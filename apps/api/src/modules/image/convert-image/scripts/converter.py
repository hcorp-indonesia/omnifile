#!/usr/bin/env python3
"""
Magic Converter - Image Converter Worker Script
Utilizes Pillow (with libwebp and pillow-avif/libavif support) to perform fast, high-quality image format conversions.
"""

import argparse
import json
import os
import sys
from PIL import Image, ImageOps

def parse_args():
    parser = argparse.ArgumentParser(description="Convert images across multiple formats.")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output image file path")
    parser.add_argument("--format", required=True, help="Target format (png, jpg, webp, avif, bmp, tiff, ico, gif)")
    parser.add_argument("--quality", type=int, default=85, help="Quality factor (1-100)")
    parser.add_argument("--background", default="#FFFFFF", help="Background color for RGBA -> RGB conversions (default #FFFFFF)")
    parser.add_argument("--width", type=int, default=0, help="Optional resize width")
    parser.add_argument("--height", type=int, default=0, help="Optional resize height")
    parser.add_argument("--remove-bg", action="store_true", help="Remove background using AI (transparent)")
    return parser.parse_args()

def hex_to_rgb(hex_str):
    hex_clean = hex_str.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) == 6:
        return tuple(int(hex_clean[i:i+2], 16) for i in (0, 2, 4))
    return (255, 255, 255)

def main():
    args = parse_args()
    input_path = args.input
    output_path = args.output
    target_format = args.format.lower().strip()
    quality = max(1, min(100, args.quality))
    bg_color = hex_to_rgb(args.background)

    if not os.path.exists(input_path):
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_path}"
        }))
        sys.exit(1)

    try:
        original_size = os.path.getsize(input_path)
        with Image.open(input_path) as im:
            # Respect EXIF orientation tag if present
            try:
                im = ImageOps.exif_transpose(im)
            except Exception:
                pass

            orig_w, orig_h = im.size
            orig_format = im.format or "UNKNOWN"

            # Resize if requested
            if args.width > 0 and args.height > 0:
                im = im.resize((args.width, args.height), Image.Resampling.LANCZOS)
            elif args.width > 0:
                calc_h = int(orig_h * (args.width / orig_w))
                im = im.resize((args.width, max(1, calc_h)), Image.Resampling.LANCZOS)
            elif args.height > 0:
                calc_w = int(orig_w * (args.height / orig_h))
                im = im.resize((max(1, calc_w), args.height), Image.Resampling.LANCZOS)

            curr_w, curr_h = im.size

            if args.remove_bg:
                try:
                    import rembg
                    session = rembg.new_session("u2netp")
                    im = rembg.remove(im, session=session)
                    curr_w, curr_h = im.size
                except Exception as rembg_err:
                    print(json.dumps({
                        "success": False,
                        "error": f"AI Background removal error: {str(rembg_err)}"
                    }))
                    sys.exit(1)

            # Normalize target format
            fmt_upper = target_format.upper()
            if fmt_upper in ["JPG", "JPEG"]:
                fmt_upper = "JPEG"
                # If image has alpha channel or palette with transparency, composite onto background
                if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                    alpha_im = im.convert("RGBA")
                    bg = Image.new("RGBA", alpha_im.size, bg_color + (255,))
                    composite = Image.alpha_composite(bg, alpha_im)
                    im = composite.convert("RGB")
                elif im.mode != "RGB":
                    im = im.convert("RGB")

                im.save(output_path, format="JPEG", quality=quality, optimize=True)

            elif fmt_upper == "PNG":
                # PNG supports RGBA and RGB
                if im.mode not in ("RGBA", "RGB", "L", "LA"):
                    im = im.convert("RGBA")
                im.save(output_path, format="PNG", optimize=True, compress_level=6)

            elif fmt_upper == "WEBP":
                if im.mode not in ("RGBA", "RGB"):
                    im = im.convert("RGBA")
                is_lossless = (quality == 100)
                im.save(output_path, format="WEBP", quality=quality, lossless=is_lossless, method=6)

            elif fmt_upper == "AVIF":
                if im.mode not in ("RGBA", "RGB"):
                    im = im.convert("RGBA")
                im.save(output_path, format="AVIF", quality=quality)

            elif fmt_upper == "BMP":
                if im.mode in ("RGBA", "LA"):
                    bg = Image.new("RGB", im.size, bg_color)
                    bg.paste(im, mask=im.split()[-1])
                    im = bg
                elif im.mode != "RGB":
                    im = im.convert("RGB")
                im.save(output_path, format="BMP")

            elif fmt_upper in ["TIFF", "TIF"]:
                fmt_upper = "TIFF"
                im.save(output_path, format="TIFF", compression="tiff_deflate")

            elif fmt_upper == "ICO":
                # Windows icons usually are 256x256 max
                if im.mode != "RGBA":
                    im = im.convert("RGBA")
                icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
                # Filter sizes smaller or equal to current dimensions
                valid_sizes = [s for s in icon_sizes if s[0] <= max(curr_w, 256) and s[1] <= max(curr_h, 256)]
                if not valid_sizes:
                    valid_sizes = [(32, 32)]
                im.save(output_path, format="ICO", sizes=valid_sizes)

            elif fmt_upper == "GIF":
                if im.mode not in ("P", "L"):
                    im = im.convert("P", palette=Image.Palette.ADAPTIVE)
                im.save(output_path, format="GIF", optimize=True)

            else:
                # Default generic fallback
                im.save(output_path, format=fmt_upper)

        converted_size = os.path.getsize(output_path)

        result = {
            "success": True,
            "original_format": orig_format,
            "converted_format": fmt_upper,
            "original_width": orig_w,
            "original_height": orig_h,
            "converted_width": curr_w,
            "converted_height": curr_h,
            "original_size": original_size,
            "converted_size": converted_size
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
