package removepdf

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type RemovePdfController struct {
	service *RemovePdfService
}

func NewRemovePdfController(service *RemovePdfService) *RemovePdfController {
	return &RemovePdfController{service: service}
}

func (c *RemovePdfController) Remove(ctx fiber.Ctx) error {
	file, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please upload a PDF document",
		})
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Uploaded file must be a PDF document",
		})
	}

	pages := strings.TrimSpace(ctx.FormValue("pages"))
	if pages == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please specify which pages to remove",
		})
	}

	outputFileName := strings.TrimSpace(ctx.FormValue("output_file_name"))

	opts := RemovePdfOptions{
		Pages:          pages,
		OutputFileName: outputFileName,
	}

	res, err := c.service.RemovePages(ctx.Context(), file, opts)
	if err != nil {
		log.Error().Err(err).Str("file", file.Filename).Interface("opts", opts).Msg("Failed to remove PDF pages")
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    res,
	})
}
