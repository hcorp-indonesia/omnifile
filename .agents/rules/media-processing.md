# Media Processing Guidelines

When working on the new media features for Magic Converter (File Converter, Remove BG, Upscaler), adhere to the following rules:

## 1. Upload & Storage
- Always use the abstracted S3/MinIO client (RustFS) located in `apps/api/pkg/client/rustfs` for storing original and processed files.
- Never store large files in memory. Use Go's `io.Reader` and `io.Writer` for streaming files directly between HTTP requests, the processing engine, and storage.
- Implement strict file size limits and MIME type validation in the Fiber routes before passing files to services.

## 2. Processing Strategy
- **Synchronous vs Asynchronous**: For quick tasks (like basic image format conversion), synchronous processing is fine. For heavy tasks (Remove BG, AI Upscaling), implement a background worker queue (using Redis/Dragonfly) and return a Job ID to the frontend to poll for progress or use WebSockets/Server-Sent Events (SSE).

## 3. Tool Integration
- If calling external Python scripts or CLI tools (like FFmpeg) from Go, use `os/exec` with strict timeouts using `context.WithTimeout`.
- Clean up temporary files immediately after processing or uploading to S3 to prevent disk space exhaustion.
