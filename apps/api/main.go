package main

import (
	"magic-converter/config"
	"magic-converter/src/middleware"
	"magic-converter/src/modules/auth"
	"magic-converter/src/modules/converter"
	"magic-converter/src/modules/media"
	"magic-converter/src/routes"
	"magic-converter/src/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"go.uber.org/dig"
)

func main() {
	utils.LoadEnv()

	c := dig.New()

	c.Provide(config.NewDatabase)
	c.Provide(utils.NewDragonflyClient)
	c.Provide(utils.NewRustfsClient)

	c.Provide(converter.NewConverterService)
	c.Provide(converter.NewConverterController)

	c.Provide(media.NewMediaService)
	c.Provide(media.NewMediaController)

	c.Provide(auth.NewAuthService)
	c.Provide(auth.NewSMTPMailer)
	c.Provide(auth.NewAuthController)

	c.Provide(func() *fiber.App {
		cfg := config.FiberConfig()
		cfg.ErrorHandler = utils.RespondError

		app := fiber.New(cfg)

		app.Use(compress.New(compress.Config{
			Level: compress.LevelBestSpeed,
		}))
		middleware.FiberMiddleware(app)

		app.Get(healthcheck.LivenessEndpoint, healthcheck.New())

		return app
	})

	c.Invoke(func(
		app *fiber.App,
		converterController *converter.ConverterController,
		mediaController *media.MediaController,
		authController *auth.AuthController,
		dbClient *bun.DB,
		dragonflyClient *utils.DragonflyClient,
	) {
		routes.RegisterRoutes(app, converterController, mediaController, authController)

		defer dbClient.Close()
		defer dragonflyClient.Client.Close()

		if err := utils.StartServerWithGracefulShutdown(app); err != nil {
			log.Error().Err(err).Msg("Server error")
		}
	})
}
