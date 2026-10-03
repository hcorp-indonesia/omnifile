package pdftoexcel

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/png"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/references"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/responses"
	"github.com/rs/zerolog/log"
	"github.com/xuri/excelize/v2"
)

type PdfToExcelService struct {
	pool       pdfium.Pool
	httpClient *http.Client
}

func NewPdfToExcelService(pool pdfium.Pool) *PdfToExcelService {
	return &PdfToExcelService{
		pool: pool,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

type rectWithPos struct {
	text   string
	left   float64
	top    float64
	right  float64
	bottom float64
}

type positionedCell struct {
	text  string
	left  float64
	right float64
}

type PdfTemplate struct {
	Name    string           `json:"name"`
	Columns []TemplateColumn `json:"columns"`
}

type TemplateColumn struct {
	Header  string   `json:"header"`
	Aliases []string `json:"aliases"`
}

var multiSpaceRegex = regexp.MustCompile(`\s{2,}`)

type pdfCoPresignedResponse struct {
	Error        bool   `json:"error"`
	Status       int    `json:"status"`
	Message      string `json:"message"`
	PresignedURL string `json:"presignedUrl"`
	URL          string `json:"url"`
}

type pdfCoConvertResponse struct {
	Error            bool   `json:"error"`
	Status           int    `json:"status"`
	Message          string `json:"message"`
	URL              string `json:"url"`
	PageCount        int    `json:"pageCount"`
	Name             string `json:"name"`
	RemainingCredits int    `json:"remainingCredits"`
}

func (s *PdfToExcelService) Convert(ctx context.Context, fileName string, fileSize int64, reader io.Reader, template *PdfTemplate) (*ExcelFileResult, error) {
	tempPath, err := spoolPDF(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to spool PDF: %w", err)
	}
	defer os.Remove(tempPath)

	apiKey := strings.TrimSpace(os.Getenv("PDFCO_API_KEY"))
	if apiKey != "" {
		pdfReader, err := os.Open(tempPath)
		if err == nil {
			remoteResult, remoteErr := s.convertWithPdfCo(ctx, apiKey, fileName, fileSize, tempPath, pdfReader, template)
			_ = pdfReader.Close()
			if remoteErr == nil {
				return remoteResult, nil
			}
			log.Warn().Err(remoteErr).Msg("PDF.co conversion failed, trying local PDF-to-Excel engine")
		}
	}

	pdfReader, err := os.Open(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to reopen spooled PDF for local conversion: %w", err)
	}
	localResult, localErr := s.convertWithLocalEngine(ctx, fileName, pdfReader)
	_ = pdfReader.Close()
	if localErr == nil {
		return localResult, nil
	}

	return nil, localErr
}

func (s *PdfToExcelService) convertWithPdfCo(ctx context.Context, apiKey, fileName string, fileSize int64, pdfPath string, reader io.Reader, template *PdfTemplate) (*ExcelFileResult, error) {
	baseName := strings.TrimSuffix(filepath.Base(fileName), filepath.Ext(fileName))
	outFileName := baseName + ".xlsx"

	// 1. Get presigned upload URL from PDF.co
	endpoint := fmt.Sprintf("https://api.pdf.co/v1/file/upload/get-presigned-url?name=%s&contenttype=application/pdf", url.QueryEscape(fileName))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create presigned URL request: %w", err)
	}
	req.Header.Set("x-api-key", apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to request presigned URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("pdf.co presigned URL failed (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var presignedData pdfCoPresignedResponse
	if err := json.NewDecoder(resp.Body).Decode(&presignedData); err != nil {
		return nil, fmt.Errorf("failed to decode presigned URL response: %w", err)
	}

	if presignedData.Error || presignedData.PresignedURL == "" {
		return nil, fmt.Errorf("pdf.co returned error: %s", presignedData.Message)
	}

	// 2. Upload file stream to S3 presigned URL
	uploadReq, err := http.NewRequestWithContext(ctx, http.MethodPut, presignedData.PresignedURL, reader)
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 upload request: %w", err)
	}
	uploadReq.Header.Set("Content-Type", "application/pdf")
	if fileSize > 0 {
		uploadReq.ContentLength = fileSize
	}

	uploadResp, err := s.httpClient.Do(uploadReq)
	if err != nil {
		return nil, fmt.Errorf("failed to upload PDF to presigned URL: %w", err)
	}
	defer uploadResp.Body.Close()

	if uploadResp.StatusCode < 200 || uploadResp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(uploadResp.Body)
		return nil, fmt.Errorf("s3 upload failed with status %d: %s", uploadResp.StatusCode, string(bodyBytes))
	}

	// 3. Convert uploaded PDF to Excel via PDF.co API
	convertPayload := map[string]interface{}{
		"url":      presignedData.URL,
		"name":     outFileName,
		"async":    false,
		"profiles": "{ \"ColumnDetectionMode\": \"ContentGroupsAndBorders\" }",
	}
	payloadBytes, err := json.Marshal(convertPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal convert payload: %w", err)
	}

	convertReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.pdf.co/v1/pdf/convert/to/xlsx", bytes.NewReader(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create convert request: %w", err)
	}
	convertReq.Header.Set("x-api-key", apiKey)
	convertReq.Header.Set("Content-Type", "application/json")

	convertResp, err := s.httpClient.Do(convertReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute PDF.co convert request: %w", err)
	}
	defer convertResp.Body.Close()

	if convertResp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(convertResp.Body)
		return nil, fmt.Errorf("pdf.co convert returned error status (%d): %s", convertResp.StatusCode, string(bodyBytes))
	}

	var convertResult pdfCoConvertResponse
	if err := json.NewDecoder(convertResp.Body).Decode(&convertResult); err != nil {
		return nil, fmt.Errorf("failed to decode convert response: %w", err)
	}

	if convertResult.Error || convertResult.URL == "" {
		return nil, fmt.Errorf("pdf.co conversion failed: %s", convertResult.Message)
	}

	// 4. Download converted XLSX file for client base64 and interactive preview
	xlsxReq, err := http.NewRequestWithContext(ctx, http.MethodGet, convertResult.URL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create xlsx download request: %w", err)
	}

	xlsxResp, err := s.httpClient.Do(xlsxReq)
	if err != nil {
		return nil, fmt.Errorf("failed to download converted xlsx: %w", err)
	}
	defer xlsxResp.Body.Close()

	xlsxBytes, err := io.ReadAll(xlsxResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read xlsx response body: %w", err)
	}

	xlsxBytes, err = normalizePdfCoWorkbook(xlsxBytes, template)
	if err != nil {
		return nil, fmt.Errorf("failed to normalize PDF.co table rows: %w", err)
	}

	xlsxBytes, err = s.overlayRenderedPages(pdfPath, xlsxBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to preserve PDF layout in xlsx: %w", err)
	}

	// 5. Parse sheets with excelize for frontend preview
	xlsxBytes, err = formatWorkbook(xlsxBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to format converted xlsx: %w", err)
	}
	sheets, totalRows := s.extractPreviewsFromXlsx(xlsxBytes)

	totalPages := convertResult.PageCount
	if totalPages <= 0 {
		totalPages = len(sheets)
	}

	return &ExcelFileResult{
		OriginalName: fileName,
		FileName:     outFileName,
		TotalPages:   totalPages,
		TotalSheets:  len(sheets),
		TotalRows:    totalRows,
		FileSize:     int64(len(xlsxBytes)),
		DownloadUrl:  convertResult.URL,
		Engine:       "pdf.co",
		FileBase64:   base64.StdEncoding.EncodeToString(xlsxBytes),
		Sheets:       sheets,
	}, nil
}

