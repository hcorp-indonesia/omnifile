package removepdf

type RemovePdfOptions struct {
	Pages          string `json:"pages"`            // e.g. "2, 4-5"
	OutputFileName string `json:"output_file_name"` // Base filename
}

type RemovePdfResult struct {
	FileName          string `json:"file_name"`
	FileSize          int64  `json:"file_size"`
	OriginalPages     int    `json:"original_pages"`
	RemainingPages    int    `json:"remaining_pages"`
	RemovedPagesCount int    `json:"removed_pages_count"`
	FileBase64        string `json:"file_base64"`
}
