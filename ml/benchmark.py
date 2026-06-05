"""
ml/benchmark.py — produce accuracy + speed metrics for a YOLO weights file.

Outputs:
- Per-class precision / recall / mAP@0.5 / mAP@0.5:0.95 (printed + JSON)
- Mean inference time per image (NFR3: < 5s budget)
- Confusion matrix PNG (Ultralytics auto-saves it)

Usage:
    python ml/benchmark.py --weights ml/weights/harda_v1.pt --data path/to/data.yaml
    python ml/benchmark.py --weights ml/weights/pothole_yolov8s.pt --images path/to/images/

The first form runs full validation against a labelled YOLO dataset and is
what you want for the slide deck. The second form runs inference on a folder
of unlabelled images and reports timing only — useful as a quick demo prop.
"""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

NFR3_BUDGET_MS = 5000


def benchmark_with_dataset(weights: str, data_yaml: str, output_json: Path) -> dict:
    """Full validation pass against a labelled dataset.yaml."""
    from ultralytics import YOLO

    model = YOLO(weights)
    metrics = model.val(data=data_yaml, plots=True, save_json=True, verbose=False)

    per_class = {}
    for i, name in enumerate(model.names.values()):
        per_class[name] = {
            "precision": float(metrics.box.p[i]) if i < len(metrics.box.p) else 0.0,
            "recall":    float(metrics.box.r[i]) if i < len(metrics.box.r) else 0.0,
            "ap50":      float(metrics.box.ap50[i]) if i < len(metrics.box.ap50) else 0.0,
            "ap":        float(metrics.box.ap[i]) if i < len(metrics.box.ap) else 0.0,
        }

    summary = {
        "weights": weights,
        "data": data_yaml,
        "mAP_50": float(metrics.box.map50),
        "mAP_50_95": float(metrics.box.map),
        "per_class": per_class,
    }

    print("\n──────── Validation summary ────────")
    print(f"Weights:     {weights}")
    print(f"Data:        {data_yaml}")
    print(f"mAP@0.5:     {summary['mAP_50']:.4f}")
    print(f"mAP@0.5:0.95 {summary['mAP_50_95']:.4f}")
    print("\nPer-class:")
    for name, m in per_class.items():
        print(f"  {name:25s} P={m['precision']:.3f}  R={m['recall']:.3f}  "
              f"AP@0.5={m['ap50']:.3f}  AP={m['ap']:.3f}")
    print("────────────────────────────────────")

    output_json.write_text(json.dumps(summary, indent=2))
    print(f"\nSummary JSON: {output_json}")
    print(f"Confusion matrix: runs/detect/val/confusion_matrix.png")
    return summary


def benchmark_speed_only(weights: str, images_dir: str, output_json: Path) -> dict:
    """Inference-time benchmark over a folder of images."""
    from ultralytics import YOLO

    model = YOLO(weights)
    images = sorted(
        [p for p in Path(images_dir).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    )
    if not images:
        raise SystemExit(f"No JPG/PNG images found in {images_dir}")

    timings: list[float] = []
    detections_count: list[int] = []
    for img in images:
        t0 = time.perf_counter()
        r = model(str(img), verbose=False)[0]
        elapsed_ms = (time.perf_counter() - t0) * 1000
        timings.append(elapsed_ms)
        detections_count.append(len(r.boxes))

    summary = {
        "weights": weights,
        "images_dir": images_dir,
        "n_images": len(images),
        "mean_ms": round(statistics.mean(timings), 2),
        "median_ms": round(statistics.median(timings), 2),
        "p95_ms": round(sorted(timings)[int(len(timings) * 0.95)], 2),
        "max_ms": round(max(timings), 2),
        "min_ms": round(min(timings), 2),
        "nfr3_budget_ms": NFR3_BUDGET_MS,
        "nfr3_pass_rate": round(sum(1 for t in timings if t <= NFR3_BUDGET_MS) / len(timings), 3),
        "avg_detections_per_image": round(statistics.mean(detections_count), 2),
    }

    print("\n──────── Speed summary ────────")
    print(f"Weights:        {weights}")
    print(f"Images:         {len(images)} from {images_dir}")
    print(f"Mean / median:  {summary['mean_ms']} ms / {summary['median_ms']} ms")
    print(f"p95 / max:      {summary['p95_ms']} ms / {summary['max_ms']} ms")
    print(f"NFR3 (<5000ms): {summary['nfr3_pass_rate'] * 100:.1f}% of images")
    print(f"Avg detections: {summary['avg_detections_per_image']} per image")
    print("───────────────────────────────")

    output_json.write_text(json.dumps(summary, indent=2))
    print(f"\nSummary JSON: {output_json}")
    return summary


def main():
    p = argparse.ArgumentParser(description="HARDA YOLO benchmark")
    p.add_argument("--weights", required=True, help="Path to .pt weights")
    p.add_argument("--data", help="Path to dataset YAML for accuracy benchmark")
    p.add_argument("--images", help="Folder of images for speed-only benchmark")
    p.add_argument("--out", default="ml/benchmark_results.json",
                   help="Where to write the JSON summary")
    args = p.parse_args()

    if not args.data and not args.images:
        p.error("Provide either --data (full accuracy run) or --images (speed only)")

    output_json = Path(args.out)
    output_json.parent.mkdir(parents=True, exist_ok=True)

    if args.data:
        benchmark_with_dataset(args.weights, args.data, output_json)
    else:
        benchmark_speed_only(args.weights, args.images, output_json)


if __name__ == "__main__":
    main()
