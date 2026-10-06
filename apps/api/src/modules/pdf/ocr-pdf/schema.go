package ocrpdf

type OcrPdfOptions struct {
	Language       string `json:"language" form:"language"`                 // "eng+ind", "ind", "eng"
	OutputFileName string `json:"output_file_name" form:"output_file_name"` // e.g. "document_ocr.pdf"
}

type OcrPdfResult struct {
	FileName      string `json:"file_name"`
	OriginalSize  int64  `json:"original_size"`
	ProcessedSize int64  `json:"processed_size"`
	TotalPages    int    `json:"total_pages"`
	Language      string `json:"language"`
	ExtractedText string `json:"extracted_text"`
	WordsCount    int    `json:"words_count"`
	FileBase64    string `json:"file_base64"`
}

type OcrPdfResponse struct {
	Success bool          `json:"success"`
	Message string        `json:"message,omitempty"`
	Data    *OcrPdfResult `json:"data,omitempty"`
}
