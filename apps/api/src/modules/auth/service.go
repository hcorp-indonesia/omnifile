package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"strings"
	"time"

	"magic-converter/src/utils"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

const (
	AccessTokenDuration        = 7 * 24 * time.Hour  // 1 week
	RefreshTokenDuration       = 30 * 24 * time.Hour // 1 month
	PasswordResetTokenDuration = 15 * time.Minute
)

type AuthService struct {
	db     *bun.DB
	mailer *SMTPMailer
}

func NewAuthService(db *bun.DB, mailer *SMTPMailer) *AuthService {
	return &AuthService{db: db, mailer: mailer}
}

func generateSecureToken(byteLen int) (string, error) {
	b := make([]byte, byteLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func hashResetToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (s *AuthService) RequestPasswordReset(ctx context.Context, req *RequestPasswordResetRequest) error {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	user := new(User)
	if err := s.db.NewSelect().Model(user).Where("LOWER(email) = ?", cleanEmail).Scan(ctx); err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return utils.ErrInternalServerError("Unable to process password reset request")
	}

	rawToken, err := generateSecureToken(32)
	if err != nil {
		return utils.ErrInternalServerError("Unable to generate password reset token")
	}
	token := &PasswordResetToken{
		UserID:    user.ID,
		TokenHash: hashResetToken(rawToken),
		ExpiresAt: time.Now().Add(PasswordResetTokenDuration),
		CreatedAt: time.Now(),
	}

	if _, err := s.db.NewUpdate().Model((*PasswordResetToken)(nil)).
		Set("used_at = ?", time.Now()).
		Where("user_id = ?", user.ID).
		Where("used_at IS NULL").
		Exec(ctx); err != nil {
		return utils.ErrInternalServerError("Unable to prepare password reset request")
	}
	if _, err := s.db.NewInsert().Model(token).Exec(ctx); err != nil {
		return utils.ErrInternalServerError("Unable to prepare password reset request")
	}

	if err := s.mailer.SendPasswordReset(user.Email, user.Name, rawToken); err != nil {
		log.Error().Err(err).Msg("Failed to send password reset email")
		_, _ = s.db.NewDelete().Model(token).WherePK().Exec(ctx)
	}

	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
	if req.NewPassword != req.ConfirmPassword {
		return utils.ErrBadRequest("Passwords do not match")
	}

	tokenHash := hashResetToken(strings.TrimSpace(req.Token))
	now := time.Now()
	resetToken := new(PasswordResetToken)

	if err := s.db.NewSelect().Model(resetToken).
		Where("prt.token_hash = ?", tokenHash).
		Where("prt.used_at IS NULL").
		Where("prt.expires_at > ?", now).
		Scan(ctx); err != nil {
		if err == sql.ErrNoRows {
			return utils.ErrBadRequest("Invalid or expired password reset link")
		}
		return utils.ErrInternalServerError("Unable to verify password reset link")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrInternalServerError("Unable to update password")
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		user := &User{ID: resetToken.UserID, Password: func() *string { value := string(hashedPassword); return &value }(), UpdatedAt: now}
		if _, err := tx.NewUpdate().Model(user).Column("password", "updated_at").WherePK().Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewUpdate().Model((*Session)(nil)).
			Set("is_revoked = true").
			Set("updated_at = ?", now).
			Where("user_id = ?", resetToken.UserID).
			Where("is_revoked = false").
			Exec(ctx); err != nil {
			return err
		}
		_, err := tx.NewUpdate().Model(resetToken).Column("used_at").WherePK().Exec(ctx)
		if err != nil {
			return err
		}
		resetToken.UsedAt = &now
		return nil
	})
	if err != nil {
		return utils.ErrInternalServerError("Unable to update password")
	}

	return nil
}

func (s *AuthService) Register(ctx context.Context, req *RegisterRequest, ip, ua string) (*AuthResult, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))

	// Check existing user
	exists, err := s.db.NewSelect().
		Model((*User)(nil)).
		Where("LOWER(email) = ?", cleanEmail).
		Exists(ctx)
	if err != nil {
		return nil, utils.ErrInternalServerError("Database error checking email")
	}
	if exists {
		return nil, utils.ErrConflict("Email is already registered")
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to hash password")
	}
	passwordHash := string(hashed)

	now := time.Now()
	user := &User{
		Name:      strings.TrimSpace(req.Name),
		Email:     cleanEmail,
		Password:  &passwordHash,
		Provider:  "local",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if _, err := s.db.NewInsert().Model(user).Exec(ctx); err != nil {
		return nil, utils.ErrInternalServerError("Failed to create user account")
	}

	return s.createSession(ctx, user, true, ip, ua)
}

func (s *AuthService) Login(ctx context.Context, req *LoginRequest, ip, ua string) (*AuthResult, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))

	user := new(User)
	err := s.db.NewSelect().
		Model(user).
		Where("LOWER(email) = ?", cleanEmail).
		Scan(ctx)
	if err != nil {
		return nil, utils.ErrUnauthorized("Invalid email or password")
	}

	if user.Password == nil || *user.Password == "" {
		return nil, utils.ErrUnauthorized("This account was registered with Google. Please use Google Sign In.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.Password), []byte(req.Password)); err != nil {
		return nil, utils.ErrUnauthorized("Invalid email or password")
	}

	return s.createSession(ctx, user, req.RememberMe, ip, ua)
}

