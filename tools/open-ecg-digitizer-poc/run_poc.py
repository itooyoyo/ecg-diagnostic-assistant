"""Isolated audit wrapper for the upstream Open ECG Digitizer.

This module does not import or modify the Next.js application. Inputs, model
weights, and generated outputs must stay in git-ignored directories.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any

os.environ.setdefault("MPLBACKEND", "Agg")
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("MPLCONFIGDIR", str(Path.cwd() / ".open-ecg-cache"))

import matplotlib.pyplot as plt
import numpy as np
import psutil
import torch
from PIL import Image
from torchvision.io import decode_image

LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]


def _save_probability_map(array: np.ndarray, destination: Path) -> None:
    normalized = np.clip(array, 0, 1)
    Image.fromarray(np.uint8(normalized * 255), mode="L").save(destination)


def _json_signal(values: np.ndarray) -> list[float | None]:
    return [None if np.isnan(value) else round(float(value), 6) for value in values]


def _monitor_memory(stop: threading.Event, peak: list[int]) -> None:
    process = psutil.Process(os.getpid())
    while not stop.wait(0.05):
        peak[0] = max(peak[0], process.memory_info().rss)


def run(source: Path, image_path: Path, output: Path, resample_size: int) -> dict[str, Any]:
    source = source.resolve()
    image_path = image_path.resolve()
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    audit_dir = output / "audit"
    lead_dir = audit_dir / "leads"
    lead_dir.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(source))
    os.chdir(source)
    from src.config.default import get_cfg
    from src.utils import import_class_from_path

    config = get_cfg(str(source / "src/config/inference_wrapper_george-moody-2024.yml"))
    config.MODEL.KWARGS.device = "cpu"
    config.MODEL.KWARGS.resample_size = resample_size
    config.MODEL.KWARGS.enable_timing = True
    config.MODEL.KWARGS.config.LAYOUT_IDENTIFIER.KWARGS.device = "cpu"

    peak = [psutil.Process(os.getpid()).memory_info().rss]
    stop = threading.Event()
    monitor = threading.Thread(target=_monitor_memory, args=(stop, peak), daemon=True)
    monitor.start()
    started = time.perf_counter()
    try:
        wrapper_class = import_class_from_path(config.MODEL.class_path)
        wrapper = wrapper_class(**config.MODEL.KWARGS)
        image = decode_image(str(image_path), mode="RGB").unsqueeze(0)
        with torch.no_grad():
            values = wrapper(image, layout_should_include_substring=None)
        elapsed = time.perf_counter() - started
    finally:
        stop.set()
        monitor.join()

    aligned_image = values["aligned"]["image"].squeeze().permute(1, 2, 0).numpy()
    signal_probability = values["aligned"]["signal_prob"].squeeze().numpy()
    grid_probability = values["aligned"]["grid_prob"].squeeze().numpy()
    canonical = values["signal"]["canonical_lines"]
    canonical_array = canonical.squeeze().numpy() if canonical is not None else np.empty((0, 0))

    Image.fromarray(np.uint8(np.clip(aligned_image, 0, 1) * 255)).save(audit_dir / "aligned-image.png")
    _save_probability_map(signal_probability, audit_dir / "segmentation-signal-mask.png")
    _save_probability_map(grid_probability, audit_dir / "segmentation-grid-mask.png")

    plt.figure(figsize=(18, 8))
    plt.imshow(aligned_image)
    plt.imshow(signal_probability, cmap="Blues", alpha=np.clip(signal_probability * 0.55, 0, 0.55))
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(audit_dir / "segmentation-overlay.png", dpi=160, bbox_inches="tight", pad_inches=0)
    plt.close()

    lead_results: list[dict[str, Any]] = []
    if canonical_array.size:
        waveform_figure, waveform_axes = plt.subplots(6, 2, figsize=(18, 12))
        for index, lead in enumerate(LEADS):
            signal = canonical_array[index]
            nan_ratio = float(np.isnan(signal).mean())
            limitations = []
            if nan_ratio:
                limitations.append("NaN includes layout intervals where this lead is not recorded and unreconstructed samples.")
            lead_results.append(
                {
                    "lead": lead,
                    "signal": _json_signal(signal),
                    "samplingRateHz": 1000,
                    "nanRatio": round(nan_ratio, 6),
                    "quality": "not_provided_by_upstream",
                    "limitations": limitations,
                }
            )
            axis = waveform_axes.flat[index]
            axis.plot(signal, linewidth=0.55)
            axis.set_title(f"{lead} (NaN {nan_ratio:.1%})")
            axis.grid(alpha=0.2)
            lead_figure, lead_axis = plt.subplots(figsize=(12, 3))
            lead_axis.plot(signal, linewidth=0.7)
            lead_axis.set_title(f"Reconstructed {lead}; NaN {nan_ratio:.1%}")
            lead_axis.grid(alpha=0.2)
            lead_figure.tight_layout()
            lead_figure.savefig(lead_dir / f"{lead}.png", dpi=140)
            plt.close(lead_figure)
        waveform_figure.tight_layout()
        waveform_figure.savefig(audit_dir / "reconstructed-waveforms.png", dpi=160)
        plt.close(waveform_figure)

    result = {
        "upstream": {
            "name": "Open ECG Digitizer",
            "version": "1.9.3",
            "repositoryCommit": "97a15087d4abcda843da8c58ee74b1d8f47e6f9a",
        },
        "input": {"width": int(image.shape[-1]), "height": int(image.shape[-2])},
        "layout": values["layout_name"],
        "layoutMatchingCost": float(values["signal"]["layout_matching_cost"]),
        "pixelSpacingMm": {
            "x": float(values["pixel_spacing_mm"]["x"]),
            "y": float(values["pixel_spacing_mm"]["y"]),
            "averagePixelsPerMm": float(values["pixel_spacing_mm"]["average_pixel_per_mm"]),
        },
        "leads": lead_results,
        "quality": {
            "upstreamQualityLabel": None,
            "limitations": ["The upstream pipeline does not emit a clinical quality classification."],
        },
        "processing": {
            "seconds": round(elapsed, 3),
            "peakRamBytes": peak[0],
            "device": "cpu",
            "resampleSize": resample_size,
            "upstreamTimingsSeconds": {key: round(value, 3) for key, value in wrapper.times.items()},
        },
    }
    (output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--resample-size", type=int, default=2000)
    args = parser.parse_args()
    result = run(args.source, args.image, args.output, args.resample_size)
    print(json.dumps({key: value for key, value in result.items() if key != "leads"}, ensure_ascii=False, indent=2))
    print(f"restored_leads={len(result['leads'])}")


if __name__ == "__main__":
    main()
