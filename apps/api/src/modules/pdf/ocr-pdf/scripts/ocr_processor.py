import sys
import os
import json
import argparse
import subprocess
import shutil
import tempfile
import pymupdf

def find_tesseract():
    # Priority locations for tesseract
    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        shutil.which("tesseract"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return "tesseract"

def process_ocr(input_pdf, output_dir, lang="eng+ind"):
    if not os.path.exists(input_pdf):
        raise FileNotFoundError(f"Input PDF file not found: {input_pdf}")

    tesseract_exe = find_tesseract()
    os.makedirs(output_dir, exist_ok=True)

    # Open PDF
    doc = pymupdf.open(input_pdf)
    total_pages = len(doc)
    if total_pages == 0:
        raise ValueError("PDF has 0 pages")

    temp_render_dir = tempfile.mkdtemp(prefix="mc_ocr_pages_")
    image_paths = []

    try:
        # Render pages to PNG images at 150-200 DPI (ideal balance between OCR accuracy and speed)
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=150)
            img_path = os.path.join(temp_render_dir, f"page_{i:04d}.png")
            pix.save(img_path)
            image_paths.append(img_path)
        doc.close()

        # Write list of files for batch tesseract execution
        list_file_path = os.path.join(temp_render_dir, "pages_list.txt")
        with open(list_file_path, "w", encoding="utf-8") as f:
            for p in image_paths:
                f.write(p + "\n")

        output_base = os.path.join(output_dir, "searchable_doc")
        
        # Execute tesseract in batch mode
        # Generate both searchable PDF (.pdf) and plain text (.txt)
        cmd = [
            tesseract_exe,
            list_file_path,
            output_base,
            "-l", lang,
            "pdf", "txt"
        ]

        # Ensure tessdata environment variable points to valid tessdata if needed
        env = os.environ.copy()
        if os.path.exists(r"C:\Users\Lenovo\AppData\Local\Tesseract\tessdata"):
            env["TESSDATA_PREFIX"] = r"C:\Users\Lenovo\AppData\Local\Tesseract\tessdata"
        elif os.path.exists(r"C:\Program Files\Tesseract-OCR\tessdata"):
            env["TESSDATA_PREFIX"] = r"C:\Program Files\Tesseract-OCR\tessdata"

        res = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if res.returncode != 0:
            raise RuntimeError(f"Tesseract failed: {res.stderr}")

        output_pdf = output_base + ".pdf"
        output_txt = output_base + ".txt"

        if not os.path.exists(output_pdf):
            raise FileNotFoundError(f"Expected searchable PDF was not generated at {output_pdf}")

        extracted_text = ""
        if os.path.exists(output_txt):
            with open(output_txt, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        words_count = len(extracted_text.split())

        return {
            "success": True,
            "total_pages": total_pages,
            "output_pdf": output_pdf,
            "text_content": extracted_text,
            "words_count": words_count,
        }

    finally:
        # Cleanup rendered PNGs and list file
        if os.path.exists(temp_render_dir):
            shutil.rmtree(temp_render_dir, ignore_errors=True)

def main():
    parser = argparse.ArgumentParser(description="OCR PDF Processor to Searchable PDF and Text")
    parser.add_argument("--input", required=True, help="Input PDF file path")
    parser.add_argument("--output-dir", required=True, help="Output directory path")
    parser.add_argument("--lang", default="eng+ind", help="OCR language: eng, ind, eng+ind")

    args = parser.parse_args()

    try:
        res = process_ocr(args.input, args.output_dir, args.lang)
        print(json.dumps(res))
        sys.exit(0)
    except Exception as e:
        err_res = {"success": False, "error": str(e)}
        print(json.dumps(err_res), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
