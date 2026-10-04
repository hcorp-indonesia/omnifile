package upscaleimage

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *UpscaleImageController) {
	router.Post("/image/upscale", controller.Upscale)
}
