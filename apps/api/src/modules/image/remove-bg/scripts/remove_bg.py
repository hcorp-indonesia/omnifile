#!/usr/bin/env python3
"""Persistent BiRefNet background-removal worker for Magic Converter."""

import argparse
import gc
import json
import os
import sys

from PIL import Image, ImageOps


DEFAULT_MODEL = "birefnet-general-lite"
SUPPORTED_MODELS = (DEFAULT_MODEL, "u2netp")


def parse_args():
    parser = argparse.ArgumentParser(description="AI Background Removal")
    parser.add_argument("--input", help="Input image file path")
    parser.add_argument("--output", help="Output image file path")
    parser.add_argument("--format", default="png", help="Output format (png, webp)")
    parser.add_argument("--model", choices=SUPPORTED_MODELS, default=DEFAULT_MODEL)
    parser.add_argument("--cpu-threads", type=int, default=4)
    parser.add_argument("--server", action="store_true")
    return parser.parse_args()


def create_session(cpu_threads, model_name):
    import onnxruntime as ort
    import rembg

    session_options = ort.SessionOptions()
    session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_options.intra_op_num_threads = max(1, cpu_threads)
    session_options.inter_op_num_threads = 1
    session_options.enable_cpu_mem_arena = False
    session_options.enable_mem_pattern = False
    session_options.enable_mem_reuse = False

    provider = os.getenv("REMBG_PROVIDER", "cpu").lower()
    if provider == "directml" and "DmlExecutionProvider" in ort.get_available_providers():
        session_options.enable_mem_pattern = False
        providers = ["DmlExecutionProvider", "CPUExecutionProvider"]
    else:
        providers = ["CPUExecutionProvider"]

    return rembg.new_session(
        model_name,
        sess_opts=session_options,
        providers=providers,
    )


def process_image(input_path, output_path, target_format, session, model_name):
    import rembg

    if not input_path or not os.path.exists(input_path):
        raise RuntimeError(f"Input file not found: {input_path}")
    if not output_path:
        raise RuntimeError("Output file path is required")

    original_size = os.path.getsize(input_path)
    with Image.open(input_path) as source:
        source = ImageOps.exif_transpose(source)
        original_width, original_height = source.size
        original_format = source.format or "UNKNOWN"
        result = rembg.remove(source, session=session)
        try:
            result_width, result_height = result.size
            if target_format == "webp":
                result.save(output_path, format="WEBP", lossless=True, method=2)
                converted_format = "WEBP"
            else:
                result.save(output_path, format="PNG", compress_level=3)
                converted_format = "PNG"
        finally:
            result.close()

    return {
        "success": True,
        "original_format": original_format,
        "converted_format": converted_format,
        "original_width": original_width,
        "original_height": original_height,
        "result_width": result_width,
        "result_height": result_height,
        "original_size": original_size,
        "result_size": os.path.getsize(output_path),
        "model_used": model_name,
    }


def error_response(error):
    return {"success": False, "error": str(error)}


def run_server(args, session):
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = process_image(
                request.get("input"),
                request.get("output"),
                (request.get("format") or "png").lower().strip(),
                session,
                args.model,
            )
        except Exception as error:
            response = error_response(error)
        print(json.dumps(response), flush=True)
        gc.collect()


def main():
    args = parse_args()
    session = create_session(args.cpu_threads, args.model)

    if args.server:
        run_server(args, session)
        return

    if not args.input or not args.output:
        raise RuntimeError("--input and --output are required outside server mode")
    response = process_image(
        args.input,
        args.output,
        (args.format or "png").lower().strip(),
        session,
        args.model,
    )
    print(json.dumps(response))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps(error_response(error)), flush=True)
        sys.exit(1)
