# syntax=docker/dockerfile:1.7

FROM oven/bun:1-alpine AS web-builder
WORKDIR /app/apps/web

ENV CI=true
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY apps/web/package.json apps/web/bun.lock* ./
RUN bun install --frozen-lockfile

COPY apps/web/ ./
RUN bun run build

FROM golang:1.26-alpine AS api-builder
WORKDIR /app/apps/api

COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./main.go && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/migrate ./db/migrations/migrate.go

FROM python:3.12-slim AS runtime
WORKDIR /app

ENV APP_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=8000 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    MALLOC_ARENA_MAX=2 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libgl1 \
        libgomp1 \
        libglib2.0-0 \
        libvulkan1 \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-ind \
        tzdata \
        unzip && \
    curl -fsSL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip \
        -o /tmp/realesrgan-ncnn-vulkan.zip && \
    unzip -q /tmp/realesrgan-ncnn-vulkan.zip -d /app/realesrgan-ncnn-vulkan && \
    chmod +x /app/realesrgan-ncnn-vulkan/realesrgan-ncnn-vulkan && \
    mkdir -p /app/models && \
    curl -fsSL https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth \
        -o /app/models/RealESRGAN_x4plus_anime_6B.pth && \
    rm -f /tmp/realesrgan-ncnn-vulkan.zip && \
    apt-get purge -y --auto-remove curl unzip && \
    rm -rf /var/lib/apt/lists/*

COPY apps/api/src/modules/image/upscale-image/scripts/requirements.txt /tmp/upscale-requirements.txt
COPY apps/api/src/modules/image/remove-bg/scripts/requirements.txt /tmp/remove-bg-requirements.txt
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
        torch==2.7.1 torchvision==0.22.1 && \
    pip install --no-cache-dir -r /tmp/upscale-requirements.txt && \
    pip install --no-cache-dir -r /tmp/remove-bg-requirements.txt && \
    pip install --no-cache-dir pymupdf==1.26.4 python-docx==1.2.0 && \
    rm -f /tmp/upscale-requirements.txt /tmp/remove-bg-requirements.txt

COPY --from=api-builder /out/server /app/server
COPY --from=api-builder /out/migrate /app/migrate
COPY --from=web-builder /app/apps/web/dist /app/static
COPY apps/api/src/modules /app/src/modules
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN addgroup --system appgroup && \
    adduser --system --home /home/appuser --ingroup appgroup appuser && \
    mkdir -p /app/models && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R appuser:appgroup /app /home/appuser

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/livez', timeout=3)"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
