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
	for _, name := range []string{"access_token", "refresh_token"} {
		ctx.Cookie(&fiber.Cookie{
			Name:     name,
			Value:    "",
			Expires:  expired,
			HTTPOnly: true,
			Secure:   isSecure,
			SameSite: "Lax",
			Path:     "/",
		})
	}
}

func (c *AuthController) RequestLoginOTP(ctx fiber.Ctx) error {
	var req RequestLoginOTPRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	result, err := c.service.RequestLoginOTP(ctx.Context(), &req, ctx.IP())
	if err != nil {
		return err
	}
	return utils.RespondSuccess(ctx, "Login code sent", result)
}

func (c *AuthController) VerifyLoginOTP(ctx fiber.Ctx) error {
	var req VerifyLoginOTPRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return utils.ErrBadRequest("Invalid request body")
	}

	result, err := c.service.VerifyLoginOTP(ctx.Context(), &req, ctx.IP(), ctx.Get(fiber.HeaderUserAgent))
	if err != nil {
		return err
	}
	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Login successful", result.User)
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
		return utils.ErrUnauthorized("No refresh token provided")
	}

	result, err := c.service.RefreshToken(ctx.Context(), refreshToken, ctx.IP(), ctx.Get(fiber.HeaderUserAgent))
	if err != nil {
		c.clearAuthCookies(ctx)
		return err
	}
	c.setAuthCookies(ctx, result)
	return utils.RespondSuccess(ctx, "Session refreshed", result.User)
}

func (c *AuthController) Me(ctx fiber.Ctx) error {
	if userValue := ctx.Locals("user"); userValue != nil {
		if user, ok := userValue.(*UserResponse); ok {
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
		result, err := c.service.RefreshToken(ctx.Context(), refreshToken, ctx.IP(), ctx.Get(fiber.HeaderUserAgent))
		if err == nil {
			c.setAuthCookies(ctx, result)
			return utils.RespondSuccess(ctx, "Authenticated user", result.User)
		}
	}

	c.clearAuthCookies(ctx)
	return utils.ErrUnauthorized("Not authenticated")
}

func (c *AuthController) Logout(ctx fiber.Ctx) error {
	_ = c.service.Logout(ctx.Context(), ctx.Cookies("access_token"), ctx.Cookies("refresh_token"))
	c.clearAuthCookies(ctx)
	return utils.RespondSuccess(ctx, "Logged out successfully", nil)
}
