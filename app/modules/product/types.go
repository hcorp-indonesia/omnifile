package product

import "github.com/google/uuid"

type ProductListItemResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Price    int       `json:"price"`
	Status   bool      `json:"status"`
	ImageURL string    `json:"image_url"`
}

type ProductDetailResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Price       int       `json:"price"`
	Stock       int       `json:"stock"`
	Status      bool      `json:"status"`
	ImageURL    string    `json:"image_url"`
}

type CreateProductRequest struct {
	Name        string  `form:"name" json:"name" validate:"required"`
	Description *string `form:"description" json:"description"`
	Price       int     `form:"price" json:"price" validate:"required,numeric,min=0"`
	Stock       int     `form:"stock" json:"stock" validate:"required,numeric,min=0"`
}

type UpdateProductRequest struct {
	Name        *string `form:"name" json:"name"`
	Description *string `form:"description" json:"description"`
	Price       *int    `form:"price" json:"price" validate:"omitempty,numeric,min=0"`
	Stock       *int    `form:"stock" json:"stock" validate:"omitempty,numeric,min=0"`
	Status      *bool   `form:"status" json:"status"`
}


