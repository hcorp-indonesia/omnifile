# BiRefNet Lite background removal

The required model is `birefnet-general-lite` through `rembg`. Model files are
cached under `REMBG_MODEL_DIR` (`./models/rembg` locally).

The API keeps one persistent Python worker so the ONNX model is loaded once and
reused across requests. The worker uses file paths instead of base64, uses up
to eight logical CPU threads, disables ONNX memory arenas that can exhaust RAM
between jobs, and uses fast PNG encoding. Override the thread count with
`REMBG_CPU_THREADS` on smaller servers.

BiRefNet receives a 5-second processing budget. If it does not finish in that
time, the API stops its worker and retries the image with the lightweight
`u2netp` model. The response header `X-Remove-Bg-Model` reports which model
produced the downloaded image.

On Windows, DirectML can be enabled explicitly with
`REMBG_PROVIDER=directml`. CPU remains the safe default because low-memory GPUs
may reject the fixed 1024x1024 BiRefNet graph.

Install dependencies with:

```powershell
python -m pip install -r requirements.txt
```

The first request initializes the model and is slower than subsequent requests.
Production deployments should pre-populate `REMBG_MODEL_DIR` and run this
feature as a background job when no suitable GPU is available.
