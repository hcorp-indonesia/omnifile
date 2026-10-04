package ocrpdf

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

type OcrPdfService struct {
	pythonPath string
	scriptPath string
}

func NewOcrPdfService() *OcrPdfService {
	// Find python executable
	pyPath := "python"
	if p, err := exec.LookPath("python"); err == nil {
		pyPath = p
	} else if p, err := exec.LookPath("python3"); err == nil {
		pyPath = p
	} else if _, err := os.Stat(`C:\Python312\python.exe`); err == nil {
		pyPath = `C:\Python312\python.exe`
	}

	// Locate ocr_processor.py
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

	scriptCandidates := []string{
		filepath.Join("src", "modules", "pdf", "ocr-pdf", "scripts", "ocr_processor.py"),
		filepath.Join(baseDir, "src", "modules", "pdf", "ocr-pdf", "scripts", "ocr_processor.py"),
		filepath.Join(baseDir, "scripts", "ocr_processor.py"),
		filepath.Join("apps", "api", "src", "modules", "pdf", "ocr-pdf", "scripts", "ocr_processor.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\pdf\ocr-pdf\scripts\ocr_processor.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	return &OcrPdfService{
		pythonPath: pyPath,
		scriptPath: finalScriptPath,
	}
}

type pyOcrOutput struct {
	Success     bool   `json:"success"`
	TotalPages  int    `json:"total_pages"`
	OutputPdf   string `json:"output_pdf"`
	TextContent string `json:"text_content"`
	WordsCount  int    `json:"words_count"`
	Error       string `json:"error,omitempty"`
}

func (s *OcrPdfService) OcrPdf(
	ctx context.Context,
	fileHeader *multipart.FileHeader,
	opts OcrPdfOptions,
) (*OcrPdfResult, error) {
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

	lang := strings.TrimSpace(opts.Language)
	if lang == "" {
		lang = "eng+ind"
	}

	tempIn, err := os.CreateTemp("", "mc-ocr-in-*.pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp in file: %w", err)
	}
	tempInPath := tempIn.Name()
	defer func() {
		_ = os.Remove(tempInPath)
	}()

	if _, err := tempIn.Write(originalData); err != nil {
		_ = tempIn.Close()
		return nil, fmt.Errorf("failed to write original file: %w", err)
	}
	_ = tempIn.Close()

	tempOutDir, err := os.MkdirTemp("", "mc-ocr-out-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp out dir: %w", err)
	}
	defer func() {
		_ = os.RemoveAll(tempOutDir)
	}()

	cmdCtx, cancel := context.WithTimeout(ctx, 300*time.Second) // OCR can take longer on multi-page docs
	defer cancel()

	cmd := exec.CommandContext(
		cmdCtx,
		s.pythonPath,
		s.scriptPath,
		"--input", tempInPath,
		"--output-dir", tempOutDir,
		"--lang", lang,
	)

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	if err := cmd.Run(); err != nil {
		log.Error().Err(err).Str("stderr", stderrBuf.String()).Msg("OCR processing failed")
		return nil, fmt.Errorf("OCR processing failed: %w, details: %s", err, stderrBuf.String())
	}

	var pyRes pyOcrOutput
	if err := json.Unmarshal(stdoutBuf.Bytes(), &pyRes); err != nil {
		return nil, fmt.Errorf("failed to parse OCR processor response: %w, stdout: %s", err, stdoutBuf.String())
	}

	if !pyRes.Success || pyRes.OutputPdf == "" {
		return nil, fmt.Errorf("OCR failed: %s", pyRes.Error)
	}

	searchablePdfBytes, err := os.ReadFile(pyRes.OutputPdf)
	if err != nil {
		return nil, fmt.Errorf("failed to read generated searchable PDF: %w", err)
	}

	processedSize := int64(len(searchablePdfBytes))

	baseName := strings.TrimSuffix(fileHeader.Filename, filepath.Ext(fileHeader.Filename))
	outputName := opts.OutputFileName
	if strings.TrimSpace(outputName) == "" {
		outputName = fmt.Sprintf("%s_ocr.pdf", baseName)
	} else if !strings.HasSuffix(strings.ToLower(outputName), ".pdf") {
		outputName = fmt.Sprintf("%s.pdf", outputName)
	}

	encodedBase64 := base64.StdEncoding.EncodeToString(searchablePdfBytes)

	return &OcrPdfResult{
		FileName:      outputName,
		OriginalSize:  originalSize,
		ProcessedSize: processedSize,
		TotalPages:    pyRes.TotalPages,
		Language:      lang,
		ExtractedText: pyRes.TextContent,
		WordsCount:    pyRes.WordsCount,
		FileBase64:    encodedBase64,
	}, nil
}
