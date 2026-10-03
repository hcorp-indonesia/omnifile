package removepdf

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *RemovePdfController) {
	router.Post("/pdf/remove", controller.Remove)
}
