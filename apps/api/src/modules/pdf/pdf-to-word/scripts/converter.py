import os
import sys
import json
import io
import re
import tempfile
import subprocess
import argparse
import warnings

warnings.filterwarnings("ignore")

from PIL import Image, ImageDraw
import numpy as np
import pymupdf as fitz
try:
    fitz.TOOLS.mupdf_display_errors(False)
except Exception:
    pass

import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def get_tesseract_path():
    env_path = os.getenv("TESSERACT_PATH", "").strip()
    if env_path and os.path.exists(env_path):
        return env_path
    standard_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for p in standard_paths:
        if os.path.exists(p):
            return p
    return None

def run_tesseract_ocr(img_path):
    tess_path = get_tesseract_path()
    if not tess_path:
        return ""
    try:
        cmd = [tess_path, img_path, "stdout", "-l", "ind+eng", "--psm", "6"]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=45)
        text = res.stdout.strip()
        if len(text.split()) < 5:
            cmd_fb = [tess_path, img_path, "stdout", "-l", "ind+eng"]
            res_fb = subprocess.run(cmd_fb, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=45)
            text = res_fb.stdout.strip()
        return text
    except Exception:
        return ""

def run_tesseract_spans(img_path, dpi=300):
    """Runs Tesseract in TSV mode and returns positioned word spans in PDF points."""
    tess_path = get_tesseract_path()
    if not tess_path:
        return []
    try:
        cmd = [tess_path, img_path, "stdout", "-l", "ind+eng", "--psm", "6", "tsv"]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=60)
        k = 72.0 / dpi
        spans = []
        for ln in res.stdout.splitlines()[1:]:
            p = ln.split("\t")
            if len(p) < 12 or p[0] != "5":
                continue
            text = p[11].strip()
            try:
                conf = float(p[10])
                left, top, w, h = int(p[6]), int(p[7]), int(p[8]), int(p[9])
            except ValueError:
                continue
            if not text or conf < 20:
                continue
            spans.append({
                "x0": left * k, "y0": top * k, "x1": (left + w) * k, "y1": (top + h) * k,
                "text": text, "size": h * k * 1.15, "bold": False,
            })
        return spans
    except Exception:
        return []

def extract_page_header_logo(page):
    """
    Intelligently extracts an emblem, seal, or logo from the document header:
    - First checks for embedded vector/raster images in the top 28% of the page.
    - If none, inspects the top-left quadrant of the high-res scanned render to find
      a genuine logo cluster, cleanly crops it, and returns the blanking bbox.
    Returns (logo_file_path, blank_box_tuple) or (None, None).
    """
    try:
        # 1. Check native embedded images in PDF
        for img_info in page.get_images():
            xref = img_info[0]
            for rect in page.get_image_rects(xref):
                if rect.y1 < page.rect.height * 0.28 and 25 < rect.width < page.rect.width * 0.35:
                    base_img = page.parent.extract_image(xref)
                    if base_img and base_img.get("image"):
                        tmp = tempfile.NamedTemporaryFile(suffix="." + base_img.get("ext", "png"), delete=False)
                        tmp.write(base_img["image"])
                        tmp.close()
                        return tmp.name, (int(rect.x0), int(rect.y0), int(rect.x1), int(rect.y1))

        # 2. Check scanned page: analyze top-left header quadrant
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        w, h = img.size

        tl_w = int(w * 0.35)
        tl_h = int(h * 0.22)
        crop_tl = img.crop((0, 0, tl_w, tl_h)).convert("L")
        arr = np.array(crop_tl) < 220

        rows = np.any(arr, axis=1)
        cols = np.any(arr, axis=0)
        if not np.any(rows) or not np.any(cols):
            return None, None

        y_min, y_max = np.where(rows)[0][[0, -1]]
        x_min, x_max = np.where(cols)[0][[0, -1]]

        if (x_max - x_min) < 80 or (y_max - y_min) < 80:
            return None, None

        # Detect gap between logo cluster and header text
        sub_arr = arr[y_min:y_max, x_min:x_max]
        col_counts = np.sum(sub_arr, axis=0)
        w_sub = x_max - x_min
        min_val = 999999
        valley_idx = -1
        for cx in range(int(w_sub * 0.3), int(w_sub * 0.85)):
            window_val = np.mean(col_counts[max(0, cx-5):min(w_sub, cx+6)])
            if window_val < min_val:
                min_val = window_val
                valley_idx = cx

        split_x = w_sub
        if valley_idx > 0 and min_val < 35:
            split_x = valley_idx + 10

        logo_w = split_x
        logo_h = y_max - y_min
        aspect = logo_w / float(logo_h)

        if 0.35 <= aspect <= 2.8:
            logo_img = img.crop((x_min, y_min, x_min + logo_w, y_max))
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            logo_img.save(tmp.name)
            tmp.close()
            blank_box = (max(0, x_min - 10), max(0, y_min - 10), x_min + logo_w + 15, y_max + 10)
            return tmp.name, blank_box
    except Exception:
        pass
    return None, None

def build_visual_lines(spans):
    """
    Rebuilds visual text rows from positioned spans: spans sharing the same baseline are
    merged left-to-right, and large horizontal gaps become column separators (3 spaces).
    Returns a list of dicts: y, text, x0, x1, size, bold, align (sorted top to bottom).
    """
    spans = sorted(spans, key=lambda s: ((s["y0"] + s["y1"]) / 2, s["x0"]))
    rows = []
    for s in spans:
        cy = (s["y0"] + s["y1"]) / 2
        h = max(s["y1"] - s["y0"], 1.0)
        placed = False
        for row in reversed(rows[-4:]):
            if abs(cy - row["cy"]) <= 0.5 * max(h, row["h"]):
                row["spans"].append(s)
                row["h"] = max(row["h"], h)
                placed = True
                break
        if not placed:
            rows.append({"cy": cy, "y": s["y0"], "h": h, "spans": [s]})
    rows.sort(key=lambda r: r["cy"])

    result = []
    for row in rows:
        sp = sorted(row["spans"], key=lambda s: s["x0"])
        row_size = max(s.get("size", 10.0) for s in sp)
        cells = []
        prev = None
        for s in sp:
            txt = s["text"].strip()
            if not txt:
                continue
            if prev is not None and (s["x0"] - prev["x1"]) < 0.9 * max(row_size, 8.0):
                cells[-1] += " " + txt
            else:
                cells.append(txt)
            prev = s
        if cells:
            result.append({
                "y": row["y"],
                "text": "   ".join(cells),
                "x0": min(s["x0"] for s in sp),
                "x1": max(s["x1"] for s in sp),
                "size": row_size,
                "bold": all(s.get("bold", False) for s in sp),
                "align": "left",
            })
    return result