func normalizePdfCoWorkbook(xlsxBytes []byte, template *PdfTemplate) ([]byte, error) {
	workbook, err := excelize.OpenReader(bytes.NewReader(xlsxBytes))
	if err != nil {
		return nil, err
	}
	defer workbook.Close()

	for _, sheetName := range workbook.GetSheetList() {
		rows, err := workbook.GetRows(sheetName)
		if err != nil || len(rows) == 0 {
			continue
		}
		if template != nil {
			templateRows := normalizeTemplateRows(rows, template)
			if len(templateRows) > 0 {
				if err := replaceWorkbookRows(workbook, sheetName, templateRows); err != nil {
					return nil, err
				}
				continue
			}
		}
		if tableRows, ok := normalizeFunnelRows(rows); ok {
			if err := replaceWorkbookRows(workbook, sheetName, tableRows); err != nil {
				return nil, err
			}
			continue
		}
		if tableRows, ok := normalizeColoredTableRows(workbook, sheetName, rows); ok {
			if err := replaceWorkbookRows(workbook, sheetName, tableRows); err != nil {
				return nil, err
			}
			continue
		}
		if ktpRows, ok := normalizeKTPRows(rows); ok {
			if err := replaceWorkbookRows(workbook, sheetName, ktpRows); err != nil {
				return nil, err
			}
			continue
		}
		if tableRows, ok := normalizeGenericTableRows(rows); ok {
			if err := replaceWorkbookRows(workbook, sheetName, tableRows); err != nil {
				return nil, err
			}
		}

		headerIndex := -1
		for index, row := range rows {
			if isVisitReportHeader(row) {
				headerIndex = index
				break
			}
		}
		if headerIndex < 0 {
			continue
		}

		header := append([]string(nil), rows[headerIndex]...)
		headerEnd := headerIndex
		if headerIndex > 0 && containsCellFragment(rows[headerIndex-1], "Dokumentas") {
			mergeTableRow(header, rows[headerIndex-1])
		}
		for headerEnd+1 < len(rows) && nonEmptyCellCount(rows[headerEnd+1]) <= 1 && containsCellFragment(rows[headerEnd+1], "i") {
			mergeTableRow(header, rows[headerEnd+1])
			headerEnd++
		}

		firstDataIndex := -1
		for index := headerEnd + 1; index < len(rows); index++ {
			if isNumberCell(rows[index], 0) {
				firstDataIndex = index
				break
			}
		}
		if firstDataIndex < 0 {
			continue
		}
		numericRecordCount := 0
		for index := firstDataIndex; index < len(rows); index++ {
			if isNumberCell(rows[index], 0) {
				numericRecordCount++
			}
		}
		if numericRecordCount < 2 {
			continue
		}

		records := make([][]string, 0)
		leading := make([]string, 0)
		for index := headerEnd + 1; index < firstDataIndex; index++ {
			leading = mergeRows(leading, rows[index])
		}

		for index := firstDataIndex; index < len(rows); {
			if !isNumberCell(rows[index], 0) {
				index++
				continue
			}

			record := append([]string(nil), rows[index]...)
			if len(records) == 0 && len(leading) > 0 {
				record = mergeRows(leading, record)
			}
			index++
			for index < len(rows) && !isNumberCell(rows[index], 0) {
				record = mergeRows(record, rows[index])
				index++
			}
			records = append(records, record)
		}

		if len(records) == 0 {
			continue
		}

		normalizedRows := make([][]string, 0, len(records)+1)
		normalizedRows = append(normalizedRows, header)
		normalizedRows = append(normalizedRows, records...)

		if err := replaceWorkbookRows(workbook, sheetName, normalizedRows); err != nil {
			return nil, err
		}
	}

	var normalized bytes.Buffer
	if err := workbook.Write(&normalized); err != nil {
		return nil, err
	}
	return normalized.Bytes(), nil
}

