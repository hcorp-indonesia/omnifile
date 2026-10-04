package upscaleimage

import (
	"mime/multipart"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
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

	// Check if JSON body
	if strings.Contains(ctx.Get("Content-Type"), "application/json") {
		if err := ctx.Bind().Body(&opts); err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(UpscaleResponse{
				Success: false,
				Message: "Invalid JSON body for upscale request",
			})
		}
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
		if opts.FileBase64 == "" {
			opts.FileBase64 = ctx.FormValue("file_base64")
		}
	}

	if fileHeader == nil && opts.FileBase64 == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(UpscaleResponse{
			Success: false,
			Message: "Please provide an image file or base64 data to upscale.",
		})
	}

	result, err := c.service.UpscaleImage(ctx.Context(), fileHeader, opts)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(UpscaleResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(UpscaleResponse{
		Success: true,
		Message: "Image successfully upscaled to HD",
		Data:    result,
	})
}
