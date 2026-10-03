package splitpdf

import (
	"archive/zip"
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

type SplitPdfService struct{}

func NewSplitPdfService() *SplitPdfService {
	return &SplitPdfService{}
}

func (s *SplitPdfService) GetInfo(ctx context.Context, fh *multipart.FileHeader) (*PdfInfoResult, error) {
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

	pageCount, err := api.PageCount(ctx, rs, conf)
	if err != nil {
		log.Warn().Err(err).Str("file", fh.Filename).Msg("Failed to read page count, assuming 1")
		pageCount = 1
	}

	return &PdfInfoResult{
		FileName:   fh.Filename,
		FileSize:   fh.Size,
		TotalPages: pageCount,
	}, nil
}

func (s *SplitPdfService) Split(ctx context.Context, fh *multipart.FileHeader, opts SplitPdfOptions) (*SplitPdfResult, error) {
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

	pageCount, err := api.PageCount(ctx, rs, conf)
	if err != nil {
		log.Warn().Err(err).Str("file", fh.Filename).Msg("Unable to retrieve page count, assuming single page")
		pageCount = 1
	}

	baseName := strings.TrimSuffix(fh.Filename, filepath.Ext(fh.Filename))
	if baseName == "" {
		baseName = "document"
	}

	// 1. Mode: Extract Pages & Merge into 1 single PDF
	if opts.Mode == "extract" && opts.MergeExtracted {
		pagesExpr := strings.TrimSpace(opts.Pages)
		if pagesExpr == "" {
			return nil, fmt.Errorf("page range cannot be empty for extraction")
		}

		pageSelection, err := api.ParsePageSelection(pagesExpr)
		if err != nil {
			return nil, fmt.Errorf("invalid page range '%s': %w", pagesExpr, err)
		}

		if _, err := rs.Seek(0, io.SeekStart); err != nil {
			return nil, fmt.Errorf("failed to seek reader: %w", err)
		}

		var outBuf bytes.Buffer
		if err := api.Trim(ctx, rs, &outBuf, pageSelection, conf); err != nil {
			return nil, fmt.Errorf("failed to extract pages: %w", err)
		}

		outFileName := strings.TrimSpace(opts.OutputFileName)
		if outFileName == "" {
			outFileName = fmt.Sprintf("%s_extracted.pdf", baseName)
		}
		if !strings.HasSuffix(strings.ToLower(outFileName), ".pdf") {
			outFileName += ".pdf"
		}

		outBytes := outBuf.Bytes()
		b64 := base64.StdEncoding.EncodeToString(outBytes)

		return &SplitPdfResult{
			FileName:   filepath.Base(outFileName),
			FileSize:   int64(len(outBytes)),
			TotalPages: pageCount,
			FileCount:  1,
			IsZip:      false,
			FileBase64: b64,
		}, nil
	}

	// 2. Mode: Split Every N Pages into separate files bundled in a ZIP
	if opts.Mode == "split_every" {
		everyN := opts.EveryN
		if everyN <= 0 {
			everyN = 1
		}

		var zipBuf bytes.Buffer
		zipWriter := zip.NewWriter(&zipBuf)
		itemsInfo := make([]SplitPdfItemInfo, 0)
		partIdx := 1

		for start := 1; start <= pageCount; start += everyN {
			end := start + everyN - 1
			if end > pageCount {
				end = pageCount
			}

			rangeExpr := fmt.Sprintf("%d-%d", start, end)
			if start == end {
				rangeExpr = fmt.Sprintf("%d", start)
			}

			pageSel, err := api.ParsePageSelection(rangeExpr)
			if err != nil {
				return nil, fmt.Errorf("failed to parse range '%s': %w", rangeExpr, err)
			}

			if _, err := rs.Seek(0, io.SeekStart); err != nil {
				return nil, fmt.Errorf("failed to seek reader: %w", err)
			}

			var partBuf bytes.Buffer
			if err := api.Trim(ctx, rs, &partBuf, pageSel, conf); err != nil {
				return nil, fmt.Errorf("failed to extract part %s: %w", rangeExpr, err)
			}

			partName := fmt.Sprintf("%s_part_%02d_pages_%s.pdf", baseName, partIdx, rangeExpr)
			fEntry, err := zipWriter.Create(partName)
			if err != nil {
				return nil, fmt.Errorf("failed to create zip entry %s: %w", partName, err)
			}

			partBytes := partBuf.Bytes()
			if _, err := fEntry.Write(partBytes); err != nil {
				return nil, fmt.Errorf("failed to write zip content for %s: %w", partName, err)
			}

			itemsInfo = append(itemsInfo, SplitPdfItemInfo{
				FileName: partName,
				Pages:    rangeExpr,
				FileSize: int64(len(partBytes)),
			})
			partIdx++
		}

		if err := zipWriter.Close(); err != nil {
			return nil, fmt.Errorf("failed to finalize zip archive: %w", err)
		}

		zipBytes := zipBuf.Bytes()
		b64 := base64.StdEncoding.EncodeToString(zipBytes)
		outFileName := fmt.Sprintf("%s_split_every_%d.zip", baseName, everyN)

		return &SplitPdfResult{
			FileName:   outFileName,
			FileSize:   int64(len(zipBytes)),
			TotalPages: pageCount,
			FileCount:  len(itemsInfo),
			IsZip:      true,
			FileBase64: b64,
			Items:      itemsInfo,
		}, nil
	}

	// 3. Mode: Split All pages or Extract Individual pages into a ZIP
	var pageSelection []string
	if opts.Mode == "split_all" || strings.TrimSpace(opts.Pages) == "" {
		pageSelection = nil // nil means all pages in pdfcpu
	} else {
		var err error
		pageSelection, err = api.ParsePageSelection(strings.TrimSpace(opts.Pages))
		if err != nil {
			return nil, fmt.Errorf("invalid page range '%s': %w", opts.Pages, err)
		}
	}

	var zipBuf bytes.Buffer
	zipWriter := zip.NewWriter(&zipBuf)
	itemsInfo := make([]SplitPdfItemInfo, 0)

	digestPage := func(r io.Reader, pageNr int) error {
		partName := fmt.Sprintf("%s_page_%03d.pdf", baseName, pageNr)
		entry, err := zipWriter.Create(partName)
		if err != nil {
			return fmt.Errorf("failed to add %s to zip: %w", partName, err)
		}

		var pageBuf bytes.Buffer
		tee := io.TeeReader(r, &pageBuf)
		if _, err := io.Copy(entry, tee); err != nil {
			return fmt.Errorf("failed to write %s to zip: %w", partName, err)
		}

		itemsInfo = append(itemsInfo, SplitPdfItemInfo{
			FileName: partName,
			Pages:    fmt.Sprintf("%d", pageNr),
			FileSize: int64(pageBuf.Len()),
		})
		return nil
	}

	if _, err := rs.Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("failed to seek reader: %w", err)
	}

	if err := api.ExtractPages(ctx, rs, pageSelection, digestPage, conf); err != nil {
		return nil, fmt.Errorf("failed to extract individual pages: %w", err)
	}

	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip archive: %w", err)
	}

	zipBytes := zipBuf.Bytes()
	b64 := base64.StdEncoding.EncodeToString(zipBytes)
	outFileName := fmt.Sprintf("%s_extracted_pages.zip", baseName)

	return &SplitPdfResult{
		FileName:   outFileName,
		FileSize:   int64(len(zipBytes)),
		TotalPages: pageCount,
		FileCount:  len(itemsInfo),
		IsZip:      true,
		FileBase64: b64,
		Items:      itemsInfo,
	}, nil
}
