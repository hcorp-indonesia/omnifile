package pdftoword

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type ConvertWordOptions struct {
	Engine  string // "auto", "pdf.co", "local"
	OCR     bool   // enable OCR for scanned documents
	OCRLang string // language code, e.g. "eng", "ind"
}

type PdfToWordService struct {
	httpClient *http.Client
	scriptPath string
	pythonPath string
}

func NewPdfToWordService() *PdfToWordService {
	// Find python executable
	pyPath := "python"
	if p, err := exec.LookPath("python"); err == nil {
		pyPath = p
	} else if p, err := exec.LookPath("python3"); err == nil {
		pyPath = p
	} else if _, err := os.Stat(`C:\Python312\python.exe`); err == nil {
		pyPath = `C:\Python312\python.exe`
	}

	// Determine script path
	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}

	scriptCandidates := []string{
		filepath.Join("src", "modules", "pdf", "pdf-to-word", "scripts", "converter.py"),
		filepath.Join(baseDir, "src", "modules", "pdf", "pdf-to-word", "scripts", "converter.py"),
		filepath.Join(baseDir, "scripts", "converter.py"),
		filepath.Join("apps", "api", "src", "modules", "pdf", "pdf-to-word", "scripts", "converter.py"),
		`C:\laragon\www\magic-converter\apps\api\src\modules\pdf\pdf-to-word\scripts\converter.py`,
	}

	finalScriptPath := scriptCandidates[0]
	for _, sc := range scriptCandidates {
		if _, err := os.Stat(sc); err == nil {
			finalScriptPath = sc
			break
		}
	}

	return &PdfToWordService{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		scriptPath: finalScriptPath,
		pythonPath: pyPath,
	}
}

func spoolPDF(reader io.Reader) (string, error) {
	tempFile, err := os.CreateTemp("", "magic-pdf2word-*.pdf")
	if err != nil {
		return "", err
	}
	tempPath := tempFile.Name()
	if _, err := io.Copy(tempFile, reader); err != nil {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
		return "", err
	}
	if err := tempFile.Close(); err != nil {
		_ = os.Remove(tempPath)
		return "", err
	}
	return tempPath, nil
}

func (s *PdfToWordService) Convert(ctx context.Context, fileName string, fileSize int64, reader io.Reader, opts ConvertWordOptions) (*WordFileResult, error) {
	tempPdf, err := spoolPDF(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to spool uploaded PDF: %w", err)
	}
	defer os.Remove(tempPdf)

	baseName := strings.TrimSuffix(filepath.Base(fileName), filepath.Ext(fileName))
	outFileName := baseName + ".docx"

	apiKey := strings.TrimSpace(os.Getenv("PDFCO_API_KEY"))
	useRemote := opts.Engine == "pdf.co" || (opts.Engine != "local" && apiKey != "")

	if useRemote && apiKey != "" {
		res, err := s.convertWithPdfCo(ctx, apiKey, fileName, outFileName, fileSize, tempPdf, opts)
		if err == nil {
			return res, nil
		}
		log.Warn().Err(err).Str("file", fileName).Msg("PDF.co cloud conversion failed, falling back to local converter")
		if opts.Engine == "pdf.co" {
			return nil, fmt.Errorf("PDF.co conversion failed: %w", err)
		}
	}

	// Fallback or explicit local engine
	return s.convertWithLocalEngine(ctx, fileName, outFileName, tempPdf, opts)
}

type pdfCoPresignedResponse struct {
	Error        bool   `json:"error"`
	Message      string `json:"message"`
	PresignedURL string `json:"presignedUrl"`
	URL          string `json:"url"`
}

type pdfCoConvertResponse struct {
	Error     bool   `json:"error"`
	Message   string `json:"message"`
	URL       string `json:"url"`
	PageCount int    `json:"pageCount"`
}

