package user

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID        uuid.UUID `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Username  string    `bun:"username,notnull,unique" json:"username"`
	Email     string    `bun:"email,notnull,unique" json:"email"`
	Password  string    `bun:"password,notnull" json:"-"`
	FullName  string    `bun:"full_name" json:"full_name"`
	RoleID    uuid.UUID `bun:"type:uuid,notnull" json:"role_id"`
	IsActive  bool      `bun:"is_active,notnull,default:true" json:"is_active"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp" json:"updated_at"`
	DeletedAt time.Time `bun:"deleted_at,soft_delete,nullzero" json:"-"`
}
