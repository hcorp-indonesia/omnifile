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
	Provider  string     `bun:"provider,notnull,default:'email_otp'" json:"provider"`
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

type LoginOTP struct {
	bun.BaseModel `bun:"table:login_otps,alias:lo"`

	ID          uuid.UUID  `bun:"type:uuid,pk,default:gen_random_uuid()" json:"id"`
	Email       string     `bun:"email,notnull" json:"email"`
	CodeDigest  string     `bun:"code_digest,notnull" json:"-"`
	ExpiresAt   time.Time  `bun:"expires_at,notnull" json:"expires_at"`
	Attempts    int        `bun:"attempts,notnull,default:0" json:"-"`
	UsedAt      *time.Time `bun:"used_at" json:"-"`
	RequestedIP *string    `bun:"requested_ip" json:"-"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
}

type RequestLoginOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type VerifyLoginOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required,len=6,numeric"`
}

type RequestLoginOTPResult struct {
	Email             string `json:"email"`
	ExpiresInSeconds  int    `json:"expires_in_seconds"`
	ResendAfterSecond int    `json:"resend_after_seconds"`
}

type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Provider string    `json:"provider"`
}

func ToUserResponse(user *User) *UserResponse {
	if user == nil {
		return nil
	}
	return &UserResponse{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Provider: user.Provider,
	}
}

type AuthResult struct {
	User                  *UserResponse `json:"user"`
	AccessToken           string        `json:"access_token"`
	RefreshToken          string        `json:"refresh_token"`
	AccessTokenExpiresAt  int64         `json:"access_token_expires_at"`
	RefreshTokenExpiresAt int64         `json:"refresh_token_expires_at"`
	RememberMe            bool          `json:"remember_me"`
}
