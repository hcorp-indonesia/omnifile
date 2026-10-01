package auth

import (
	"gofiber-starterkit/app/shared"
	"github.com/gofiber/fiber/v3"
)

type AuthController struct {
	service *AuthService
}

func NewAuthController(service *AuthService) *AuthController {
	return &AuthController{service: service}
}

func (c *AuthController) Login(ctx fiber.Ctx) error {
	// TODO: Implement login logic
	return shared.RespondSuccess(ctx, "Login success", nil)
}

func (c *AuthController) Register(ctx fiber.Ctx) error {
	// TODO: Implement register logic
	return shared.RespondSuccess(ctx, "Registration success", nil)
}
