package auth

import (
	"os"
	"time"

	"magic-converter/src/utils"

	"github.com/gofiber/fiber/v3"
)

type AuthController struct {
	service *AuthService
}

func NewAuthController(service *AuthService) *AuthController {
	return &AuthController{service: service}
}

func (c *AuthController) setAuthCookies(ctx fiber.Ctx, result *AuthResult) {
	isSecure := os.Getenv("APP_ENV") == "production"

	ctx.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    result.AccessToken,
		Expires:  time.Unix(result.AccessTokenExpiresAt, 0),
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})

	ctx.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    result.RefreshToken,
		Expires:  time.Unix(result.RefreshTokenExpiresAt, 0),
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})
}

func (c *AuthController) clearAuthCookies(ctx fiber.Ctx) {
	isSecure := os.Getenv("APP_ENV") == "production"
	expired := time.Now().Add(-24 * time.Hour)

	ctx.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  expired,
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})

	ctx.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  expired,
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})
}

func (c *AuthController) Register(ctx fiber.Ctx) error {
	var req RegisterRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	ip := ctx.IP()
	ua := ctx.Get(fiber.HeaderUserAgent)

	result, err := c.service.Register(ctx.Context(), &req, ip, ua)
	if err != nil {
		return err
	}

	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Registration successful", result.User)
}

func (c *AuthController) Login(ctx fiber.Ctx) error {
	var req LoginRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	ip := ctx.IP()
	ua := ctx.Get(fiber.HeaderUserAgent)

	result, err := c.service.Login(ctx.Context(), &req, ip, ua)
	if err != nil {
		return err
	}

	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Login successful", result.User)
}

func (c *AuthController) GoogleAuth(ctx fiber.Ctx) error {
	var req GoogleAuthRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	ip := ctx.IP()
	ua := ctx.Get(fiber.HeaderUserAgent)

	result, err := c.service.GoogleAuth(ctx.Context(), &req, ip, ua)
	if err != nil {
		return err
	}

	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Google authentication successful", result.User)
}

func (c *AuthController) Refresh(ctx fiber.Ctx) error {
	refreshToken := ctx.Cookies("refresh_token")
	if refreshToken == "" {

		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = ctx.Bind().Body(&body)
		refreshToken = body.RefreshToken
	}

	if refreshToken == "" {
		return utils.ErrUnauthorized("No refresh token provided in cookies")
	}

	ip := ctx.IP()
	ua := ctx.Get(fiber.HeaderUserAgent)

	result, err := c.service.RefreshToken(ctx.Context(), refreshToken, ip, ua)
	if err != nil {
		c.clearAuthCookies(ctx)
		return err
	}

	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Tokens refreshed successfully", result.User)
}

func (c *AuthController) Me(ctx fiber.Ctx) error {
	if userVal := ctx.Locals("user"); userVal != nil {
		if user, ok := userVal.(*UserResponse); ok {
			return utils.RespondSuccess(ctx, "Authenticated user", user)
		}
	}

	accessToken := ctx.Cookies("access_token")
	if accessToken != "" {
		session, err := c.service.GetSessionByAccessToken(ctx.Context(), accessToken)
		if err == nil && session.AccessTokenExpiresAt.After(time.Now()) {
			return utils.RespondSuccess(ctx, "Authenticated user", ToUserResponse(session.User))
		}
	}

	refreshToken := ctx.Cookies("refresh_token")
	if refreshToken != "" {
		ip := ctx.IP()
		ua := ctx.Get(fiber.HeaderUserAgent)
		result, err := c.service.RefreshToken(ctx.Context(), refreshToken, ip, ua)
		if err == nil {
			c.setAuthCookies(ctx, result)
			return utils.RespondSuccess(ctx, "Authenticated user", result.User)
		}
	}

	c.clearAuthCookies(ctx)
	return utils.ErrUnauthorized("Not authenticated")
}

func (c *AuthController) Logout(ctx fiber.Ctx) error {
	accessToken := ctx.Cookies("access_token")
	refreshToken := ctx.Cookies("refresh_token")

	_ = c.service.Logout(ctx.Context(), accessToken, refreshToken)
	c.clearAuthCookies(ctx)

	return utils.RespondSuccess(ctx, "Logged out successfully", nil)
}

func (c *AuthController) RequestPasswordReset(ctx fiber.Ctx) error {
	var req RequestPasswordResetRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	if err := c.service.RequestPasswordReset(ctx.Context(), &req); err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "If the email is registered, a password reset link has been sent.", nil)
}

func (c *AuthController) ResetPassword(ctx fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	if err := c.service.ResetPassword(ctx.Context(), &req); err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "Password updated successfully. Please sign in again.", nil)
}
