package upscaleimage

type UpscaleOptions struct {
	Scale          int    `json:"scale" form:"scale"`                       // 2 or 4
	OutputFormat   string `json:"output_format" form:"output_format"`       // "png", "jpg", "webp"
	OutputFileName string `json:"output_file_name" form:"output_file_name"` // custom filename
	FileBase64     string `json:"file_base64" form:"file_base64"`           // Optional: Direct base64 string for already converted items
}

type UpscaleResult struct {
	FileName        string `json:"file_name"`
	OriginalFormat  string `json:"original_format"`
	ConvertedFormat string `json:"converted_format"`
	OriginalSize    int64  `json:"original_size"`
	UpscaledSize    int64  `json:"upscaled_size"`
	OriginalWidth   int    `json:"original_width"`
	OriginalHeight  int    `json:"original_height"`
	UpscaledWidth   int    `json:"upscaled_width"`
	UpscaledHeight  int    `json:"upscaled_height"`
	ScaleFactor     int    `json:"scale_factor"`
	MimeType        string `json:"mime_type"`
	FileBase64      string `json:"file_base64"`
}

type UpscaleResponse struct {
	Success bool           `json:"success"`
	Message string         `json:"message,omitempty"`
	Data    *UpscaleResult `json:"data,omitempty"`
}
