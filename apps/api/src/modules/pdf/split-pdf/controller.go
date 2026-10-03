package splitpdf

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type SplitPdfController struct {
	service *SplitPdfService
}

func NewSplitPdfController(service *SplitPdfService) *SplitPdfController {
	return &SplitPdfController{service: service}
}

func (c *SplitPdfController) GetInfo(ctx fiber.Ctx) error {
	file, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please upload a valid PDF document",
		})
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Uploaded file must be a PDF document",
		})
	}

	info, err := c.service.GetInfo(ctx.Context(), file)
	if err != nil {
		log.Error().Err(err).Str("file", file.Filename).Msg("Failed to inspect PDF info")
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    info,
	})
}

func (c *SplitPdfController) Split(ctx fiber.Ctx) error {
	file, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Please upload a PDF document to split",
		})
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Uploaded file must be a PDF document",
		})
	}

	mode := strings.TrimSpace(ctx.FormValue("mode"))
	if mode == "" {
		mode = "extract"
	}

	pages := strings.TrimSpace(ctx.FormValue("pages"))
	everyNStr := strings.TrimSpace(ctx.FormValue("every_n"))
	everyN := 1
	if everyNStr != "" {
		if val, err := strconv.Atoi(everyNStr); err == nil && val > 0 {
			everyN = val
		}
	}

	mergeExtractedStr := strings.TrimSpace(ctx.FormValue("merge_extracted"))
	mergeExtracted := true
	if mergeExtractedStr != "" {
		if val, err := strconv.ParseBool(mergeExtractedStr); err == nil {
			mergeExtracted = val
		}
	}

	outputFileName := strings.TrimSpace(ctx.FormValue("output_file_name"))

	opts := SplitPdfOptions{
		Mode:           mode,
		Pages:          pages,
		EveryN:         everyN,
		MergeExtracted: mergeExtracted,
		OutputFileName: outputFileName,
	}

	res, err := c.service.Split(ctx.Context(), file, opts)
	if err != nil {
		log.Error().Err(err).Str("file", file.Filename).Interface("opts", opts).Msg("Failed to split PDF")
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
