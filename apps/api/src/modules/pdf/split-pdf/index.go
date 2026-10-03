package splitpdf

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *SplitPdfController) {
	router.Post("/pdf/split", controller.Split)
	router.Post("/pdf/info", controller.GetInfo)
}
