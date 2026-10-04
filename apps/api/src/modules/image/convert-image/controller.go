package convertimage

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

type ConvertImageController struct {
	service *ConvertImageService
}

func NewConvertImageController(service *ConvertImageService) *ConvertImageController {
	return &ConvertImageController{service: service}
}

var supportedImageExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".avif": true,
	".bmp":  true,
	".tiff": true,
	".tif":  true,
	".gif":  true,
	".ico":  true,
	".heic": true,
	".heif": true,
	".svg":  true,
}

func (c *ConvertImageController) ConvertImage(ctx fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(ConvertImageResponse{
			Success: false,
			Message: "No image file uploaded. Please provide a file in multipart form under 'file'.",
		})
	}

	// Validate image extension
	lowerName := strings.ToLower(fileHeader.Filename)
	hasValidExt := false
	for ext := range supportedImageExtensions {
		if strings.HasSuffix(lowerName, ext) {
			hasValidExt = true
			break
		}
	}

	if !hasValidExt {
		return ctx.Status(fiber.StatusBadRequest).JSON(ConvertImageResponse{
			Success: false,
			Message: "Uploaded file must be a supported image format (.jpg, .jpeg, .png, .webp, .avif, .bmp, .tiff, .gif, .ico).",
		})
	}

	var opts ConvertImageOptions
	if err := ctx.Bind().Body(&opts); err != nil {
		opts = ConvertImageOptions{}
	}

	// Fallback to form values if bind didn't capture multipart form fields
	if opts.TargetFormat == "" {
		opts.TargetFormat = ctx.FormValue("target_format", "png")
	}
	if opts.Quality == 0 {
		if qStr := ctx.FormValue("quality"); qStr != "" {
			if q, err := strconv.Atoi(qStr); err == nil {
				opts.Quality = q
			}
		}
	}
	if opts.Background == "" {
		opts.Background = ctx.FormValue("background", "#FFFFFF")
	}
	if opts.Width == 0 {
		if wStr := ctx.FormValue("width"); wStr != "" {
			if w, err := strconv.Atoi(wStr); err == nil {
				opts.Width = w
			}
		}
	}
	if opts.Height == 0 {
		if hStr := ctx.FormValue("height"); hStr != "" {
			if h, err := strconv.Atoi(hStr); err == nil {
				opts.Height = h
			}
		}
	}
	if opts.OutputFileName == "" {
		opts.OutputFileName = ctx.FormValue("output_file_name")
	}
	if !opts.RemoveBg {
		opts.RemoveBg = ctx.FormValue("remove_bg") == "true" || ctx.FormValue("remove_bg") == "1"
	}

	result, err := c.service.ConvertImage(ctx.Context(), fileHeader, opts)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(ConvertImageResponse{
			Success: false,
			Message: err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(ConvertImageResponse{
		Success: true,
		Message: "Image successfully converted",
		Data:    result,
	})
}
