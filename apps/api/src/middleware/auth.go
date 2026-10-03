package middleware

import (
	"database/sql"
	"strings"
	"time"

	"magic-converter/src/modules/auth"
	"magic-converter/src/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/uptrace/bun"
)

type AuthMiddleware struct {
	db *bun.DB
}

func NewAuthMiddleware(db *bun.DB) *AuthMiddleware {
	return &AuthMiddleware{db: db}
}

// RequireAuth ensures that the incoming request is authenticated via Cookie or Authorization header.
func (m *AuthMiddleware) RequireAuth() fiber.Handler {
	return func(c fiber.Ctx) error {
		token := m.extractToken(c)
		if token == "" {
			return utils.ErrUnauthorized("Authentication required. Please log in.")
		}

		session := new(auth.Session)
		err := m.db.NewSelect().
			Model(session).
			Relation("User").
			Where("s.access_token = ?", token).
			Where("s.is_revoked = false").
			Scan(c.Context())

		if err != nil {
			if err == sql.ErrNoRows {
				return utils.ErrUnauthorized("Invalid or expired session. Please log in again.")
			}
			return utils.ErrInternalServerError("Failed to authenticate session")
		}

		if session.AccessTokenExpiresAt.Before(time.Now()) {
			return utils.ErrUnauthorized("Session has expired. Please log in again.")
		}

		if session.User == nil || session.User.DeletedAt != nil {
			return utils.ErrUnauthorized("User account not found or has been disabled.")
		}

		// Store user and session into context locals
		c.Locals("user", auth.ToUserResponse(session.User))
		c.Locals("userId", session.UserID)
		c.Locals("session", session)

		return c.Next()
	}
}

// OptionalAuth attaches user information to Locals if a valid token exists, but does not block unauthenticated requests.
func (m *AuthMiddleware) OptionalAuth() fiber.Handler {
	return func(c fiber.Ctx) error {
		token := m.extractToken(c)
		if token == "" {
			return c.Next()
		}

		session := new(auth.Session)
		err := m.db.NewSelect().
			Model(session).
			Relation("User").
			Where("s.access_token = ?", token).
			Where("s.is_revoked = false").
			Scan(c.Context())

		if err == nil && session.AccessTokenExpiresAt.After(time.Now()) && session.User != nil && session.User.DeletedAt == nil {
			c.Locals("user", auth.ToUserResponse(session.User))
			c.Locals("userId", session.UserID)
			c.Locals("session", session)
		}

		return c.Next()
	}
}

func (m *AuthMiddleware) extractToken(c fiber.Ctx) string {
	// 1. Check Cookie first
	if token := c.Cookies("access_token"); token != "" {
		return token
	}

	// 2. Check Authorization Bearer header
	authHeader := c.Get(fiber.HeaderAuthorization)
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	return ""
}
