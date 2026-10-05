# Real-ESRGAN setup

## Fast NCNN Vulkan worker

The API prefers the portable `realesrgan-ncnn-vulkan` worker for JPG, PNG,
and WebP input. Download the official portable archive for the host OS and
extract it to `tools/realesrgan-ncnn-vulkan`, or configure these variables:

```env
REALESRGAN_ENGINE=auto
REALESRGAN_NCNN_PATH=./tools/realesrgan-ncnn-vulkan/realesrgan-ncnn-vulkan.exe
REALESRGAN_NCNN_MODELS_PATH=./tools/realesrgan-ncnn-vulkan/models
REALESRGAN_NCNN_MODEL=realesr-animevideov3
```

`realesr-animevideov3` is the latency-optimized default. Set the model to
`realesrgan-x4plus` for higher quality at substantially higher latency.

Adaptive policy for a requested 4x upscale:

- images up to 350,000 pixels use native 4x AI;
- larger images use 2x AI to keep latency and memory bounded;
- the applied factor and mode are returned in `X-Upscale-Scale` and
  `X-Upscale-Mode` response headers.

Use `scale=1` for enhancement at the original resolution. Real-ESRGAN runs at
2x internally, then the result is downsampled with a high-quality filter to the
source dimensions. The response reports `X-Upscale-Scale: 1` and
`X-Upscale-Mode: ai-enhance-original`.

## Python fallback

Download `RealESRGAN_x4plus.pth` from the Real-ESRGAN releases and set
`REALESRGAN_MODEL_PATH` to its absolute path. The worker is intentionally
configured for CPU-safe operation on a 4 GB RAM machine:

- one upscale job at a time;
- CPU inference with two threads;
- 96 px tiles with 8 px padding;
- 3840 px maximum output edge;
- no base64 response buffering.

Install the local Python dependencies with:

```powershell
python -m pip install -r requirements.txt
```
