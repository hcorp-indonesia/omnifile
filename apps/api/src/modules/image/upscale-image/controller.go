package upscaleimage

import (
	"mime/multipart"
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

type UpscaleImageController struct {
	service *UpscaleImageService
}

func NewUpscaleImageController(service *UpscaleImageService) *UpscaleImageController {
	return &UpscaleImageController{service: service}
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

func (c *UpscaleImageController) Upscale(ctx fiber.Ctx) error {
	var fileHeader *multipart.FileHeader
	var opts UpscaleOptions

	if !strings.Contains(ctx.Get("Content-Type"), "multipart/form-data") {
		return ctx.Status(fiber.StatusBadRequest).JSON(UpscaleResponse{
			Success: false,
			Message: "Upscaling requires an image upload using multipart form-data.",
		})
	} else {
		// Multipart Form
		fh, err := ctx.FormFile("file")
		if err == nil {
			fileHeader = fh
			lowerName := strings.ToLower(fh.Filename)
			hasValidExt := false
			for ext := range supportedExtensions {
				if strings.HasSuffix(lowerName, ext) {
					hasValidExt = true
					break
				}
			}
			if !hasValidExt {
				return ctx.Status(fiber.StatusBadRequest).JSON(UpscaleResponse{
					Success: false,
					Message: "Supported formats for upscaling are JPG, PNG, WebP, AVIF, BMP, TIFF.",
				})
			}
		}

		_ = ctx.Bind().Body(&opts)
		if scaleStr := ctx.FormValue("scale"); scaleStr != "" {
			if s, err := strconv.Atoi(scaleStr); err == nil {
				opts.Scale = s
			}
		}
		if opts.OutputFormat == "" {
			opts.OutputFormat = ctx.FormValue("output_format", "png")
		}
		if opts.OutputFileName == "" {
			opts.OutputFileName = ctx.FormValue("output_file_name")
		}
	}

	if fileHeader == nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(UpscaleResponse{
			Success: false,
			Message: "Please provide an image file or base64 data to upscale.",
		})
	}

	result, err := c.service.UpscaleImage(ctx.Context(), fileHeader, opts)
	if err != nil {
		log.Error().Err(err).Msg("HD Image Upscaling failed")
		return ctx.Status(fiber.StatusInternalServerError).JSON(UpscaleResponse{
			Success: false,
			Message: "Image upscaling failed. Please try again later.",
		})
	}

	defer result.Cleanup()
	ctx.Set("Content-Type", result.MimeType)
	ctx.Set("Content-Disposition", `attachment; filename="`+url.PathEscape(result.FileName)+`"`)
	ctx.Set("X-Upscale-Original-Format", result.OriginalFormat)
	ctx.Set("X-Upscale-Converted-Format", result.ConvertedFormat)
	ctx.Set("X-Upscale-Original-Size", strconv.FormatInt(result.OriginalSize, 10))
	ctx.Set("X-Upscale-Upscaled-Size", strconv.FormatInt(result.UpscaledSize, 10))
	ctx.Set("X-Upscale-Original-Width", strconv.Itoa(result.OriginalWidth))
	ctx.Set("X-Upscale-Original-Height", strconv.Itoa(result.OriginalHeight))
	ctx.Set("X-Upscale-Width", strconv.Itoa(result.UpscaledWidth))
	ctx.Set("X-Upscale-Height", strconv.Itoa(result.UpscaledHeight))
	ctx.Set("X-Upscale-Scale", strconv.Itoa(result.ScaleFactor))
	ctx.Set("X-Upscale-Mode", result.ProcessingMode)
	return ctx.SendFile(result.OutputPath)
}
