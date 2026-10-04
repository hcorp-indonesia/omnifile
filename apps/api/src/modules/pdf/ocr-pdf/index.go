package ocrpdf

import (
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(router fiber.Router, controller *OcrPdfController) {
	pdfGroup := router.Group("/pdf")
	pdfGroup.Post("/ocr", controller.OcrPdf)
}
