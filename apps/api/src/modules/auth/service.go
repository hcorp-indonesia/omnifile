package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/mail"
	"os"
	"strings"
	"time"
	"unicode"

	"magic-converter/src/utils"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
)

const (
	AccessTokenDuration  = 7 * 24 * time.Hour
	RefreshTokenDuration = 30 * 24 * time.Hour
	LoginOTPDuration     = 10 * time.Minute
	LoginOTPCooldown     = 60 * time.Second
	LoginOTPMaxAttempts  = 5
	LoginOTPIPWindow     = 10 * time.Minute
	LoginOTPIPMaxRequest = 10
)

type AuthService struct {
	db     *bun.DB
	mailer *utils.SMTPMailer
}

func NewAuthService(db *bun.DB, mailer *utils.SMTPMailer) *AuthService {
	return &AuthService{db: db, mailer: mailer}
}

func generateSecureToken(byteLength int) (string, error) {
	buffer := make([]byte, byteLength)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func generateLoginOTP() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

func normalizeEmail(rawEmail string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(rawEmail))
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || !strings.Contains(email, "@") {
		return "", utils.ErrBadRequest("A valid email address is required")
	}
	return email, nil
}

func loginOTPDigest(email, code string) (string, error) {
	secret := strings.TrimSpace(os.Getenv("OTP_SECRET"))
	if secret == "" {
		secret = strings.TrimSpace(os.Getenv("JWT_SECRET"))
	}
	if secret == "" {
		return "", fmt.Errorf("OTP_SECRET or JWT_SECRET is required")
	}

	digest := hmac.New(sha256.New, []byte(secret))
	_, _ = digest.Write([]byte(email + ":" + code))
	return hex.EncodeToString(digest.Sum(nil)), nil
}

func (s *AuthService) RequestLoginOTP(ctx context.Context, req *RequestLoginOTPRequest, ip string) (*RequestLoginOTPResult, error) {
	email, err := normalizeEmail(req.Email)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if ip != "" {
		requestCount, countErr := s.db.NewSelect().Model((*LoginOTP)(nil)).
			Where("requested_ip = ?", ip).
			Where("created_at > ?", now.Add(-LoginOTPIPWindow)).
			Count(ctx)
		if countErr != nil {
			log.Error().Err(countErr).Msg("Failed to check OTP IP rate limit")
			return nil, utils.ErrInternalServerError("Unable to send login code")
		}
		if requestCount >= LoginOTPIPMaxRequest {
			return nil, utils.ErrTooManyRequests("Too many login code requests. Please try again later")
		}
	}

	latestOTP := new(LoginOTP)
	err = s.db.NewSelect().Model(latestOTP).
		Where("lo.email = ?", email).
		Order("lo.created_at DESC").
		Limit(1).
		Scan(ctx)
	if err == nil && latestOTP.CreatedAt.Add(LoginOTPCooldown).After(now) {
		return nil, utils.ErrTooManyRequests("Please wait one minute before requesting another code")
	}
	if err != nil && err != sql.ErrNoRows {
		log.Error().Err(err).Msg("Failed to check OTP cooldown")
		return nil, utils.ErrInternalServerError("Unable to send login code")
	}

	code, err := generateLoginOTP()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate login OTP")
		return nil, utils.ErrInternalServerError("Unable to send login code")
	}
	digest, err := loginOTPDigest(email, code)
	if err != nil {
		log.Error().Err(err).Msg("OTP secret is not configured")
		return nil, utils.ErrInternalServerError("Unable to send login code")
	}

	if _, err := s.db.NewUpdate().Model((*LoginOTP)(nil)).
		Set("used_at = ?", now).
		Where("email = ?", email).
		Where("used_at IS NULL").
		Exec(ctx); err != nil {
		log.Error().Err(err).Msg("Failed to invalidate previous login OTP")
		return nil, utils.ErrInternalServerError("Unable to send login code")
	}

	otp := &LoginOTP{
		Email:       email,
		CodeDigest:  digest,
		ExpiresAt:   now.Add(LoginOTPDuration),
		RequestedIP: &ip,
		CreatedAt:   now,
	}
	if _, err := s.db.NewInsert().Model(otp).Exec(ctx); err != nil {
		log.Error().Err(err).Msg("Failed to persist login OTP")
		return nil, utils.ErrInternalServerError("Unable to send login code")
	}

	if err := s.mailer.SendLoginOTP(email, code, LoginOTPDuration); err != nil {
		log.Error().Err(err).Msg("Failed to send login OTP email")
		_, _ = s.db.NewDelete().Model(otp).WherePK().Exec(ctx)
		return nil, utils.ErrInternalServerError("Unable to send login code. Please try again later")
	}

	return &RequestLoginOTPResult{
		Email:             email,
		ExpiresInSeconds:  int(LoginOTPDuration.Seconds()),
		ResendAfterSecond: int(LoginOTPCooldown.Seconds()),
	}, nil
}

