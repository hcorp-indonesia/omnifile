package converter

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"magic-converter/src/utils"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/uptrace/bun"
)

type ConverterService struct {
	db           *bun.DB
	rustfsClient *utils.RustfsClient
}

func NewConverterService(db *bun.DB, rustfsClient *utils.RustfsClient) *ConverterService {
	return &ConverterService{
		db:           db,
		rustfsClient: rustfsClient,
	}
}

func (s *ConverterService) Create(ctx context.Context, req *CreateConverterRequest, image *multipart.FileHeader) (*Converter, error) {
	var imageKey *string
	if image != nil {
		key, err := s.uploadImage(image)
		if err != nil {
			return nil, err
		}
		imageKey = &key
	}

	conv := &Converter{
		Name:        req.Name,
		Description: req.Description,
		FromUnit:    req.FromUnit,
		ToUnit:      req.ToUnit,
		Formula:     req.Formula,
		Category:    req.Category,
		IsActive:    true,
		ImageKey:    imageKey,
	}

	_, err := s.db.NewInsert().Model(conv).Exec(ctx)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to create converter")
	}

	s.populateImageURL(conv)
	return conv, nil
}

func (s *ConverterService) GetByID(ctx context.Context, id uuid.UUID) (*Converter, error) {
	conv := new(Converter)
	err := s.db.NewSelect().Model(conv).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, utils.ErrNotFound("Converter not found")
	}
	s.populateImageURL(conv)
	return conv, nil
}

func (s *ConverterService) List(ctx context.Context, page, perPage int) ([]*Converter, int, error) {
	var converters []*Converter

	offset := (page - 1) * perPage

	total, err := s.db.NewSelect().
		Model(&converters).
		Limit(perPage).
		Offset(offset).
		Order("created_at DESC").
		ScanAndCount(ctx)
	if err != nil {
		return nil, 0, utils.ErrInternalServerError("Failed to list converters")
	}

	for _, c := range converters {
		s.populateImageURL(c)
	}

	return converters, total, nil
}

func (s *ConverterService) Update(ctx context.Context, id uuid.UUID, req *UpdateConverterRequest, image *multipart.FileHeader) (*Converter, error) {
	conv, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		conv.Name = *req.Name
	}
	if req.Description != nil {
		conv.Description = req.Description
	}
	if req.FromUnit != nil {
		conv.FromUnit = *req.FromUnit
	}
	if req.ToUnit != nil {
		conv.ToUnit = *req.ToUnit
	}
	if req.Formula != nil {
		conv.Formula = *req.Formula
	}
	if req.Category != nil {
		conv.Category = *req.Category
	}
	if req.IsActive != nil {
		conv.IsActive = *req.IsActive
	}

	if image != nil {
		if conv.ImageKey != nil && *conv.ImageKey != "" {
			_ = s.rustfsClient.DeleteObject(*conv.ImageKey)
		}

		key, err := s.uploadImage(image)
		if err != nil {
			return nil, err
		}
		conv.ImageKey = &key
	}

	conv.UpdatedAt = time.Now()

	_, err = s.db.NewUpdate().Model(conv).WherePK().Exec(ctx)
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to update converter")
	}

	s.populateImageURL(conv)
	return conv, nil
}

func (s *ConverterService) Delete(ctx context.Context, id uuid.UUID) error {
	conv, err := s.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if conv.ImageKey != nil && *conv.ImageKey != "" {
		_ = s.rustfsClient.DeleteObject(*conv.ImageKey)
	}

	_, err = s.db.NewDelete().Model((*Converter)(nil)).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return utils.ErrInternalServerError("Failed to delete converter")
	}
	return nil
}

func (s *ConverterService) uploadImage(image *multipart.FileHeader) (string, error) {
	file, err := image.Open()
	if err != nil {
		return "", utils.ErrInternalServerError("Failed to open image file")
	}
	defer file.Close()

	ext := filepath.Ext(image.Filename)
	imageKey := fmt.Sprintf("converters/%s%s", uuid.New().String(), ext)

	_, err = s.rustfsClient.Client.PutObject(context.Background(), utils.BucketNameEnv, imageKey, file, image.Size, minio.PutObjectOptions{
		ContentType: image.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", utils.ErrInternalServerError("Failed to upload image to storage")
	}

	return imageKey, nil
}

func (s *ConverterService) populateImageURL(conv *Converter) {
	if conv.ImageKey != nil && *conv.ImageKey != "" {
		url, err := s.rustfsClient.GetPresignedURL(*conv.ImageKey)
		if err == nil {
			conv.ImageURL = url
		}
	}
}
