package media

type ConvertFileRequest struct {
	TargetFormat string `json:"target_format" form:"target_format" validate:"required,oneof=avif webp jpg jpeg png pdf docx"`
}

type UpscaleImageRequest struct {
	Scale int `json:"scale" form:"scale" validate:"required,oneof=2 4"`
}

type MediaProcessingResponse struct {
	JobID   string `json:"job_id"`
	Status  string `json:"status"`
	FileURL string `json:"file_url,omitempty"`
	Message string `json:"message"`
}
