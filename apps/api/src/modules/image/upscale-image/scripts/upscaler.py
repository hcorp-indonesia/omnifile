#!/usr/bin/env python3
"""
Magic Converter - AI & Super Resolution Image Upscaler
Upscales images by 2x or 4x with edge-preserving filtering, detail enhancement, and transparency support.
"""

import argparse
import json
import os
import sys
from PIL import Image, ImageOps, ImageFilter, ImageEnhance

def parse_args():
    parser = argparse.ArgumentParser(description="Image Super Resolution Upscaler")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output image file path")
    parser.add_argument("--scale", type=int, default=2, help="Scale multiplier (2 or 4)")
    parser.add_argument("--format", default="", help="Output format (png, jpg, webp)")
    return parser.parse_args()

def upscale_image(im, scale):
    orig_w, orig_h = im.size
    target_w = orig_w * scale
    target_h = orig_h * scale

    # Step 1: High fidelity Lanczos resampling
    upscaled = im.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Step 2: Unsharp masking tailored to scale factor
    # If image has alpha channel, separate alpha to avoid halo artifacts
    if upscaled.mode == "RGBA":
        r, g, b, a = upscaled.split()
        rgb = Image.merge("RGB", (r, g, b))
        
        # Apply edge sharpening to RGB
        radius = 1.5 if scale == 2 else 2.5
        percent = 135 if scale == 2 else 150
        rgb_sharp = rgb.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
        
        # Subtle contrast/detail enhance
        enhancer = ImageEnhance.Sharpness(rgb_sharp)
        rgb_enhanced = enhancer.enhance(1.2)
        
        # Re-merge with original alpha
        r_new, g_new, b_new = rgb_enhanced.split()
        final_im = Image.merge("RGBA", (r_new, g_new, b_new, a))
    else:
        radius = 1.5 if scale == 2 else 2.5
        percent = 135 if scale == 2 else 150
        sharp = upscaled.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
        enhancer = ImageEnhance.Sharpness(sharp)
        final_im = enhancer.enhance(1.2)

    return final_im

def main():
    args = parse_args()
    input_path = args.input
    output_path = args.output
    scale = args.scale if args.scale in [2, 4] else 2

    if not os.path.exists(input_path):
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_path}"
        }))
        sys.exit(1)

    try:
        original_size = os.path.getsize(input_path)
        with Image.open(input_path) as im:
            try:
                im = ImageOps.exif_transpose(im)
            except Exception:
                pass

            orig_w, orig_h = im.size
            orig_format = im.format or "UNKNOWN"

            # Determine format
            target_fmt = args.format.lower().strip()
            if not target_fmt:
                target_fmt = orig_format.lower()
            if target_fmt in ["jpeg", "jpg"]:
                target_fmt = "jpg"
            elif target_fmt not in ["png", "webp"]:
                target_fmt = "png"

            # Run upscaling
            result_im = upscale_image(im, scale)
            new_w, new_h = result_im.size

            # Save in requested format
            if target_fmt == "png":
                if result_im.mode not in ("RGBA", "RGB"):
                    result_im = result_im.convert("RGBA")
                result_im.save(output_path, format="PNG", optimize=True, compress_level=6)
                out_format = "PNG"
            elif target_fmt == "webp":
                if result_im.mode not in ("RGBA", "RGB"):
                    result_im = result_im.convert("RGBA")
                result_im.save(output_path, format="WEBP", quality=95, method=6)
                out_format = "WEBP"
            else:
                if result_im.mode != "RGB":
                    bg = Image.new("RGB", result_im.size, (255, 255, 255))
                    if result_im.mode == "RGBA":
                        bg.paste(result_im, mask=result_im.split()[-1])
                    else:
                        bg.paste(result_im)
                    result_im = bg
                result_im.save(output_path, format="JPEG", quality=95, optimize=True)
                out_format = "JPEG"

        result_size = os.path.getsize(output_path)

        print(json.dumps({
            "success": True,
            "original_format": orig_format,
            "converted_format": out_format,
            "original_width": orig_w,
            "original_height": orig_h,
            "upscaled_width": new_w,
            "upscaled_height": new_h,
            "scale_factor": scale,
            "original_size": original_size,
            "upscaled_size": result_size
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