def is_sig_or_date_line(text, x0, L, W):
    text_s = text.strip()
    if (x0 - L) > 0.40 * W and len(text_s) < 55:
        return True
    if re.search(r'^(Semarang|Jakarta|Surabaya|Bandung|Yogyakarta|[A-Z][a-z]+,\s*\d{1,2}\s+[A-Z][a-z]+\s+\d{4})', text_s):
        return True
    if re.search(r'^(Petugas|Mengetahui|Tanda Tangan|Hormat kami|Yang menyatakan|Verifikasi)\b', text_s, re.I):
        return True
    if re.match(r'^\([A-Z][a-zA-Z\s.,]+\)$', text_s):
        return True
    return False

def annotate_and_merge_lines(lines):
    """
    Detects horizontal alignment of each visual line (left / center / right) relative to the
    content area, and merges wrapped full-width lines into one justified paragraph.
    """
    if not lines:
        return lines
    L = min(l["x0"] for l in lines)
    R = max(l["x1"] for l in lines)
    W = max(R - L, 1.0)
    mid = (L + R) / 2.0

    for l in lines:
        l["align"] = "left"
        if W < 60:
            continue
        line_w = l["x1"] - l["x0"]
        cx = (l["x0"] + l["x1"]) / 2.0

        if is_sig_or_date_line(l["text"], l["x0"], L, W):
            l["align"] = "right"
        elif (l["x0"] - L) > 0.40 * W and line_w < 0.65 * W:
            l["align"] = "right"
        elif l["x1"] >= R - 0.05 * W and (l["x0"] - L) > 0.35 * W:
            l["align"] = "right"
        elif abs(cx - mid) < 0.08 * W and (l["x0"] - L) > 0.06 * W and (R - l["x1"]) > 0.06 * W and line_w < 0.85 * W:
            l["align"] = "center"

    def is_full(l):
        return "   " not in l["text"] and (l["x1"] >= R - 0.08 * W) and (l["x1"] - l["x0"]) >= 0.75 * W

    merged = []
    i = 0
    n = len(lines)
    while i < n:
        cur = dict(lines[i])
        last = lines[i]
        i += 1
        did_merge = False
        if not is_kv_line(cur["text"]) and cur.get("align") != "right":
            while i < n and is_full(last):
                nxt = lines[i]
                if ("   " in nxt["text"] or is_kv_line(nxt["text"])
                        or abs(nxt["size"] - cur["size"]) > 1.5
                        or (nxt["y"] - last["y"]) > 2.4 * max(cur["size"], 8.0)
                        or (nxt["x0"] - L) > 0.12 * W
                        or nxt.get("align") == "right"):
                    break
                cur["text"] += " " + nxt["text"]
                cur["x1"] = nxt["x1"]
                last = nxt
                did_merge = True
                i += 1
        if did_merge:
            cur["align"] = "justify"
        merged.append(cur)
    return merged

