import os
import json
import re
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
import httpx
from app.config import settings
from app.ocr.engine import OCRItem
from app.ocr.normalizer import NumberNormalizer

class AIVisionService:
    CONFIG_FILE = settings.DATA_DIR / "ai_settings.json"

    @classmethod
    def get_settings(cls) -> Dict[str, Any]:
        if cls.CONFIG_FILE.exists():
            try:
                with open(cls.CONFIG_FILE, "r", encoding="utf-8") as fp:
                    return json.load(fp)
            except Exception:
                pass
        return {
            "provider": "directml",  # "directml" or "gemini"
            "api_key": "",
            "model_name": "gemini-2.5-flash"
        }

    @classmethod
    def save_settings(cls, new_settings: Dict[str, Any]):
        cls.CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        current = cls.get_settings()
        current.update(new_settings)
        with open(cls.CONFIG_FILE, "w", encoding="utf-8") as fp:
            json.dump(current, fp, indent=2)

    @classmethod
    async def detect_benchmark(
        cls,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        context_hints: Optional[Dict[str, Optional[str]]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes screenshot with AI vision and returns a structured benchmark definition proposal.
        """
        ai_cfg = cls.get_settings()
        api_key = ai_cfg.get("api_key", "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()

        # If Cloud Gemini is enabled and key is provided, use multimodal Gemini 2.5 Flash
        if ai_cfg.get("provider") == "gemini" and api_key:
            try:
                result = await cls._analyze_with_gemini(image, api_key, ai_cfg.get("model_name", "gemini-2.5-flash"))
                if result and result.get("name") and result.get("metrics"):
                    return result
            except Exception as e:
                print(f"[AIVisionService] Cloud AI warning: {e}, falling back to local DirectML engine.")

        # Default: Local Visual Semantic Intelligence Engine (DirectML / OCR)
        return cls._analyze_with_local_engine(image, ocr_items, context_hints)

    @classmethod
    async def _analyze_with_gemini(
        cls,
        image: np.ndarray,
        api_key: str,
        model: str = "gemini-2.5-flash"
    ) -> Dict[str, Any]:
        _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        b64_data = base64.b64encode(buffer).decode("utf-8")

        prompt = """
You are an expert hardware benchmark reviewer. Analyze this benchmark test results scorecard screenshot.
Identify:
1. Benchmark Name (e.g. "Procyon AI Image Generation", "Black Myth: Wukong Benchmark", "Cinebench R23")
2. Benchmark Category: strictly one of ["CPU", "GPU", "SSD", "RAM", "Laptop", "System"]
3. Hardware Tested: GPU or CPU or SSD model name if shown
4. All key test metrics with:
   - id: snake_case identifier (e.g. "average_fps", "overall_score", "duration")
   - name: readable metric label
   - display_name: label for charts
   - value: numerical score/time (number only, no letters)
   - unit: e.g. "score", "FPS", "pts", "s", "MB/s", "s/image"
   - higher_is_better: true or false
   - decimal_places: int (0 for whole numbers, 2 or 3 for times/fps)

Return strictly valid JSON matching this schema:
{
  "name": "Benchmark Name",
  "category": "GPU",
  "device_tested": "Model Name",
  "keywords": ["keyword1", "keyword2"],
  "metrics": [
    {
      "id": "metric_id",
      "name": "Metric Name",
      "display_name": "Metric Name",
      "value": 100.0,
      "unit": "FPS",
      "higher_is_better": true,
      "decimal_places": 1
    }
  ]
}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": "image/jpeg",
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)

    @classmethod
    def _analyze_with_local_engine(
        cls,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        context_hints: Optional[Dict[str, Optional[str]]] = None
    ) -> Dict[str, Any]:
        h, w = image.shape[:2]
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # 1. Infer Benchmark Name & Category
        detected_name = None
        category = "General"

        if "procyon" in full_text:
            if any(k in full_text for k in ["image generation", "diffusion", "stable diffusion", "unet"]) or ("image" in full_text and "generation" in full_text):
                detected_name = "Procyon AI Image Generation"
            elif any(k in full_text for k in ["vision", "computer vision", "inference", "winml", "openvino", "tensorrt", "float32", "float16"]):
                detected_name = "Procyon AI Computer Vision"
            else:
                detected_name = "UL Procyon"
            category = "GPU"
        elif "geekbench" in full_text:
            if "opencl" in full_text:
                detected_name = "Geekbench 6 OpenCL"
                category = "GPU"
            elif "vulkan" in full_text:
                detected_name = "Geekbench 6 Vulkan"
                category = "GPU"
            else:
                detected_name = "Geekbench 6"
                category = "CPU"
        elif "cinebench" in full_text:
            detected_name = "Cinebench 2024" if "2024" in full_text else "Cinebench R23"
            category = "CPU"
        elif "crystaldiskmark" in full_text or "seq1m" in full_text:
            detected_name = "CrystalDiskMark"
            category = "SSD"
        elif "as ssd" in full_text:
            detected_name = "AS SSD Benchmark"
            category = "SSD"
        elif "3dmark" in full_text or "time spy" in full_text or "steel nomad" in full_text:
            detected_name = "3DMark"
            category = "GPU"
        elif "blender" in full_text:
            detected_name = "Blender Benchmark"
            category = "CPU"
        elif "v-ray" in full_text or "vray" in full_text:
            detected_name = "V-Ray Benchmark"
            category = "CPU"

        # Check path hints if category is still General or override
        if context_hints and context_hints.get("suggested_category"):
            category = context_hints["suggested_category"]
        elif category == "General":
            if any(w in full_text for w in ["gpu", "graphics", "radeon", "geforce", "rtx", "opencl", "vulkan", "fps", "unet", "diffusion"]):
                category = "GPU"
            elif any(w in full_text for w in ["ssd", "storage", "nvme", "m.2", "seq1m", "rnd4k", "mb/s", "iops", "disk"]):
                category = "SSD"
            elif any(w in full_text for w in ["cpu", "processor", "ryzen", "core ultra", "intel core", "single-core", "multi-core"]):
                category = "CPU"
            elif any(w in full_text for w in ["ram", "ddr4", "ddr5", "latency", "ns"]):
                category = "RAM"

        # Fallback to visual prominence for custom / unrecognized benchmark names
        if not detected_name:
            candidates = [
                it for it in ocr_items
                if 25 < it.box[1] < h * 0.35
                and it.box[3] >= 14
                and not re.match(r'^\d+$', it.text.strip())
                and not any(w in it.text.lower() for w in ["file", "edit", "view", "help", "window", "options", "close", "minimize"])
            ]
            if candidates:
                detected_name = sorted(candidates, key=lambda x: (x.box[3], x.confidence), reverse=True)[0].text.strip()
            else:
                detected_name = "Custom Benchmark"

        # 2. Extract Device Tested
        device_tested = context_hints.get("product_name") if context_hints else None
        if not device_tested:
            for it in ocr_items:
                m = re.search(r'(?:radeon|geforce|rtx|arc|intel core|ryzen)[\w\s-]+', it.text, re.IGNORECASE)
                if m:
                    clean = m.group(0).strip()
                    if len(clean) >= 8:
                        device_tested = clean
                        break

        # 3. Discover Metrics & Hero Score
        # Filter for clean numeric values (not dates, not in title bar)
        numeric_items = []
        for it in ocr_items:
            clean_t = it.text.strip().replace(',', '')
            if re.match(r'^\d+(\.\d+)?$', clean_t) and it.box[1] > 25:
                val = float(clean_t)
                if val not in [2024, 2025, 2026] and val <= 9000000:
                    numeric_items.append((val, it))

        # Sort by box height (font prominence) and box area
        numeric_items.sort(key=lambda x: (x[1].box[3], x[1].box[2]), reverse=True)

        metrics = []
        seen_vals = set()

        # Hero Metric (Primary Score)
        if numeric_items:
            hero_val, hero_item = numeric_items[0]
            seen_vals.add(round(hero_val, 2))

            hero_label = "Overall Score"
            if "opencl" in full_text and "geekbench" in full_text:
                hero_label = "OpenCL Score"
            elif "vulkan" in full_text and "geekbench" in full_text:
                hero_label = "Vulkan Score"
            elif "single" in full_text and "multi" in full_text:
                hero_label = "Multi-Core Score"

            hero_id = re.sub(r'[^a-z0-9_]', '_', hero_label.lower()).strip('_')
            metrics.append({
                "id": hero_id,
                "name": hero_label,
                "display_name": hero_label,
                "value": hero_val,
                "unit": "score",
                "higher_is_better": True,
                "decimal_places": 0 if hero_val.is_integer() else 2,
                "sort_order": 0
            })

        # Secondary Metrics (Durations, Speeds, Subtests)
        # Typo correction map for OCR tokens
        CORRECTION_MAP = {
            "osenll": "Overall",
            "oserll": "Overall",
            "ovenal": "Overall",
            "deration": "Duration",
            "scote": "Score",
            "soore": "Score",
            "geseraton": "Generation",
            "geserati": "Generation",
            "inage": "Image",
            "duraton": "Duration",
            "rodeon": "Radeon",
            "rtodeon": "Radeon"
        }

        for val, item in numeric_items[1:]:
            val_key = round(val, 2)
            if val_key in seen_vals:
                continue
            seen_vals.add(val_key)

            # Look for adjacent label (above or to the left)
            label = f"Score {len(metrics) + 1}"
            unit = "score"
            higher_is_better = True

            bx, by, bw, bh = item.box
            best_dist = float('inf')

            for candidate in ocr_items:
                if candidate == item or re.match(r'^\d+(\.\d+)?$', candidate.text.strip().replace(',', '')):
                    continue
                cx, cy, cw, ch = candidate.box
                # Check left
                if cx + cw <= bx and abs(cy - by) < max(bh, ch) * 1.5:
                    dist = bx - (cx + cw)
                    if dist < best_dist and dist < 250:
                        best_dist = dist
                        label = candidate.text.strip()
                # Check above
                elif cy + ch <= by and abs(cx - bx) < max(bw, cw) * 1.5:
                    dist = by - (cy + ch)
                    if dist < best_dist and dist < 120:
                        best_dist = dist
                        label = candidate.text.strip()

            # Clean and normalize label
            words = [CORRECTION_MAP.get(w.lower(), w) for w in re.split(r'[\s_\-\.]+', label) if w]
            clean_label = " ".join(words).title()
            if not clean_label or len(clean_label) < 3 or re.match(r'^\d+$', clean_label):
                clean_label = f"Metric {len(metrics) + 1}"

            # Check unit and directionality
            lower_lbl = clean_label.lower()
            if any(t in lower_lbl for t in ["duration", "time", "latency", "delay"]):
                unit = "s"
                higher_is_better = False
            elif "speed" in lower_lbl:
                unit = "s/image" if "image" in lower_lbl or "procyon" in full_text else "FPS"
                higher_is_better = unit == "FPS"
            elif any(u in lower_lbl for u in ["fps", "rate"]):
                unit = "FPS"
                higher_is_better = True
            elif any(u in lower_lbl for u in ["mb/s", "bandwidth", "throughput"]):
                unit = "MB/s"
                higher_is_better = True

            m_id = re.sub(r'[^a-z0-9_]', '_', clean_label.lower()).strip('_')
            decimals = 0 if val.is_integer() else (3 if unit == "s/image" else 2)

            metrics.append({
                "id": m_id,
                "name": clean_label,
                "display_name": clean_label,
                "value": val,
                "unit": unit,
                "higher_is_better": higher_is_better,
                "decimal_places": decimals,
                "sort_order": len(metrics)
            })

            if len(metrics) >= 8:
                break

        b_id = re.sub(r'[^a-z0-9_]', '_', detected_name.lower()).strip('_')
        return {
            "id": b_id,
            "name": detected_name,
            "category": category,
            "device_tested": device_tested,
            "keywords": [b_id, detected_name.lower()],
            "metrics": metrics
        }
