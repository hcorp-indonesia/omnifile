package auth

import (
	"github.com/uptrace/bun"
)

type AuthService struct {
	db *bun.DB
}

func NewAuthService(db *bun.DB) *AuthService {
	return &AuthService{db: db}
}
