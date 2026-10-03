package compresspdf

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

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/rs/zerolog/log"
)

type CompressPdfService struct {
	pythonPath string
	scriptPath string
}

func NewCompressPdfService() *CompressPdfService {
	// Find python executable
	pyPath := "python"
	if p, err := exec.LookPath("python"); err == nil {
		pyPath = p
	} else if p, err := exec.LookPath("python3"); err == nil {
		pyPath = p
	} else if _, err := os.Stat(`C:\Python312\python.exe`); err == nil {
		pyPath = `C:\Python312\python.exe`
	}

	// Locate compressor.py
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

	scriptCandidates := []string{
		filepath.Join("src", "modules", "pdf", "compress-pdf", "scripts", "compressor.py"),
		filepath.Join(baseDir, "src", "modules", "pdf", "compress-pdf", "scripts", "compressor.py"),
		filepath.Join(baseDir, "scripts", "compressor.py"),
		filepath.Join("apps", "api", "src", "modules", "pdf", "compress-pdf", "scripts", "compressor.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\pdf\compress-pdf\scripts\compressor.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	return &CompressPdfService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
	}
}

type pythonCompressOutput struct {
	Success        bool   `json:"success"`
	OriginalSize   int64  `json:"original_size"`
	CompressedSize int64  `json:"compressed_size"`
	TotalPages     int    `json:"total_pages"`
	Error          string `json:"error,omitempty"`
}

func (s *CompressPdfService) compressViaPython(
	ctx context.Context,
	originalData []byte,
	opts CompressPdfOptions,
) ([]byte, int, error) {
	if _, err := os.Stat(s.scriptPath); err != nil {
		return nil, 0, fmt.Errorf("compressor script not found at %s: %w", s.scriptPath, err)
	}

	tempIn, err := os.CreateTemp("", "mc-compress-in-*.pdf")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create temp in file: %w", err)
	}
	defer func() {
		_ = os.Remove(tempIn.Name())
	}()

	if _, err := tempIn.Write(originalData); err != nil {
		_ = tempIn.Close()
		return nil, 0, fmt.Errorf("failed to write original data: %w", err)
	}
	_ = tempIn.Close()

	tempOut, err := os.CreateTemp("", "mc-compress-out-*.pdf")
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create temp out file: %w", err)
	}
	tempOutPath := tempOut.Name()
	_ = tempOut.Close()
	defer func() {
		_ = os.Remove(tempOutPath)
	}()

	args := []string{
		s.scriptPath,
		"--input", tempIn.Name(),
		"--output", tempOutPath,
		"--level", opts.Level,
	}

	if opts.TargetSizeKB > 0 {
		args = append(args, "--target-kb", strconv.FormatInt(opts.TargetSizeKB, 10))
	}
	if opts.Quality > 0 {
		args = append(args, "--quality", strconv.Itoa(opts.Quality))
	}
	if opts.DPI > 0 {
		args = append(args, "--dpi", strconv.Itoa(opts.DPI))
	}
	if opts.RemoveMetadata {
		args = append(args, "--remove-metadata")
	}

	cmdCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, s.pythonPath, args...)
	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	if err := cmd.Run(); err != nil {
		return nil, 0, fmt.Errorf("python compressor execution failed: %w, stderr: %s", err, stderrBuf.String())
	}

	var pyRes pythonCompressOutput
	if err := json.Unmarshal(stdoutBuf.Bytes(), &pyRes); err != nil {
		log.Warn().Err(err).Str("stdout", stdoutBuf.String()).Msg("Failed to parse python compressor stdout, proceeding with file read")
	}

	compressedData, err := os.ReadFile(tempOutPath)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read compressed output: %w", err)
	}

	totalPages := pyRes.TotalPages
	if totalPages == 0 {
		totalPages = 1
	}

	return compressedData, totalPages, nil
}

