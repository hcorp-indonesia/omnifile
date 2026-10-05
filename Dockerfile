# =========================================================
# Stage 1: Build Frontend (React + Vite SPA)
# =========================================================
FROM oven/bun:1-alpine AS web-builder
WORKDIR /app

ENV CI=true

COPY apps/web/package.json apps/web/bun.lock* ./apps/web/
WORKDIR /app/apps/web
RUN bun install --frozen-lockfile

COPY apps/web ./
RUN bun run build

# =========================================================
# Stage 2: Build Backend (Go Fiber v3)
# =========================================================
FROM golang:1.25-alpine AS api-builder
WORKDIR /app

# Copy go.mod and go.sum for dependency caching
COPY apps/api/go.mod apps/api/go.sum ./apps/api/
WORKDIR /app/apps/api
RUN go mod download

# Copy API source and build
COPY apps/api ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server main.go
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/healthcheck hc/main.go

# =========================================================
# Stage 3: Runtime (Alpine)
# =========================================================
FROM python:3.12-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip libgomp1 libvulkan1 tzdata tesseract-ocr tesseract-ocr-eng tesseract-ocr-ind && \
    curl -fsSL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip -o /tmp/realesrgan-ncnn-vulkan.zip && \
    unzip -q /tmp/realesrgan-ncnn-vulkan.zip -d /app/realesrgan-ncnn-vulkan && \
    chmod +x /app/realesrgan-ncnn-vulkan/realesrgan-ncnn-vulkan && \
    rm -f /tmp/realesrgan-ncnn-vulkan.zip && \
    apt-get purge -y --auto-remove curl unzip && \
    rm -rf /var/lib/apt/lists/*

# Copy Go binary and health check
COPY --from=api-builder /app/server .
COPY --from=api-builder /app/healthcheck .
COPY apps/api/src/modules/image/upscale-image/scripts/upscaler.py ./scripts/upscaler.py
COPY apps/api/src/modules/image/upscale-image/scripts/requirements.txt ./scripts/requirements.txt
COPY apps/api/src/modules/image/remove-bg/scripts/remove_bg.py ./scripts/remove_bg.py
COPY apps/api/src/modules/image/remove-bg/scripts/requirements.txt ./scripts/remove-bg-requirements.txt
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.7.1 torchvision==0.22.1 && \
    pip install --no-cache-dir numpy==2.5.3 Pillow==12.3.0 realesrgan==0.3.0 && \
    pip install --no-cache-dir -r ./scripts/remove-bg-requirements.txt

# Copy built frontend into static directory
COPY --from=web-builder /app/apps/web/dist ./static

# Create non-root user
RUN addgroup -S appgroup && adduser -S -h /home/appuser -s /bin/sh appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD ["/app/healthcheck"]

ENTRYPOINT ["/app/server"]
