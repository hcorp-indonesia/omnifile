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
FROM alpine:3.21 AS runtime
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-ind

# Copy Go binary and health check
COPY --from=api-builder /app/server .
COPY --from=api-builder /app/healthcheck .

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
