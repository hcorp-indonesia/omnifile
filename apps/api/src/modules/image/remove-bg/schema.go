package removebg

type RemoveBgOptions struct {
	Model          string `json:"model" form:"model"`                       // "u2netp" (fast) or "u2net" (high detail)
	OutputFormat   string `json:"output_format" form:"output_format"`       // "png" (default) or "webp"
	OutputFileName string `json:"output_file_name" form:"output_file_name"` // custom filename
}

type RemoveBgResult struct {
	FileName        string `json:"file_name"`
	OriginalFormat  string `json:"original_format"`
	ConvertedFormat string `json:"converted_format"`
	OriginalSize    int64  `json:"original_size"`
	ResultSize      int64  `json:"result_size"`
	OriginalWidth   int    `json:"original_width"`
	OriginalHeight  int    `json:"original_height"`
	ResultWidth     int    `json:"result_width"`
	ResultHeight    int    `json:"result_height"`
	MimeType        string `json:"mime_type"`
	FileBase64      string `json:"file_base64"`
}

type RemoveBgResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message,omitempty"`
	Data    *RemoveBgResult `json:"data,omitempty"`
}
