package removebg

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

type RemoveBgService struct {
	pythonPath    string
	scriptPath    string
	modelDir      string
	provider      string
	cpuThreads    int
	workerMu      sync.Mutex
	workerCmd     *exec.Cmd
	workerInput   io.WriteCloser
	workerEncoder *json.Encoder
	workerDecoder *json.Decoder
	workerIdle    *time.Timer
}

const biRefNetModel = "birefnet-general-lite"
const fallbackModel = "u2netp"

func NewRemoveBgService() *RemoveBgService {
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}
	pyPath := resolveRemoveBgPython(baseDir)

	scriptCandidates := []string{
		filepath.Join("src", "modules", "image", "remove-bg", "scripts", "remove_bg.py"),
		filepath.Join(baseDir, "src", "modules", "image", "remove-bg", "scripts", "remove_bg.py"),
		filepath.Join(baseDir, "scripts", "remove_bg.py"),
		filepath.Join("apps", "api", "src", "modules", "image", "remove-bg", "scripts", "remove_bg.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\image\remove-bg\scripts\remove_bg.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	modelDir := strings.TrimSpace(os.Getenv("REMBG_MODEL_DIR"))
	if modelDir == "" {
		modelDir = filepath.Join("models", "rembg")
	}
	if !filepath.IsAbs(modelDir) {
		modelDir = resolveRemoveBgPath(baseDir, modelDir)
	}
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("REMBG_PROVIDER")))
	if provider == "" {
		provider = "cpu"
	}
	cpuThreads := min(runtime.NumCPU(), 8)
	if configuredThreads, parseErr := strconv.Atoi(strings.TrimSpace(os.Getenv("REMBG_CPU_THREADS"))); parseErr == nil && configuredThreads > 0 {
		cpuThreads = configuredThreads
	}

	return &RemoveBgService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
		modelDir:   modelDir,
		provider:   provider,
		cpuThreads: cpuThreads,
	}
}

func removeBgRoots(baseDir string) []string {
	roots := []string{"."}
	appendAncestors := func(start string) {
		absolute, err := filepath.Abs(start)
		if err != nil {
			return
		}
		for current := absolute; ; current = filepath.Dir(current) {
			roots = append(roots, current)
			parent := filepath.Dir(current)
			if parent == current {
				break
			}
		}
	}
	if workingDir, err := os.Getwd(); err == nil {
		appendAncestors(workingDir)
	}
	appendAncestors(baseDir)
	return roots
}

func resolveRemoveBgPath(baseDir, configuredPath string) string {
	if _, err := os.Stat(configuredPath); err == nil {
		absolute, absErr := filepath.Abs(configuredPath)
		if absErr == nil {
			return absolute
		}
	}
	for _, root := range removeBgRoots(baseDir) {
		candidate := filepath.Join(root, configuredPath)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	for _, root := range removeBgRoots(baseDir) {
		if _, err := os.Stat(filepath.Join(root, "apps", "api", "go.mod")); err == nil {
			return filepath.Join(root, configuredPath)
		}
	}
	return configuredPath
}

func resolveRemoveBgPython(baseDir string) string {
	candidates := []string{}
	if configured := strings.TrimSpace(os.Getenv("REMBG_PYTHON_PATH")); configured != "" {
		candidates = append(candidates, configured)
	}
	for _, root := range removeBgRoots(baseDir) {
		candidates = append(candidates,
			filepath.Join(root, ".venv", "Scripts", "python.exe"),
			filepath.Join(root, ".venv", "bin", "python"),
		)
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
	}
	if path, err := exec.LookPath("python"); err == nil {
		return path
	}
	if path, err := exec.LookPath("python3"); err == nil {
		return path
	}
	return "python"
}

type pythonRemoveBgOutput struct {
	Success         bool   `json:"success"`
	OriginalFormat  string `json:"original_format"`
	ConvertedFormat string `json:"converted_format"`
	OriginalWidth   int    `json:"original_width"`
	OriginalHeight  int    `json:"original_height"`
	ResultWidth     int    `json:"result_width"`
	ResultHeight    int    `json:"result_height"`
	OriginalSize    int64  `json:"original_size"`
	ResultSize      int64  `json:"result_size"`
	ModelUsed       string `json:"model_used"`
	Error           string `json:"error,omitempty"`
}

type removeBgWorkerRequest struct {
	Input  string `json:"input"`
	Output string `json:"output"`
	Format string `json:"format"`
}

func (s *RemoveBgService) startWorkerLocked() error {
	if s.workerIdle != nil {
		s.workerIdle.Stop()
		s.workerIdle = nil
	}
	if s.workerCmd != nil {
		return nil
	}

	cmd := exec.Command(
		s.pythonPath,
		s.scriptPath,
		"--server",
		"--model", biRefNetModel,
		"--cpu-threads", strconv.Itoa(s.cpuThreads),
	)
	cmd.Env = append(os.Environ(),
		"U2NET_HOME="+s.modelDir,
		"OMP_NUM_THREADS="+strconv.Itoa(s.cpuThreads),
		"REMBG_PROVIDER="+s.provider,
	)
	cmd.Stderr = os.Stderr

	workerInput, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to open background-removal worker input: %w", err)
	}
	workerOutput, err := cmd.StdoutPipe()
	if err != nil {
		_ = workerInput.Close()
		return fmt.Errorf("failed to open background-removal worker output: %w", err)
	}
	if err := cmd.Start(); err != nil {
		_ = workerInput.Close()
		return fmt.Errorf("failed to start background-removal worker: %w", err)
	}

	s.workerCmd = cmd
	s.workerInput = workerInput
	s.workerEncoder = json.NewEncoder(workerInput)
	s.workerDecoder = json.NewDecoder(workerOutput)
	log.Info().
		Str("python", s.pythonPath).
		Str("model", biRefNetModel).
		Str("provider", s.provider).
		Int("cpu_threads", s.cpuThreads).
		Msg("Started persistent AI Background Removal worker")
	return nil
}