func normalizeFunnelRows(rows [][]string) ([][]string, bool) {
	titleIndex := -1
	for index, row := range rows {
		if containsCellFragment(row, "LAPORAN FUNNEL SALES") {
			titleIndex = index
			break
		}
	}
	if titleIndex < 0 {
		return nil, false
	}

	headerStart := titleIndex + 1
	for index := titleIndex + 1; index < len(rows); index++ {
		if containsCellFragment(rows[index], "Periode") {
			headerStart = index + 1
			break
		}
	}
	headerEnd := -1
	for index := headerStart; index < len(rows); index++ {
		if containsCellFragment(rows[index], "(A,B,C") || containsCellFragment(rows[index], "D)") {
			headerEnd = index
		}
	}
	if headerEnd < headerStart || headerEnd+1 >= len(rows) {
		return nil, false
	}

	header := make([]string, 0)
	for _, row := range rows[headerStart : headerEnd+1] {
		header = mergeRows(header, row)
	}
	if nonEmptyCellCount(header) < 5 {
		return nil, false
	}

	leadingRows := make([]string, 0)
	records := make([][]string, 0)
	var currentRecord []string
	for _, row := range rows[headerEnd+1:] {
		if nonEmptyCellCount(row) == 0 {
			continue
		}
		if len(row) > 0 && strings.TrimSpace(row[0]) != "" {
			if len(currentRecord) > 0 {
				records = append(records, currentRecord)
			}
			currentRecord = append([]string(nil), row...)
			if len(records) == 0 && len(leadingRows) > 0 {
				currentRecord = mergeRows(leadingRows, currentRecord)
			}
		} else if len(currentRecord) > 0 {
			currentRecord = mergeRows(currentRecord, row)
		} else {
			leadingRows = mergeRows(leadingRows, row)
		}
	}
	if len(currentRecord) > 0 {
		records = append(records, currentRecord)
	}
	if len(records) == 0 {
		return nil, false
	}
	return append([][]string{header}, records...), true
}

func normalizeColoredTableRows(workbook *excelize.File, sheetName string, rows [][]string) ([][]string, bool) {
	headerIndex := -1
	bestColoredCells := 0
	bestNonEmptyCells := 0
	for rowIndex := 0; rowIndex+1 < len(rows); rowIndex++ {
		coloredCells := 0
		nonEmptyCells := 0
		for columnIndex, value := range rows[rowIndex] {
			if strings.TrimSpace(value) == "" {
				continue
			}
			nonEmptyCells++
			cell, err := excelize.CoordinatesToCellName(columnIndex+1, rowIndex+1)
			if err != nil {
				continue
			}
			styleIndex, err := workbook.GetCellStyle(sheetName, cell)
			if err != nil || styleIndex == 0 {
				continue
			}
			style, err := workbook.GetStyle(styleIndex)
			if err == nil && style.Fill.Pattern != 0 && len(style.Fill.Color) > 0 {
				coloredCells++
			}
		}
		if coloredCells < 3 || nonEmptyCells < 3 {
			continue
		}
		if coloredCells > bestColoredCells || (coloredCells == bestColoredCells && nonEmptyCells > bestNonEmptyCells) {
			headerIndex = rowIndex
			bestColoredCells = coloredCells
			bestNonEmptyCells = nonEmptyCells
		}
	}
	if headerIndex < 0 {
		return nil, false
	}

	header := append([]string(nil), rows[headerIndex]...)
	records := make([][]string, 0)
	var currentRecord []string
	leadingRows := make([]string, 0)
	for _, row := range rows[headerIndex+1:] {
		if nonEmptyCellCount(row) == 0 {
			continue
		}
		if isNumberCell(row, 0) {
			if len(currentRecord) > 0 {
				records = append(records, currentRecord)
			}
			currentRecord = append([]string(nil), row...)
			if len(records) == 0 && len(leadingRows) > 0 {
				currentRecord = mergeRows(leadingRows, currentRecord)
			}
			continue
		}
		if len(currentRecord) > 0 {
			currentRecord = mergeRows(currentRecord, row)
		} else {
			leadingRows = mergeRows(leadingRows, row)
		}
	}
	if len(currentRecord) > 0 {
		records = append(records, currentRecord)
	}
	if len(records) == 0 {
		return nil, false
	}
	return append([][]string{header}, records...), true
}

