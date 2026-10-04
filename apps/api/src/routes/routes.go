package routes

import (
	"magic-converter/src/middleware"
	"magic-converter/src/modules/auth"
	pdftoexcel "magic-converter/src/modules/pdf/pdf-to-excel"
	pdftojpg "magic-converter/src/modules/pdf/pdf-to-jpg"
	pdftoword "magic-converter/src/modules/pdf/pdf-to-word"
	mergepdf "magic-converter/src/modules/pdf/merge-pdf"
	splitpdf "magic-converter/src/modules/pdf/split-pdf"
	removepdf "magic-converter/src/modules/pdf/remove-pdf"
	compresspdf "magic-converter/src/modules/pdf/compress-pdf"
	ocrpdf "magic-converter/src/modules/pdf/ocr-pdf"
	convertimage "magic-converter/src/modules/image/convert-image"
	removebg "magic-converter/src/modules/image/remove-bg"
	upscaleimage "magic-converter/src/modules/image/upscale-image"

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
	splitPdfController *splitpdf.SplitPdfController,
	removePdfController *removepdf.RemovePdfController,
	compressPdfController *compresspdf.CompressPdfController,
	ocrPdfController *ocrpdf.OcrPdfController,
	convertImageController *convertimage.ConvertImageController,
	removeBgController *removebg.RemoveBgController,
	upscaleImageController *upscaleimage.UpscaleImageController,
) {
	const ApiVersion = "/api/v1"
	api := app.Group(ApiVersion)

	auth.RegisterRoutes(api, authController)
	pdftojpg.RegisterRoutes(api, pdfToJpgController)
	pdftoexcel.RegisterRoutes(api, pdfToExcelController)
	pdftoword.RegisterRoutes(api, pdfToWordController)
	mergepdf.RegisterRoutes(api, mergePdfController)
	splitpdf.RegisterRoutes(api, splitPdfController)
	removepdf.RegisterRoutes(api, removePdfController)
	compresspdf.RegisterRoutes(api, compressPdfController)
	ocrpdf.RegisterRoutes(api, ocrPdfController)
	convertimage.RegisterRoutes(api, convertImageController)
	removebg.RegisterRoutes(api, removeBgController)
	upscaleimage.RegisterRoutes(api, upscaleImageController)
}