func (s *RemoveBgService) runFallback(
	ctx context.Context,
	inputPath string,
	outputPath string,
	targetFormat string,
) (*pythonRemoveBgOutput, error) {
	args := []string{
		s.scriptPath,
		"--input", inputPath,
		"--output", outputPath,
		"--format", targetFormat,
		"--model", fallbackModel,
		"--cpu-threads", strconv.Itoa(s.cpuThreads),
	}
	cmd := exec.CommandContext(ctx, s.pythonPath, args...)
	cmd.Env = append(os.Environ(),
		"U2NET_HOME="+s.modelDir,
		"OMP_NUM_THREADS="+strconv.Itoa(s.cpuThreads),
		"REMBG_PROVIDER=cpu",
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	startedAt := time.Now()
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf(
			"U2NetP fallback failed: %w (stderr: %s)",
			err,
			strings.TrimSpace(stderr.String()),
		)
	}

	var output pythonRemoveBgOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		return nil, fmt.Errorf("failed to parse U2NetP fallback response: %w", err)
	}
	if !output.Success {
		return nil, fmt.Errorf("U2NetP fallback failed: %s", output.Error)
	}
	log.Info().
		Str("model", fallbackModel).
		Dur("duration", time.Since(startedAt)).
		Msg("Completed background removal with fallback model")
	return &output, nil
}

func (s *RemoveBgService) stopWorkerLocked() {
	if s.workerIdle != nil {
		s.workerIdle.Stop()
		s.workerIdle = nil
	}
	if s.workerInput != nil {
		_ = s.workerInput.Close()
	}
	if s.workerCmd != nil && s.workerCmd.Process != nil {
		_ = s.workerCmd.Process.Kill()
		_ = s.workerCmd.Wait()
	}
	s.workerCmd = nil
	s.workerInput = nil
	s.workerEncoder = nil
	s.workerDecoder = nil
}

func (s *RemoveBgService) scheduleWorkerShutdownLocked() {
	if s.workerIdle != nil {
		s.workerIdle.Stop()
	}
	s.workerIdle = time.AfterFunc(2*time.Minute, func() {
		s.workerMu.Lock()
		defer s.workerMu.Unlock()
		s.stopWorkerLocked()
		log.Info().Msg("Stopped idle AI Background Removal worker")
	})
}

