package splitpdf

type SplitPdfOptions struct {
	Mode           string `json:"mode"`             // "extract" | "split_all" | "split_every" | "custom_ranges"
	Pages          string `json:"pages"`            // e.g. "1-3, 5, 8"
	EveryN         int    `json:"every_n"`          // e.g. 1 (split every 1 page), 2 (every 2 pages)
	MergeExtracted bool   `json:"merge_extracted"`  // If true, merges selected pages into 1 PDF. If false, returns a ZIP
	OutputFileName string `json:"output_file_name"` // Base filename
}

type SplitPdfItemInfo struct {
	FileName string `json:"file_name"`
	Pages    string `json:"pages"`
	FileSize int64  `json:"file_size"`
}

type SplitPdfResult struct {
	FileName   string             `json:"file_name"`
	FileSize   int64              `json:"file_size"`
	TotalPages int                `json:"total_pages"`
	FileCount  int                `json:"file_count"`
	IsZip      bool               `json:"is_zip"`
	FileBase64 string             `json:"file_base64"`
	Items      []SplitPdfItemInfo `json:"items,omitempty"`
}

type PdfInfoResult struct {
	FileName   string `json:"file_name"`
	FileSize   int64  `json:"file_size"`
	TotalPages int    `json:"total_pages"`
}
