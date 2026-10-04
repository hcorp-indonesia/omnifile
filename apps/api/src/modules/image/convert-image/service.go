package convertimage

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
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type ConvertImageService struct {
	pythonPath string
	scriptPath string
}

func NewConvertImageService() *ConvertImageService {
	// Find python executable
	pyPath := "python"
	if p, err := exec.LookPath("python"); err == nil {
		pyPath = p
	} else if p, err := exec.LookPath("python3"); err == nil {
		pyPath = p
	} else if _, err := os.Stat(`C:\Python312\python.exe`); err == nil {
		pyPath = `C:\Python312\python.exe`
	}

	// Locate converter.py
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

	scriptCandidates := []string{
		filepath.Join("src", "modules", "image", "convert-image", "scripts", "converter.py"),
		filepath.Join(baseDir, "src", "modules", "image", "convert-image", "scripts", "converter.py"),
		filepath.Join(baseDir, "scripts", "converter.py"),
		filepath.Join("apps", "api", "src", "modules", "image", "convert-image", "scripts", "converter.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\image\convert-image\scripts\converter.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	return &ConvertImageService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
	}
}

type pythonConvertOutput struct {
	Success         bool   `json:"success"`
	OriginalFormat  string `json:"original_format"`
	ConvertedFormat string `json:"converted_format"`
	OriginalWidth   int    `json:"original_width"`
	OriginalHeight  int    `json:"original_height"`
	ConvertedWidth  int    `json:"converted_width"`
	ConvertedHeight int    `json:"converted_height"`
	OriginalSize    int64  `json:"original_size"`
	ConvertedSize   int64  `json:"converted_size"`
	Error           string `json:"error,omitempty"`
}

func GetMimeType(format string) string {
	switch strings.ToLower(format) {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "webp":
		return "image/webp"
	case "avif":
		return "image/avif"
	case "bmp":
		return "image/bmp"
	case "tiff", "tif":
		return "image/tiff"
	case "ico":
		return "image/x-icon"
	case "gif":
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}

func (s *ConvertImageService) ConvertImage(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts ConvertImageOptions,
) (*ConvertImageResult, error) {
	srcFile, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer srcFile.Close()

	// Normalize target format
	targetFmt := strings.ToLower(strings.TrimSpace(opts.TargetFormat))
	if targetFmt == "" {
		targetFmt = "png"
	}
	if targetFmt == "jpeg" {
		targetFmt = "jpg"
	}

	// Create temp input file
	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".tmp"
	}
	tempIn, err := os.CreateTemp("", "mc-image-in-*"+ext)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp in file: %w", err)
	}
	defer func() {
		_ = os.Remove(tempIn.Name())
	}()

	// Stream upload to temp file
	originalSize, err := io.Copy(tempIn, srcFile)
	if err != nil {
		_ = tempIn.Close()
		return nil, fmt.Errorf("failed to write source image to temp: %w", err)
	}
	_ = tempIn.Close()

	// Create temp output file
	tempOut, err := os.CreateTemp("", "mc-image-out-*."+targetFmt)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp out file: %w", err)
	}
	outPath := tempOut.Name()
	_ = tempOut.Close()
	defer func() {
		_ = os.Remove(outPath)
	}()

	// Quality defaults
	quality := opts.Quality
	if quality <= 0 {
		quality = 85
	} else if quality > 100 {
		quality = 100
	}

	bgColor := opts.Background
	if bgColor == "" {
		bgColor = "#FFFFFF"
	}

	// Prepare arguments for converter.py
	args := []string{
		s.scriptPath,
		"--input", tempIn.Name(),
		"--output", outPath,
		"--format", targetFmt,
		"--quality", strconv.Itoa(quality),
		"--background", bgColor,
	}

	if opts.Width > 0 {
		args = append(args, "--width", strconv.Itoa(opts.Width))
	}
	if opts.Height > 0 {
		args = append(args, "--height", strconv.Itoa(opts.Height))
	}
	if opts.RemoveBg {
		args = append(args, "--remove-bg")
	}

	// Timeout context for safety (allow extra time for AI processing)
	execCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(execCtx, s.pythonPath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Info().
		Str("python", s.pythonPath).
		Str("script", s.scriptPath).
		Str("format", targetFmt).
		Int("quality", quality).
		Msg("Executing image conversion worker")

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = strings.TrimSpace(stdout.String())
		}
		return nil, fmt.Errorf("image conversion worker failed: %w (stderr: %s)", err, errMsg)
	}

	// Parse JSON stdout from converter.py
	var pyOut pythonConvertOutput
	if err := json.Unmarshal(stdout.Bytes(), &pyOut); err != nil {
		return nil, fmt.Errorf("failed to parse converter script response: %w (output: %s)", err, stdout.String())
	}

	if !pyOut.Success {
		return nil, fmt.Errorf("conversion failed: %s", pyOut.Error)
	}

	// Read converted file
	convertedData, err := os.ReadFile(outPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read converted image: %w", err)
	}

	convertedSize := int64(len(convertedData))
	savedBytes := originalSize - convertedSize
	savedPct := 0.0
	if originalSize > 0 {
		savedPct = (float64(savedBytes) / float64(originalSize)) * 100
	}

	// Prepare file name
	origBase := strings.TrimSuffix(filepath.Base(fileHeader.Filename), filepath.Ext(fileHeader.Filename))
	if origBase == "" {
		origBase = "image"
	}

	outFileName := opts.OutputFileName
	if outFileName == "" {
		outFileName = fmt.Sprintf("%s_converted.%s", origBase, targetFmt)
	} else if !strings.HasSuffix(strings.ToLower(outFileName), "."+targetFmt) {
		outFileName = fmt.Sprintf("%s.%s", outFileName, targetFmt)
	}

	mimeType := GetMimeType(targetFmt)
	encoded := base64.StdEncoding.EncodeToString(convertedData)

	return &ConvertImageResult{
		FileName:        outFileName,
		OriginalFormat:  pyOut.OriginalFormat,
		ConvertedFormat: pyOut.ConvertedFormat,
		OriginalSize:    originalSize,
		ConvertedSize:   convertedSize,
		SavedBytes:      savedBytes,
		SavedPercentage: savedPct,
		OriginalWidth:   pyOut.OriginalWidth,
		OriginalHeight:  pyOut.OriginalHeight,
		ConvertedWidth:  pyOut.ConvertedWidth,
		ConvertedHeight: pyOut.ConvertedHeight,
		MimeType:        mimeType,
		FileBase64:      encoded,
	}, nil
}