func (s *AuthService) VerifyLoginOTP(ctx context.Context, req *VerifyLoginOTPRequest, ip, userAgent string) (*AuthResult, error) {
	email, err := normalizeEmail(req.Email)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(req.Code)
	if len(code) != 6 {
		return nil, utils.ErrBadRequest("The login code must contain 6 digits")
	}
	for _, character := range code {
		if !unicode.IsDigit(character) {
			return nil, utils.ErrBadRequest("The login code must contain 6 digits")
		}
	}

	now := time.Now()
	otp := new(LoginOTP)
	err = s.db.NewSelect().Model(otp).
		Where("lo.email = ?", email).
		Where("lo.used_at IS NULL").
		Where("lo.expires_at > ?", now).
		Where("lo.attempts < ?", LoginOTPMaxAttempts).
		Order("lo.created_at DESC").
		Limit(1).
		Scan(ctx)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Error().Err(err).Msg("Failed to load login OTP")
		}
		return nil, utils.ErrUnauthorized("Invalid or expired login code")
	}

	expectedDigest, err := loginOTPDigest(email, code)
	if err != nil {
		log.Error().Err(err).Msg("OTP secret is not configured")
		return nil, utils.ErrInternalServerError("Unable to verify login code")
	}
	if subtle.ConstantTimeCompare([]byte(expectedDigest), []byte(otp.CodeDigest)) != 1 {
		update := s.db.NewUpdate().Model(otp).Set("attempts = attempts + 1")
		if otp.Attempts+1 >= LoginOTPMaxAttempts {
			update = update.Set("used_at = ?", now)
		}
		if _, updateErr := update.WherePK().Exec(ctx); updateErr != nil {
			log.Error().Err(updateErr).Msg("Failed to update login OTP attempts")
		}
		return nil, utils.ErrUnauthorized("Invalid or expired login code")
	}

	result, err := s.db.NewUpdate().Model(otp).
		Set("used_at = ?", now).
		WherePK().
		Where("used_at IS NULL").
		Exec(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to consume login OTP")
		return nil, utils.ErrInternalServerError("Unable to verify login code")
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected != 1 {
		return nil, utils.ErrUnauthorized("Login code has already been used")
	}

	user, err := s.findOrCreateUser(ctx, email, now)
	if err != nil {
		return nil, err
	}
	return s.createSession(ctx, user, true, ip, userAgent)
}

