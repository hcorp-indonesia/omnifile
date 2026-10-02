package converter

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, c *ConverterController) {
	group := router.Group("/converters")
	group.Get("", c.List)
	group.Get("/:id", c.Get)
	group.Post("", c.Create)
	group.Put("/:id", c.Update)
	group.Delete("/:id", c.Delete)
}
