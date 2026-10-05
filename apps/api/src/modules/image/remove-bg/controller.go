package removebg

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
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

	if opts.OutputFormat == "" {
		opts.OutputFormat = ctx.FormValue("output_format", "png")
	}
	if opts.OutputFileName == "" {
		opts.OutputFileName = ctx.FormValue("output_file_name")
	}

	result, err := c.service.RemoveBackground(ctx.Context(), fileHeader, opts)
	if err != nil {
		log.Error().Err(err).Msg("AI Background Removal failed")
		return ctx.Status(fiber.StatusInternalServerError).JSON(RemoveBgResponse{
			Success: false,
			Message: "Background removal failed. Please try again later.",
		})
	}

	defer result.Cleanup()
	ctx.Set("Content-Type", result.MimeType)
	ctx.Set("Content-Disposition", `attachment; filename="`+url.PathEscape(result.FileName)+`"`)
	ctx.Set("X-Remove-Bg-Original-Format", result.OriginalFormat)
	ctx.Set("X-Remove-Bg-Converted-Format", result.ConvertedFormat)
	ctx.Set("X-Remove-Bg-Original-Size", strconv.FormatInt(result.OriginalSize, 10))
	ctx.Set("X-Remove-Bg-Result-Size", strconv.FormatInt(result.ResultSize, 10))
	ctx.Set("X-Remove-Bg-Original-Width", strconv.Itoa(result.OriginalWidth))
	ctx.Set("X-Remove-Bg-Original-Height", strconv.Itoa(result.OriginalHeight))
	ctx.Set("X-Remove-Bg-Width", strconv.Itoa(result.ResultWidth))
	ctx.Set("X-Remove-Bg-Height", strconv.Itoa(result.ResultHeight))
	ctx.Set("X-Remove-Bg-Model", result.ModelUsed)
	return ctx.SendFile(result.OutputPath)
}
