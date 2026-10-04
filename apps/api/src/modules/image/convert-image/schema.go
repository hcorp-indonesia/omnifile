package convertimage

type ConvertImageOptions struct {
	TargetFormat   string `json:"target_format" form:"target_format"`       // "png", "jpg", "webp", "avif", "bmp", "tiff", "ico", "gif"
	Quality        int    `json:"quality" form:"quality"`                   // 1 - 100
	Background     string `json:"background" form:"background"`             // Hex color e.g. "#FFFFFF"
	Width          int    `json:"width" form:"width"`                       // Optional resize width
	Height         int    `json:"height" form:"height"`                     // Optional resize height
	OutputFileName string `json:"output_file_name" form:"output_file_name"` // Custom output file name
	RemoveBg       bool   `json:"remove_bg" form:"remove_bg"`               // Automatically remove background via AI
}

type ConvertImageResult struct {
	FileName        string  `json:"file_name"`
	OriginalFormat  string  `json:"original_format"`
	ConvertedFormat string  `json:"converted_format"`
	OriginalSize    int64   `json:"original_size"`
	ConvertedSize   int64   `json:"converted_size"`
	SavedBytes      int64   `json:"saved_bytes"`
	SavedPercentage float64 `json:"saved_percentage"`
	OriginalWidth   int     `json:"original_width"`
	OriginalHeight  int     `json:"original_height"`
	ConvertedWidth  int     `json:"converted_width"`
	ConvertedHeight int     `json:"converted_height"`
	MimeType        string  `json:"mime_type"`
	FileBase64      string  `json:"file_base64"`
}

type ConvertImageResponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message,omitempty"`
	Data    *ConvertImageResult `json:"data,omitempty"`
}
