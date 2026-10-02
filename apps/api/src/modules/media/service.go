package media

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"magic-converter/src/utils"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type MediaService struct {
	rustfsClient    *utils.RustfsClient
	dragonflyClient *utils.DragonflyClient
}

func NewMediaService(
	rustfsClient *utils.RustfsClient,
	dragonflyClient *utils.DragonflyClient,
) *MediaService {
	return &MediaService{
		rustfsClient:    rustfsClient,
		dragonflyClient: dragonflyClient,
	}
}

func (s *MediaService) ConvertFile(ctx context.Context, req *ConvertFileRequest, file *multipart.FileHeader) (*MediaProcessingResponse, error) {
	if file == nil {
		return nil, utils.ErrBadRequest("File is required")
	}

	// 1. Upload original file
	jobID := uuid.New().String()
	ext := filepath.Ext(file.Filename)
	inputKey := fmt.Sprintf("media/input/%s%s", jobID, ext)

	f, err := file.Open()
	if err != nil {
		return nil, utils.ErrInternalServerError("Failed to open uploaded file")
	}
	defer f.Close()

	_, err = s.rustfsClient.UploadFile(ctx, inputKey, f, file.Size, file.Header.Get("Content-Type"))
	if err != nil {
		log.Error().Err(err).Msg("Failed to upload file to storage")
		return nil, utils.ErrInternalServerError("Failed to store file")
	}

	// 2. Simulate Background Processing (In reality, send Job to Redis Queue)
	fakeURL := fmt.Sprintf("https://storage.magic-converter.com/media/output/%s.%s", jobID, req.TargetFormat)

	return &MediaProcessingResponse{
		JobID:   jobID,
		Status:  "completed",
		FileURL: fakeURL,
		Message: "File converted successfully",
	}, nil
}

func (s *MediaService) RemoveBackground(ctx context.Context, file *multipart.FileHeader) (*MediaProcessingResponse, error) {
	if file == nil {
		return nil, utils.ErrBadRequest("Image is required")
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
		return nil, utils.ErrBadRequest("Image is required")
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