func (s *PdfToWordService) convertWithPdfCo(ctx context.Context, apiKey, fileName, outFileName string, fileSize int64, pdfPath string, opts ConvertWordOptions) (*WordFileResult, error) {
	// 1. Get presigned upload URL
	endpoint := fmt.Sprintf("https://api.pdf.co/v1/file/upload/get-presigned-url?name=%s&contenttype=application/pdf", url.QueryEscape(fileName))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request presigned URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request presigned URL status %d", resp.StatusCode)
	}

	var presigned pdfCoPresignedResponse
	if err := json.NewDecoder(resp.Body).Decode(&presigned); err != nil {
		return nil, fmt.Errorf("decode presigned URL: %w", err)
	}
	if presigned.Error || presigned.PresignedURL == "" || presigned.URL == "" {
		return nil, fmt.Errorf("PDF.co error: %s", presigned.Message)
	}

	// 2. Upload PDF using file reader
	pdfFile, err := os.Open(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("open spooled PDF: %w", err)
	}
	defer pdfFile.Close()

	fi, _ := pdfFile.Stat()
	uploadLen := fi.Size()
	if uploadLen == 0 {
		uploadLen = fileSize
	}

	uploadReq, err := http.NewRequestWithContext(ctx, http.MethodPut, presigned.PresignedURL, pdfFile)
	if err != nil {
		return nil, err
	}
	uploadReq.Header.Set("Content-Type", "application/pdf")
	if uploadLen > 0 {
		uploadReq.ContentLength = uploadLen
	}

	uploadResp, err := s.httpClient.Do(uploadReq)
	if err != nil {
		return nil, fmt.Errorf("upload to PDF.co: %w", err)
	}
	defer uploadResp.Body.Close()

	if uploadResp.StatusCode < 200 || uploadResp.StatusCode >= 300 {
		return nil, fmt.Errorf("upload to PDF.co failed with status %d", uploadResp.StatusCode)
	}

	// 3. Request conversion to docx
	payloadMap := map[string]interface{}{
		"url":   presigned.URL,
		"name":  outFileName,
		"async": false,
	}
	if opts.OCR {
		payloadMap["ocr"] = true
		if opts.OCRLang != "" {
			payloadMap["ocrLanguage"] = opts.OCRLang
		}
	}

	payloadBytes, _ := json.Marshal(payloadMap)
	convertReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.pdf.co/v1/pdf/convert/to/doc", bytes.NewReader(payloadBytes))
	if err != nil {
		return nil, err
	}
	convertReq.Header.Set("x-api-key", apiKey)
	convertReq.Header.Set("Content-Type", "application/json")

	convertResp, err := s.httpClient.Do(convertReq)
	if err != nil {
		return nil, fmt.Errorf("request PDF to Word: %w", err)
	}
	defer convertResp.Body.Close()

	if convertResp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(convertResp.Body)
		return nil, fmt.Errorf("PDF to Word API returned status %d: %s", convertResp.StatusCode, string(b))
	}

	var converted pdfCoConvertResponse
	if err := json.NewDecoder(convertResp.Body).Decode(&converted); err != nil {
		return nil, fmt.Errorf("decode convert response: %w", err)
	}
	if converted.Error || converted.URL == "" {
		return nil, fmt.Errorf("PDF.co conversion error: %s", converted.Message)
	}

	// 4. Download converted .docx to get base64 and size
	docxReq, err := http.NewRequestWithContext(ctx, http.MethodGet, converted.URL, nil)
	if err != nil {
		return nil, fmt.Errorf("request docx download: %w", err)
	}
	docxResp, err := s.httpClient.Do(docxReq)
	if err != nil {
		return nil, fmt.Errorf("download docx: %w", err)
	}
	defer docxResp.Body.Close()

	docxBytes, err := io.ReadAll(docxResp.Body)
	if err != nil {
		return nil, fmt.Errorf("read docx body: %w", err)
	}

	// 5. Extract previews directly from the converted DOCX (highest fidelity)
	previews, wordCount, paraCount := s.extractPreviewsFromDocxBytes(ctx, docxBytes)
	if len(previews) == 0 {
		previews, wordCount, paraCount = s.extractPreviewsLocally(ctx, pdfPath)
	}
	totalPages := converted.PageCount
	if totalPages <= 0 && len(previews) > 0 {
		for _, p := range previews {
			if p.Page > totalPages {
				totalPages = p.Page
			}
		}
	}
	if totalPages <= 0 {
		totalPages = 1
	}

	return &WordFileResult{
		OriginalName:   fileName,
		FileName:       outFileName,
		TotalPages:     totalPages,
		WordCount:      wordCount,
		ParagraphCount: paraCount,
		FileSize:       int64(len(docxBytes)),
		DownloadURL:    converted.URL,
		Engine:         "pdf.co",
		FileBase64:     base64.StdEncoding.EncodeToString(docxBytes),
		Previews:       previews,
	}, nil
}

type pythonConverterResult struct {
	Success        bool                   `json:"success"`
	Error          string                 `json:"error,omitempty"`
	TotalPages     int                    `json:"total_pages"`
	WordCount      int                    `json:"word_count"`
	ParagraphCount int                    `json:"paragraph_count"`
	Previews       []WordParagraphPreview `json:"previews"`
}

