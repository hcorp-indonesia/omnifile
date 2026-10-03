package mergepdf

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

type MergePdfService struct{}

func NewMergePdfService() *MergePdfService {
	return &MergePdfService{}
}

func (s *MergePdfService) Merge(ctx context.Context, fileHeaders []*multipart.FileHeader, opts MergePdfOptions) (*MergePdfResult, error) {
	if len(fileHeaders) < 2 {
		return nil, fmt.Errorf("at least 2 PDF files are required for merging")
	}

	readSeekers := make([]io.ReadSeeker, 0, len(fileHeaders))
	fileSummaries := make([]MergedFileSummary, 0, len(fileHeaders))
	totalPageSum := 0

	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	for idx, fh := range fileHeaders {
		f, err := fh.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open file %s: %w", fh.Filename, err)
		}

		data, err := io.ReadAll(f)
		_ = f.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read content of %s: %w", fh.Filename, err)
		}

		rs := bytes.NewReader(data)

		// Obtain page count of this PDF
		pageCount, err := api.PageCount(ctx, rs, conf)
		if err != nil {
			log.Warn().Err(err).Str("file", fh.Filename).Msg("Unable to determine page count via pdfcpu, fallback to 1")
			pageCount = 1
		}

		// Reset seeker before merging
		if _, err := rs.Seek(0, io.SeekStart); err != nil {
			return nil, fmt.Errorf("failed to reset reader for %s: %w", fh.Filename, err)
		}

		readSeekers = append(readSeekers, rs)
		fileSummaries = append(fileSummaries, MergedFileSummary{
			Name:  fh.Filename,
			Size:  fh.Size,
			Pages: pageCount,
		})
		totalPageSum += pageCount
		log.Info().Int("index", idx).Str("file", fh.Filename).Int("pages", pageCount).Msg("PDF ready for merge")
	}

	var outBuf bytes.Buffer
	if err := api.MergeRaw(ctx, readSeekers, &outBuf, false, conf); err != nil {
		return nil, fmt.Errorf("failed to merge PDF streams: %w", err)
	}

	outFileName := strings.TrimSpace(opts.OutputFileName)
	if outFileName == "" {
		outFileName = "merged-document.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(outFileName), ".pdf") {
		outFileName += ".pdf"
	}

	mergedBytes := outBuf.Bytes()
	b64 := base64.StdEncoding.EncodeToString(mergedBytes)

	log.Info().
		Str("output_file", outFileName).
		Int("total_files", len(fileHeaders)).
		Int("total_pages", totalPageSum).
		Int("file_size", len(mergedBytes)).
		Msg("PDF files successfully merged")

	return &MergePdfResult{
		FileName:   filepath.Base(outFileName),
		FileSize:   int64(len(mergedBytes)),
		TotalPages: totalPageSum,
		TotalFiles: len(fileHeaders),
		FileBase64: b64,
		Files:      fileSummaries,
	}, nil
}
