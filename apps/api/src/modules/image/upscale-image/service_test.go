package upscaleimage

import (
	"context"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestResizeImageFilePreservesRequestedDimensions(t *testing.T) {
	inputPath := filepath.Join(t.TempDir(), "ai-output.png")
	inputFile, err := os.Create(inputPath)
	if err != nil {
		t.Fatalf("create input image: %v", err)
	}
	inputImage := image.NewNRGBA(image.Rect(0, 0, 8, 6))
	for y := range 6 {
		for x := range 8 {
			inputImage.SetNRGBA(x, y, color.NRGBA{R: 230, G: 160, B: 40, A: 255})
		}
	}
	if err := png.Encode(inputFile, inputImage); err != nil {
		_ = inputFile.Close()
		t.Fatalf("encode input image: %v", err)
	}
	_ = inputFile.Close()

	outputPath := filepath.Join(t.TempDir(), "enhanced.png")
	if err := resizeImageFile(inputPath, outputPath, "png", 4, 3); err != nil {
		t.Fatalf("resizeImageFile returned an error: %v", err)
	}
	width, height, _, err := decodeImageMetadata(outputPath)
	if err != nil {
		t.Fatalf("decode output metadata: %v", err)
	}
	if width != 4 || height != 3 {
		t.Fatalf("output dimensions = %dx%d, want 4x3", width, height)
	}
}

func TestAdaptiveUpscaleScale(t *testing.T) {
	tests := []struct {
		name           string
		requestedScale int
		width          int
		height         int
		wantScale      int
		wantMode       string
	}{
		{name: "enhance mode uses 2x AI internally", requestedScale: 1, width: 1920, height: 1080, wantScale: 2, wantMode: "ai-enhance-original"},
		{name: "small image gets native 4x AI", requestedScale: 4, width: 512, height: 512, wantScale: 4, wantMode: "ai-4x"},
		{name: "medium image uses lighter 2x AI", requestedScale: 4, width: 1420, height: 392, wantScale: 2, wantMode: "adaptive-ai-2x"},
		{name: "explicit 2x remains 2x", requestedScale: 2, width: 320, height: 240, wantScale: 2, wantMode: "ai-2x"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gotScale, gotMode := adaptiveUpscaleScale(test.requestedScale, test.width, test.height)
			if gotScale != test.wantScale || gotMode != test.wantMode {
				t.Fatalf("adaptiveUpscaleScale() = (%d, %q), want (%d, %q)", gotScale, gotMode, test.wantScale, test.wantMode)
			}
		})
	}
}

func TestNCNNUpscale(t *testing.T) {
	executablePath := resolveWorkspacePath(".", filepath.Join(
		"tools",
		"realesrgan-ncnn-vulkan",
		"realesrgan-ncnn-vulkan.exe",
	))
	if _, err := os.Stat(executablePath); err != nil {
		t.Skip("NCNN Vulkan worker is not installed")
	}

	inputPath := resolveWorkspacePath(".", filepath.Join(
		"apps",
		"web",
		"public",
		"logo-dark.png",
	))
	outputPath := filepath.Join(t.TempDir(), "upscaled.webp")
	service := &UpscaleImageService{
		ncnnPath:   executablePath,
		ncnnModels: filepath.Join(filepath.Dir(executablePath), "models"),
		ncnnModel:  "realesr-animevideov3",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	result, err := service.runNCNN(ctx, inputPath, outputPath, "webp", 2)
	if err != nil {
		t.Fatalf("runNCNN returned an error: %v", err)
	}
	if result.UpscaledWidth != result.OriginalWidth*2 {
		t.Fatalf("upscaled width = %d, want %d", result.UpscaledWidth, result.OriginalWidth*2)
	}
	if result.UpscaledHeight != result.OriginalHeight*2 {
		t.Fatalf("upscaled height = %d, want %d", result.UpscaledHeight, result.OriginalHeight*2)
	}
}
