package removebg

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *RemoveBgController) {
	router.Post("/image/remove-bg", controller.RemoveBackground)
}
