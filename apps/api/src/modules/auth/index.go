package auth

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, c *AuthController) {
	group := router.Group("/auth")
	group.Post("/register", c.Register)
	group.Post("/login", c.Login)
	group.Post("/google", c.GoogleAuth)
	group.Post("/refresh", c.Refresh)
	group.Get("/me", c.Me)
	group.Post("/logout", c.Logout)
	group.Post("/password-reset/request", c.RequestPasswordReset)
	group.Post("/password-reset/confirm", c.ResetPassword)
}