func firstNonEmptyCell(row []string) string {
	for _, value := range row {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func normalizeGenericTableRows(rows [][]string) ([][]string, bool) {
	headerIndex := -1
	dataStartIndex := -1
	for index := 0; index < len(rows); index++ {
		if nonEmptyCellCount(rows[index]) < 3 || headerKeywordCount(rows[index]) < 2 {
			continue
		}
		for nextIndex := index + 1; nextIndex < len(rows) && nextIndex <= index+6; nextIndex++ {
			if isNumberCell(rows[nextIndex], 0) {
				headerIndex = index
				dataStartIndex = nextIndex
				break
			}
		}
		if headerIndex >= 0 {
			break
		}
	}
	if headerIndex < 0 || dataStartIndex < 0 {
		return nil, false
	}

	header := append([]string(nil), rows[headerIndex]...)
	records := make([][]string, 0)
	leadingRows := make([]string, 0)
	for _, row := range rows[headerIndex+1 : dataStartIndex] {
		if nonEmptyCellCount(row) > 0 {
			leadingRows = mergeRows(leadingRows, row)
		}
	}
	var currentRecord []string
	for _, row := range rows[dataStartIndex:] {
		if isNumberCell(row, 0) {
			if len(currentRecord) > 0 {
				records = append(records, currentRecord)
			}
			currentRecord = append([]string(nil), row...)
			if len(records) == 0 && len(leadingRows) > 0 {
				currentRecord = mergeRows(leadingRows, currentRecord)
			}
		} else if len(currentRecord) > 0 && nonEmptyCellCount(row) > 0 {
			currentRecord = mergeRows(currentRecord, row)
		}
	}
	if len(currentRecord) > 0 {
		records = append(records, currentRecord)
	}
	if len(records) == 0 {
		return nil, false
	}
	return append([][]string{header}, records...), true
}

func headerKeywordCount(row []string) int {
	keywords := []string{"no", "id", "tanggal", "date", "jam", "time", "nama", "name", "alamat", "address", "status", "type", "tipe", "sales", "total", "amount", "description", "keterangan", "modality"}
	count := 0
	for _, cell := range row {
		value := strings.ToLower(strings.TrimSpace(cell))
		for _, keyword := range keywords {
			if value == keyword || strings.Contains(value, keyword) {
				count++
				break
			}
		}
	}
	return count
}

func normalizeKTPRows(rows [][]string) ([][]string, bool) {
	hasNIK := false
	hasName := false
	for _, row := range rows {
		if containsCellFragment(row, "NIK") {
			hasNIK = true
		}
		if containsCellFragment(row, "Nama") {
			hasName = true
		}
	}
	if !hasNIK || !hasName {
		return nil, false
	}

	fields := []struct {
		header  string
		aliases []string
	}{
		{"NIK", []string{"NIK"}},
		{"Nama", []string{"Nama"}},
		{"Tempat/Tgl Lahir", []string{"Tempat/Tgl Lahir", "Tempat/Tgl. Lahir"}},
		{"Jenis Kelamin", []string{"Jenis Kelamin"}},
		{"Alamat", []string{"Alamat"}},
		{"RT/RW", []string{"RT/RW"}},
		{"Kel/Desa", []string{"Kel/Desa", "Kelurahan/Desa"}},
		{"Kecamatan", []string{"Kecamatan"}},
		{"Agama", []string{"Agama"}},
		{"Status Perkawinan", []string{"Status Perkawinan"}},
		{"Pekerjaan", []string{"Pekerjaan"}},
		{"Kewarganegaraan", []string{"Kewarganegaraan"}},
		{"Berlaku Hingga", []string{"Berlaku Hingga"}},
	}

	headers := make([]string, 0, len(fields))
	values := make([]string, 0, len(fields))
	for _, field := range fields {
		headers = append(headers, field.header)
		values = append(values, findKTPValue(rows, field.aliases))
	}
	return [][]string{headers, values}, true
}

func normalizeTemplateRows(rows [][]string, template *PdfTemplate) [][]string {
	if template == nil || len(template.Columns) == 0 {
		return nil
	}

	headers := make([]string, 0, len(template.Columns))
	values := make([]string, 0, len(template.Columns))
	foundValues := 0
	for _, column := range template.Columns {
		header := strings.TrimSpace(column.Header)
		if header == "" {
			continue
		}
		aliases := column.Aliases
		if len(aliases) == 0 {
			aliases = []string{header}
		}
		value := findKTPValue(rows, aliases)
		if value != "" {
			foundValues++
		}
		headers = append(headers, header)
		values = append(values, value)
	}
	if len(headers) == 0 || foundValues == 0 {
		return nil
	}
	return [][]string{headers, values}
}

func findKTPValue(rows [][]string, aliases []string) string {
	for rowIndex, row := range rows {
		for cellIndex, cell := range row {
			cleanCell := strings.TrimSpace(cell)
			matched := false
			for _, alias := range aliases {
				if strings.EqualFold(cleanCell, alias) || strings.HasPrefix(strings.ToLower(cleanCell), strings.ToLower(alias)+":") {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
			if separator := strings.Index(cleanCell, ":"); separator >= 0 {
				if value := strings.TrimSpace(cleanCell[separator+1:]); value != "" {
					return value
				}
			}
			for _, candidate := range row[cellIndex+1:] {
				if value := strings.TrimSpace(candidate); value != "" {
					return value
				}
			}
			if rowIndex+1 < len(rows) {
				for _, candidate := range rows[rowIndex+1] {
					if value := strings.TrimSpace(candidate); value != "" {
						return value
					}
				}
			}
		}
	}
	return ""
}

func replaceWorkbookRows(workbook *excelize.File, sheetName string, rows [][]string) error {
	existingRows, err := workbook.GetRows(sheetName)
	if err != nil {
		return err
	}
	for index := len(existingRows); index >= 1; index-- {
		if err := workbook.RemoveRow(sheetName, index); err != nil {
			return err
		}
	}
	for index, row := range rows {
		cell, err := excelize.CoordinatesToCellName(1, index+1)
		if err != nil {
			return err
		}
		if err := workbook.SetSheetRow(sheetName, cell, &row); err != nil {
			return err
		}
	}
	return nil
}

func containsCell(row []string, value string) bool {
	for _, cell := range row {
		if strings.EqualFold(strings.TrimSpace(cell), value) {
			return true
		}
	}
	return false
}

func isVisitReportHeader(row []string) bool {
	required := []string{"No", "Tanggal", "Jam", "Modality", "Nama Sales", "Subjek"}
	for _, value := range required {
		if !containsCell(row, value) {
			return false
		}
	}
	return true
}

func containsCellFragment(row []string, value string) bool {
	for _, cell := range row {
		if strings.Contains(strings.ToLower(strings.TrimSpace(cell)), strings.ToLower(value)) {
			return true
		}
	}
	return false
}

func nonEmptyCellCount(row []string) int {
	count := 0
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			count++
		}
	}
	return count
}

func isNumberCell(row []string, index int) bool {
	if index >= len(row) {
		return false
	}
	value := strings.TrimSpace(row[index])
	if _, err := strconv.Atoi(value); err == nil {
		return true
	}
	return regexp.MustCompile(`^\d+\b`).MatchString(value)
}

func mergeRows(left, right []string) []string {
	merged := append([]string(nil), left...)
	if len(merged) < len(right) {
		merged = append(merged, make([]string, len(right)-len(merged))...)
	}
	mergeTableRow(merged, right)
	return merged
}

func mergeTableRow(target, source []string) {
	for index, value := range source {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if index >= len(target) {
			continue
		}
		if strings.TrimSpace(target[index]) == "" {
			target[index] = value
		} else if strings.EqualFold(strings.TrimSpace(target[index]), "Dokumentas") && strings.EqualFold(value, "i") {
			target[index] = strings.TrimSpace(target[index]) + value
		} else if !strings.Contains(target[index], value) {
			target[index] = strings.TrimSpace(target[index] + " " + value)
		}
	}
	if len(target) > 0 && regexp.MustCompile(`^\d+\b`).MatchString(target[0]) {
		target[0] = strings.TrimSpace(strings.Fields(target[0])[0])
	}
}

func (s *PdfToExcelService) extractPreviewsFromXlsx(xlsxBytes []byte) ([]SheetPreview, int) {
	excelFile, err := excelize.OpenReader(bytes.NewReader(xlsxBytes))
	if err != nil {
		return nil, 0
	}
	defer excelFile.Close()

	sheetNames := excelFile.GetSheetList()
	previews := make([]SheetPreview, 0, len(sheetNames))
	totalRows := 0

	for idx, name := range sheetNames {
		rows, err := excelFile.GetRows(name)
		if err != nil {
			continue
		}

		maxCols := 0
		for _, r := range rows {
			if len(r) > maxCols {
				maxCols = len(r)
			}
		}

		previewCount := len(rows)
		if previewCount > 50 {
			previewCount = 50
		}
		previewRows := make([][]string, previewCount)
		copy(previewRows, rows[:previewCount])

		previews = append(previews, SheetPreview{
			SheetName:   name,
			PageNumber:  idx + 1,
			RowCount:    len(rows),
			ColumnCount: maxCols,
			Rows:        previewRows,
		})

		totalRows += len(rows)
	}

	return previews, totalRows
}

func (s *PdfToExcelService) convertWithLocalEngine(ctx context.Context, fileName string, reader io.Reader) (*ExcelFileResult, error) {
	pdfBytes, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF content: %w", err)
	}

	instance, err := s.pool.GetInstance(time.Second * 60)
	if err != nil {
		return nil, fmt.Errorf("failed to get PDFium instance: %w", err)
	}
	defer instance.Close()

	doc, err := instance.OpenDocument(&requests.OpenDocument{
		File: &pdfBytes,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF document: %w", err)
	}
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{
		Document: doc.Document,
	})

	pageCountResp, err := instance.FPDF_GetPageCount(&requests.FPDF_GetPageCount{
		Document: doc.Document,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get page count: %w", err)
	}

	totalPages := pageCountResp.PageCount
	xlsxFile := excelize.NewFile()
	defer xlsxFile.Close()

	headerStyle, _ := xlsxFile.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   11,
			Color:  "0F172A",
			Family: "Segoe UI",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#F1F5F9"},
			Pattern: 1,
		},
		Border: []excelize.Border{
			{Type: "bottom", Color: "94A3B8", Style: 1},
		},
		Alignment: &excelize.Alignment{
			Vertical: "center",
		},
	})

	sheets := make([]SheetPreview, 0, totalPages)
	totalExtractedRows := 0

	for pageIdx := 0; pageIdx < totalPages; pageIdx++ {
		sheetName := fmt.Sprintf("Page %d", pageIdx+1)
		if pageIdx == 0 {
			_ = xlsxFile.SetSheetName("Sheet1", sheetName)
		} else {
			_, err = xlsxFile.NewSheet(sheetName)
			if err != nil {
				log.Warn().Err(err).Str("sheet", sheetName).Msg("Failed to create new Excel worksheet")
				continue
			}
		}

		rows := s.extractRowsFromPage(ctx, instance, doc.Document, pageIdx)
		if len(rows) == 0 {
			rows = [][]string{{"(No selectable text or table data found on this page)"}}
		}

		maxCols := 0
		colMaxWidths := make(map[int]int)

		for rIdx, row := range rows {
			if len(row) > maxCols {
				maxCols = len(row)
			}

			rowInterfaces := make([]interface{}, len(row))
			for cIdx, cellVal := range row {
				rowInterfaces[cIdx] = cellVal
				cellLen := len(cellVal)
				if cellLen > colMaxWidths[cIdx] {
					colMaxWidths[cIdx] = cellLen
				}
			}

			cellRef, err := excelize.CoordinatesToCellName(1, rIdx+1)
			if err == nil {
				_ = xlsxFile.SetSheetRow(sheetName, cellRef, &rowInterfaces)
			}
		}

		if len(rows) > 1 && headerStyle != 0 {
			_ = xlsxFile.SetRowStyle(sheetName, 1, 1, headerStyle)
		}

		for cIdx := 0; cIdx < maxCols; cIdx++ {
			colName, err := excelize.ColumnNumberToName(cIdx + 1)
			if err == nil {
				w := float64(colMaxWidths[cIdx]) + 4
				if w < 12 {
					w = 12
				} else if w > 50 {
					w = 50
				}
				_ = xlsxFile.SetColWidth(sheetName, colName, colName, w)
			}
		}

		previewRowCount := len(rows)
		if previewRowCount > 50 {
			previewRowCount = 50
		}
		previewRows := make([][]string, previewRowCount)
		copy(previewRows, rows[:previewRowCount])

		sheets = append(sheets, SheetPreview{
			SheetName:   sheetName,
			PageNumber:  pageIdx + 1,
			RowCount:    len(rows),
			ColumnCount: maxCols,
			Rows:        previewRows,
		})

		totalExtractedRows += len(rows)
	}

	buf, err := xlsxFile.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("failed to generate Excel buffer: %w", err)
	}
	visualBytes, err := s.overlayRenderedPagesFromBytes(pdfBytes, buf.Bytes())
	if err != nil {
		return nil, fmt.Errorf("failed to preserve PDF layout in xlsx: %w", err)
	}
	formattedBytes, err := formatWorkbook(visualBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to format generated xlsx: %w", err)
	}

	baseName := strings.TrimSuffix(filepath.Base(fileName), filepath.Ext(fileName))
	outFileName := baseName + ".xlsx"

	return &ExcelFileResult{
		OriginalName: fileName,
		FileName:     outFileName,
		TotalPages:   totalPages,
		TotalSheets:  len(sheets),
		TotalRows:    totalExtractedRows,
		FileSize:     int64(len(formattedBytes)),
		Engine:       "local",
		FileBase64:   base64.StdEncoding.EncodeToString(formattedBytes),
		Sheets:       sheets,
	}, nil
}

