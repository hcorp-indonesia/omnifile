package compresspdf

type CompressPdfOptions struct {
	Level          string `json:"level" form:"level"`                       // "recommended", "extreme", "low", "custom"
	TargetSizeKB   int64  `json:"target_size_kb" form:"target_size_kb"`     // in KB, e.g. 200, 500, 1024
	Quality        int    `json:"quality" form:"quality"`                   // 10 - 100
	DPI            int    `json:"dpi" form:"dpi"`                           // 72, 150, 200, 300
	RemoveMetadata bool   `json:"remove_metadata" form:"remove_metadata"`
	OutputFileName string `json:"output_file_name" form:"output_file_name"` // e.g. "document_compressed.pdf"
}

type CompressPdfResult struct {
	FileName        string  `json:"file_name"`
	OriginalSize    int64   `json:"original_size"`
	CompressedSize  int64   `json:"compressed_size"`
	SavedBytes      int64   `json:"saved_bytes"`
	SavedPercentage float64 `json:"saved_percentage"`
	CompressionLevel string `json:"compression_level"`
	TotalPages      int     `json:"total_pages"`
	FileBase64      string  `json:"file_base64"`
}

type CompressPdfResponse struct {
	Success bool               `json:"success"`
	Message string             `json:"message,omitempty"`
	Data    *CompressPdfResult `json:"data,omitempty"`
}