func (s *RemoveBgService) runWorker(
	ctx context.Context,
	inputPath string,
	outputPath string,
	targetFormat string,
) (*pythonRemoveBgOutput, error) {
	s.workerMu.Lock()
	defer s.workerMu.Unlock()

	request := removeBgWorkerRequest{
		Input:  inputPath,
		Output: outputPath,
		Format: targetFormat,
	}

	for attempt := 0; attempt < 2; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if err := s.startWorkerLocked(); err != nil {
			return nil, err
		}
		if err := s.workerEncoder.Encode(request); err != nil {
			s.stopWorkerLocked()
			if attempt == 0 {
				continue
			}
			return nil, fmt.Errorf("failed to send image to background-removal worker: %w", err)
		}

		type workerResponse struct {
			output pythonRemoveBgOutput
			err    error
		}
		responseCh := make(chan workerResponse, 1)
		decoder := s.workerDecoder
		go func() {
			var output pythonRemoveBgOutput
			decodeErr := decoder.Decode(&output)
			responseCh <- workerResponse{output: output, err: decodeErr}
		}()

		select {
		case response := <-responseCh:
			if response.err != nil {
				s.stopWorkerLocked()
				if attempt == 0 {
					continue
				}
				return nil, fmt.Errorf("failed to read background-removal worker response: %w", response.err)
			}
			if !response.output.Success {
				s.scheduleWorkerShutdownLocked()
				return nil, fmt.Errorf("AI background removal failed: %s", response.output.Error)
			}
			s.scheduleWorkerShutdownLocked()
			return &response.output, nil
		case <-ctx.Done():
			s.stopWorkerLocked()
			return nil, ctx.Err()
		}
	}

	return nil, fmt.Errorf("background-removal worker is unavailable")
}

func (s *RemoveBgService) RemoveBackground(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts RemoveBgOptions,
) (*RemoveBgResult, error) {
	srcFile, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer srcFile.Close()

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".png"
	}

	tempIn, err := os.CreateTemp("", "mc-rembg-in-*"+ext)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp in file: %w", err)
	}
	defer func() {
		_ = os.Remove(tempIn.Name())
	}()

	// Stream upload to temp file using io.Copy (media-stream-pro)
	originalSize, err := io.Copy(tempIn, srcFile)
	if err != nil {
		_ = tempIn.Close()
		return nil, fmt.Errorf("failed to stream source image to temp: %w", err)
	}
	_ = tempIn.Close()

	targetFmt := strings.ToLower(strings.TrimSpace(opts.OutputFormat))
	if targetFmt != "webp" {
		targetFmt = "png"
	}

	tempOut, err := os.CreateTemp("", "mc-rembg-out-*."+targetFmt)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp out file: %w", err)
	}
	outPath := tempOut.Name()
	_ = tempOut.Close()
	keepOutput := false
	defer func() {
		if !keepOutput {
			_ = os.Remove(outPath)
		}
	}()

	execCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	log.Info().
		Str("model", biRefNetModel).
		Str("target", targetFmt).
		Msg("Executing AI Background Removal worker")
	biRefCtx, biRefCancel := context.WithTimeout(execCtx, 5*time.Second)
	pyOut, err := s.runWorker(biRefCtx, tempIn.Name(), outPath, targetFmt)
	biRefCancel()
	if errors.Is(err, context.DeadlineExceeded) && execCtx.Err() == nil {
		log.Warn().
			Str("fallback_model", fallbackModel).
			Msg("BiRefNet exceeded 5 seconds; switching to fallback model")
		pyOut, err = s.runFallback(execCtx, tempIn.Name(), outPath, targetFmt)
	}
	if err != nil {
		return nil, err
	}

	resultInfo, err := os.Stat(outPath)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect result image: %w", err)
	}

	origBase := strings.TrimSuffix(filepath.Base(fileHeader.Filename), filepath.Ext(fileHeader.Filename))
	if origBase == "" {
		origBase = "image"
	}

	outFileName := opts.OutputFileName
	if outFileName == "" {
		outFileName = fmt.Sprintf("%s_no_bg.%s", origBase, targetFmt)
	} else if !strings.HasSuffix(strings.ToLower(outFileName), "."+targetFmt) {
		outFileName = fmt.Sprintf("%s.%s", outFileName, targetFmt)
	}

	mimeType := "image/png"
	if targetFmt == "webp" {
		mimeType = "image/webp"
	}

	result := &RemoveBgResult{
		FileName:        outFileName,
		OriginalFormat:  pyOut.OriginalFormat,
		ConvertedFormat: pyOut.ConvertedFormat,
		OriginalSize:    originalSize,
		ResultSize:      resultInfo.Size(),
		OriginalWidth:   pyOut.OriginalWidth,
		OriginalHeight:  pyOut.OriginalHeight,
		ResultWidth:     pyOut.ResultWidth,
		ResultHeight:    pyOut.ResultHeight,
		ModelUsed:       pyOut.ModelUsed,
		MimeType:        mimeType,
		OutputPath:      outPath,
		Cleanup: func() {
			_ = os.Remove(outPath)
		},
	}
	keepOutput = true
	return result, nil
}
