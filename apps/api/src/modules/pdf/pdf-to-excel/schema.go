package pdftoexcel

type SheetPreview struct {
	SheetName   string     `json:"sheet_name"`
	PageNumber  int        `json:"page_number"`
	RowCount    int        `json:"row_count"`
	ColumnCount int        `json:"column_count"`
	Rows        [][]string `json:"rows"`
}

type ExcelFileResult struct {
	OriginalName string         `json:"original_name"`
	FileName     string         `json:"file_name"`
	TotalPages   int            `json:"total_pages"`
	TotalSheets  int            `json:"total_sheets"`
	TotalRows    int            `json:"total_rows"`
	FileSize     int64          `json:"file_size"`
	DownloadUrl  string         `json:"download_url,omitempty"`
	Engine       string         `json:"engine"`
	FileBase64   string         `json:"file_base64"`
	Sheets       []SheetPreview `json:"sheets"`
}

type ConvertPdfToExcelResponse struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Data    []ExcelFileResult `json:"data"`
}
