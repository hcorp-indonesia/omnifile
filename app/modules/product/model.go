package product

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Product struct {
	bun.BaseModel `bun:"table:products,alias:p"`

	ID          uuid.UUID `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Name        string    `bun:"name,notnull,unique" json:"name" validate:"required"`
	Description *string   `bun:"description" json:"description"`
	Price       int       `bun:"price,notnull" json:"price" validate:"required,numeric,min=0"`
	Stock       int       `bun:"stock,notnull,default:0" json:"stock" validate:"required,numeric,min=0"`
	Status      bool      `bun:"status,notnull,default:true" json:"status"`
	ImageKey    *string   `bun:"image_key" json:"image_key"`
	ImageURL    string    `bun:"-" json:"image_url"`
	CreatedAt   time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,notnull,default:current_timestamp" json:"updated_at"`
	DeletedAt   time.Time `bun:"deleted_at,soft_delete,nullzero" json:"-"`
}
