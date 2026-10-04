package removebg

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

type RemoveBgController struct {
	service *RemoveBgService
}

func NewRemoveBgController(service *RemoveBgService) *RemoveBgController {
	return &RemoveBgController{service: service}
}

var supportedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".avif": true,
	".bmp":  true,
	".tiff": true,
	".tif":  true,
}

func (c *RemoveBgController) RemoveBackground(ctx fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(RemoveBgResponse{
			Success: false,
			Message: "No image file uploaded. Please upload a file under form field 'file'.",
		})
	}

	lowerName := strings.ToLower(fileHeader.Filename)
	hasValidExt := false
	for ext := range supportedExtensions {
		if strings.HasSuffix(lowerName, ext) {
			hasValidExt = true
			break
		}
	}

	if !hasValidExt {
		return ctx.Status(fiber.StatusBadRequest).JSON(RemoveBgResponse{
			Success: false,
			Message: "Supported formats for background removal are JPG, PNG, WebP, AVIF, BMP, TIFF.",
		})
	}

	var opts RemoveBgOptions
	if err := ctx.Bind().Body(&opts); err != nil {
		opts = RemoveBgOptions{}
	}

	if opts.Model == "" {
		opts.Model = ctx.FormValue("model", "u2netp")
	}
	if opts.OutputFormat == "" {
		opts.OutputFormat = ctx.FormValue("output_format", "png")
	}
	if opts.OutputFileName == "" {
		opts.OutputFileName = ctx.FormValue("output_file_name")
	}

	result, err := c.service.RemoveBackground(ctx.Context(), fileHeader, opts)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(RemoveBgResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(RemoveBgResponse{
		Success: true,
		Message: "Background successfully removed",
		Data:    result,
	})
}
