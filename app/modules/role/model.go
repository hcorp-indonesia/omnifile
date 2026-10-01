package role

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Role struct {
	bun.BaseModel `bun:"table:roles,alias:r"`

	ID          uuid.UUID `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Name        string    `bun:"name,notnull,unique" json:"name"`
	Slug        string    `bun:"slug,notnull,unique" json:"slug"`
	Description string    `bun:"description" json:"description"`
	CreatedAt   time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at,notnull,default:current_timestamp" json:"updated_at"`
}