func (s *PdfToWordService) convertWithLocalEngine(ctx context.Context, fileName, outFileName, pdfPath string, opts ConvertWordOptions) (*WordFileResult, error) {
	tempDocx, err := os.CreateTemp("", "magic-output-*.docx")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp docx: %w", err)
	}
	docxPath := tempDocx.Name()
	_ = tempDocx.Close()
	defer os.Remove(docxPath)

	args := []string{s.scriptPath, pdfPath, docxPath}
	if opts.OCR {
		args = append(args, "--ocr")
	}

	cmd := exec.CommandContext(ctx, s.pythonPath, args...)
	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	if err := cmd.Run(); err != nil {
		log.Error().Err(err).Str("stderr", stderrBuf.String()).Msg("Local python PDF to Word failed")
		return nil, fmt.Errorf("local converter error: %v (details: %s)", err, stderrBuf.String())
	}

	// Find JSON line in stdout
	stdoutStr := strings.TrimSpace(stdoutBuf.String())
	lines := strings.Split(stdoutStr, "\n")
	var jsonLine string
	for i := len(lines) - 1; i >= 0; i-- {
		l := strings.TrimSpace(lines[i])
		if strings.HasPrefix(l, "{") && strings.HasSuffix(l, "}") {
			jsonLine = l
			break
		}
	}

	if jsonLine == "" {
		return nil, fmt.Errorf("invalid response from local converter: %s", stdoutStr)
	}

	var pyRes pythonConverterResult
	if err := json.Unmarshal([]byte(jsonLine), &pyRes); err != nil {
		return nil, fmt.Errorf("failed to decode local converter output: %w", err)
	}
	if !pyRes.Success {
		return nil, fmt.Errorf("local converter returned error: %s", pyRes.Error)
	}

	docxBytes, err := os.ReadFile(docxPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read generated docx file: %w", err)
	}

	return &WordFileResult{
		OriginalName:   fileName,
		FileName:       outFileName,
		TotalPages:     pyRes.TotalPages,
		WordCount:      pyRes.WordCount,
		ParagraphCount: pyRes.ParagraphCount,
		FileSize:       int64(len(docxBytes)),
		Engine:         "local",
		FileBase64:     base64.StdEncoding.EncodeToString(docxBytes),
		Previews:       pyRes.Previews,
	}, nil
}

func (s *PdfToWordService) extractPreviewsLocally(ctx context.Context, pdfPath string) ([]WordParagraphPreview, int, int) {
	tempDocx, err := os.CreateTemp("", "magic-preview-*.docx")
	if err != nil {
		return nil, 0, 0
	}
	previewDocxPath := tempDocx.Name()
	_ = tempDocx.Close()
	defer os.Remove(previewDocxPath)

	cmd := exec.CommandContext(ctx, s.pythonPath, s.scriptPath, pdfPath, previewDocxPath)
	var stdoutBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf

	if err := cmd.Run(); err != nil {
		return nil, 0, 0
	}

	lines := strings.Split(strings.TrimSpace(stdoutBuf.String()), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		l := strings.TrimSpace(lines[i])
		if strings.HasPrefix(l, "{") && strings.HasSuffix(l, "}") {
			var pyRes pythonConverterResult
			if err := json.Unmarshal([]byte(l), &pyRes); err == nil && pyRes.Success {
				return pyRes.Previews, pyRes.WordCount, pyRes.ParagraphCount
			}
		}
	}
	return nil, 0, 0
}

func (s *PdfToWordService) extractPreviewsFromDocxBytes(ctx context.Context, docxBytes []byte) ([]WordParagraphPreview, int, int) {
	tempDocx, err := os.CreateTemp("", "magic-parse-*.docx")
	if err != nil {
		return nil, 0, 0
	}
	defer os.Remove(tempDocx.Name())
	if _, err := tempDocx.Write(docxBytes); err != nil {
		_ = tempDocx.Close()
		return nil, 0, 0
	}
	_ = tempDocx.Close()

	cmd := exec.CommandContext(ctx, s.pythonPath, s.scriptPath, "--parse-docx", tempDocx.Name())
	var stdoutBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf

	if err := cmd.Run(); err != nil {
		return nil, 0, 0
	}

	lines := strings.Split(strings.TrimSpace(stdoutBuf.String()), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		l := strings.TrimSpace(lines[i])
		if strings.HasPrefix(l, "{") && strings.HasSuffix(l, "}") {
			var pyRes pythonConverterResult
			if err := json.Unmarshal([]byte(l), &pyRes); err == nil && pyRes.Success {
				return pyRes.Previews, pyRes.WordCount, pyRes.ParagraphCount
			}
		}
	}
	return nil, 0, 0
}
