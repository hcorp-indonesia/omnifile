package pdftoword

type WordParagraphPreview struct {
	Page      int        `json:"page"`
	Type      string     `json:"type"` // "heading", "paragraph", "table"
	Text      string     `json:"text"`
	TableData [][]string `json:"table_data,omitempty"`
}

type WordFileResult struct {
	OriginalName   string                 `json:"original_name"`
	FileName       string                 `json:"file_name"`
	TotalPages     int                    `json:"total_pages"`
	WordCount      int                    `json:"word_count"`
	ParagraphCount int                    `json:"paragraph_count"`
	FileSize       int64                  `json:"file_size"`
	DownloadURL    string                 `json:"download_url,omitempty"`
	Engine         string                 `json:"engine"` // "pdf.co" or "local"
	FileBase64     string                 `json:"file_base64"`
	Previews       []WordParagraphPreview `json:"previews"`
}

type ConvertPdfToWordResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    []WordFileResult `json:"data"`
}
