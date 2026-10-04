#!/usr/bin/env python3
"""
Magic Converter - AI Background Removal Worker Script
Utilizes rembg with onnxruntime to perform state-of-the-art background removal.
"""

import argparse
import json
import os
import sys
from PIL import Image, ImageOps

def parse_args():
    parser = argparse.ArgumentParser(description="AI Background Removal")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output image file path")
    parser.add_argument("--model", default="u2netp", help="rembg model name (u2netp, u2net)")
    parser.add_argument("--format", default="png", help="Output format (png, webp)")
    return parser.parse_args()

def main():
    args = parse_args()
    input_path = args.input
    output_path = args.output
    model_name = args.model or "u2netp"
    target_format = (args.format or "png").lower().strip()

    if not os.path.exists(input_path):
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_path}"
        }))
        sys.exit(1)

    try:
        import rembg

        original_size = os.path.getsize(input_path)
        with Image.open(input_path) as im:
            try:
                im = ImageOps.exif_transpose(im)
            except Exception:
                pass

            orig_w, orig_h = im.size
            orig_format = im.format or "UNKNOWN"

            # Create session for model
            session = rembg.new_session(model_name)
            result_im = rembg.remove(im, session=session)

            curr_w, curr_h = result_im.size

            if target_format == "webp":
                result_im.save(output_path, format="WEBP", lossless=True, quality=100)
                out_format = "WEBP"
            else:
                result_im.save(output_path, format="PNG", optimize=True, compress_level=6)
                out_format = "PNG"

        result_size = os.path.getsize(output_path)

        print(json.dumps({
            "success": True,
            "original_format": orig_format,
            "converted_format": out_format,
            "original_width": orig_w,
            "original_height": orig_h,
            "result_width": curr_w,
            "result_height": curr_h,
            "original_size": original_size,
            "result_size": result_size
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
