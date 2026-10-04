package convertimage

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *ConvertImageController) {
	router.Post("/image/convert", controller.ConvertImage)
}
