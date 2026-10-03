package mergepdf

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *MergePdfController) {
	router.Post("/pdf/merge", controller.Merge)
}
