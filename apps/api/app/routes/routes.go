package routes

import (
	"magic-converter/app/modules/converter"

	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(
	app *fiber.App,
	converterController *converter.ConverterController,
) {
	const ApiVersion = "/api/v1"

	api := app.Group(ApiVersion)

	converters := api.Group("/converters")
	converters.Get("", converterController.List)
	converters.Get("/:id", converterController.Get)
	converters.Post("", converterController.Create)
	converters.Put("/:id", converterController.Update)
	converters.Delete("/:id", converterController.Delete)
}
