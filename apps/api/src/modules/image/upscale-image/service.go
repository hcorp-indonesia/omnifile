package upscaleimage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/jpeg"
	"image/png"
	_ "image/png"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/HugoSmits86/nativewebp"
	"github.com/rs/zerolog/log"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

type UpscaleImageService struct {
	pythonPath string
	scriptPath string
	modelPath  string
	ncnnPath   string
	ncnnModels string
	ncnnModel  string
	engine     string
	jobs       chan struct{}
}

func NewUpscaleImageService() *UpscaleImageService {
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

	pyPath := resolvePythonPath(baseDir)

	scriptCandidates := []string{
		filepath.Join("src", "modules", "image", "upscale-image", "scripts", "upscaler.py"),
		filepath.Join(baseDir, "src", "modules", "image", "upscale-image", "scripts", "upscaler.py"),
		filepath.Join(baseDir, "scripts", "upscaler.py"),
		filepath.Join("apps", "api", "src", "modules", "image", "upscale-image", "scripts", "upscaler.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\image\upscale-image\scripts\upscaler.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	modelPath := os.Getenv("REALESRGAN_MODEL_PATH")
	if modelPath != "" && !filepath.IsAbs(modelPath) {
		modelPath = resolveWorkspacePath(baseDir, modelPath)
	}
	ncnnPath := resolveNCNNPath(baseDir)
	ncnnModels := strings.TrimSpace(os.Getenv("REALESRGAN_NCNN_MODELS_PATH"))
	if ncnnModels == "" && ncnnPath != "" {
		ncnnModels = filepath.Join(filepath.Dir(ncnnPath), "models")
	} else if ncnnModels != "" && !filepath.IsAbs(ncnnModels) {
		ncnnModels = resolveWorkspacePath(baseDir, ncnnModels)
	}
	ncnnModel := strings.TrimSpace(os.Getenv("REALESRGAN_NCNN_MODEL"))
	if ncnnModel == "" {
		ncnnModel = "realesr-animevideov3"
	}
	engine := strings.ToLower(strings.TrimSpace(os.Getenv("REALESRGAN_ENGINE")))
	if engine == "" {
		engine = "auto"
	}

	return &UpscaleImageService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
		modelPath:  modelPath,
		ncnnPath:   ncnnPath,
		ncnnModels: ncnnModels,
		ncnnModel:  ncnnModel,
		engine:     engine,
		jobs:       make(chan struct{}, 1),
	}
}

func resolveNCNNPath(baseDir string) string {
	candidates := []string{}
	if configured := strings.TrimSpace(os.Getenv("REALESRGAN_NCNN_PATH")); configured != "" {
		candidates = append(candidates, configured)
	}

	executableName := "realesrgan-ncnn-vulkan"
	if filepath.Separator == '\\' {
		executableName += ".exe"
	}
	for _, root := range workspaceRoots(baseDir) {
		candidates = append(candidates,
			filepath.Join(root, "tools", "realesrgan-ncnn-vulkan", executableName),
			filepath.Join(root, "realesrgan-ncnn-vulkan", executableName),
		)
	}

	for _, candidate := range candidates {
		if !filepath.IsAbs(candidate) {
			candidate = resolveWorkspacePath(baseDir, candidate)
		}
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
	}
	if path, err := exec.LookPath(executableName); err == nil {
		return path
	}
	return ""
}

func resolvePythonPath(baseDir string) string {
	candidates := []string{}
	if configured := strings.TrimSpace(os.Getenv("REALESRGAN_PYTHON_PATH")); configured != "" {
		candidates = append(candidates, configured)
	}

	for _, root := range workspaceRoots(baseDir) {
		candidates = append(candidates,
			filepath.Join(root, ".venv", "Scripts", "python.exe"),
			filepath.Join(root, ".venv", "bin", "python"),
		)
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	if p, err := exec.LookPath("python"); err == nil {
		return p
	}
	if p, err := exec.LookPath("python3"); err == nil {
		return p
	}
	return "python"
}

func resolveWorkspacePath(baseDir, configuredPath string) string {
	if _, err := os.Stat(configuredPath); err == nil {
		if absolute, err := filepath.Abs(configuredPath); err == nil {
			return absolute
		}
	}
	for _, root := range workspaceRoots(baseDir) {
		candidate := filepath.Join(root, configuredPath)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return configuredPath
}

func workspaceRoots(baseDir string) []string {
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

type pythonUpscaleOutput struct {
	Success         bool   `json:"success"`
	OriginalFormat  string `json:"original_format"`
	ConvertedFormat string `json:"converted_format"`
	OriginalWidth   int    `json:"original_width"`
	OriginalHeight  int    `json:"original_height"`
	UpscaledWidth   int    `json:"upscaled_width"`
	UpscaledHeight  int    `json:"upscaled_height"`
	ScaleFactor     int    `json:"scale_factor"`
	OriginalSize    int64  `json:"original_size"`
	UpscaledSize    int64  `json:"upscaled_size"`
	ProcessingMode  string `json:"processing_mode,omitempty"`
	Error           string `json:"error,omitempty"`
}

func adaptiveUpscaleScale(requestedScale, width, height int) (int, string) {
	if requestedScale == 1 {
		return 2, "ai-enhance-original"
	}
	if requestedScale == 2 {
		return 2, "ai-2x"
	}
	pixels := int64(width) * int64(height)
	if pixels <= 350_000 {
		return 4, "ai-4x"
	}
	return 2, "adaptive-ai-2x"
}

func resizeImageFile(inputPath, outputPath, targetFormat string, width, height int) error {
	sourceFile, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("failed to open AI output: %w", err)
	}
	source, _, err := image.Decode(sourceFile)
	_ = sourceFile.Close()
	if err != nil {
		return fmt.Errorf("failed to decode AI output: %w", err)
	}

	target := image.NewNRGBA(image.Rect(0, 0, width, height))
	xdraw.CatmullRom.Scale(target, target.Bounds(), source, source.Bounds(), xdraw.Over, nil)

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create enhanced image: %w", err)
	}
	defer outputFile.Close()

	switch targetFormat {
	case "jpg", "jpeg":
		opaque := image.NewRGBA(target.Bounds())
		draw.Draw(opaque, opaque.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
		draw.Draw(opaque, opaque.Bounds(), target, image.Point{}, draw.Over)
		err = jpeg.Encode(outputFile, opaque, &jpeg.Options{Quality: 90})
	case "png":
		err = png.Encode(outputFile, target)
	default:
		err = nativewebp.Encode(outputFile, target, nil)
	}
	if err != nil {
		return fmt.Errorf("failed to encode enhanced image: %w", err)
	}
	return nil
}

func (s *UpscaleImageService) canUseNCNN(inputPath string) bool {
	if s.engine == "python" || s.ncnnPath == "" || s.ncnnModels == "" {
		return false
	}
	extension := strings.ToLower(filepath.Ext(inputPath))
	return extension == ".jpg" || extension == ".jpeg" || extension == ".png" || extension == ".webp"
}

func (s *UpscaleImageService) runNCNN(
	ctx context.Context,
	inputPath string,
	outputPath string,
	targetFormat string,
	scale int,
) (*pythonUpscaleOutput, error) {
	args := []string{
		"-i", inputPath,
		"-o", outputPath,
		"-s", strconv.Itoa(scale),
		"-t", "512",
		"-m", s.ncnnModels,
		"-n", s.ncnnModel,
		"-g", "auto",
		"-j", "1:2:2",
		"-f", targetFormat,
	}
	cmd := exec.CommandContext(ctx, s.ncnnPath, args...)
	cmd.Dir = filepath.Dir(s.ncnnPath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	startedAt := time.Now()
	log.Info().
		Str("engine", "ncnn-vulkan").
		Str("model", s.ncnnModel).
		Int("scale", scale).
		Str("target", targetFormat).
		Msg("Executing HD Image Upscaling worker")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ncnn-vulkan worker failed: %w (stderr: %s)", err, strings.TrimSpace(stderr.String()))
	}

	originalWidth, originalHeight, originalFormat, err := decodeImageMetadata(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect source image: %w", err)
	}
	upscaledWidth, upscaledHeight, convertedFormat, err := decodeImageMetadata(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect upscaled image: %w", err)
	}
	inputInfo, err := os.Stat(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect source size: %w", err)
	}
	outputInfo, err := os.Stat(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect upscaled size: %w", err)
	}

	log.Info().
		Str("engine", "ncnn-vulkan").
		Dur("duration", time.Since(startedAt)).
		Msg("HD Image Upscaling worker completed")
	return &pythonUpscaleOutput{
		Success:         true,
		OriginalFormat:  originalFormat,
		ConvertedFormat: convertedFormat,
		OriginalWidth:   originalWidth,
		OriginalHeight:  originalHeight,
		UpscaledWidth:   upscaledWidth,
		UpscaledHeight:  upscaledHeight,
		ScaleFactor:     scale,
		OriginalSize:    inputInfo.Size(),
		UpscaledSize:    outputInfo.Size(),
		ProcessingMode:  fmt.Sprintf("ai-%dx", scale),
	}, nil
}

func decodeImageMetadata(path string) (int, int, string, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, 0, "", err
	}
	defer file.Close()
	config, format, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, "", err
	}
	return config.Width, config.Height, strings.ToUpper(format), nil
}

func (s *UpscaleImageService) runPython(
	ctx context.Context,
	inputPath string,
	outputPath string,
	targetFormat string,
	scale int,
) (*pythonUpscaleOutput, error) {
	if s.modelPath == "" {
		return nil, fmt.Errorf("REALESRGAN_MODEL_PATH is not configured")
	}
	args := []string{
		s.scriptPath,
		"--input", inputPath,
		"--output", outputPath,
		"--scale", strconv.Itoa(scale),
		"--format", targetFormat,
		"--max-size-mb", "5.0",
		"--max-dimension", "3840",
		"--tile", "96",
		"--cpu-threads", "2",
		"--model-path", s.modelPath,
	}
	cmd := exec.CommandContext(ctx, s.pythonPath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Info().
		Str("engine", "python").
		Str("python", s.pythonPath).
		Int("scale", scale).
		Str("target", targetFormat).
		Msg("Executing HD Image Upscaling worker")
	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = strings.TrimSpace(stdout.String())
		}
		return nil, fmt.Errorf("image upscaler worker failed: %w (stderr: %s)", err, errMsg)
	}

	var output pythonUpscaleOutput
	if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
		return nil, fmt.Errorf("failed to parse upscaler response: %w (output: %s)", err, stdout.String())
	}
	if !output.Success {
		return nil, fmt.Errorf("image upscaling failed: %s", output.Error)
	}
	return &output, nil
}

