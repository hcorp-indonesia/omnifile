package removepdf

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/rs/zerolog/log"
)

type RemovePdfService struct{}

func NewRemovePdfService() *RemovePdfService {
	return &RemovePdfService{}
}

func (s *RemovePdfService) RemovePages(ctx context.Context, fh *multipart.FileHeader, opts RemovePdfOptions) (*RemovePdfResult, error) {
	pagesExpr := strings.TrimSpace(opts.Pages)
	if pagesExpr == "" {
		return nil, fmt.Errorf("please specify at least one page number to remove")
	}

	f, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded PDF: %w", err)
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF content: %w", err)
	}

	rs := bytes.NewReader(data)
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	origPageCount, err := api.PageCount(ctx, rs, conf)
	if err != nil {
		log.Warn().Err(err).Str("file", fh.Filename).Msg("Unable to determine original page count, fallback to 1")
		origPageCount = 1
	}

	pageSelection, err := api.ParsePageSelection(pagesExpr)
	if err != nil {
		return nil, fmt.Errorf("invalid page range '%s': %w", pagesExpr, err)
	}

	if _, err := rs.Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("failed to reset reader: %w", err)
	}

	var outBuf bytes.Buffer
	if err := api.RemovePages(ctx, rs, &outBuf, pageSelection, conf); err != nil {
		return nil, fmt.Errorf("failed to remove specified pages: %w (make sure you don't remove all pages)", err)
	}

	outBytes := outBuf.Bytes()
	if len(outBytes) == 0 {
		return nil, fmt.Errorf("result document is empty after page removal")
	}

	// Calculate remaining pages
	remainingPageCount, err := api.PageCount(ctx, bytes.NewReader(outBytes), conf)
	if err != nil {
		remainingPageCount = origPageCount - len(pageSelection)
		if remainingPageCount < 1 {
			remainingPageCount = 1
		}
	}

	baseName := strings.TrimSuffix(fh.Filename, filepath.Ext(fh.Filename))
	if baseName == "" {
		baseName = "document"
	}

	outFileName := strings.TrimSpace(opts.OutputFileName)
	if outFileName == "" {
		outFileName = fmt.Sprintf("%s_pages_removed.pdf", baseName)
	}
	if !strings.HasSuffix(strings.ToLower(outFileName), ".pdf") {
		outFileName += ".pdf"
	}

	b64 := base64.StdEncoding.EncodeToString(outBytes)

	log.Info().
		Str("output_file", outFileName).
		Int("original_pages", origPageCount).
		Int("remaining_pages", remainingPageCount).
		Int("file_size", len(outBytes)).
		Msg("PDF pages successfully removed")

	return &RemovePdfResult{
		FileName:          filepath.Base(outFileName),
		FileSize:          int64(len(outBytes)),
		OriginalPages:     origPageCount,
		RemainingPages:    remainingPageCount,
		RemovedPagesCount: origPageCount - remainingPageCount,
		FileBase64:        b64,
	}, nil
}