func spoolPDF(reader io.Reader) (string, error) {
	tempFile, err := os.CreateTemp("", "magic-converter-pdf-*.pdf")
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

func (s *PdfToExcelService) overlayRenderedPages(pdfPath string, xlsxBytes []byte) ([]byte, error) {
	pdfBytes, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, err
	}
	return s.overlayRenderedPagesFromBytes(pdfBytes, xlsxBytes)
}

func (s *PdfToExcelService) overlayRenderedPagesFromBytes(pdfBytes, xlsxBytes []byte) ([]byte, error) {
	workbook, err := excelize.OpenReader(bytes.NewReader(xlsxBytes))
	if err != nil {
		return nil, err
	}
	defer workbook.Close()

	instance, err := s.pool.GetInstance(time.Second * 60)
	if err != nil {
		return nil, err
	}
	defer instance.Close()

	doc, err := instance.OpenDocument(&requests.OpenDocument{File: &pdfBytes})
	if err != nil {
		return nil, err
	}
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{Document: doc.Document})

	sheetNames := workbook.GetSheetList()
	pageCountResp, err := instance.FPDF_GetPageCount(&requests.FPDF_GetPageCount{Document: doc.Document})
	if err != nil {
		return nil, err
	}
	pageCount := pageCountResp.PageCount
	if len(sheetNames) < pageCount {
		pageCount = len(sheetNames)
	}

	for pageIndex := 0; pageIndex < pageCount; pageIndex++ {
		rendered, err := instance.RenderPageInDPI(&requests.RenderPageInDPI{
			DPI: 96,
			Page: requests.Page{ByIndex: &requests.PageByIndex{
				Document: doc.Document,
				Index:    pageIndex,
			}},
		})
		if err != nil {
			return nil, err
		}

		var imageBytes bytes.Buffer
		if err := png.Encode(&imageBytes, rendered.Result.RenderedImage); err != nil {
			return nil, err
		}
		rendered.Cleanup()
		if err := workbook.AddPictureFromBytes(sheetNames[pageIndex], "A1", &excelize.Picture{
			Extension: ".png",
			File:      imageBytes.Bytes(),
			Format: &excelize.GraphicOptions{
				AltText:         fmt.Sprintf("Original PDF page %d", pageIndex+1),
				Name:            fmt.Sprintf("PDFPage%d", pageIndex+1),
				LockAspectRatio: true,
				Positioning:     "absolute",
			},
		}); err != nil {
			return nil, err
		}
		_ = workbook.SetSheetView(sheetNames[pageIndex], 0, &excelize.ViewOptions{ShowGridLines: boolPtr(false)})
	}

	var visualWorkbook bytes.Buffer
	if err := workbook.Write(&visualWorkbook); err != nil {
		return nil, err
	}
	return visualWorkbook.Bytes(), nil
}

