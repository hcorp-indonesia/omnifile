# Magic Converter Agent Rules & PRD

These rules apply to any AI agent working on the `magic-converter` project.

## 1. Project Context & Goal
- **Name**: Magic Converter
- **Goal**: Build an all-in-one utility app.

## 2. Tech Stack & Architecture
- **Backend**: Go 1.25, Fiber v3, Bun ORM (PostgreSQL), Redis (Dragonfly) for caching, MinIO/S3 (RustFS) for file storage. Use Clean Architecture (Controller -> Service -> Model).
- **Frontend**: React 19 (Vite), TypeScript, Tailwind CSS v4, Zustand (state), TanStack Query (data fetching), Axios.

## 3. Product Requirements (Core Features)

### 3.1. File Extension Converter
- **Description**: Convert files between various formats.
- **Requirements**:
  - Support for extensive file formats including images (AVIF, WebP, JPG, JPEG, PNG) and documents (PDF, Word/DOCX).
  - Upload interface with drag-and-drop support.
  - Progress tracking for large files.
  - Integration with backend processing (possibly using tools like FFmpeg or ImageMagick).

### 3.2. Remove Background (Remove BG)
- **Description**: Automatically remove the background from uploaded images.
- **Requirements**:
  - Accept image uploads (JPG, PNG, WebP).
  - Use an AI/ML model or third-party API (e.g., rembg, remove.bg API) to process the image.
  - Allow users to download the resulting transparent PNG.
  - Preview before downloading.

### 3.3. Image Upscaling to HD
- **Description**: Enhance and upscale low-resolution images to High Definition (HD) without losing quality.
- **Requirements**:
  - Accept low-res image uploads.
  - Utilize AI-powered upscaling algorithms (e.g., Real-ESRGAN or similar).
  - Provide a side-by-side comparison slider (Original vs. Upscaled).
  - Options for 2x, 4x upscaling.

### 3.4. Unit Converter (Existing/Legacy)
- **Description**: Convert numerical units across categories like temperature, length, weight, etc.
- **Requirements**:
  - Manage dynamic conversion formulas via the database.
  - Simple, fast UI for instant calculations.

## 4. Instructions for Next Steps
When continuing development, always ask the user which feature from the PRD they want to tackle next, or propose a concrete technical plan for integrating the media processing capabilities into the existing Go API.
