package compresspdf

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *CompressPdfController) {
	router.Post("/pdf/compress", controller.CompressPdf)
}
