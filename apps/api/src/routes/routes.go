package routes

import (
	"magic-converter/src/middleware"
	"magic-converter/src/modules/auth"
	pdftoexcel "magic-converter/src/modules/pdf/pdf-to-excel"
	pdftojpg "magic-converter/src/modules/pdf/pdf-to-jpg"

	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(
	app *fiber.App,
	authController *auth.AuthController,
	authMiddleware *middleware.AuthMiddleware,
	pdfToJpgController *pdftojpg.PdfToJpgController,
	pdfToExcelController *pdftoexcel.PdfToExcelController,
) {
	const ApiVersion = "/api/v1"
	api := app.Group(ApiVersion)

	auth.RegisterRoutes(api, authController)
	pdftojpg.RegisterRoutes(api, pdfToJpgController)
	pdftoexcel.RegisterRoutes(api, pdfToExcelController)
}

