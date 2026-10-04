package upscaleimage

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

type UpscaleImageService struct {
	pythonPath string
	scriptPath string
}

func NewUpscaleImageService() *UpscaleImageService {
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

	return &UpscaleImageService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
	}
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
	Error           string `json:"error,omitempty"`
}

func (s *UpscaleImageService) UpscaleImage(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts UpscaleOptions,
) (*UpscaleResult, error) {
	scale := opts.Scale
	if scale != 2 && scale != 4 {
		scale = 2
	}

	targetFmt := strings.ToLower(strings.TrimSpace(opts.OutputFormat))
	if targetFmt == "" {
		targetFmt = "png"
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
	} else if opts.FileBase64 != "" {
		// Clean base64 header if present
		b64Data := opts.FileBase64
		if idx := strings.Index(b64Data, ","); idx != -1 {
			b64Data = b64Data[idx+1:]
		}
		decoded, err := base64.StdEncoding.DecodeString(b64Data)
		if err != nil {
			return nil, fmt.Errorf("invalid base64 image payload: %w", err)
		}

		tempIn, err := os.CreateTemp("", "mc-upscale-in-*.png")
		if err != nil {
			return nil, fmt.Errorf("failed to create temp in file: %w", err)
		}
		tempInPath = tempIn.Name()
		if _, err := tempIn.Write(decoded); err != nil {
			_ = tempIn.Close()
			_ = os.Remove(tempInPath)
			return nil, fmt.Errorf("failed to write base64 to temp: %w", err)
		}
		_ = tempIn.Close()
		origName = "image.png"
		originalSize = int64(len(decoded))
	} else {
		return nil, fmt.Errorf("no image file or base64 data provided")
	}

	defer func() {
		_ = os.Remove(tempInPath)
	}()

	tempOut, err := os.CreateTemp("", "mc-upscale-out-*."+targetFmt)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp out file: %w", err)
	}
	outPath := tempOut.Name()
	_ = tempOut.Close()
	defer func() {
		_ = os.Remove(outPath)
	}()

	args := []string{
		s.scriptPath,
		"--input", tempInPath,
		"--output", outPath,
		"--scale", strconv.Itoa(scale),
		"--format", targetFmt,
	}

	execCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(execCtx, s.pythonPath, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Info().
		Str("python", s.pythonPath).
		Int("scale", scale).
		Str("target", targetFmt).
		Msg("Executing HD Image Upscaling worker")

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = strings.TrimSpace(stdout.String())
		}
		return nil, fmt.Errorf("image upscaler worker failed: %w (stderr: %s)", err, errMsg)
	}

	var pyOut pythonUpscaleOutput
	if err := json.Unmarshal(stdout.Bytes(), &pyOut); err != nil {
		return nil, fmt.Errorf("failed to parse upscaler response: %w (output: %s)", err, stdout.String())
	}

	if !pyOut.Success {
		return nil, fmt.Errorf("image upscaling failed: %s", pyOut.Error)
	}

	resultData, err := os.ReadFile(outPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read upscaled image: %w", err)
	}

	origBase := strings.TrimSuffix(filepath.Base(origName), filepath.Ext(origName))
	if origBase == "" {
		origBase = "image"
	}

	outFileName := opts.OutputFileName
	if outFileName == "" {
		outFileName = fmt.Sprintf("%s_hd_%dx.%s", origBase, scale, targetFmt)
	} else if !strings.HasSuffix(strings.ToLower(outFileName), "."+targetFmt) {
		outFileName = fmt.Sprintf("%s.%s", outFileName, targetFmt)
	}

	mimeType := "image/png"
	if targetFmt == "webp" {
		mimeType = "image/webp"
	} else if targetFmt == "jpg" || targetFmt == "jpeg" {
		mimeType = "image/jpeg"
	}

	encoded := base64.StdEncoding.EncodeToString(resultData)

	return &UpscaleResult{
		FileName:        outFileName,
		OriginalFormat:  pyOut.OriginalFormat,
		ConvertedFormat: pyOut.ConvertedFormat,
		OriginalSize:    originalSize,
		UpscaledSize:    int64(len(resultData)),
		OriginalWidth:   pyOut.OriginalWidth,
		OriginalHeight:  pyOut.OriginalHeight,
		UpscaledWidth:   pyOut.UpscaledWidth,
		UpscaledHeight:  pyOut.UpscaledHeight,
		ScaleFactor:     pyOut.ScaleFactor,
		MimeType:        mimeType,
		FileBase64:      encoded,
	}, nil
}
