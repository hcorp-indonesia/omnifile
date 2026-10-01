package rustfs

import (
	"context"
	"os"
	"strings"
	"time"

	"gofiber-starterkit/pkg/utils"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/zerolog/log"
)

var (
	BucketNameEnv = os.Getenv("RUSTFS_BUCKET")
	RegionEnv     = os.Getenv("RUSTFS_REGION")
)

type RustfsClient struct {
	Client *minio.Client
}

func New() *RustfsClient {
	endpoint := os.Getenv("RUSTFS_ENDPOINT")
	accessKey := os.Getenv("RUSTFS_ACCESS_KEY_ID")
	secretKey := os.Getenv("RUSTFS_SECRET_ACCESS_KEY")
	usePathStyle := utils.ParseBoolEnv("RUSTFS_USE_PATH_STYLE", false)

	secure := true
	if strings.HasPrefix(endpoint, "http://") {
		secure = false
		endpoint = strings.TrimPrefix(endpoint, "http://")
	} else if strings.HasPrefix(endpoint, "https://") {
		secure = true
		endpoint = strings.TrimPrefix(endpoint, "https://")
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:        credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure:       secure,
		Region:       RegionEnv,
		BucketLookup: minio.BucketLookupAuto,
	})

	if usePathStyle {
		client.SetAppInfo("Flowy", "1.0.0")

		client, err = minio.New(endpoint, &minio.Options{
			Creds:        credentials.NewStaticV4(accessKey, secretKey, ""),
			Secure:       secure,
			Region:       RegionEnv,
			BucketLookup: minio.BucketLookupPath,
		})
	}

	if err != nil {
		log.Error().Err(err).Msg("Failed to create Rustfs (S3) client")
		return nil
	}

	log.Debug().Msg("Connected to Rustfs (S3) successfully")

	return &RustfsClient{
		Client: client,
	}
}

func (s *RustfsClient) GetPresignedURL(key string) (string, error) {
	url, err := s.Client.PresignedGetObject(context.Background(), BucketNameEnv, key, time.Hour*24, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (s *RustfsClient) GetPresignedUploadURL(key string, contentType string) (string, error) {
	url, err := s.Client.PresignedPutObject(context.Background(), BucketNameEnv, key, time.Hour*1)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (s *RustfsClient) DeleteObject(key string) error {
	return s.Client.RemoveObject(context.Background(), BucketNameEnv, key, minio.RemoveObjectOptions{})
}
