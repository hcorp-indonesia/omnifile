package pdftoexcel

import (
	"encoding/json"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type PdfToExcelController struct {
	service *PdfToExcelService
}

func NewPdfToExcelController(service *PdfToExcelService) *PdfToExcelController {
	return &PdfToExcelController{
		service: service,
	}
}

func (c *PdfToExcelController) ConvertPdfToExcel(ctx fiber.Ctx) error {
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

	var template *PdfTemplate
	if values := form.Value["template"]; len(values) > 0 && strings.TrimSpace(values[0]) != "" {
		var parsedTemplate PdfTemplate
		if err := json.Unmarshal([]byte(values[0]), &parsedTemplate); err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Invalid document template JSON",
			})
		}
		if len(parsedTemplate.Columns) == 0 {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Document template must contain at least one column",
			})
		}
		template = &parsedTemplate
	}

	if len(files) == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please select at least one PDF file to convert to Excel",
		})
	}

	results := make([]ExcelFileResult, 0, len(files))

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
			continue
		}

		res, err := c.service.Convert(ctx.Context(), fileHeader.Filename, fileHeader.Size, file, template)
		_ = file.Close()

		if err != nil {
			log.Error().Err(err).Str("file", fileHeader.Filename).Msg("Failed to convert PDF to Excel")
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to convert " + fileHeader.Filename + ": " + err.Error(),
			})
		}

		results = append(results, *res)
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "PDF converted to Excel (.xlsx) successfully",
		"data":    results,
	})
}
