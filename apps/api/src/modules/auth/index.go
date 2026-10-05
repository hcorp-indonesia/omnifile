package auth

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, controller *AuthController) {
	group := router.Group("/auth")
	group.Post("/request-otp", controller.RequestLoginOTP)
	group.Post("/verify-otp", controller.VerifyLoginOTP)
	group.Post("/refresh", controller.Refresh)
	group.Get("/me", controller.Me)
	group.Post("/logout", controller.Logout)
}
