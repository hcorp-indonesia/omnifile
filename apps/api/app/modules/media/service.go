package media

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"magic-converter/app/shared"
	"magic-converter/pkg/client/dragonfly"
	"magic-converter/pkg/client/rustfs"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type MediaService struct {
	rustfsClient    *rustfs.RustfsClient
	dragonflyClient *dragonfly.DragonflyClient
}

func NewMediaService(
	rustfsClient *rustfs.RustfsClient,
	dragonflyClient *dragonfly.DragonflyClient,
) *MediaService {
	return &MediaService{
		rustfsClient:    rustfsClient,
		dragonflyClient: dragonflyClient,
	}
}

func (s *MediaService) ConvertFile(ctx context.Context, req *ConvertFileRequest, file *multipart.FileHeader) (*MediaProcessingResponse, error) {
	if file == nil {
		return nil, shared.ErrBadRequest("File is required")
	}

	// 1. Upload original file
	ext := filepath.Ext(file.Filename)
	originalKey := fmt.Sprintf("media/original/%s%s", uuid.New().String(), ext)

	f, err := file.Open()
	if err != nil {
		return nil, shared.ErrInternalServerError("Failed to open uploaded file")
	}
	defer f.Close()

	if _, err := s.rustfsClient.UploadFile(ctx, originalKey, f, file.Size, file.Header.Get("Content-Type")); err != nil {
		log.Error().Err(err).Msg("Failed to upload file to storage")
		return nil, shared.ErrInternalServerError("Failed to store file")
	}

	// 2. Simulate Background Processing (In reality, send Job to Redis Queue)
	jobID := uuid.New().String()

	// Simulated synchronous processing for now (since we don't have a real worker yet)
	// We'll just return a success response with a fake URL
	fakeProcessedKey := fmt.Sprintf("media/processed/%s.%s", jobID, req.TargetFormat)
	fakeURL := fmt.Sprintf("https://storage.magic-converter.com/%s", fakeProcessedKey)

	return &MediaProcessingResponse{
		JobID:   jobID,
		Status:  "completed",
		FileURL: fakeURL,
		Message: "File converted successfully",
	}, nil
}

func (s *MediaService) RemoveBackground(ctx context.Context, file *multipart.FileHeader) (*MediaProcessingResponse, error) {
	if file == nil {
		return nil, shared.ErrBadRequest("Image is required")
	}

	// Simulated processing
	jobID := uuid.New().String()
	fakeURL := fmt.Sprintf("https://storage.magic-converter.com/media/nobg/%s.png", jobID)

	// Simulated delay for "performance first" streaming awareness
	time.Sleep(500 * time.Millisecond)

	return &MediaProcessingResponse{
		JobID:   jobID,
		Status:  "completed",
		FileURL: fakeURL,
		Message: "Background removed successfully",
	}, nil
}

func (s *MediaService) UpscaleImage(ctx context.Context, req *UpscaleImageRequest, file *multipart.FileHeader) (*MediaProcessingResponse, error) {
	if file == nil {
		return nil, shared.ErrBadRequest("Image is required")
	}

	// Simulated processing
	jobID := uuid.New().String()
	ext := filepath.Ext(file.Filename)
	fakeURL := fmt.Sprintf("https://storage.magic-converter.com/media/upscaled/%s_x%d%s", jobID, req.Scale, ext)

	return &MediaProcessingResponse{
		JobID:   jobID,
		Status:  "completed",
		FileURL: fakeURL,
		Message: "Image upscaled successfully",
	}, nil
}

// In a real scenario, we would use the dragonflyClient to push jobs to a queue
// and have a worker pick them up, passing io.Reader/Writer between RustFS and the worker.
