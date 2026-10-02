package media

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, c *MediaController) {
	group := router.Group("/media")
	group.Post("/convert", c.Convert)
	group.Post("/remove-bg", c.RemoveBG)
	group.Post("/upscale", c.Upscale)
}
