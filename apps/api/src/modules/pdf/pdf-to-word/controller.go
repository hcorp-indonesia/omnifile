package pdftoword

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type PdfToWordController struct {
	service *PdfToWordService
}

func NewPdfToWordController(service *PdfToWordService) *PdfToWordController {
	return &PdfToWordController{service: service}
}

func (c *PdfToWordController) ConvertPdfToWord(ctx fiber.Ctx) error {
	form, err := ctx.MultipartForm()
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid multipart form data",
		})
	}

	files := form.File["files"]
	if len(files) == 0 {
		files = form.File["file"]
	}
	if len(files) == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please select at least one PDF file to convert to Word",
		})
	}

	engine := strings.ToLower(strings.TrimSpace(ctx.FormValue("engine")))
	if engine == "" {
		engine = "auto"
	}

	ocrVal := strings.ToLower(strings.TrimSpace(ctx.FormValue("ocr")))
	ocr := ocrVal == "true" || ocrVal == "1" || ocrVal == "yes"

	ocrLang := strings.TrimSpace(ctx.FormValue("ocr_lang"))
	if ocrLang == "" {
		ocrLang = "eng"
	}

	opts := ConvertWordOptions{
		Engine:  engine,
		OCR:     ocr,
		OCRLang: ocrLang,
	}

	results := make([]WordFileResult, 0, len(files))

	for _, fileHeader := range files {
		if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Only PDF files are supported: " + fileHeader.Filename,
			})
		}

		file, err := fileHeader.Open()
		if err != nil {
			log.Error().Err(err).Str("file", fileHeader.Filename).Msg("Failed to open uploaded PDF file")
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Unable to open " + fileHeader.Filename,
			})
		}

		result, convertErr := c.service.Convert(ctx.Context(), fileHeader.Filename, fileHeader.Size, file, opts)
		_ = file.Close()

		if convertErr != nil {
			log.Error().Err(convertErr).Str("file", fileHeader.Filename).Msg("Failed to convert PDF to Word")
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to convert " + fileHeader.Filename + ": " + convertErr.Error(),
			})
		}

		results = append(results, *result)
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "PDF converted to Word (.docx) successfully",
		"data":    results,
	})
}
