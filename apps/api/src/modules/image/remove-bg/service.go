package removebg

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type RemoveBgService struct {
	pythonPath string
	scriptPath string
}

func NewRemoveBgService() *RemoveBgService {
	pyPath := "python"
	if p, err := exec.LookPath("python"); err == nil {
		pyPath = p
	} else if p, err := exec.LookPath("python3"); err == nil {
		pyPath = p
	} else if _, err := os.Stat(`C:\Python312\python.exe`); err == nil {
		pyPath = `C:\Python312\python.exe`
	}

	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

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

	return &RemoveBgService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
	}
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
	Error           string `json:"error,omitempty"`
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
	defer func() {
		_ = os.Remove(outPath)
	}()

	modelName := opts.Model
	if modelName == "" {
		modelName = "u2netp"
	}

	args := []string{
		s.scriptPath,
		"--input", tempIn.Name(),
		"--output", outPath,
		"--model", modelName,
		"--format", targetFmt,
	}

	execCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(execCtx, s.pythonPath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Info().
		Str("python", s.pythonPath).
		Str("model", modelName).
		Str("target", targetFmt).
		Msg("Executing AI Background Removal worker")

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = strings.TrimSpace(stdout.String())
		}
		return nil, fmt.Errorf("AI background removal worker failed: %w (stderr: %s)", err, errMsg)
	}

	var pyOut pythonRemoveBgOutput
	if err := json.Unmarshal(stdout.Bytes(), &pyOut); err != nil {
		return nil, fmt.Errorf("failed to parse AI worker response: %w (output: %s)", err, stdout.String())
	}

	if !pyOut.Success {
		return nil, fmt.Errorf("AI background removal failed: %s", pyOut.Error)
	}

	resultData, err := os.ReadFile(outPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read result image: %w", err)
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

	encoded := base64.StdEncoding.EncodeToString(resultData)

	return &RemoveBgResult{
		FileName:        outFileName,
		OriginalFormat:  pyOut.OriginalFormat,
		ConvertedFormat: pyOut.ConvertedFormat,
		OriginalSize:    originalSize,
		ResultSize:      int64(len(resultData)),
		OriginalWidth:   pyOut.OriginalWidth,
		OriginalHeight:  pyOut.OriginalHeight,
		ResultWidth:     pyOut.ResultWidth,
		ResultHeight:    pyOut.ResultHeight,
		MimeType:        mimeType,
		FileBase64:      encoded,
	}, nil
}
