package routes

import (
	"magic-converter/src/modules/auth"
	"magic-converter/src/modules/converter"
	"magic-converter/src/modules/media"

	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(
	app *fiber.App,
	converterController *converter.ConverterController,
	mediaController *media.MediaController,
	authController *auth.AuthController,
) {
	const ApiVersion = "/api/v1"
	api := app.Group(ApiVersion)

	auth.RegisterRoutes(api, authController)
	converter.RegisterRoutes(api, converterController)
	media.RegisterRoutes(api, mediaController)
}