func (s *AuthService) findOrCreateUser(ctx context.Context, email string, now time.Time) (*User, error) {
	user := new(User)
	err := s.db.NewSelect().Model(user).Where("LOWER(email) = ?", email).Scan(ctx)
	if err == nil {
		if user.Provider != "email_otp" {
			user.Provider = "email_otp"
			user.UpdatedAt = now
			if _, updateErr := s.db.NewUpdate().Model(user).Column("provider", "updated_at").WherePK().Exec(ctx); updateErr != nil {
				log.Error().Err(updateErr).Msg("Failed to update user login provider")
				return nil, utils.ErrInternalServerError("Unable to sign in")
			}
		}
		return user, nil
	}
	if err != sql.ErrNoRows {
		log.Error().Err(err).Msg("Failed to find OTP user")
		return nil, utils.ErrInternalServerError("Unable to sign in")
	}

	user = &User{
		Name:      displayNameFromEmail(email),
		Email:     email,
		Provider:  "email_otp",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := s.db.NewInsert().Model(user).Exec(ctx); err != nil {
		log.Error().Err(err).Msg("Failed to create OTP user")
		return nil, utils.ErrInternalServerError("Unable to sign in")
	}
	return user, nil
}

func displayNameFromEmail(email string) string {
	localPart := strings.SplitN(email, "@", 2)[0]
	parts := strings.FieldsFunc(localPart, func(character rune) bool {
		return character == '.' || character == '_' || character == '-'
	})
	for index, part := range parts {
		runes := []rune(strings.ToLower(part))
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
			parts[index] = string(runes)
		}
	}
	name := strings.TrimSpace(strings.Join(parts, " "))
	if name == "" {
		return "Magic Converter User"
	}
	return name
}

func (s *AuthService) createSession(ctx context.Context, user *User, rememberMe bool, ip, userAgent string) (*AuthResult, error) {
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
		UserAgent:             &userAgent,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	if _, err := s.db.NewInsert().Model(session).Exec(ctx); err != nil {
		log.Error().Err(err).Msg("Failed to persist session")
		return nil, utils.ErrInternalServerError("Failed to create session")
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

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string, ip, userAgent string) (*AuthResult, error) {
	if refreshToken == "" {
		return nil, utils.ErrUnauthorized("Refresh token is required")
	}

	session := new(Session)
	err := s.db.NewSelect().Model(session).
		Relation("User").
		Where("s.refresh_token = ?", refreshToken).
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
		return nil, utils.ErrUnauthorized("Session has expired, please sign in again")
	}

	newAccessToken, err := generateSecureToken(32)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to generate access token")
	}
	session.AccessToken = newAccessToken
	session.AccessTokenExpiresAt = now.Add(AccessTokenDuration)
	session.UpdatedAt = now
	session.IPAddress = &ip
	session.UserAgent = &userAgent
	if session.RememberMe {
		session.RefreshTokenExpiresAt = now.Add(RefreshTokenDuration)
	}

	if _, err := s.db.NewUpdate().Model(session).Column(
		"access_token",
		"access_token_expires_at",
		"refresh_token_expires_at",
		"ip_address",
		"user_agent",
		"updated_at",
	).WherePK().Exec(ctx); err != nil {
		return nil, utils.ErrInternalServerError("Failed to update session")
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

func (s *AuthService) GetSessionByAccessToken(ctx context.Context, accessToken string) (*Session, error) {
	if accessToken == "" {
		return nil, utils.ErrUnauthorized("Access token required")
	}

	session := new(Session)
	err := s.db.NewSelect().Model(session).
		Relation("User").
		Where("s.access_token = ?", accessToken).
		Where("s.is_revoked = false").
		Scan(ctx)
	if err != nil {
		return nil, utils.ErrUnauthorized("Invalid session")
	}
	return session, nil
}

func (s *AuthService) Logout(ctx context.Context, accessToken, refreshToken string) error {
	query := s.db.NewUpdate().Model((*Session)(nil)).
		Set("is_revoked = true").
		Set("updated_at = ?", time.Now())

	if accessToken != "" {
		query = query.Where("access_token = ?", accessToken)
	} else if refreshToken != "" {
		query = query.Where("refresh_token = ?", refreshToken)
	} else {
		return nil
	}

	_, err := query.Exec(ctx)
	return err
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*UserResponse, error) {
	user := new(User)
	if err := s.db.NewSelect().Model(user).Where("id = ?", id).Scan(ctx); err != nil {
		return nil, utils.ErrNotFound("User not found")
	}
	return ToUserResponse(user), nil
}
