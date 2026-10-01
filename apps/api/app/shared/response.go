package shared

import "github.com/gofiber/fiber/v3"

func RespondError(ctx fiber.Ctx, err error) error {
	var code int
	var message string
	if httpErr, ok := err.(*HTTPError); ok {
		code = httpErr.Code
		message = httpErr.Message
	} else if fiberErr, ok := err.(*fiber.Error); ok {
		code = fiberErr.Code
		message = fiberErr.Message
	} else {
		code = fiber.StatusInternalServerError
		message = err.Error()
	}
	jerr := ctx.Status(code).JSON(BaseResponse{
		Success:  false,
		Message:  message,
		Metadata: &Metadata{},
		Data:     map[string]any{},
	})
	if jerr != nil {
		return jerr
	}
	return nil
}

func RespondSuccess(ctx fiber.Ctx, message string, data any) error {
	if data == nil {
		data = map[string]any{}
	}
	return ctx.JSON(BaseResponse{
		Success:  true,
		Message:  message,
		Data:     data,
		Metadata: &Metadata{},
	})
}

func RespondSuccessWithMeta(ctx fiber.Ctx, message string, data any, meta *Metadata) error {
	return ctx.JSON(BaseResponse{
		Success:  true,
		Message:  message,
		Data:     data,
		Metadata: meta,
	})
}
