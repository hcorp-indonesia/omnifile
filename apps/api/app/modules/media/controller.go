package media

import (
	"magic-converter/app/shared"
	"magic-converter/pkg/middlewares"

	"github.com/gofiber/fiber/v3"
)

type MediaController struct {
	service *MediaService
}

func NewMediaController(service *MediaService) *MediaController {
	return &MediaController{service: service}
}

func (c *MediaController) Convert(ctx fiber.Ctx) error {
	var req ConvertFileRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	if err := middlewares.ValidateStruct(&req); err != nil {
		return err
	}

	file, _ := ctx.FormFile("file")

	res, err := c.service.ConvertFile(ctx.Context(), &req, file)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Conversion task initiated", res)
}

func (c *MediaController) RemoveBG(ctx fiber.Ctx) error {
	file, _ := ctx.FormFile("file")

	res, err := c.service.RemoveBackground(ctx.Context(), file)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Remove background task initiated", res)
}

func (c *MediaController) Upscale(ctx fiber.Ctx) error {
	var req UpscaleImageRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	if err := middlewares.ValidateStruct(&req); err != nil {
		return err
	}

	file, _ := ctx.FormFile("file")

	res, err := c.service.UpscaleImage(ctx.Context(), &req, file)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Upscale task initiated", res)
}
