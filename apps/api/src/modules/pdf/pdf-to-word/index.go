package pdftoword

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, controller *PdfToWordController) {
	router.Group("/pdf").Post("/pdf-to-word", controller.ConvertPdfToWord)
}
