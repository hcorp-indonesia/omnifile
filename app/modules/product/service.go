package product

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"gofiber-starterkit/app/shared"
	"gofiber-starterkit/pkg/client/rustfs"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/uptrace/bun"
)

type ProductService struct {
	db           *bun.DB
	rustfsClient *rustfs.RustfsClient
}

func NewProductService(db *bun.DB, rustfsClient *rustfs.RustfsClient) *ProductService {
	return &ProductService{
		db:           db,
		rustfsClient: rustfsClient,
	}
}

func (s *ProductService) Create(ctx context.Context, req *CreateProductRequest, image *multipart.FileHeader) (*Product, error) {
	product := &Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		Status:      true,
	}

	if image != nil {
		imageKey, err := s.uploadImage(image)
		if err != nil {
			return nil, err
		}
		product.ImageKey = &imageKey
	}

	_, err := s.db.NewInsert().Model(product).Exec(ctx)
	if err != nil {
		return nil, shared.ErrInternalServerError("Failed to create product")
	}

	s.populateImageURL(product)
	return product, nil
}

func (s *ProductService) GetByID(ctx context.Context, id uuid.UUID) (*Product, error) {
	product := new(Product)
	err := s.db.NewSelect().Model(product).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, shared.ErrNotFound("Product not found")
	}
	s.populateImageURL(product)
	return product, nil
}

func (s *ProductService) List(ctx context.Context, page, perPage int) ([]*Product, int, error) {
	var products []*Product
	count, err := s.db.NewSelect().
		Model(&products).
		Limit(perPage).
		Offset((page - 1) * perPage).
		Order("created_at DESC").
		ScanAndCount(ctx)
	if err != nil {
		return nil, 0, shared.ErrInternalServerError("Failed to list products")
	}

	for _, p := range products {
		s.populateImageURL(p)
	}

	return products, count, nil
}

func (s *ProductService) Update(ctx context.Context, id uuid.UUID, req *UpdateProductRequest, image *multipart.FileHeader) (*Product, error) {
	product, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.Description != nil {
		product.Description = req.Description
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.Stock != nil {
		product.Stock = *req.Stock
	}
	if req.Status != nil {
		product.Status = *req.Status
	}

	if image != nil {
		if product.ImageKey != nil {
			_ = s.rustfsClient.DeleteObject(*product.ImageKey)
		}

		imageKey, err := s.uploadImage(image)
		if err != nil {
			return nil, err
		}
		product.ImageKey = &imageKey
	}

	product.UpdatedAt = time.Now()

	_, err = s.db.NewUpdate().Model(product).WherePK().Exec(ctx)
	if err != nil {
		return nil, shared.ErrInternalServerError("Failed to update product")
	}

	s.populateImageURL(product)
	return product, nil
}

func (s *ProductService) UpdateStatus(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.NewUpdate().
		Model((*Product)(nil)).
		Set("status = NOT status").
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return shared.ErrInternalServerError("Failed to toggle product status")
	}
	return nil
}

func (s *ProductService) Delete(ctx context.Context, id uuid.UUID) error {
	product, err := s.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if product.ImageKey != nil {
		_ = s.rustfsClient.DeleteObject(*product.ImageKey)
	}

	_, err = s.db.NewDelete().Model((*Product)(nil)).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return shared.ErrInternalServerError("Failed to delete product")
	}
	return nil
}

func (s *ProductService) uploadImage(image *multipart.FileHeader) (string, error) {
	file, err := image.Open()
	if err != nil {
		return "", shared.ErrInternalServerError("Failed to open image file")
	}
	defer file.Close()

	ext := filepath.Ext(image.Filename)
	imageKey := fmt.Sprintf("products/%s%s", uuid.New().String(), ext)

	_, err = s.rustfsClient.Client.PutObject(context.Background(), rustfs.BucketNameEnv, imageKey, file, image.Size, minio.PutObjectOptions{
		ContentType: image.Header.Get("Content-Type"),
	})
	if err != nil {
		return "", shared.ErrInternalServerError("Failed to upload image to storage")
	}

	return imageKey, nil
}

func (s *ProductService) populateImageURL(product *Product) {
	if product.ImageKey != nil {
		url, err := s.rustfsClient.GetPresignedURL(*product.ImageKey)
		if err == nil {
			product.ImageURL = url
		}
	}
}
