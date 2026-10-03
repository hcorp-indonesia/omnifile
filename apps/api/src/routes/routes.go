package routes

import (
	"magic-converter/src/middleware"
	"magic-converter/src/modules/auth"
	pdftoexcel "magic-converter/src/modules/pdf/pdf-to-excel"
	pdftojpg "magic-converter/src/modules/pdf/pdf-to-jpg"
	pdftoword "magic-converter/src/modules/pdf/pdf-to-word"
	mergepdf "magic-converter/src/modules/pdf/merge-pdf"

	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(
	app *fiber.App,
	authController *auth.AuthController,
	authMiddleware *middleware.AuthMiddleware,
	pdfToJpgController *pdftojpg.PdfToJpgController,
	pdfToExcelController *pdftoexcel.PdfToExcelController,
	pdfToWordController *pdftoword.PdfToWordController,
	mergePdfController *mergepdf.MergePdfController,
) {
	const ApiVersion = "/api/v1"
	api := app.Group(ApiVersion)

	auth.RegisterRoutes(api, authController)
	pdftojpg.RegisterRoutes(api, pdfToJpgController)
	pdftoexcel.RegisterRoutes(api, pdfToExcelController)
	pdftoword.RegisterRoutes(api, pdfToWordController)
	mergepdf.RegisterRoutes(api, mergePdfController)
}