func (s *AuthService) GoogleAuth(ctx context.Context, req *GoogleAuthRequest, ip, ua string) (*AuthResult, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))

	user := new(User)
	err := s.db.NewSelect().
		Model(user).
		Where("LOWER(email) = ?", cleanEmail).
		Scan(ctx)

	now := time.Now()
	if err != nil {
		// New user from Google
		user = &User{
			Name:      strings.TrimSpace(req.Name),
			Email:     cleanEmail,
			Provider:  "google",
			CreatedAt: now,
			UpdatedAt: now,
		}
		if _, err := s.db.NewInsert().Model(user).Exec(ctx); err != nil {
			return nil, utils.ErrInternalServerError("Failed to create Google user account")
		}
	} else {
		// Existing user
		user.UpdatedAt = now
		if _, err := s.db.NewUpdate().Model(user).WherePK().Exec(ctx); err != nil {
			return nil, utils.ErrInternalServerError("Failed to update user profile")
		}
	}

	return s.createSession(ctx, user, req.RememberMe, ip, ua)
}

func (s *AuthService) createSession(ctx context.Context, user *User, rememberMe bool, ip, ua string) (*AuthResult, error) {
	accessToken, err := generateSecureToken(32)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to generate access token")
	}

	refreshToken, err := generateSecureToken(32)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to generate refresh token")
	}

	now := time.Now()
	accessExpires := now.Add(AccessTokenDuration)
	refreshExpires := now.Add(RefreshTokenDuration)

	session := &Session{
		UserID:                user.ID,
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		AccessTokenExpiresAt:  accessExpires,
		RefreshTokenExpiresAt: refreshExpires,
		RememberMe:            rememberMe,
		IPAddress:             &ip,
		UserAgent:             &ua,
		IsRevoked:             false,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	if _, err := s.db.NewInsert().Model(session).Exec(ctx); err != nil {
		return nil, utils.ErrInternalServerError("Failed to persist session")
	}

	return &AuthResult{
		User:                  ToUserResponse(user),
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		AccessTokenExpiresAt:  accessExpires.Unix(),
		RefreshTokenExpiresAt: refreshExpires.Unix(),
		RememberMe:            rememberMe,
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string, ip, ua string) (*AuthResult, error) {
	if refreshTokenStr == "" {
		return nil, utils.ErrUnauthorized("Refresh token is required")
	}

	session := new(Session)
	err := s.db.NewSelect().
		Model(session).
		Relation("User").
		Where("s.refresh_token = ?", refreshTokenStr).
		Where("s.is_revoked = false").
		Scan(ctx)
	if err != nil {
		return nil, utils.ErrUnauthorized("Invalid or revoked session")
	}

	now := time.Now()
	if session.RefreshTokenExpiresAt.Before(now) {
		session.IsRevoked = true
		session.UpdatedAt = now
		_, _ = s.db.NewUpdate().Model(session).Column("is_revoked", "updated_at").WherePK().Exec(ctx)
		return nil, utils.ErrUnauthorized("Refresh token has expired, please log in again")
	}

	// Generate new access token (valid for 1 week)
	newAccessToken, err := generateSecureToken(32)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to generate access token")
	}
	newAccessExpires := now.Add(AccessTokenDuration)

	session.AccessToken = newAccessToken
	session.AccessTokenExpiresAt = newAccessExpires
	session.UpdatedAt = now
	session.IPAddress = &ip
	session.UserAgent = &ua

	// Remember Me logic:
	// If remember_me == true, refresh token expiry is also extended by 30 days!
	// If remember_me == false, refresh token expiry remains unchanged.
	if session.RememberMe {
		session.RefreshTokenExpiresAt = now.Add(RefreshTokenDuration)
	}

	columnsToUpdate := []string{
		"access_token",
		"access_token_expires_at",
		"refresh_token_expires_at",
		"ip_address",
		"user_agent",
		"updated_at",
	}

	if _, err := s.db.NewUpdate().Model(session).Column(columnsToUpdate...).WherePK().Exec(ctx); err != nil {
		return nil, utils.ErrInternalServerError("Failed to update session tokens")
	}

	return &AuthResult{
		User:                  ToUserResponse(session.User),
		AccessToken:           session.AccessToken,
		RefreshToken:          session.RefreshToken,
		AccessTokenExpiresAt:  session.AccessTokenExpiresAt.Unix(),
		RefreshTokenExpiresAt: session.RefreshTokenExpiresAt.Unix(),
		RememberMe:            session.RememberMe,
	}, nil
}

func (s *AuthService) GetSessionByAccessToken(ctx context.Context, accessTokenStr string) (*Session, error) {
	if accessTokenStr == "" {
		return nil, utils.ErrUnauthorized("Access token required")
	}

	session := new(Session)
	err := s.db.NewSelect().
		Model(session).
		Relation("User").
		Where("s.access_token = ?", accessTokenStr).
		Where("s.is_revoked = false").
		Scan(ctx)
	if err != nil {
		return nil, utils.ErrUnauthorized("Invalid session")
	}

	return session, nil
}

func (s *AuthService) Logout(ctx context.Context, accessTokenStr, refreshTokenStr string) error {
	query := s.db.NewUpdate().
		Model((*Session)(nil)).
		Set("is_revoked = true").
		Set("updated_at = ?", time.Now())

	hasCondition := false
	if accessTokenStr != "" {
		query = query.Where("access_token = ?", accessTokenStr)
		hasCondition = true
	} else if refreshTokenStr != "" {
		query = query.Where("refresh_token = ?", refreshTokenStr)
		hasCondition = true
	}

	if !hasCondition {
		return nil
	}

	_, err := query.Exec(ctx)
	return err
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*UserResponse, error) {
	user := new(User)
	err := s.db.NewSelect().
		Model(user).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, utils.ErrNotFound("User not found")
	}
	return ToUserResponse(user), nil
}
