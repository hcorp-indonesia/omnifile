package utils

import "github.com/gofiber/fiber/v3"

type BaseResponse struct {
	Success  bool      `json:"success"`
	Message  string    `json:"message"`
	Metadata *Metadata `json:"metadata"`
	Data     any       `json:"data"`
}

type Metadata struct {
	PerPage     int `json:"per_page,omitempty"`
	CurrentPage int `json:"current_page,omitempty"`
	TotalRow    int `json:"total_row,omitempty"`
	TotalPage   int `json:"total_page,omitempty"`
}

type HTTPError struct {
	Code    int    `json:"-"`
	Message string `json:"message"`
}

func (e *HTTPError) Error() string {
	return e.Message
}

func NewHTTPError(code int, message string) *HTTPError {
	return &HTTPError{
		Code:    code,
		Message: message,
	}
}

var (
	ErrBadRequest          = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusBadRequest, msg) }
	ErrUnauthorized        = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusUnauthorized, msg) }
	ErrForbidden           = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusForbidden, msg) }
	ErrNotFound            = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusNotFound, msg) }
	ErrConflict            = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusConflict, msg) }
	ErrPaymentRequired     = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusPaymentRequired, msg) }
	ErrInternalServerError = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusInternalServerError, msg) }
	ErrUnprocessableEntity = func(msg string) *HTTPError { return NewHTTPError(fiber.StatusUnprocessableEntity, msg) }
)

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
	return ctx.Status(code).JSON(BaseResponse{
		Success:  false,
		Message:  message,
		Metadata: &Metadata{},
		Data:     map[string]any{},
	})
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
