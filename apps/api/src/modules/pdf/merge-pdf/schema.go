package mergepdf

type MergedFileSummary struct {
	Name  string `json:"name"`
	Size  int64  `json:"size"`
	Pages int    `json:"pages"`
}

type MergePdfResult struct {
	FileName   string              `json:"file_name"`
	FileSize   int64               `json:"file_size"`
	TotalPages int                 `json:"total_pages"`
	TotalFiles int                 `json:"total_files"`
	FileBase64 string              `json:"file_base64"`
	Files      []MergedFileSummary `json:"files"`
}

type MergePdfOptions struct {
	OutputFileName string `json:"output_file_name"`
}
