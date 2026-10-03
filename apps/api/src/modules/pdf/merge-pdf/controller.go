package mergepdf

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type MergePdfController struct {
	service *MergePdfService
}

func NewMergePdfController(service *MergePdfService) *MergePdfController {
	return &MergePdfController{service: service}
}

func (c *MergePdfController) Merge(ctx fiber.Ctx) error {
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

	if len(files) < 2 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please upload at least 2 PDF files to merge",
		})
	}

	for _, fh := range files {
		if !strings.HasSuffix(strings.ToLower(fh.Filename), ".pdf") {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "All uploaded files must be valid PDF documents: " + fh.Filename,
			})
		}
	}

	outName := strings.TrimSpace(ctx.FormValue("output_file_name"))
	if outName == "" {
		outName = strings.TrimSpace(ctx.FormValue("file_name"))
	}
	if outName == "" {
		outName = "merged-document.pdf"
	}

	opts := MergePdfOptions{
		OutputFileName: outName,
	}

	result, err := c.service.Merge(ctx.Context(), files, opts)
	if err != nil {
		log.Error().Err(err).Msg("Failed to merge PDF files")
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to merge PDF files: " + err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "PDF files successfully merged",
		"data":    result,
	})
}