func (s *CompressPdfService) CompressPdf(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts CompressPdfOptions,
) (*CompressPdfResult, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer file.Close()

	originalData, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	originalSize := int64(len(originalData))
	if originalSize == 0 {
		return nil, fmt.Errorf("uploaded file is empty")
	}

	level := strings.ToLower(strings.TrimSpace(opts.Level))
	if level == "" {
		level = "recommended"
	}
	opts.Level = level

	var finalData []byte
	var totalPages int

	// 1. First attempt: High-fidelity image and stream compressor via PyMuPDF
	pyData, pyPages, pyErr := s.compressViaPython(ctx, originalData, opts)
	if pyErr == nil && len(pyData) > 0 {
		finalData = pyData
		totalPages = pyPages
	} else {
		if pyErr != nil {
			log.Warn().Err(pyErr).Msg("Python compressor failed or unavailable, falling back to pdfcpu")
		}

		// 2. Fallback: pdfcpu structural optimization
		conf := model.NewDefaultConfiguration()
		conf.ValidationMode = model.ValidationRelaxed
		conf.CheckFileNameExt = false

		switch level {
		case "extreme":
			conf.Optimize = true
			conf.OptimizeBeforeWriting = true
			conf.OptimizeResourceDicts = true
			conf.OptimizeDuplicateContentStreams = true
			conf.WriteObjectStream = true
			conf.WriteXRefStream = true
		case "low":
			conf.Optimize = true
			conf.OptimizeBeforeWriting = false
			conf.OptimizeResourceDicts = false
			conf.OptimizeDuplicateContentStreams = false
			conf.WriteObjectStream = false
		case "custom":
			conf.Optimize = true
			conf.OptimizeBeforeWriting = true
			conf.WriteXRefStream = true
			if opts.TargetSizeKB > 0 {
				targetBytes := opts.TargetSizeKB * 1024
				conf.OptimizeResourceDicts = true
				conf.OptimizeDuplicateContentStreams = true
				conf.WriteObjectStream = true
				if targetBytes < (originalSize * 70 / 100) {
					conf.PreserveInfoDict = false
					conf.RemoveSignatures = true
				}
			} else {
				if opts.Quality <= 60 || (opts.DPI > 0 && opts.DPI <= 150) {
					conf.OptimizeResourceDicts = true
					conf.OptimizeDuplicateContentStreams = true
					conf.WriteObjectStream = true
				} else {
					conf.OptimizeResourceDicts = false
					conf.OptimizeDuplicateContentStreams = false
					conf.WriteObjectStream = false
				}
				if opts.RemoveMetadata {
					conf.PreserveInfoDict = false
					conf.RemoveSignatures = true
				}
			}
		default: // "recommended"
			conf.Optimize = true
			conf.OptimizeBeforeWriting = true
			conf.OptimizeResourceDicts = true
			conf.OptimizeDuplicateContentStreams = true
			conf.WriteObjectStream = true
			conf.WriteXRefStream = true
		}

		readSeeker := bytes.NewReader(originalData)
		count, err := api.PageCount(ctx, readSeeker, conf)
		if err == nil {
			totalPages = count
		} else {
			totalPages = 1
		}
		_, _ = readSeeker.Seek(0, io.SeekStart)

		var outBuf bytes.Buffer
		if err := api.Optimize(ctx, readSeeker, &outBuf, conf, nil); err != nil {
			return nil, fmt.Errorf("failed to optimize/compress PDF: %w", err)
		}
		finalData = outBuf.Bytes()
	}

	finalSize := int64(len(finalData))

	// If compressed size turns out slightly larger, keep original to guarantee no inflation
	if finalSize > originalSize {
		finalData = originalData
		finalSize = originalSize
	}

	savedBytes := originalSize - finalSize
	if savedBytes < 0 {
		savedBytes = 0
	}

	var savedPercentage float64
	if originalSize > 0 {
		savedPercentage = (float64(savedBytes) / float64(originalSize)) * 100
	}

	// Determine output filename
	baseName := strings.TrimSuffix(fileHeader.Filename, filepath.Ext(fileHeader.Filename))
	outputName := opts.OutputFileName
	if strings.TrimSpace(outputName) == "" {
		outputName = fmt.Sprintf("%s_compressed.pdf", baseName)
	} else if !strings.HasSuffix(strings.ToLower(outputName), ".pdf") {
		outputName = fmt.Sprintf("%s.pdf", outputName)
	}

	encodedBase64 := base64.StdEncoding.EncodeToString(finalData)

	return &CompressPdfResult{
		FileName:         outputName,
		OriginalSize:     originalSize,
		CompressedSize:   finalSize,
		SavedBytes:       savedBytes,
		SavedPercentage:  savedPercentage,
		CompressionLevel: level,
		TotalPages:       totalPages,
		FileBase64:       encodedBase64,
	}, nil
}
