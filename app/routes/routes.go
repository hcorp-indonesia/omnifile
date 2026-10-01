package routes

import (
	"gofiber-starterkit/app/modules/product"

	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(
	app *fiber.App,
	productController *product.ProductController,
) {
	const ApiVersion = "/api/v1"

	api := app.Group(ApiVersion)

	products := api.Group("/products")
	products.Get("", productController.List)
	products.Get("/:id/show", productController.Get)
	products.Post("", productController.Create)
	products.Put("/:id/update", productController.Update)
	products.Patch("/:id/status", productController.UpdateStatus)
	products.Delete("/:id/delete", productController.Delete)
}
