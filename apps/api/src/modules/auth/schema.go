package auth

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID        uuid.UUID  `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Name      string     `bun:"name,notnull" json:"name"`
	Email     string     `bun:"email,notnull,unique" json:"email"`
	Password  *string    `bun:"password" json:"-"`
	Provider  string     `bun:"provider,notnull,default:'local'" json:"provider"`
	CreatedAt time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt time.Time  `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
	DeletedAt *time.Time `bun:"deleted_at,soft_delete" json:"-"`
}

type Session struct {
	bun.BaseModel `bun:"table:sessions,alias:s"`

	ID                    uuid.UUID `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	UserID                uuid.UUID `bun:"user_id,type:uuid,notnull" json:"user_id"`
	User                  *User     `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
	AccessToken           string    `bun:"access_token,notnull,unique" json:"-"`
	RefreshToken          string    `bun:"refresh_token,notnull,unique" json:"-"`
	AccessTokenExpiresAt  time.Time `bun:"access_token_expires_at,notnull" json:"access_token_expires_at"`
	RefreshTokenExpiresAt time.Time `bun:"refresh_token_expires_at,notnull" json:"refresh_token_expires_at"`
	RememberMe            bool      `bun:"remember_me,notnull,default:false" json:"remember_me"`
	IPAddress             *string   `bun:"ip_address" json:"ip_address,omitempty"`
	UserAgent             *string   `bun:"user_agent" json:"user_agent,omitempty"`
	IsRevoked             bool      `bun:"is_revoked,notnull,default:false" json:"is_revoked"`
	CreatedAt             time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt             time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

type PasswordResetToken struct {
	bun.BaseModel `bun:"table:password_reset_tokens,alias:prt"`

	ID        uuid.UUID  `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `bun:"user_id,type:uuid,notnull" json:"user_id"`
	TokenHash string     `bun:"token_hash,notnull,unique" json:"-"`
	ExpiresAt time.Time  `bun:"expires_at,notnull" json:"expires_at"`
	UsedAt    *time.Time `bun:"used_at" json:"-"`
	CreatedAt time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=100"`
}

type LoginRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required"`
	RememberMe bool   `json:"remember_me"`
}

type GoogleAuthRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Name       string `json:"name" validate:"required"`
	RememberMe bool   `json:"remember_me"`
}

type RequestPasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=100"`
	ConfirmPassword string `json:"confirm_password" validate:"required,min=8,max=100"`
}

type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Provider string    `json:"provider"`
}

func ToUserResponse(u *User) *UserResponse {
	if u == nil {
		return nil
	}
	return &UserResponse{
		ID:       u.ID,
		Name:     u.Name,
		Email:    u.Email,
		Provider: u.Provider,
	}
}

type AuthResult struct {
	User                  *UserResponse `json:"user"`
	AccessToken           string        `json:"access_token"`
	RefreshToken          string        `json:"refresh_token"`
	AccessTokenExpiresAt  int64         `json:"access_token_expires_at"`  // Unix timestamp (seconds)
	RefreshTokenExpiresAt int64         `json:"refresh_token_expires_at"` // Unix timestamp (seconds)
	RememberMe            bool          `json:"remember_me"`
}