func formatWorkbook(xlsxBytes []byte) ([]byte, error) {
	workbook, err := excelize.OpenReader(bytes.NewReader(xlsxBytes))
	if err != nil {
		return nil, err
	}
	defer workbook.Close()

	bodyStyle, err := workbook.NewStyle(&excelize.Style{
		Font: &excelize.Font{Family: "Calibri", Size: 11, Color: "1F2937"},
		Border: []excelize.Border{
			{Type: "left", Color: "D1D5DB", Style: 1},
			{Type: "right", Color: "D1D5DB", Style: 1},
			{Type: "top", Color: "D1D5DB", Style: 1},
			{Type: "bottom", Color: "D1D5DB", Style: 1},
		},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})
	if err != nil {
		return nil, err
	}
	headerStyle, err := workbook.NewStyle(&excelize.Style{
		Font: &excelize.Font{Family: "Calibri", Size: 11, Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"166534"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "14532D", Style: 1},
			{Type: "right", Color: "14532D", Style: 1},
			{Type: "top", Color: "14532D", Style: 1},
			{Type: "bottom", Color: "14532D", Style: 1},
		},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
	})
	if err != nil {
		return nil, err
	}

	for sheetIndex, sheetName := range workbook.GetSheetList() {
		rows, err := workbook.GetRows(sheetName)
		if err != nil || len(rows) == 0 {
			continue
		}

		maxColumns := 0
		columnWidths := make(map[int]int)
		for _, row := range rows {
			if len(row) > maxColumns {
				maxColumns = len(row)
			}
			for columnIndex, value := range row {
				width := len([]rune(value)) + 2
				if width > columnWidths[columnIndex] {
					columnWidths[columnIndex] = width
				}
			}
		}
		if maxColumns == 0 {
			continue
		}

		lastCell, err := excelize.CoordinatesToCellName(maxColumns, len(rows))
		if err != nil {
			continue
		}
		_ = workbook.SetCellStyle(sheetName, "A1", lastCell, bodyStyle)
		if len(rows) > 1 {
			_ = workbook.SetCellStyle(sheetName, "A1", fmt.Sprintf("%s1", columnName(maxColumns)), headerStyle)
			_ = workbook.SetRowHeight(sheetName, 1, 28)
			_ = workbook.SetPanes(sheetName, &excelize.Panes{
				Freeze:      true,
				YSplit:      1,
				TopLeftCell: "A2",
				ActivePane:  "bottomLeft",
			})

			if maxColumns >= 1 {
				tableName := fmt.Sprintf("PDFTable%d", sheetIndex+1)
				_ = workbook.AddTable(sheetName, &excelize.Table{
					Range:          fmt.Sprintf("A1:%s", lastCell),
					Name:           tableName,
					StyleName:      "TableStyleMedium4",
					ShowRowStripes: boolPtr(true),
				})
			}
		}

		for columnIndex := 1; columnIndex <= maxColumns; columnIndex++ {
			column := columnName(columnIndex)
			width := columnWidths[columnIndex-1]
			if width < 12 {
				width = 12
			}
			if width > 42 {
				width = 42
			}
			_ = workbook.SetColWidth(sheetName, column, column, float64(width))
		}
		for rowIndex := 2; rowIndex <= len(rows); rowIndex++ {
			_ = workbook.SetRowHeight(sheetName, rowIndex, 22)
		}
	}

	var formatted bytes.Buffer
	if err := workbook.Write(&formatted); err != nil {
		return nil, err
	}
	return formatted.Bytes(), nil
}

