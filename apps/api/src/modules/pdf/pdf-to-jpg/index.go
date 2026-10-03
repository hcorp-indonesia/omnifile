package pdftojpg

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, c *PdfToJpgController) {
	group := router.Group("/pdf")
	group.Post("/pdf-to-jpg", c.ConvertPdfToJpg)
	group.Post("/pdf-to-jpeg", c.ConvertPdfToJpeg)
	group.Post("/pdf-to-png", c.ConvertPdfToPng)
	group.Post("/pdf-to-webp", c.ConvertPdfToWebp)
	group.Post("/pdf-to-avif", c.ConvertPdfToAvif)
}
