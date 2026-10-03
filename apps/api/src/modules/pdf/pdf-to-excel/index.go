package pdftoexcel

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, c *PdfToExcelController) {
	group := router.Group("/pdf")
	group.Post("/pdf-to-excel", c.ConvertPdfToExcel)
}
