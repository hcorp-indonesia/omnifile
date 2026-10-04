package ocrpdf

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

type OcrPdfController struct {
	service *OcrPdfService
}

func NewOcrPdfController(service *OcrPdfService) *OcrPdfController {
	return &OcrPdfController{service: service}
}

func (c *OcrPdfController) OcrPdf(ctx fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(OcrPdfResponse{
			Success: false,
			Message: "No PDF file uploaded. Please provide a file in multipart form under 'file'.",
		})
	}

	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
		return ctx.Status(fiber.StatusBadRequest).JSON(OcrPdfResponse{
			Success: false,
			Message: "Uploaded file must be a PDF document (.pdf).",
		})
	}

	var opts OcrPdfOptions
	if err := ctx.Bind().Body(&opts); err != nil {
		opts = OcrPdfOptions{}
	}

	if opts.Language == "" {
		opts.Language = ctx.FormValue("language", "eng+ind")
	}
	if opts.OutputFileName == "" {
		opts.OutputFileName = ctx.FormValue("output_file_name")
	}

	result, err := c.service.OcrPdf(ctx.Context(), fileHeader, opts)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(OcrPdfResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(OcrPdfResponse{
		Success: true,
		Message: "PDF OCR processed successfully",
		Data:    result,
	})
}
