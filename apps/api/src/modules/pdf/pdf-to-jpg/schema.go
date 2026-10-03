package pdftojpg

type PageResult struct {
	PageNumber int    `json:"page_number"`
	ImageBase64 string `json:"image_base64,omitempty"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	FileName   string `json:"file_name"`
}

type FileConversionResult struct {
	OriginalName string       `json:"original_name"`
	TotalPages   int          `json:"total_pages"`
	Pages        []PageResult `json:"pages"`
}

type ConvertPdfToJpgResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
	Data    []FileConversionResult `json:"data"`
}
