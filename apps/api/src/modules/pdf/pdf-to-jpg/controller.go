package pdftojpg

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type PdfToJpgController struct {
	service *PdfToJpgService
}

func NewPdfToJpgController(service *PdfToJpgService) *PdfToJpgController {
	return &PdfToJpgController{
		service: service,
	}
}

func (c *PdfToJpgController) ConvertPdfToJpg(ctx fiber.Ctx) error {
	return c.handleConvert(ctx, "jpg")
}

func (c *PdfToJpgController) ConvertPdfToJpeg(ctx fiber.Ctx) error {
	return c.handleConvert(ctx, "jpeg")
}

func (c *PdfToJpgController) ConvertPdfToPng(ctx fiber.Ctx) error {
	return c.handleConvert(ctx, "png")
}

func (c *PdfToJpgController) ConvertPdfToWebp(ctx fiber.Ctx) error {
	return c.handleConvert(ctx, "webp")
}

func (c *PdfToJpgController) ConvertPdfToAvif(ctx fiber.Ctx) error {
	return c.handleConvert(ctx, "avif")
}

func (c *PdfToJpgController) handleConvert(ctx fiber.Ctx, defaultFormat string) error {
	form, err := ctx.MultipartForm()
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid multipart form data",
		})
	}

	files := form.File["files"]
	if len(files) == 0 {
		// Also support single file field "file"
		files = form.File["file"]
	}

	if len(files) == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please select at least one PDF file",
		})
	}

	dpi := 150
	if dpiStr := ctx.FormValue("dpi"); dpiStr != "" {
		if parsed, err := strconv.Atoi(dpiStr); err == nil && parsed > 0 {
			dpi = parsed
		}
	}

	quality := 82
	if qualityStr := ctx.FormValue("quality"); qualityStr != "" {
		if parsed, err := strconv.Atoi(qualityStr); err == nil && parsed > 0 {
			quality = parsed
		}
	}

	format := strings.ToLower(ctx.FormValue("format"))
	if format == "" {
		format = defaultFormat
	}

	opts := ConvertOptions{
		DPI:     dpi,
		Quality: quality,
		Format:  format,
	}

	results := make([]FileConversionResult, 0, len(files))

	for _, fileHeader := range files {
		if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Only PDF files are supported: " + fileHeader.Filename,
			})
		}

		file, err := fileHeader.Open()
		if err != nil {
			log.Error().Err(err).Str("file", fileHeader.Filename).Msg("Failed to open uploaded file")
			continue
		}

		res, err := c.service.Convert(ctx.Context(), fileHeader.Filename, file, opts)
		file.Close()

		if err != nil {
			log.Error().Err(err).Str("file", fileHeader.Filename).Msg("Failed to convert PDF to " + strings.ToUpper(format))
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to convert " + fileHeader.Filename + ": " + err.Error(),
			})
		}

		results = append(results, *res)
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "PDF converted to " + strings.ToUpper(format) + " successfully",
		"data":    results,
	})
}
