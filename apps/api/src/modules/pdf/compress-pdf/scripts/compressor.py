import sys
import os
import json
import argparse
import io
import pymupdf
from PIL import Image

def compress_pdf(input_path, output_path, level="recommended", target_kb=0, quality=70, dpi=150, remove_metadata=False):
    original_size = os.path.getsize(input_path)
    if original_size == 0:
        raise ValueError("Input file is empty")

    doc = pymupdf.open(input_path)
    total_pages = len(doc)

    # Determine compression strategy
    do_image_compression = True
    max_dim = 1600
    img_quality = 70
    strip_meta = remove_metadata

    target_bytes = target_kb * 1024 if target_kb > 0 else 0

    if target_bytes > 0:
        ratio = target_bytes / original_size
        if ratio >= 1.0:
            # Already smaller than target, just perform structural optimization
            do_image_compression = False
        elif ratio < 0.25:
            max_dim = 900
            img_quality = 40
            strip_meta = True
        elif ratio < 0.50:
            max_dim = 1200
            img_quality = 55
            strip_meta = True
        elif ratio < 0.75:
            max_dim = 1500
            img_quality = 65
        else:
            max_dim = 1800
            img_quality = 75
    elif level == "extreme":
        max_dim = 1000
        img_quality = 45
        strip_meta = True
    elif level == "low":
        max_dim = 2400
        img_quality = 85
    elif level == "custom":
        if quality > 0:
            img_quality = quality
        if dpi == 72:
            max_dim = 800
        elif dpi == 150:
            max_dim = 1400
        elif dpi == 200:
            max_dim = 1800
        elif dpi == 300:
            max_dim = 2400
    else: # "recommended"
        max_dim = 1600
        img_quality = 70

    if strip_meta:
        doc.set_metadata({})

    processed_xrefs = set()

    if do_image_compression:
        for page in doc:
            images = page.get_images()
            for img_info in images:
                xref = img_info[0]
                if xref in processed_xrefs:
                    continue
                processed_xrefs.add(xref)

                try:
                    base_img = doc.extract_image(xref)
                    if not base_img or not base_img.get("image"):
                        continue
                    
                    img_bytes = base_img["image"]
                    # Skip very small icons / decorations (< 10 KB)
                    if len(img_bytes) < 10240:
                        continue

                    pil_img = Image.open(io.BytesIO(img_bytes))
                    
                    # Convert palettes or CMYK to RGB
                    if pil_img.mode in ("P", "CMYK", "RGBA"):
                        if pil_img.mode == "RGBA":
                            # Check if truly has transparent pixels
                            if pil_img.getextrema()[-1][0] < 255:
                                # Has transparency, keep as PNG or composite on white
                                bg = Image.new("RGB", pil_img.size, (255, 255, 255))
                                bg.paste(pil_img, mask=pil_img.split()[3])
                                pil_img = bg
                            else:
                                pil_img = pil_img.convert("RGB")
                        else:
                            pil_img = pil_img.convert("RGB")
                    elif pil_img.mode != "RGB" and pil_img.mode != "L":
                        pil_img = pil_img.convert("RGB")

                    # Resize if larger than max_dim
                    orig_w, orig_h = pil_img.size
                    if max(orig_w, orig_h) > max_dim:
                        pil_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

                    out_buf = io.BytesIO()
                    pil_img.save(out_buf, format="JPEG", quality=img_quality, optimize=True)
                    new_bytes = out_buf.getvalue()

                    # Only replace if newly compressed bytes are smaller
                    if len(new_bytes) < len(img_bytes):
                        page.replace_image(xref, stream=new_bytes)
                except Exception:
                    # Ignore individual image errors gracefully
                    continue

    # First pass save
    doc.save(
        output_path,
        garbage=4,
        deflate=True,
        clean=True,
        deflate_images=True,
        deflate_fonts=True,
        use_objstms=1,
    )
    doc.close()

    compressed_size = os.path.getsize(output_path)

    # Check if target_bytes was specified and we haven't met it yet, and images were found
    if target_bytes > 0 and compressed_size > target_bytes and len(processed_xrefs) > 0:
        # Aggressive second pass: reduce to lower quality
        second_doc = pymupdf.open(output_path)
        sec_processed = set()
        for page in second_doc:
            for img_info in page.get_images():
                xref = img_info[0]
                if xref in sec_processed:
                    continue
                sec_processed.add(xref)
                try:
                    base_img = second_doc.extract_image(xref)
                    if not base_img or not base_img.get("image"):
                        continue
                    img_bytes = base_img["image"]
                    if len(img_bytes) < 10240:
                        continue
                    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                    pil_img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                    out_buf = io.BytesIO()
                    pil_img.save(out_buf, format="JPEG", quality=38, optimize=True)
                    new_bytes = out_buf.getvalue()
                    if len(new_bytes) < len(img_bytes):
                        page.replace_image(xref, stream=new_bytes)
                except Exception:
                    continue

        temp_pass2 = output_path + ".pass2.pdf"
        second_doc.save(
            temp_pass2,
            garbage=4,
            deflate=True,
            clean=True,
            deflate_images=True,
            deflate_fonts=True,
            use_objstms=1,
        )
        second_doc.close()
        
        if os.path.exists(temp_pass2):
            if os.path.getsize(temp_pass2) < compressed_size:
                os.replace(temp_pass2, output_path)
                compressed_size = os.path.getsize(output_path)
            else:
                os.remove(temp_pass2)

    # Guarantee final compressed file is never larger than original
    if compressed_size > original_size:
        import shutil
        shutil.copyfile(input_path, output_path)
        compressed_size = original_size

    return {
        "success": True,
        "original_size": original_size,
        "compressed_size": compressed_size,
        "total_pages": total_pages,
    }

def main():
    parser = argparse.ArgumentParser(description="High performance PDF compressor")
    parser.add_argument("--input", required=True, help="Input PDF file path")
    parser.add_argument("--output", required=True, help="Output PDF file path")
    parser.add_argument("--level", default="recommended", help="recommended, extreme, low, custom")
    parser.add_argument("--target-kb", type=int, default=0, help="Target file size in KB")
    parser.add_argument("--quality", type=int, default=70, help="Image quality (10-100)")
    parser.add_argument("--dpi", type=int, default=150, help="DPI (72, 150, 200, 300)")
    parser.add_argument("--remove-metadata", action="store_true", help="Strip metadata")

    args = parser.parse_args()

    try:
        res = compress_pdf(
            input_path=args.input,
            output_path=args.output,
            level=args.level,
            target_kb=args.target_kb,
            quality=args.quality,
            dpi=args.dpi,
            remove_metadata=args.remove_metadata,
        )
        print(json.dumps(res))
        sys.exit(0)
    except Exception as e:
        err_res = {"success": False, "error": str(e)}
        print(json.dumps(err_res), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
