package converter

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Converter struct {
	bun.BaseModel `bun:"table:converters,alias:c"`

	ID          uuid.UUID `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Name        string    `bun:"name,notnull" json:"name" validate:"required"`
	Description *string   `bun:"description" json:"description"`
	FromUnit    string    `bun:"from_unit,notnull" json:"from_unit" validate:"required"`
	ToUnit      string    `bun:"to_unit,notnull" json:"to_unit" validate:"required"`
	Formula     string    `bun:"formula,notnull" json:"formula" validate:"required"`
	Category    string    `bun:"category,notnull" json:"category" validate:"required"`
	IsActive    bool      `bun:"is_active,notnull,default:true" json:"is_active"`
	ImageKey    *string   `bun:"image_key" json:"image_key"`
	ImageURL    string    `bun:"-" json:"image_url"`
	CreatedAt   time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,notnull,default:current_timestamp" json:"updated_at"`
	DeletedAt   time.Time `bun:"deleted_at,soft_delete,nullzero" json:"-"`
}

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
