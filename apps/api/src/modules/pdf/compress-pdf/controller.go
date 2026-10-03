package compresspdf

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

type CompressPdfController struct {
	service *CompressPdfService
}

func NewCompressPdfController(service *CompressPdfService) *CompressPdfController {
	return &CompressPdfController{service: service}
}

func (c *CompressPdfController) CompressPdf(ctx fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(CompressPdfResponse{
			Success: false,
			Message: "No PDF file uploaded. Please provide a file in multipart form under 'file'.",
		})
	}

	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
		return ctx.Status(fiber.StatusBadRequest).JSON(CompressPdfResponse{
			Success: false,
			Message: "Uploaded file must be a PDF document (.pdf).",
		})
	}

	var opts CompressPdfOptions
	if err := ctx.Bind().Body(&opts); err != nil {
		// Non-fatal if body binding fails, use default options
		opts = CompressPdfOptions{}
	}

	if opts.Level == "" {
		opts.Level = ctx.FormValue("level", "recommended")
	}
	if opts.TargetSizeKB == 0 {
		if tsStr := ctx.FormValue("target_size_kb"); tsStr != "" {
			if ts, err := strconv.ParseInt(tsStr, 10, 64); err == nil {
				opts.TargetSizeKB = ts
			}
		}
	}
	if opts.Quality == 0 {
		if qStr := ctx.FormValue("quality"); qStr != "" {
			if q, err := strconv.Atoi(qStr); err == nil {
				opts.Quality = q
			}
		}
	}
	if opts.DPI == 0 {
		if dStr := ctx.FormValue("dpi"); dStr != "" {
			if d, err := strconv.Atoi(dStr); err == nil {
				opts.DPI = d
			}
		}
	}
	if !opts.RemoveMetadata {
		if rmStr := ctx.FormValue("remove_metadata"); rmStr == "true" || rmStr == "1" {
			opts.RemoveMetadata = true
		}
	}
	if opts.OutputFileName == "" {
		opts.OutputFileName = ctx.FormValue("output_file_name")
	}

	result, err := c.service.CompressPdf(ctx.Context(), fileHeader, opts)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(CompressPdfResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(CompressPdfResponse{
		Success: true,
		Message: "PDF compressed successfully",
		Data:    result,
	})
}
