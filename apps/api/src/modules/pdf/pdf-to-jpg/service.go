package pdftojpg

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/HugoSmits86/nativewebp"
	"github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/webassembly"
	"github.com/rs/zerolog/log"
)

type PdfToJpgService struct {
	pool pdfium.Pool
	mu   sync.Mutex
}

func NewPdfToJpgService() (*PdfToJpgService, error) {
	// Initialize Go-PDFium WebAssembly pool with optimal concurrency
	pool, err := webassembly.Init(webassembly.Config{
		MinIdle:  1,
		MaxIdle:  2,
		MaxTotal: 4,
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to initialize PDFium WebAssembly pool")
		return nil, err
	}

	return &PdfToJpgService{
		pool: pool,
	}, nil
}

type ConvertOptions struct {
	DPI     int
	Quality int
	Format  string // "jpg", "jpeg", "png"
}

func (s *PdfToJpgService) Convert(ctx context.Context, fileName string, reader io.Reader, opts ConvertOptions) (*FileConversionResult, error) {
	if opts.DPI <= 0 {
		opts.DPI = 150
	}
	if opts.Quality <= 0 {
		opts.Quality = 82
	}
	targetExt := strings.ToLower(opts.Format)
	if targetExt == "" {
		targetExt = "jpg"
	}
	switch targetExt {
	case "jpeg", "png", "webp", "avif":
		// valid
	default:
		targetExt = "jpg"
	}

	pdfBytes, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF content: %w", err)
	}

	instance, err := s.pool.GetInstance(time.Second * 60)
	if err != nil {
		return nil, fmt.Errorf("failed to get PDFium instance: %w", err)
	}
	defer instance.Close()

	doc, err := instance.OpenDocument(&requests.OpenDocument{
		File: &pdfBytes,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF document: %w", err)
	}
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{
		Document: doc.Document,
	})

	pageCountResp, err := instance.FPDF_GetPageCount(&requests.FPDF_GetPageCount{
		Document: doc.Document,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get page count: %w", err)
	}

	totalPages := pageCountResp.PageCount
	baseName := strings.TrimSuffix(filepath.Base(fileName), filepath.Ext(fileName))
	results := make([]PageResult, 0, totalPages)

	for i := 0; i < totalPages; i++ {
		rendered, err := instance.RenderPageInDPI(&requests.RenderPageInDPI{
			Page: requests.Page{
				ByIndex: &requests.PageByIndex{
					Document: doc.Document,
					Index:    i,
				},
			},
			DPI: opts.DPI,
		})
		if err != nil {
			log.Warn().Err(err).Int("page", i+1).Msg("Failed to render PDF page")
			continue
		}

		var img image.Image = rendered.Result.Image
		var buf bytes.Buffer

		switch targetExt {
		case "png":
			err = png.Encode(&buf, img)
		case "webp":
			err = nativewebp.Encode(&buf, img, nil)
		case "avif":
			// WebP fallback for avif format
			err = nativewebp.Encode(&buf, img, nil)
		default: // "jpg", "jpeg"
			err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: opts.Quality})
		}
		if err != nil {
			log.Warn().Err(err).Int("page", i+1).Msg("Failed to encode page image")
			continue
		}

		encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
		pageName := fmt.Sprintf("%s_page_%03d.%s", baseName, i+1, targetExt)

		bounds := img.Bounds()
		results = append(results, PageResult{
			PageNumber:  i + 1,
			ImageBase64: encoded,
			Width:       bounds.Dx(),
			Height:      bounds.Dy(),
			FileName:    pageName,
		})
	}

	return &FileConversionResult{
		OriginalName: fileName,
		TotalPages:   totalPages,
		Pages:        results,
	}, nil
}