func columnName(columnNumber int) string {
	name, err := excelize.ColumnNumberToName(columnNumber)
	if err != nil {
		return "A"
	}
	return name
}

func boolPtr(value bool) *bool {
	return &value
}

func (s *PdfToExcelService) extractRowsFromPage(ctx context.Context, instance pdfium.Pdfium, doc references.FPDF_DOCUMENT, pageIdx int) [][]string {
	var textRows [][]string
	structured, err := instance.GetPageTextStructured(&requests.GetPageTextStructured{
		Page: requests.Page{
			ByIndex: &requests.PageByIndex{
				Document: doc,
				Index:    pageIdx,
			},
		},
		Mode: requests.GetPageTextStructuredModeRects,
	})

	if err == nil && structured != nil && len(structured.Rects) > 0 {
		textRows = s.clusterRectsToRows(structured.Rects)
		if len(textRows) == 0 {
			textRows = nil
		}
	}

	if len(textRows) == 0 {
		plainResp, plainErr := instance.GetPageText(&requests.GetPageText{
			Page: requests.Page{
				ByIndex: &requests.PageByIndex{
					Document: doc,
					Index:    pageIdx,
				},
			},
		})
		if plainErr == nil && plainResp != nil && strings.TrimSpace(plainResp.Text) != "" {
			textRows = s.parsePlainTextToRows(plainResp.Text)
		}
	}

	if len(textRows) > 0 {
		return textRows
	}

	return s.extractRowsWithTesseract(ctx, instance, doc, pageIdx)
}

type ocrWord struct {
	text   string
	left   int
	top    int
	width  int
	height int
}

func (s *PdfToExcelService) extractRowsWithTesseract(ctx context.Context, instance pdfium.Pdfium, doc references.FPDF_DOCUMENT, pageIdx int) [][]string {
	tesseractPath := strings.TrimSpace(os.Getenv("TESSERACT_PATH"))
	if tesseractPath == "" {
		tesseractPath = "tesseract"
	}
	if _, err := exec.LookPath(tesseractPath); err != nil {
		return nil
	}

	rendered, err := instance.RenderPageInDPI(&requests.RenderPageInDPI{
		DPI: 200,
		Page: requests.Page{ByIndex: &requests.PageByIndex{
			Document: doc,
			Index:    pageIdx,
		}},
	})
	if err != nil {
		return nil
	}
	defer rendered.Cleanup()

	imageFile, err := os.CreateTemp("", "magic-converter-ocr-*.png")
	if err != nil {
		return nil
	}
	imagePath := imageFile.Name()
	defer os.Remove(imagePath)
	if err := png.Encode(imageFile, rendered.Result.RenderedImage); err != nil {
		_ = imageFile.Close()
		return nil
	}
	if err := imageFile.Close(); err != nil {
		return nil
	}

	language := strings.TrimSpace(os.Getenv("TESSERACT_LANG"))
	if language == "" {
		language = "eng+ind"
	}
	command := exec.CommandContext(ctx, tesseractPath, imagePath, "stdout", "--psm", "6", "-l", language, "tsv")
	output, err := command.Output()
	if err != nil {
		return nil
	}
	return parseTesseractTSV(string(output))
}

func parseTesseractTSV(tsv string) [][]string {
	lines := make(map[string][]ocrWord)
	for lineIndex, line := range strings.Split(tsv, "\n") {
		if lineIndex == 0 || strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.SplitN(line, "\t", 12)
		if len(fields) < 12 || strings.TrimSpace(fields[11]) == "" {
			continue
		}
		confidence, err := strconv.ParseFloat(fields[10], 64)
		if err != nil || confidence < 20 {
			continue
		}
		left, leftErr := strconv.Atoi(fields[6])
		top, topErr := strconv.Atoi(fields[7])
		width, widthErr := strconv.Atoi(fields[8])
		height, heightErr := strconv.Atoi(fields[9])
		if leftErr != nil || topErr != nil || widthErr != nil || heightErr != nil {
			continue
		}
		key := strings.Join([]string{fields[2], fields[3], fields[4], fields[5]}, ":")
		lines[key] = append(lines[key], ocrWord{
			text:   strings.TrimSpace(fields[11]),
			left:   left,
			top:    top,
			width:  width,
			height: height,
		})
	}

	type positionedLine struct {
		top   int
		words []ocrWord
	}
	positionedLines := make([]positionedLine, 0, len(lines))
	for _, words := range lines {
		if len(words) == 0 {
			continue
		}
		sort.Slice(words, func(i, j int) bool { return words[i].left < words[j].left })
		positionedLines = append(positionedLines, positionedLine{top: words[0].top, words: words})
	}
	sort.Slice(positionedLines, func(i, j int) bool { return positionedLines[i].top < positionedLines[j].top })

	positionedRows := make([][]positionedCell, 0, len(positionedLines))
	for _, line := range positionedLines {
		averageHeight := 0
		for _, word := range line.words {
			averageHeight += word.height
		}
		averageHeight = maxInt(averageHeight/len(line.words), 1)
		cellGap := maxInt(averageHeight*2, 24)
		row := make([]positionedCell, 0, len(line.words))
		current := line.words[0].text
		currentLeft := float64(line.words[0].left)
		lastRight := line.words[0].left + line.words[0].width
		for _, word := range line.words[1:] {
			if word.left-lastRight >= cellGap {
				row = append(row, positionedCell{text: strings.TrimSpace(current), left: currentLeft, right: float64(lastRight)})
				current = word.text
				currentLeft = float64(word.left)
			} else {
				current += " " + word.text
			}
			lastRight = word.left + word.width
		}
		row = append(row, positionedCell{text: strings.TrimSpace(current), left: currentLeft, right: float64(lastRight)})
		positionedRows = append(positionedRows, row)
	}
	return alignPositionedRows(positionedRows)
}

