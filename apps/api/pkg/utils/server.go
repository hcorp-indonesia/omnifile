package utils

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

func StartServer(app *fiber.App) error {
	addr := ConnectionString()

	enablePrefork := false
	if os.Getenv("APP_ENV") == "production" && os.Getenv("FIBER_PREFORK") == "true" {
		enablePrefork = true
	}

	return app.Listen(addr, fiber.ListenConfig{EnablePrefork: enablePrefork})
}

func StartServerWithGracefulShutdown(app *fiber.App) error {
	log.Info().Msg("Starting server...")
	addr := ConnectionString()

	enablePrefork := false
	if os.Getenv("APP_ENV") == "production" && os.Getenv("FIBER_PREFORK") == "true" {
		enablePrefork = true
	}

	serverErr := make(chan error, 1)

	go func() {
		serverErr <- app.Listen(addr, fiber.ListenConfig{EnablePrefork: enablePrefork})
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(quit)

	select {
	case err := <-serverErr:
		if err != nil {
			log.Error().Err(err).Msg("server closed")
			return err
		}
		return nil
	case <-quit:
	}

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := app.Shutdown(); err != nil {
		log.Error().Err(err).Msg("server shutdown error")
		return err
	}

	<-ctx.Done()
	log.Info().Msg("Server stopped")

	if err := <-serverErr; err != nil {
		return err
	}

	return nil
}