func (s *UpscaleImageService) UpscaleImage(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts UpscaleOptions,
) (*UpscaleResult, error) {
	targetFmt := strings.ToLower(strings.TrimSpace(opts.OutputFormat))
	if targetFmt == "" {
		if fileHeader != nil {
			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			switch ext {
			case ".jpg", ".jpeg":
				targetFmt = "jpg"
			case ".webp":
				targetFmt = "webp"
			default:
				targetFmt = "webp"
			}
		} else {
			targetFmt = "webp"
		}
	}

	var tempInPath string
	var origName string
	var originalSize int64

	if fileHeader != nil {
		origName = fileHeader.Filename
		srcFile, err := fileHeader.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open uploaded file: %w", err)
		}
		defer srcFile.Close()

		ext := filepath.Ext(fileHeader.Filename)
		if ext == "" {
			ext = ".png"
		}

		tempIn, err := os.CreateTemp("", "mc-upscale-in-*"+ext)
		if err != nil {
			return nil, fmt.Errorf("failed to create temp in file: %w", err)
		}
		tempInPath = tempIn.Name()

		n, err := io.Copy(tempIn, srcFile)
		_ = tempIn.Close()
		if err != nil {
			_ = os.Remove(tempInPath)
			return nil, fmt.Errorf("failed to write upload to temp: %w", err)
		}
		originalSize = n
	} else {
		return nil, fmt.Errorf("no image file provided")
	}

	originalWidth, originalHeight, _, err := decodeImageMetadata(tempInPath)
	if err != nil {
		_ = os.Remove(tempInPath)
		return nil, fmt.Errorf("failed to inspect uploaded image: %w", err)
	}
	requestedScale := opts.Scale
	if requestedScale != 1 && requestedScale != 2 && requestedScale != 4 {
		requestedScale = 4
	}
	preserveDimensions := requestedScale == 1
	scale, processingMode := adaptiveUpscaleScale(requestedScale, originalWidth, originalHeight)

	tempOut, err := os.CreateTemp("", "mc-upscale-out-*."+targetFmt)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp out file: %w", err)
	}
	outPath := tempOut.Name()
	_ = tempOut.Close()
	workerOutPath := outPath
	if preserveDimensions {
		workerOut, createErr := os.CreateTemp("", "mc-upscale-ai-*."+targetFmt)
		if createErr != nil {
			_ = os.Remove(tempInPath)
			_ = os.Remove(outPath)
			return nil, fmt.Errorf("failed to create AI output file: %w", createErr)
		}
		workerOutPath = workerOut.Name()
		_ = workerOut.Close()
		defer os.Remove(workerOutPath)
	}
	cleanup := func() {
		_ = os.Remove(tempInPath)
		_ = os.Remove(outPath)
	}
	keepOutput := false
	defer func() {
		if !keepOutput {
			cleanup()
		}
	}()
	select {
	case s.jobs <- struct{}{}:
		defer func() { <-s.jobs }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	execCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	var workerOutput *pythonUpscaleOutput
	if s.canUseNCNN(tempInPath) {
		workerOutput, err = s.runNCNN(execCtx, tempInPath, workerOutPath, targetFmt, scale)
		if err != nil && s.engine == "auto" {
			log.Warn().Err(err).Msg("NCNN Vulkan unavailable; falling back to Python upscaler")
			workerOutput, err = s.runPython(execCtx, tempInPath, workerOutPath, targetFmt, scale)
		}
	} else {
		if s.engine == "ncnn" {
			return nil, fmt.Errorf("NCNN Vulkan is configured but unavailable for this image format")
		}
		workerOutput, err = s.runPython(execCtx, tempInPath, workerOutPath, targetFmt, scale)
	}
	if err != nil {
		return nil, err
	}
	if preserveDimensions {
		if err := resizeImageFile(workerOutPath, outPath, targetFmt, originalWidth, originalHeight); err != nil {
			return nil, err
		}
		outputInfo, statErr := os.Stat(outPath)
		if statErr != nil {
			return nil, fmt.Errorf("failed to inspect enhanced image size: %w", statErr)
		}
		workerOutput.UpscaledWidth = originalWidth
		workerOutput.UpscaledHeight = originalHeight
		workerOutput.UpscaledSize = outputInfo.Size()
		workerOutput.ScaleFactor = 1
	}
	workerOutput.ProcessingMode = processingMode

	origBase := strings.TrimSuffix(filepath.Base(origName), filepath.Ext(origName))
	if origBase == "" {
		origBase = "image"
	}

	outFileName := opts.OutputFileName
	if outFileName == "" {
		if preserveDimensions {
			outFileName = fmt.Sprintf("%s_enhanced.%s", origBase, targetFmt)
		} else {
			outFileName = fmt.Sprintf("%s_hd_%dx.%s", origBase, scale, targetFmt)
		}
	} else if !strings.HasSuffix(strings.ToLower(outFileName), "."+targetFmt) {
		outFileName = fmt.Sprintf("%s.%s", outFileName, targetFmt)
	}

	mimeType := "image/png"
	if targetFmt == "webp" {
		mimeType = "image/webp"
	} else if targetFmt == "jpg" || targetFmt == "jpeg" {
		mimeType = "image/jpeg"
	}

	result := &UpscaleResult{
		FileName:        outFileName,
		OriginalFormat:  workerOutput.OriginalFormat,
		ConvertedFormat: workerOutput.ConvertedFormat,
		OriginalSize:    originalSize,
		UpscaledSize:    workerOutput.UpscaledSize,
		OriginalWidth:   workerOutput.OriginalWidth,
		OriginalHeight:  workerOutput.OriginalHeight,
		UpscaledWidth:   workerOutput.UpscaledWidth,
		UpscaledHeight:  workerOutput.UpscaledHeight,
		ScaleFactor:     workerOutput.ScaleFactor,
		ProcessingMode:  workerOutput.ProcessingMode,
		MimeType:        mimeType,
		OutputPath:      outPath,
		Cleanup:         cleanup,
	}
	keepOutput = true
	return result, nil
}
