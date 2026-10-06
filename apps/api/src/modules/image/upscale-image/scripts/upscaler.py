#!/usr/bin/env python3
"""Low-memory Real-ESRGAN worker for Magic Converter."""

import argparse
import json
import os
import sys


def parse_args():
    parser = argparse.ArgumentParser(description="Real-ESRGAN image upscaler")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--scale", type=int, choices=(2, 4), default=2)
    parser.add_argument("--format", default="webp")
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--max-size-mb", type=float, default=5.0)
    parser.add_argument("--max-dimension", type=int, default=3840)
    parser.add_argument("--tile", type=int, default=96)
    parser.add_argument("--cpu-threads", type=int, default=2)
    return parser.parse_args()


def save_image(image, output_path, target_format, max_bytes):
    from PIL import Image

    target_format = target_format.lower()
    if target_format in ("jpg", "jpeg"):
        if image.mode != "RGB":
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "RGBA":
                background.paste(image, mask=image.getchannel("A"))
            else:
                background.paste(image)
            image = background
        quality = 90
        while quality >= 65:
            image.save(output_path, format="JPEG", quality=quality, optimize=True)
            if os.path.getsize(output_path) <= max_bytes or quality == 65:
                break
            quality -= 5
        return "JPEG", image.size

    if target_format == "png":
        image.save(output_path, format="PNG", optimize=True, compress_level=6)
        return "PNG", image.size

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA")
    quality = 90
    while quality >= 65:
        image.save(output_path, format="WEBP", quality=quality, method=4)
        if os.path.getsize(output_path) <= max_bytes or quality == 65:
            break
        quality -= 5
    return "WEBP", image.size


def main():
    args = parse_args()
    if not os.path.exists(args.input):
        raise RuntimeError("input image not found")
    if not os.path.exists(args.model_path):
        raise RuntimeError(
            f"Real-ESRGAN model not found at {args.model_path}; "
            "download RealESRGAN_x4plus.pth and set REALESRGAN_MODEL_PATH"
        )

    os.environ.setdefault("OMP_NUM_THREADS", str(max(1, args.cpu_threads)))
    os.environ.setdefault("MKL_NUM_THREADS", str(max(1, args.cpu_threads)))

    import numpy as np
    import torch
    from PIL import Image, ImageOps
    import torchvision.transforms._functional_tensor as functional_tensor

    sys.modules.setdefault("torchvision.transforms.functional_tensor", functional_tensor)
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

    torch.set_num_threads(max(1, args.cpu_threads))
    torch.set_num_interop_threads(1)

    with Image.open(args.input) as source:
        source = ImageOps.exif_transpose(source)
        original_width, original_height = source.size
        original_format = source.format or "UNKNOWN"
        alpha = source.getchannel("A") if "A" in source.getbands() else None
        rgb = source.convert("RGB")

        target_width = original_width * args.scale
        target_height = original_height * args.scale
        if max(target_width, target_height) > args.max_dimension:
            ratio = args.max_dimension / max(target_width, target_height)
            target_width = max(1, round(target_width * ratio))
            target_height = max(1, round(target_height * ratio))

        model_variant = os.getenv("REALESRGAN_MODEL_VARIANT", "x4plus").lower()
        model = RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_block=6 if model_variant == "anime6b" else 23,
            num_grow_ch=32, scale=4,
        )
        upsampler = RealESRGANer(
            scale=4,
            model_path=args.model_path,
            model=model,
            tile=max(32, args.tile),
            tile_pad=8,
            pre_pad=0,
            half=False,
            gpu_id=None,
        )
        output, _ = upsampler.enhance(np.asarray(rgb), outscale=args.scale)
        result = Image.fromarray(output[:, :, ::-1]).convert("RGB")
        if result.size != (target_width, target_height):
            result = result.resize((target_width, target_height), Image.Resampling.LANCZOS)
        if alpha is not None:
            result.putalpha(alpha.resize(result.size, Image.Resampling.LANCZOS))

        output_format, (upscaled_width, upscaled_height) = save_image(
            result, args.output, args.format, int(args.max_size_mb * 1024 * 1024)
        )

    print(json.dumps({
        "success": True,
        "original_format": original_format,
        "converted_format": output_format,
        "original_width": original_width,
        "original_height": original_height,
        "upscaled_width": upscaled_width,
        "upscaled_height": upscaled_height,
        "scale_factor": args.scale,
        "original_size": os.path.getsize(args.input),
        "upscaled_size": os.path.getsize(args.output),
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"success": False, "error": str(error)}))
        sys.exit(1)