def structure_page_lines(v_lines, normalize=False):
    """
    Directly converts positioned visual lines into structured elements:
    - headings (titles and section headers with detected alignment and bold styling)
    - form_table (contiguous key-value pairs with multiline continuation value support)
    - grid_table (multi-column tables, transparent if 1 row or header)
    - callout (notes / alerts)
    - footer (page numbers, print stamps)
    - paragraph (standard prose, justified if merged)
    """
    if not v_lines:
        return []

    lines = []
    for l in v_lines:
        c = dict(l)
        if normalize:
            c["text"] = normalize_ocr_terms(c["text"])
        lines.append(c)

    L = min(l["x0"] for l in lines)
    R = max(l["x1"] for l in lines)
    W = max(R - L, 1.0)
    body_sizes = sorted(l["size"] for l in lines)
    body = body_sizes[len(body_sizes) // 2]

    elements = []
    i = 0
    total = len(lines)

    while i < total:
        line = lines[i]
        txt = line["text"]
        y0 = line["y"]
        align = line.get("align", "left")

        # 1. Footer check
        if re.search(r'^(dicetak|printed|page|halaman|generated|sistem)\b', txt, re.I):
            elements.append({
                "type": "footer",
                "text": txt,
                "y0": y0,
                "align": align if align != "left" else "right",
                "size": line.get("size", 8.5),
            })
            i += 1
            continue

        # 2. Callout / Alert / Note box check
        if re.search(r'^(catatan|note|perhatian|penting|disclaimer|data\s+mu[lt]ak[hn]ir|warning|caution)\b', txt, re.I):
            callout_lines = [txt]
            i += 1
            while i < total:
                next_l = lines[i]
                next_t = next_l["text"]
                if is_kv_line(next_t) or re.search(r'^(dicetak|printed|page|halaman|catatan|note|status|data\s+[a-z]+)\b', next_t, re.I):
                    break
                cols = [c.strip() for c in re.split(r'\s{2,}|\t|\|', next_t) if c.strip()]
                if len(cols) >= 2:
                    break
                callout_lines.append(next_t)
                i += 1
            elements.append({
                "type": "callout",
                "text": " ".join(callout_lines),
                "y0": y0,
                "align": align,
            })
            continue

        # 3. Form Table (contiguous Key-Value pairs with smart multiline continuation)
        kv = is_kv_line(txt)
        if kv and (line["x0"] - L) < 0.35 * W:
            form_rows = [[kv[0], ":", kv[1]]]
            label_x0 = line["x0"]
            i += 1
            while i < total:
                curr_l = lines[i]
                curr_t = curr_l["text"]
                curr_x0 = curr_l["x0"]

                # Break on date / signature block
                if is_sig_or_date_line(curr_t, curr_x0, L, W):
                    break
                # Break on footer or callout
                if re.search(r'^(dicetak|printed|page|halaman|catatan|note)\b', curr_t, re.I):
                    break

                is_indented = (curr_x0 > label_x0 + 20)
                curr_kv = is_kv_line(curr_t) if not is_indented else None

                if curr_kv:
                    form_rows.append([curr_kv[0], ":", curr_kv[1]])
                    i += 1
                elif is_indented or (len(curr_t.split()) > 1 and not curr_t.isupper()):
                    form_rows[-1][2] += " " + curr_t
                    i += 1
                else:
                    break

            elements.append({
                "type": "form_table",
                "rows": form_rows,
                "y0": y0,
            })
            continue

        # 4. Multi-column row / Grid Table
        cols = [c.strip() for c in re.split(r'\s{2,}|\t|\||\s+(?=oleh\s+[A-Za-z])', txt) if c.strip()]
        if len(cols) >= 2:
            tab_rows = [cols]
            i += 1
            while i < total:
                c_next = [c.strip() for c in re.split(r'\s{2,}|\t|\||\s+(?=oleh\s+[A-Za-z])', lines[i]["text"]) if c.strip()]
                if len(c_next) >= 2 and not is_kv_line(lines[i]["text"]) and not re.search(r'^(dicetak|catatan|note|data mutakhir|page|halaman)\b', lines[i]["text"], re.I):
                    tab_rows.append(c_next)
                    i += 1
                else:
                    break
            max_c = max(len(r) for r in tab_rows)
            padded = [r + [''] * (max_c - len(r)) for r in tab_rows]
            if len(padded) == 1:
                elements.append({
                    "type": "table_rows",
                    "rows": padded,
                    "y0": y0,
                    "transparent": True,
                })
            else:
                elements.append({
                    "type": "grid_table",
                    "rows": padded,
                    "y0": y0,
                })
            continue

        # 5. Signature / Date Block (grouped into a transparent 2-column table)
        if is_sig_or_date_line(txt, line["x0"], L, W):
            sig_lines = []
            sig_x0 = line["x0"]
            y0 = line["y"]
            while i < total:
                curr_l = lines[i]
                curr_t = curr_l["text"]
                curr_x0 = curr_l["x0"]
                if is_sig_or_date_line(curr_t, curr_x0, L, W) or abs(curr_x0 - sig_x0) < 0.15 * W:
                    sig_lines.append(curr_l)
                    i += 1
                else:
                    break
            elements.append({
                "type": "signature_block",
                "lines": sig_lines,
                "y0": y0,
                "x0_rel": (sig_x0 - L) / W,
            })
            continue

        # 6. Heading vs Paragraph
        is_heading_candidate = (
            len(txt) < 60
            and (txt.isupper() or len(txt.split()) <= 4 or line.get("bold") or line["size"] >= body * 1.25)
        )
        if is_heading_candidate:
            if len(txt) <= 2 and len(txt.split()) == 1:
                i += 1
                continue
            elements.append({
                "type": "heading",
                "text": txt,
                "y0": y0,
                "align": align,
                "size": line["size"],
                "bold": True,
                "big": line["size"] >= body * 1.25,
            })
        else:
            elements.append({
                "type": "paragraph",
                "text": txt,
                "y0": y0,
                "align": align,
                "size": line["size"],
                "bold": line.get("bold", False),
            })
        i += 1

    return elements

def is_kv_line(line):
    """
    Universally detects if a line is a Key-Value pair (e.g., 'Nama : John Doe', 'NIM : 12345', 'Invoice No : INV-01').
    Works across colons, pipes, dashes, or OCR-degraded delimiters.
    """
    line = line.strip()
    if re.match(r'^\(?https?://', line, re.I):
        return None
    m = re.match(r'^([a-zA-Z0-9\s/()._,]{2,35}?)\s*[:|]\s*(.*)$', line)
    if not m:
        m = re.match(r'^([a-zA-Z0-9\s/()._]{2,20})\s*[\-–—]\s*([a-zA-Z0-9].+)$', line)
    if not m:
        m = re.match(r'^([a-zA-Z\s]{2,20})\s*[.>]\s*([A-Z0-9].+)$', line)
    if not m:
        return None
    lbl = m.group(1).strip()
    val = m.group(2).strip()
    if re.search(r'\b\d{2}:\d{2}\b', lbl) or len(lbl.split()) > 5:
        return None
    return lbl, val

def normalize_ocr_terms(text):
    """
    Universal normalization for OCR degradation artifacts in scanned documents.
    Preserves dynamic student names, dates, amounts, and user data.
    """
    subs = [
        # Standard form field misreadings
        (r'\b(Mama|Hama|Marne)\s*[:|.]', 'Nama :'),
        (r'\b(Nin|MIA|Hr|Mm)\s*[:|."\']', 'NIM :'),
        (r'\b(Kelas|Kalas|koalas)\s*[:|.\-]', 'Kelas :'),
        (r'\b(Jwusan|Jurisan)\s*[:|.]', 'Jurusan :'),
        (r'\bProgram\s+Stud\b', 'Program Studi'),
        (r'\bTekmk\b', 'Teknik'),
        (r'\bTeknolog\s+Reksyass\b', 'Teknologi Rekayasa'),
        (r'\bSarans\b', 'Sarjana'),
        (r'\bSTATUS\s+PEMUTA\w*\b', 'STATUS PEMUTAKHIRAN'),
        (r'\bDATA\s+MAHA?\w*\b', 'DATA MAHASISWA'),
        (r'DATA CIFINSLIS.*?wf\s*DATA DERIFIKASI.*', 'DATA DIFINALISASI (DIKIRIM)    DATA DIVERIFIKASI'),
        (r'\bolen\b', 'oleh'),
        (r'\bData\s+mu[lt]ak[hn]ir\b', 'Data mutakhir'),
        (r'\bpenussan\b', 'penulisan'),
        (r'\bpencelakan\b', 'pencetakan'),
        (r'\bmelssul\b', 'melalui'),
        (r'\b(Transknin|Transkno)\b', 'Transkrip'),
        (r'\bbazah\b', 'Ijazah'),
    ]
    res = text
    for pattern, repl in subs:
        res = re.sub(pattern, repl, res, flags=re.I)
    return res

def clean_and_structure_scanned_ocr(raw_ocr_text):
    """
    Universally parses OCR text from ANY document into structured elements:
    - headings (titles and section headers)
    - form_table (contiguous key-value rows like Nama: ..., NIM: ...)
    - grid_table (multi-column rows separated by tabs, pipes, or 2+ spaces)
    - callout (notes/alerts starting with Catatan, Note, Penting, Data mutakhir, etc.)
    - footer (Dicetak ..., Printed ..., Page ...)
    - paragraph (standard prose)
    """
    if not raw_ocr_text or not raw_ocr_text.strip():
        return []

    raw_lines = [l.strip() for l in raw_ocr_text.splitlines() if l.strip()]
    elements = []
    i = 0
    total = len(raw_lines)

    last_start = 0
    prev_len = 0

    while i < total:
        for _el in elements[prev_len:]:
            _el.setdefault("src", last_start)
        prev_len = len(elements)
        last_start = i
        line = raw_lines[i]

        # 1. Footer check
        if re.search(r'^(dicetak|printed|page|halaman|generated|sistem)\b', line, re.I):
            elements.append({"type": "footer", "text": line})
            i += 1
            continue

        # 2. Callout / Alert / Note box check (including continuation lines)
        if re.search(r'^(catatan|note|perhatian|penting|disclaimer|data\s+mu[lt]ak[hn]ir|warning|caution)\b', line, re.I):
            callout_lines = [line]
            i += 1
            while i < total:
                next_l = raw_lines[i]
                if is_kv_line(next_l) or re.search(r'^(dicetak|printed|page|halaman|catatan|note|status|data\s+[a-z]+)\b', next_l, re.I):
                    break
                cols = [c.strip() for c in re.split(r'\s{2,}|\t|\|', next_l) if c.strip()]
                if len(cols) >= 2:
                    break
                callout_lines.append(next_l)
                i += 1
            elements.append({"type": "callout", "text": " ".join(callout_lines)})
            continue

        # 3. Form Table (contiguous Key-Value pairs)
        kv = is_kv_line(line)
        if kv:
            form_rows = []
            while i < total:
                kv_curr = is_kv_line(raw_lines[i])
                if kv_curr:
                    form_rows.append([kv_curr[0], ":", kv_curr[1]])
                    i += 1
                else:
                    break
            elements.append({"type": "form_table", "rows": form_rows})
            continue

        # 4. Grid Table (multi-column rows separated by 2+ spaces, tabs, pipes, or status indicators)
        cols = [c.strip() for c in re.split(r'\s{2,}|\t|\||\s+(?=oleh\s+[A-Za-z])', line) if c.strip()]
        if len(cols) >= 2:
            tab_rows = [cols]
            i += 1
            while i < total:
                c_next = [c.strip() for c in re.split(r'\s{2,}|\t|\||\s+(?=oleh\s+[A-Za-z])', raw_lines[i]) if c.strip()]
                if len(c_next) >= 2 and not is_kv_line(raw_lines[i]) and not re.search(r'^(dicetak|catatan|note|data mutakhir|page|halaman)\b', raw_lines[i], re.I):
                    tab_rows.append(c_next)
                    i += 1
                else:
                    break
            max_c = max(len(r) for r in tab_rows)
            padded = [r + [''] * (max_c - len(r)) for r in tab_rows]
            elements.append({"type": "grid_table", "rows": padded})
            continue

        # 5. Heading (short uppercase line or short section title)
        if len(line) < 60 and (line.isupper() or len(line.split()) <= 4):
            # Ignore tiny junk fragments (1-3 chars, e.g. OCR noise)
            if len(line) <= 3 and len(line.split()) == 1:
                i += 1
                continue
            elements.append({"type": "heading", "text": line})
            i += 1
            continue

        # 6. Standard paragraph
        elements.append({"type": "paragraph", "text": line})
        i += 1

    for _el in elements[prev_len:]:
        _el.setdefault("src", last_start)

    return elements

def make_table_transparent(table):
    """Makes a Word table borderless/transparent while maintaining neat column alignment."""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    tblPr = table._tbl.tblPr

    borders_xml = (
        f'<w:tblBorders {nsdecls("w")}>\n'
        '  <w:top w:val="none"/>\n'
        '  <w:left w:val="none"/>\n'
        '  <w:bottom w:val="none"/>\n'
        '  <w:right w:val="none"/>\n'
        '  <w:insideH w:val="none"/>\n'
        '  <w:insideV w:val="none"/>\n'
        '</w:tblBorders>'
    )
    tblPr.append(parse_xml(borders_xml))

    cell_mar_xml = (
        f'<w:tblCellMar {nsdecls("w")}>\n'
        '  <w:top w:w="90" w:type="dxa"/>\n'
        '  <w:bottom w:w="90" w:type="dxa"/>\n'
        '  <w:left w:w="140" w:type="dxa"/>\n'
        '  <w:right w:w="140" w:type="dxa"/>\n'
        '</w:tblCellMar>'
    )
    tblPr.append(parse_xml(cell_mar_xml))

def is_rect_overlap(r1, r2):
    return not (r1[2] <= r2[0] or r1[0] >= r2[2] or r1[3] <= r2[1] or r1[1] >= r2[3])

def split_into_columns(line_text):
    parts = [c.strip() for c in re.split(r'\s{2,}|\t|\|', line_text) if c.strip()]
    return parts if len(parts) >= 2 else None

def clean_extracted_rows(rows):
    if not rows:
        return []
    cleaned = []
    for row in rows:
        c_row = [str(cell).strip() if cell is not None else "" for cell in row]
        if any(bool(c) for c in c_row):
            cleaned.append(c_row)
    return cleaned

def extract_previews_from_docx_file(docx_path):
    doc = docx.Document(docx_path)
    previews = []
    total_words = 0
    total_paragraphs = 0

    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            words = t.split()
            total_words += len(words)
            total_paragraphs += 1
            is_heading = p.style and "Heading" in p.style.name
            previews.append({
                "page": 1,
                "type": "heading" if is_heading else "paragraph",
                "text": t
            })

    for t in doc.tables:
        rows = [[c.text.strip() for c in r.cells] for r in t.rows]
        clean = [r for r in rows if any(r)]
        if clean:
            total_paragraphs += len(clean)
            for r in clean:
                total_words += sum(len(c.split()) for c in r)
            previews.append({
                "page": 1,
                "type": "table",
                "text": f"Table ({len(clean)} rows × {len(clean[0])} columns)",
                "table_data": clean[:15]
            })

    return {
        "success": True,
        "total_pages": max(1, len(doc.sections)),
        "word_count": total_words,
        "paragraph_count": total_paragraphs,
        "previews": previews[:60]
    }

def set_cell_background(cell, hex_color):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcMar = parse_xml(f'''<w:tcMar {nsdecls("w")}>
        <w:top w:w="{top}" w:type="dxa"/>
        <w:bottom w:w="{bottom}" w:type="dxa"/>
        <w:left w:w="{left}" w:type="dxa"/>
        <w:right w:w="{right}" w:type="dxa"/>
    </w:tcMar>''')
    cell._tc.get_or_add_tcPr().append(tcMar)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            val = edge_data.get('val', 'single')
            sz = edge_data.get('sz', '4')
            color = edge_data.get('color', 'auto')
            el = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>')
            tcBorders.append(el)
        else:
            el = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(el)
    tcPr.append(tcBorders)

ALIGN_MAP = {
    "left": WD_ALIGN_PARAGRAPH.LEFT,
    "center": WD_ALIGN_PARAGRAPH.CENTER,
    "right": WD_ALIGN_PARAGRAPH.RIGHT,
    "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
}

def set_table_widths(table, widths):
    """Fixes column widths (inches) on both columns and every cell so Word honours them."""
    table.autofit = False
    for idx, w in enumerate(widths):
        table.columns[idx].width = Inches(w)
    for row in table.rows:
        for idx, w in enumerate(widths):
            row.cells[idx].width = Inches(w)


def convert_pdf_to_docx(pdf_path, docx_path, enable_ocr=True, original_name=""):
    doc = fitz.open(pdf_path)
    word_doc = docx.Document()

    # Set page dimensions and margins matching PDF page aspect ratio
    p_w_pt = doc[0].rect.width if len(doc) > 0 else 595.0
    p_h_pt = doc[0].rect.height if len(doc) > 0 else 842.0
    p_w_in = p_w_pt / 72.0
    p_h_in = p_h_pt / 72.0
    is_compact = (p_w_in < 7.0)

    for section in word_doc.sections:
        section.page_width = Inches(p_w_in)
        section.page_height = Inches(p_h_in)
        if is_compact:
            section.top_margin = Inches(0.28)
            section.bottom_margin = Inches(0.28)
            section.left_margin = Inches(0.35)
            section.right_margin = Inches(0.35)
        else:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

    content_width_in = p_w_in - (0.70 if is_compact else 1.0)

    total_pages = len(doc)
    total_words = 0
    total_paragraphs = 0
    previews = []

    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1

        # Check for page break if not first page
        if page_idx > 0:
            word_doc.add_page_break()

        # 1. Detect Tables using PyMuPDF find_tables() with lines and text strategies
        table_rects = []
        extracted_tables = []
        try:
            tabs = page.find_tables()
            for tab in tabs:
                table_rects.append(tab.bbox)
                extracted_tables.append(tab)
        except Exception:
            pass

        # Borderless layouts are handled by the spatial row builder (build_visual_lines)
        # and clean_and_structure_scanned_ocr below.

        # 2. Extract structured text dictionary
        text_page = page.get_text("dict")
        blocks = text_page.get("blocks", [])

        # Sort blocks vertically
        blocks.sort(key=lambda b: (b.get("bbox", [0, 0, 0, 0])[1], b.get("bbox", [0, 0, 0, 0])[0]))

        # Track what items to place on this page (interleave text, transparent tables, and images)
        raw_elements = []

        # Add detected tables to raw elements
        for tab in extracted_tables:
            raw_elements.append({
                "type": "table",
                "y0": tab.bbox[1],
                "data": tab
            })

        # Collect text spans (not overlapping tables) and rebuild visual rows by position
        all_spans = []
        for block in blocks:
            b_type = block.get("type", 0)
            bbox = block.get("bbox", [0, 0, 0, 0])

            # Check overlap with any detected table
            overlaps_table = any(is_rect_overlap(bbox, tr) for tr in table_rects)
            if overlaps_table:
                continue

            if b_type == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("text", "").strip():
                            sb = span.get("bbox", bbox)
                            all_spans.append({
                                "x0": sb[0], "y0": sb[1], "x1": sb[2], "y1": sb[3],
                                "text": span.get("text", ""),
                                "size": span.get("size", 10.0),
                                "bold": bool(span.get("flags", 0) & 16),
                            })
            elif b_type == 1:  # Image block
                # Photos / logos are intentionally left out of the Word output
                continue

        if all_spans:
            v_lines = annotate_and_merge_lines(build_visual_lines(all_spans))
            for el in structure_page_lines(v_lines):
                raw_elements.append(el)

        # Sort raw elements on the page by vertical position y0
        raw_elements.sort(key=lambda item: item.get("y0", 0))

        # 3. Detect and group consecutive multi-column lines into transparent tables!
        items_to_render = []
        pending_tabular_rows = []
        pending_y0 = 0

        def flush_pending_table():
            nonlocal pending_tabular_rows, pending_y0
            if len(pending_tabular_rows) >= 2:
                max_cols = max(len(r) for r in pending_tabular_rows)
                padded_rows = [r + [''] * (max_cols - len(r)) for r in pending_tabular_rows]
                items_to_render.append({
                    "type": "table_rows",
                    "y0": pending_y0,
                    "rows": padded_rows
                })
            elif len(pending_tabular_rows) == 1:
                items_to_render.append({
                    "type": "text",
                    "y0": pending_y0,
                    "text": "    ".join(pending_tabular_rows[0]),
                    "font_size": 11.0,
                    "bold": False,
                    "italic": False
                })
            pending_tabular_rows = []

        for elem in raw_elements:
            elem_type = elem["type"]

            if elem_type == "text_block":
                block_lines = elem["lines"]
                # Check if each line in block is tabular
                all_lines_tabular = True
                block_cols = []
                for l in block_lines:
                    cols = split_into_columns(l)
                    if cols:
                        block_cols.append(cols)
                    else:
                        all_lines_tabular = False
                        break

                if all_lines_tabular and len(block_cols) >= 2:
                    flush_pending_table()
                    max_c = max(len(r) for r in block_cols)
                    items_to_render.append({
                        "type": "table_rows",
                        "y0": elem["y0"],
                        "rows": [r + [''] * (max_c - len(r)) for r in block_cols]
                    })
                elif len(block_lines) == 1 and split_into_columns(block_lines[0]):
                    cols = split_into_columns(block_lines[0])
                    if not pending_tabular_rows:
                        pending_y0 = elem["y0"]
                    pending_tabular_rows.append(cols)
                else:
                    flush_pending_table()
                    combined_text = " ".join(block_lines)
                    items_to_render.append({
                        "type": "text",
                        "y0": elem["y0"],
                        "text": combined_text,
                        "font_size": elem.get("font_size", 11.0),
                        "bold": elem.get("bold", False),
                        "italic": elem.get("italic", False)
                    })
            else:
                flush_pending_table()
                items_to_render.append(elem)

        flush_pending_table()

        # Check if page has no extracted text (e.g. Scanned Document / Photo)
        def _item_words(it):
            if it.get("rows"):
                return sum(len(str(c).split()) for r in it["rows"] for c in r)
            return len(it.get("text", "").split())
        extracted_text_count = sum(_item_words(it) for it in items_to_render if it.get("type") != "image")
        if extracted_text_count < 5:
            # Check plain text first
            plain_text = page.get_text().strip()
            if len(plain_text.split()) >= 5:
                for line in plain_text.splitlines():
                    if line.strip():
                        items_to_render.append({
                            "type": "text",
                            "y0": 0,
                            "text": line.strip(),
                            "font_size": 11.0,
                            "bold": False,
                            "italic": False
                        })
            elif enable_ocr:
                # Automatic High-Fidelity OCR & Layout Reproduction for scanned/image pages
                try:
                    # Clear raw partial images from dict extractor to prevent duplicate images
                    items_to_render = [it for it in items_to_render if it.get("type") != "image"]

                    logo_path, blank_box = extract_page_header_logo(page)
                    # Logos/photos are left out; only use their area to keep OCR clean
                    if logo_path:
                        try:
                            os.remove(logo_path)
                        except Exception:
                            pass

                    pix = page.get_pixmap(dpi=300)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                    # Blank out logo region from OCR canvas so Tesseract won't pollute top header lines
                    if blank_box:
                        draw = ImageDraw.Draw(img)
                        draw.rectangle(list(blank_box), fill=(255, 255, 255))

                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
                        tmp_img_path = tmp_img.name
                    img.save(tmp_img_path)

                    # Positioned OCR words -> visual lines with alignment (never embeds page images)
                    ocr_spans = run_tesseract_spans(tmp_img_path)
                    try:
                        os.remove(tmp_img_path)
                    except Exception:
                        pass

                    if ocr_spans:
                        v_lines = annotate_and_merge_lines(build_visual_lines(ocr_spans))
                        for el in structure_page_lines(v_lines, normalize=True):
                            items_to_render.append(el)
                except Exception:
                    pass

        # Sort items on the page by vertical position y0
        items_to_render.sort(key=lambda item: item.get("y0", 0))

        # Render items into word_doc
        for item in items_to_render:
            item_type = item["type"]

            if item_type == "header_block":
                logo_path = item.get("logo_path")
                headings = item.get("headings", [])

                htable = word_doc.add_table(rows=1, cols=2)
                htable.alignment = WD_TABLE_ALIGNMENT.CENTER
                htable.columns[0].width = Inches(1.2)
                htable.columns[1].width = Inches(5.4)

                c0 = htable.cell(0, 0)
                set_cell_margins(c0, top=40, bottom=40, left=40, right=40)
                p0 = c0.paragraphs[0]
                p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
                if logo_path and os.path.exists(logo_path):
                    try:
                        p0.add_run().add_picture(logo_path, width=Inches(0.95))
                        os.remove(logo_path)
                    except Exception:
                        pass

                c1 = htable.cell(0, 1)
                set_cell_margins(c1, top=40, bottom=40, left=80, right=40)
                p1 = c1.paragraphs[0]
                p1.paragraph_format.space_before = Pt(2)
                p1.paragraph_format.space_after = Pt(2)
                p1.paragraph_format.line_spacing = 1.15
                for h_i, h_text in enumerate(headings):
                    r = p1.add_run(h_text + ("\n" if h_i < len(headings) - 1 else ""))
                    r.bold = True
                    r.font.name = "Segoe UI"
                    r.font.size = Pt(11)
                    r.font.color.rgb = RGBColor(17, 24, 39)
                    total_words += len(h_text.split())
                    total_paragraphs += 1
                    previews.append({"page": page_num, "type": "heading", "text": h_text})

                make_table_transparent(htable)
                word_doc.add_paragraph().paragraph_format.space_after = Pt(8)

            elif item_type == "text":
                text = item["text"]
                words = text.split()
                total_words += len(words)
                total_paragraphs += 1

                fsize = item.get("font_size", 11.0)
                bold = item.get("bold", False)
                italic = item.get("italic", False)

                p = word_doc.add_paragraph()
                p.alignment = ALIGN_MAP.get(item.get("align", "left"), WD_ALIGN_PARAGRAPH.LEFT)
                if re.match(r'^\([A-Z][a-zA-Z\s.,]+\)$', text.strip()) and item.get("align") == "right":
                    p.paragraph_format.space_before = Pt(36)
                else:
                    p.paragraph_format.space_before = Pt(4 if fsize >= 14 else 1)
                p.paragraph_format.space_after = Pt(4 if fsize >= 14 else 3)

                run = p.add_run(text)
                run.font.name = "Segoe UI"
                run.bold = bold or (fsize >= 14)
                run.italic = italic
                run.font.size = Pt(min(max(fsize, 9.5), 14.0))
                run.font.color.rgb = RGBColor(17, 24, 39) if (fsize >= 14 or bold) else RGBColor(31, 41, 55)
                previews.append({
                    "page": page_num,
                    "type": "heading" if fsize >= 14 else "paragraph",
                    "text": text
                })

            elif item_type == "form_table":
                rows = item.get("rows", [])
                if not rows:
                    continue
                num_rows = len(rows)
                ftable = word_doc.add_table(rows=num_rows, cols=3)
                ftable.alignment = WD_TABLE_ALIGNMENT.LEFT
                lbl_len = max(len(r[0]) for r in rows)
                label_w = min(max(lbl_len * 0.085 + 0.25, 0.9), 2.5)
                val_w = max(content_width_in - label_w - 0.25, 1.5)
                set_table_widths(ftable, [label_w, 0.25, val_w])
                make_table_transparent(ftable)

                cell_pad_v = 20 if num_rows > 10 else 40
                form_fsize = 8.0 if num_rows > 12 else (8.5 if num_rows > 8 else 9.0)

                clean_preview = []
                for r_idx, row in enumerate(rows):
                    lbl = row[0] if len(row) > 0 else ""
                    colon = row[1] if len(row) > 1 else ":"
                    val = row[2] if len(row) > 2 else ""

                    is_last = (r_idx == num_rows - 1)
                    row_cells = ftable.rows[r_idx].cells
                    for cell in row_cells:
                        set_cell_margins(cell, top=cell_pad_v, bottom=cell_pad_v, left=40, right=40)
                        if not is_last:
                            set_cell_border(cell, bottom=dict(val='single', sz='4', color='E5E7EB'))
                        else:
                            set_cell_border(cell)

                    p0 = row_cells[0].paragraphs[0]
                    p0.paragraph_format.space_before = Pt(0)
                    p0.paragraph_format.space_after = Pt(0)
                    p0.paragraph_format.line_spacing = 1.0
                    r0 = p0.add_run(lbl)
                    r0.font.name = "Segoe UI"
                    r0.font.size = Pt(form_fsize)
                    r0.font.color.rgb = RGBColor(55, 65, 81)

                    p1 = row_cells[1].paragraphs[0]
                    p1.paragraph_format.space_before = Pt(0)
                    p1.paragraph_format.space_after = Pt(0)
                    p1.paragraph_format.line_spacing = 1.0
                    r1 = p1.add_run(colon)
                    r1.font.name = "Segoe UI"
                    r1.font.size = Pt(form_fsize)
                    r1.font.color.rgb = RGBColor(107, 114, 128)

                    p2 = row_cells[2].paragraphs[0]
                    p2.paragraph_format.space_before = Pt(0)
                    p2.paragraph_format.space_after = Pt(0)
                    p2.paragraph_format.line_spacing = 1.05
                    r2 = p2.add_run(val)
                    r2.font.name = "Segoe UI"
                    r2.font.size = Pt(form_fsize)
                    r2.font.color.rgb = RGBColor(17, 24, 39)

                    total_words += len(lbl.split()) + len(val.split())
                    clean_preview.append([lbl, colon, val])

                total_paragraphs += num_rows
                previews.append({
                    "page": page_num,
                    "type": "table",
                    "text": f"Form Table ({num_rows} fields)",
                    "table_data": clean_preview[:15]
                })
                if num_rows <= 10:
                    word_doc.add_paragraph().paragraph_format.space_after = Pt(3)

            elif item_type == "grid_table":
                rows = item.get("rows", [])
                if not rows:
                    continue
                num_rows = len(rows)
                num_cols = max(len(r) for r in rows)
                gtable = word_doc.add_table(rows=num_rows, cols=num_cols)
                gtable.alignment = WD_TABLE_ALIGNMENT.CENTER

                border_color = "E5E7EB"
                tblPr = gtable._tbl.tblPr
                tblPr.append(parse_xml(f'''<w:tblBorders {nsdecls("w")}>
                    <w:top w:val="single" w:sz="4" w:color="{border_color}"/>
                    <w:left w:val="single" w:sz="4" w:color="{border_color}"/>
                    <w:bottom w:val="single" w:sz="4" w:color="{border_color}"/>
                    <w:right w:val="single" w:sz="4" w:color="{border_color}"/>
                    <w:insideH w:val="single" w:sz="4" w:color="{border_color}"/>
                    <w:insideV w:val="single" w:sz="4" w:color="{border_color}"/>
                </w:tblBorders>'''))

                col_lens = [max(4, max(len(str(r[c])) if c < len(r) else 0 for r in rows)) for c in range(num_cols)]
                set_table_widths(gtable, [content_width_in * l / sum(col_lens) for l in col_lens])

                clean_preview = []
                for r_idx, row in enumerate(rows):
                    row_cells = []
                    is_header_row = (r_idx == 0)
                    for c_idx in range(num_cols):
                        c_val = row[c_idx] if c_idx < len(row) else ""
                        cell = gtable.cell(r_idx, c_idx)
                        set_cell_margins(cell, top=90, bottom=90, left=120, right=120)

                        if is_header_row:
                            set_cell_background(cell, "F9FAFB")

                        p = cell.paragraphs[0]
                        p.paragraph_format.space_after = Pt(0)
                        r = p.add_run(c_val)
                        r.font.name = "Segoe UI"
                        r.font.size = Pt(9.5)
                        r.bold = is_header_row
                        r.font.color.rgb = RGBColor(31, 41, 55)

                        row_cells.append(c_val)
                        total_words += len(c_val.split())

                    clean_preview.append(row_cells)

                total_paragraphs += num_rows
                previews.append({
                    "page": page_num,
                    "type": "table",
                    "text": f"Table ({num_rows} × {num_cols})",
                    "table_data": clean_preview[:15]
                })
                word_doc.add_paragraph().paragraph_format.space_after = Pt(8)

            elif item_type in ("table", "table_rows"):
                if item_type == "table":
                    tab = item["data"]
                    raw_rows = tab.extract()
                    rows = clean_extracted_rows(raw_rows)
                else:
                    rows = item["rows"]

                if not rows:
                    continue

                num_rows = len(rows)
                num_cols = max(len(r) for r in rows)
                if num_rows == 0 or num_cols == 0:
                    continue

                table = word_doc.add_table(rows=num_rows, cols=num_cols)
                make_table_transparent(table)

                # Special treatment for 1-row, 2-column header row (title on left, note on right)
                if num_rows == 1 and num_cols == 2:
                    set_table_widths(table, [content_width_in * 0.70, content_width_in * 0.30])
                    c0 = table.cell(0, 0)
                    set_cell_margins(c0, top=10, bottom=10, left=20, right=20)
                    p0 = c0.paragraphs[0]
                    p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    p0.paragraph_format.space_before = Pt(0)
                    p0.paragraph_format.space_after = Pt(0)
                    p0.paragraph_format.line_spacing = 1.0
                    r0 = p0.add_run(rows[0][0])
                    r0.font.name = "Segoe UI"
                    r0.font.size = Pt(10.0 if is_compact else 11.0)
                    r0.bold = True
                    r0.font.color.rgb = RGBColor(17, 24, 39)

                    c1 = table.cell(0, 1)
                    set_cell_margins(c1, top=10, bottom=10, left=20, right=20)
                    p1 = c1.paragraphs[0]
                    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                    p1.paragraph_format.space_before = Pt(0)
                    p1.paragraph_format.space_after = Pt(0)
                    p1.paragraph_format.line_spacing = 1.0
                    r1 = p1.add_run(rows[0][1] if len(rows[0]) > 1 else "")
                    r1.font.name = "Segoe UI"
                    r1.font.size = Pt(8.5 if is_compact else 9.5)
                    r1.font.color.rgb = RGBColor(107, 114, 128)

                    total_words += sum(len(str(c).split()) for c in rows[0])
                    total_paragraphs += 1
                    previews.append({
                        "page": page_num,
                        "type": "heading",
                        "text": rows[0][0]
                    })
                    continue

                col_w = content_width_in / max(num_cols, 1)
                set_table_widths(table, [col_w] * num_cols)

                clean_table_data = []
                for r_idx, row in enumerate(rows):
                    row_cells = []
                    for c_idx in range(num_cols):
                        cell_val = row[c_idx] if c_idx < len(row) and row[c_idx] is not None else ""
                        clean_val = str(cell_val).strip()
                        row_cells.append(clean_val)

                        cell = table.cell(r_idx, c_idx)
                        cell.text = clean_val

                        for p in cell.paragraphs:
                            p.paragraph_format.space_before = Pt(2)
                            p.paragraph_format.space_after = Pt(2)
                            for run in p.runs:
                                run.font.name = "Segoe UI"
                                if r_idx == 0:
                                    run.bold = True
                                    run.font.size = Pt(10)
                                else:
                                    run.font.size = Pt(9.5)

                    clean_table_data.append(row_cells)
                    total_words += sum(len(c.split()) for c in row_cells)

                total_paragraphs += num_rows
                previews.append({
                    "page": page_num,
                    "type": "table",
                    "text": f"Table ({num_rows} rows × {num_cols} columns)",
                    "table_data": clean_table_data[:15]
                })

            elif item_type == "callout":
                text = item.get("text", "")
                total_words += len(text.split())
                total_paragraphs += 1
                ctable = word_doc.add_table(rows=1, cols=1)
                ctable.alignment = WD_TABLE_ALIGNMENT.CENTER
                c = ctable.cell(0, 0)
                set_cell_background(c, "FEFCE8")
                set_cell_margins(c, top=100, bottom=100, left=160, right=160)
                set_cell_border(c,
                                top=dict(val='single', sz='4', color='FEF08A'),
                                bottom=dict(val='single', sz='4', color='FEF08A'),
                                left=dict(val='single', sz='4', color='FEF08A'),
                                right=dict(val='single', sz='4', color='FEF08A'))
                p = c.paragraphs[0]
                p.alignment = ALIGN_MAP.get(item.get("align", "left"), WD_ALIGN_PARAGRAPH.LEFT)
                p.paragraph_format.space_after = Pt(0)
                r = p.add_run(text)
                r.font.name = "Segoe UI"
                r.font.size = Pt(8.5)
                r.italic = True
                r.font.color.rgb = RGBColor(133, 77, 14)

                previews.append({"page": page_num, "type": "paragraph", "text": text})
                word_doc.add_paragraph().paragraph_format.space_after = Pt(8)

            elif item_type == "footer":
                text = item.get("text", "")
                total_words += len(text.split())
                total_paragraphs += 1
                p = word_doc.add_paragraph()
                p.alignment = ALIGN_MAP.get(item.get("align", "right"), WD_ALIGN_PARAGRAPH.RIGHT)
                p.paragraph_format.space_after = Pt(0)
                r = p.add_run(text)
                r.font.name = "Segoe UI"
                r.font.size = Pt(8.5)
                r.italic = True
                r.font.color.rgb = RGBColor(107, 114, 128)
                previews.append({"page": page_num, "type": "paragraph", "text": text})

            elif item_type == "signature_block":
                sig_lines = item.get("lines", [])
                if not sig_lines:
                    continue
                x0_rel = item.get("x0_rel", 0.55)
                left_ratio = max(min(x0_rel, 0.65), 0.45)
                left_w = content_width_in * left_ratio
                right_w = content_width_in - left_w

                row_items = []
                name_idx = None
                for idx, sl in enumerate(sig_lines):
                    sl_text = sl["text"].strip()
                    if re.match(r'^\([A-Z][a-zA-Z\s.,]+\)$', sl_text):
                        name_idx = idx
                        break

                if name_idx is not None and name_idx > 0:
                    for sl in sig_lines[:name_idx]:
                        row_items.append((sl["text"], False, False))
                    row_items.append(("", False, True))
                    for sl in sig_lines[name_idx:]:
                        row_items.append((sl["text"], True, False))
                else:
                    if len(sig_lines) >= 2:
                        for sl in sig_lines[:-1]:
                            row_items.append((sl["text"], False, False))
                        row_items.append(("", False, True))
                        row_items.append((sig_lines[-1]["text"], True, False))
                    else:
                        for sl in sig_lines:
                            row_items.append((sl["text"], False, False))

                num_rows = len(row_items)
                stable = word_doc.add_table(rows=num_rows, cols=2)
                make_table_transparent(stable)
                set_table_widths(stable, [left_w, right_w])

                for r_idx, (r_text, is_bold, is_sig_space) in enumerate(row_items):
                    row = stable.rows[r_idx]
                    if is_sig_space:
                        trPr = row._tr.get_or_add_trPr()
                        trPr.append(parse_xml(f'<w:trHeight {nsdecls("w")} w:val="420" w:hRule="atLeast"/>'))

                    c0 = stable.cell(r_idx, 0)
                    set_cell_margins(c0, top=4, bottom=4, left=20, right=20)
                    c0.paragraphs[0].paragraph_format.space_before = Pt(0)
                    c0.paragraphs[0].paragraph_format.space_after = Pt(0)
                    c0.paragraphs[0].paragraph_format.line_spacing = 1.0

                    c1 = stable.cell(r_idx, 1)
                    set_cell_margins(c1, top=4, bottom=4, left=20, right=20)
                    p1 = c1.paragraphs[0]
                    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    p1.paragraph_format.space_before = Pt(0)
                    p1.paragraph_format.space_after = Pt(0)
                    p1.paragraph_format.line_spacing = 1.0
                    if is_sig_space:
                        p1.paragraph_format.space_before = Pt(16)

                    if r_text:
                        r = p1.add_run(r_text)
                        r.font.name = "Segoe UI"
                        r.font.size = Pt(8.5 if is_compact else 9.5)
                        r.bold = is_bold
                        r.font.color.rgb = RGBColor(17, 24, 39)
                        total_words += len(r_text.split())
                        total_paragraphs += 1
                        previews.append({
                            "page": page_num,
                            "type": "paragraph",
                            "text": r_text
                        })

            elif item_type == "heading":
                text = item["text"]
                words = text.split()
                total_words += len(words)
                total_paragraphs += 1
                hp = word_doc.add_paragraph()
                hp.alignment = ALIGN_MAP.get(item.get("align", "left"), WD_ALIGN_PARAGRAPH.LEFT)
                hp.paragraph_format.space_before = Pt(1 if is_compact else 2)
                hp.paragraph_format.space_after = Pt(1 if is_compact else 2)
                hp.paragraph_format.line_spacing = 1.0
                if re.match(r'^\([A-Z][a-zA-Z\s.,]+\)$', text.strip()) and item.get("align") == "right":
                    hp.paragraph_format.space_before = Pt(20)
                r = hp.add_run(text)
                r.font.name = "Segoe UI"
                r.bold = True
                fsize = 11.0 if (item.get("big") and not is_compact) else (10.0 if is_compact else 11.0)
                r.font.size = Pt(fsize)
                r.font.color.rgb = RGBColor(17, 24, 39)
                previews.append({
                    "page": page_num,
                    "type": "heading",
                    "text": text
                })

            elif item_type == "paragraph":
                text = item.get("text", "")
                words = text.split()
                total_words += len(words)
                total_paragraphs += 1
                p = word_doc.add_paragraph()
                p.alignment = ALIGN_MAP.get(item.get("align", "left"), WD_ALIGN_PARAGRAPH.LEFT)
                p.paragraph_format.space_after = Pt(3)
                if re.match(r'^\([A-Z][a-zA-Z\s.,]+\)$', text.strip()) and item.get("align") == "right":
                    p.paragraph_format.space_before = Pt(36)
                r = p.add_run(text)
                r.font.name = "Segoe UI"
                r.font.size = Pt(min(max(item.get("size", 10.0), 9.0), 14.0))
                r.bold = bool(item.get("bold", False))
                r.font.color.rgb = RGBColor(31, 41, 55)
                previews.append({"page": page_num, "type": "paragraph", "text": text})

            elif item_type == "image":
                try:
                    img_stream = io.BytesIO(item["bytes"])
                    word_doc.add_picture(img_stream, width=Inches(5.5))
                    p = word_doc.paragraphs[-1]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_after = Pt(8)
                except Exception:
                    pass

    # Save output DOCX
    word_doc.save(docx_path)
    doc.close()

    # Filter previews to reasonable amount for frontend
    capped_previews = previews[:60]

    return {
        "success": True,
        "total_pages": total_pages,
        "word_count": total_words,
        "paragraph_count": total_paragraphs,
        "previews": capped_previews
    }

def main():
    parser = argparse.ArgumentParser(description="Convert PDF to Word DOCX with Transparent Tables")
    parser.add_argument("pdf_path", nargs="?", help="Path to input PDF file")
    parser.add_argument("docx_path", nargs="?", help="Path to output DOCX file")
    parser.add_argument("--ocr", action="store_true", default=True, help="Enable OCR fallback")
    parser.add_argument("--original-name", default="", help="Original filename of the uploaded PDF")
    parser.add_argument("--parse-docx", help="Parse an existing .docx file directly to extract previews")

    args = parser.parse_args()

    if args.parse_docx:
        if not os.path.exists(args.parse_docx):
            print(json.dumps({"success": False, "error": f"DOCX file not found: {args.parse_docx}"}))
            sys.exit(1)
        try:
            res = extract_previews_from_docx_file(args.parse_docx)
            print(json.dumps(res))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.exit(1)

    if not args.pdf_path or not args.docx_path:
        print(json.dumps({"success": False, "error": "pdf_path and docx_path are required"}))
        sys.exit(1)

    if not os.path.exists(args.pdf_path):
        print(json.dumps({"success": False, "error": f"Input file not found: {args.pdf_path}"}))
        sys.exit(1)

    try:
        res = convert_pdf_to_docx(args.pdf_path, args.docx_path, enable_ocr=args.ocr, original_name=args.original_name)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
