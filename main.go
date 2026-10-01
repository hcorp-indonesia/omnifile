package main

import (
	"gofiber-starterkit/app/modules/product"
	"gofiber-starterkit/app/routes"
	"gofiber-starterkit/app/shared"
	"gofiber-starterkit/pkg/client/db"
	"gofiber-starterkit/pkg/client/dragonfly"
	"gofiber-starterkit/pkg/client/rustfs"
	"gofiber-starterkit/pkg/config"
	"gofiber-starterkit/pkg/middlewares"
	"gofiber-starterkit/pkg/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"go.uber.org/dig"
)

func main() {
	c := dig.New()

	c.Provide(db.New)
	c.Provide(dragonfly.New)
	c.Provide(rustfs.New)

	c.Provide(product.NewProductService)
	c.Provide(product.NewProductController)

	c.Provide(func() *fiber.App {
		cfg := config.FiberConfig()
		cfg.ErrorHandler = shared.RespondError

		app := fiber.New(cfg)

		app.Use(compress.New(compress.Config{
			Level: compress.LevelBestSpeed,
		}))
		middlewares.FiberMiddleware(app)

		app.Get(healthcheck.LivenessEndpoint, healthcheck.New())

		return app
	})

	c.Invoke(func(
		app *fiber.App,
		productController *product.ProductController,
		dbClient *bun.DB,
		dragonflyClient *dragonfly.DragonflyClient,
	) {
		routes.RegisterRoutes(app, productController)

		defer dbClient.Close()
		defer dragonflyClient.Client.Close()

		if err := utils.StartServerWithGracefulShutdown(app); err != nil {
			log.Error().Err(err).Msg("Server error")
		}
	})
}
