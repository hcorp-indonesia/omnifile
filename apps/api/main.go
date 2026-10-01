package main

import (
	"magic-converter/app/modules/converter"
	"magic-converter/app/routes"
	"magic-converter/app/shared"
	"magic-converter/pkg/client/db"
	"magic-converter/pkg/client/dragonfly"
	"magic-converter/pkg/client/rustfs"
	"magic-converter/pkg/config"
	"magic-converter/pkg/middlewares"
	"magic-converter/pkg/utils"

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

	c.Provide(converter.NewConverterService)
	c.Provide(converter.NewConverterController)

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
		converterController *converter.ConverterController,
		dbClient *bun.DB,
		dragonflyClient *dragonfly.DragonflyClient,
	) {
		routes.RegisterRoutes(app, converterController)

		defer dbClient.Close()
		defer dragonflyClient.Client.Close()

		if err := utils.StartServerWithGracefulShutdown(app); err != nil {
			log.Error().Err(err).Msg("Server error")
		}
	})
}
