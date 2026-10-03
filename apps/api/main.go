package main

import (
	"magic-converter/config"
	"magic-converter/src/middleware"
	"magic-converter/src/modules/auth"
	pdftoexcel "magic-converter/src/modules/pdf/pdf-to-excel"
	pdftojpg "magic-converter/src/modules/pdf/pdf-to-jpg"
	pdftoword "magic-converter/src/modules/pdf/pdf-to-word"
	mergepdf "magic-converter/src/modules/pdf/merge-pdf"
	splitpdf "magic-converter/src/modules/pdf/split-pdf"
	removepdf "magic-converter/src/modules/pdf/remove-pdf"
	compresspdf "magic-converter/src/modules/pdf/compress-pdf"
	"magic-converter/src/routes"
	"magic-converter/src/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/webassembly"
	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"go.uber.org/dig"
)

func main() {
	utils.LoadEnv()

	c := dig.New()

	c.Provide(config.NewDatabase)
	c.Provide(utils.NewDragonflyClient)
	c.Provide(utils.NewSMTPMailer)

	// Shared PDFium WebAssembly pool
	c.Provide(func() (pdfium.Pool, error) {
		return webassembly.Init(webassembly.Config{
			MinIdle:  1,
			MaxIdle:  2,
			MaxTotal: 4,
		})
	})

	c.Provide(auth.NewAuthService)
	c.Provide(auth.NewAuthController)
	c.Provide(middleware.NewAuthMiddleware)

	c.Provide(pdftojpg.NewPdfToJpgService)
	c.Provide(pdftojpg.NewPdfToJpgController)

	c.Provide(pdftoexcel.NewPdfToExcelService)
	c.Provide(pdftoexcel.NewPdfToExcelController)
	c.Provide(pdftoword.NewPdfToWordService)
	c.Provide(pdftoword.NewPdfToWordController)
	c.Provide(mergepdf.NewMergePdfService)
	c.Provide(mergepdf.NewMergePdfController)
	c.Provide(splitpdf.NewSplitPdfService)
	c.Provide(splitpdf.NewSplitPdfController)
	c.Provide(removepdf.NewRemovePdfService)
	c.Provide(removepdf.NewRemovePdfController)
	c.Provide(compresspdf.NewCompressPdfService)
	c.Provide(compresspdf.NewCompressPdfController)

	c.Provide(func() *fiber.App {
		cfg := config.FiberConfig()
		cfg.ErrorHandler = utils.RespondError

		app := fiber.New(cfg)

		app.Use(compress.New(compress.Config{
			Level: compress.LevelBestSpeed,
		}))
		app.Use(
			helmet.New(),
			config.CorsConfig(),
			logger.New(),
			recover.New(),
		)

		app.Get(healthcheck.LivenessEndpoint, healthcheck.New())

		return app
	})

	c.Invoke(func(
		app *fiber.App,
		authController *auth.AuthController,
		authMiddleware *middleware.AuthMiddleware,
		pdfToJpgController *pdftojpg.PdfToJpgController,
		pdfToExcelController *pdftoexcel.PdfToExcelController,
		pdfToWordController *pdftoword.PdfToWordController,
		mergePdfController *mergepdf.MergePdfController,
		splitPdfController *splitpdf.SplitPdfController,
		removePdfController *removepdf.RemovePdfController,
		compressPdfController *compresspdf.CompressPdfController,
		dbClient *bun.DB,
		dragonflyClient *utils.DragonflyClient,
	) {
		routes.RegisterRoutes(app, authController, authMiddleware, pdfToJpgController, pdfToExcelController, pdfToWordController, mergePdfController, splitPdfController, removePdfController, compressPdfController)

		defer dbClient.Close()
		defer dragonflyClient.Client.Close()

		if err := utils.StartServerWithGracefulShutdown(app); err != nil {
			log.Error().Err(err).Msg("Server error")
		}
	})
}
