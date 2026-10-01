package shared

type BaseResponse struct {
	Success  bool      `json:"success"`
	Message  string    `json:"message"`
	Metadata *Metadata `json:"metadata"`
	Data     any       `json:"data"`
}

type Metadata struct {
	PerPage     int `json:"per_page,omitempty"`
	CurrentPage int `json:"current_page,omitempty"`
	TotalRow    int `json:"total_row,omitempty"`
	TotalPage   int `json:"total_page,omitempty"`
}