func layoutScore(rows [][]string) int {
	if len(rows) == 0 {
		return 0
	}
	maxColumns := 0
	for _, row := range rows {
		if len(row) > maxColumns {
			maxColumns = len(row)
		}
	}
	return len(rows) * maxColumns
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func (s *PdfToExcelService) clusterRectsToRows(rects []*responses.GetPageTextStructuredRect) [][]string {
	cleanRects := make([]rectWithPos, 0, len(rects))
	for _, r := range rects {
		txt := strings.TrimSpace(r.Text)
		if txt == "" {
			continue
		}
		cleanRects = append(cleanRects, rectWithPos{
			text:   txt,
			left:   r.PointPosition.Left,
			top:    r.PointPosition.Top,
			right:  r.PointPosition.Right,
			bottom: r.PointPosition.Bottom,
		})
	}

	if len(cleanRects) == 0 {
		return nil
	}

	sort.Slice(cleanRects, func(i, j int) bool {
		if math.Abs(cleanRects[i].top-cleanRects[j].top) < 3.5 {
			return cleanRects[i].left < cleanRects[j].left
		}
		return cleanRects[i].top < cleanRects[j].top
	})

	type rowCluster struct {
		top   float64
		rects []rectWithPos
	}

	var rowClusters []rowCluster
	const yTolerance = 4.5

	for _, rect := range cleanRects {
		matched := false
		for idx := range rowClusters {
			if math.Abs(rowClusters[idx].top-rect.top) <= yTolerance {
				rowClusters[idx].rects = append(rowClusters[idx].rects, rect)
				matched = true
				break
			}
		}
		if !matched {
			rowClusters = append(rowClusters, rowCluster{
				top:   rect.top,
				rects: []rectWithPos{rect},
			})
		}
	}

	sort.Slice(rowClusters, func(i, j int) bool {
		return rowClusters[i].top < rowClusters[j].top
	})

	var positionedRows [][]positionedCell
	const cellGapThreshold = 14.0

	for _, cluster := range rowClusters {
		sort.Slice(cluster.rects, func(i, j int) bool {
			return cluster.rects[i].left < cluster.rects[j].left
		})

		var cells []positionedCell
		var currentCell strings.Builder
		var currentLeft float64
		var lastRight float64 = -1

		for _, r := range cluster.rects {
			if lastRight < 0 {
				currentCell.WriteString(r.text)
				currentLeft = r.left
			} else if (r.left - lastRight) >= cellGapThreshold {
				cells = append(cells, positionedCell{text: strings.TrimSpace(currentCell.String()), left: currentLeft, right: lastRight})
				currentCell.Reset()
				currentCell.WriteString(r.text)
				currentLeft = r.left
			} else {
				if currentCell.Len() > 0 && !strings.HasSuffix(currentCell.String(), " ") {
					currentCell.WriteString(" ")
				}
				currentCell.WriteString(r.text)
			}
			lastRight = r.right
		}

		if currentCell.Len() > 0 {
			cells = append(cells, positionedCell{text: strings.TrimSpace(currentCell.String()), left: currentLeft, right: lastRight})
		}

		if len(cells) > 0 {
			positionedRows = append(positionedRows, cells)
		}
	}

	return alignPositionedRows(positionedRows)
}

func alignPositionedRows(rows [][]positionedCell) [][]string {
	if len(rows) == 0 {
		return nil
	}

	const columnTolerance = 24.0
	type columnAnchor struct {
		left  float64
		count int
	}

	anchors := make([]columnAnchor, 0)
	for _, row := range rows {
		for _, cell := range row {
			bestIndex := -1
			bestDistance := columnTolerance
			for index, anchor := range anchors {
				distance := math.Abs(anchor.left - cell.left)
				if distance < bestDistance {
					bestIndex = index
					bestDistance = distance
				}
			}
			if bestIndex < 0 {
				anchors = append(anchors, columnAnchor{left: cell.left, count: 1})
			} else {
				anchor := &anchors[bestIndex]
				anchor.left = (anchor.left*float64(anchor.count) + cell.left) / float64(anchor.count+1)
				anchor.count++
			}
		}
	}

	sort.Slice(anchors, func(i, j int) bool { return anchors[i].left < anchors[j].left })
	result := make([][]string, 0, len(rows))
	for _, row := range rows {
		aligned := make([]string, len(anchors))
		for _, cell := range row {
			bestIndex := 0
			bestDistance := math.Abs(anchors[0].left - cell.left)
			for index := 1; index < len(anchors); index++ {
				distance := math.Abs(anchors[index].left - cell.left)
				if distance < bestDistance {
					bestIndex = index
					bestDistance = distance
				}
			}
			if aligned[bestIndex] == "" {
				aligned[bestIndex] = cell.text
			} else {
				aligned[bestIndex] += " " + cell.text
			}
		}
		result = append(result, aligned)
	}

	return result
}

func (s *PdfToExcelService) parsePlainTextToRows(text string) [][]string {
	lines := strings.Split(text, "\n")
	var rows [][]string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var cells []string
		if strings.Contains(line, "\t") {
			parts := strings.Split(line, "\t")
			for _, p := range parts {
				cells = append(cells, strings.TrimSpace(p))
			}
		} else if strings.Contains(line, "|") {
			parts := strings.Split(line, "|")
			for _, p := range parts {
				t := strings.TrimSpace(p)
				if t != "" {
					cells = append(cells, t)
				}
			}
		} else if multiSpaceRegex.MatchString(line) {
			parts := multiSpaceRegex.Split(line, -1)
			for _, p := range parts {
				cells = append(cells, strings.TrimSpace(p))
			}
		} else if strings.Contains(line, ",") && countOccurrences(line, ',') >= 2 {
			parts := strings.Split(line, ",")
			for _, p := range parts {
				cells = append(cells, strings.TrimSpace(p))
			}
		} else {
			cells = []string{line}
		}

		if len(cells) > 0 {
			rows = append(rows, cells)
		}
	}

	return rows
}

func countOccurrences(s string, char rune) int {
	cnt := 0
	for _, r := range s {
		if r == char {
			cnt++
		}
	}
	return cnt
}
