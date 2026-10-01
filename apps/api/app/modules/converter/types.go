package converter

import "github.com/google/uuid"

// --- Request DTOs ---

type CreateConverterRequest struct {
	Name        string  `form:"name" json:"name" validate:"required"`
	Description *string `form:"description" json:"description"`
	FromUnit    string  `form:"from_unit" json:"from_unit" validate:"required"`
	ToUnit      string  `form:"to_unit" json:"to_unit" validate:"required"`
	Formula     string  `form:"formula" json:"formula" validate:"required"`
	Category    string  `form:"category" json:"category" validate:"required"`
}

type UpdateConverterRequest struct {
	Name        *string `form:"name" json:"name"`
	Description *string `form:"description" json:"description"`
	FromUnit    *string `form:"from_unit" json:"from_unit"`
	ToUnit      *string `form:"to_unit" json:"to_unit"`
	Formula     *string `form:"formula" json:"formula"`
	Category    *string `form:"category" json:"category"`
	IsActive    *bool   `form:"is_active" json:"is_active"`
}

// --- Response DTOs ---

type ConverterListItemResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	FromUnit string    `json:"from_unit"`
	ToUnit   string    `json:"to_unit"`
	Category string    `json:"category"`
	IsActive bool      `json:"is_active"`
	ImageURL string    `json:"image_url"`
}

type ConverterDetailResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	FromUnit    string    `json:"from_unit"`
	ToUnit      string    `json:"to_unit"`
	Formula     string    `json:"formula"`
	Category    string    `json:"category"`
	IsActive    bool      `json:"is_active"`
	ImageURL    string    `json:"image_url"`
}
