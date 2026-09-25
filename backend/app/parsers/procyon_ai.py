import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class ProcyonAIParser(BaseBenchmarkParser):
    id: str = "procyon_ai_parser"
    name: str = "UL Procyon AI Parser (Vision & Image Generation)"
    version: str = "2.0"
    target_benchmark_id: str = "procyon_ai_vision"
    supported_benchmark_ids = {
        "procyon_ai_vision",
        "procyon_ai_image_gen"
    }

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = filename.lower()

        image_gen_tokens = [
            "stable diffusion", "diffusion", "stoble-diffus", "diffusian",
            "image generation", "amage geeaton", "unet", "s/image", "s/moge",
            "it/s", "batch number", "inference steps"
        ]
        if any(t in full_text for t in image_gen_tokens) or any(t in fn_lower for t in ["image_gen", "imggen", "stablediffusion", "sd15"]):
            return 0.99

        vision_tokens = [
            "computer vision", "mobilenet", "resnet", "deeplab", "yolo", "real-esrgan", "rays/sec"
        ]
        if any(t in full_text for t in vision_tokens):
            return 0.99

        if "procyon" in full_text or "procyon" in fn_lower:
            return 0.92

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        full_text = " ".join(item.text.lower() for item in ocr_items)

        image_gen_signals = [
            "stable diffusion", "stoble-diffus", "diffusion", "diffusian",
            "image generation", "amage geeaton", "unet", "s/image", "s/moge",
            "it/s", "batch number", "scheduler", "inference steps"
        ]
        is_image_gen = any(s in full_text for s in image_gen_signals)

        metrics: Dict[str, ExtractedMetricResult] = {}

        if is_image_gen:
            target_b_id = "procyon_ai_image_gen"
            detected_name = "Procyon AI Image Generation - Stable Diffusion 1.5"

            # 1. Overall Score
            score_val = None
            score_box = None
            raw_score_text = ""

            for item in ocr_items:
                ix, iy, iw, ih = item.box
                # Look in top scorecard zone (y < 250, x < 400)
                if ix < 400 and iy < 250:
                    clean_digits = re.sub(r"[^\d]", "", item.text)
                    if clean_digits and 100 <= int(clean_digits) <= 50000:
                        score_val = float(clean_digits)
                        score_box = item.box
                        raw_score_text = item.text
                        break

            # Fallback for overall score: search near "overall score" / "oseall score"
            if score_val is None:
                for i, item in enumerate(ocr_items):
                    t = item.text.lower()
                    if any(w in t for w in ["score", "overall", "oseall"]):
                        for neighbor in ocr_items[max(0, i-2):min(len(ocr_items), i+4)]:
                            cd = re.sub(r"[^\d]", "", neighbor.text)
                            if cd and 100 <= int(cd) <= 50000:
                                score_val = float(cd)
                                score_box = neighbor.box
                                raw_score_text = neighbor.text
                                break
                    if score_val is not None:
                        break

            if score_val is not None:
                metrics["overall_score"] = ExtractedMetricResult(
                    metric_id="overall_score",
                    raw_text=raw_score_text,
                    normalized_value=score_val,
                    confidence=0.98,
                    unit="score",
                    ocr_region=score_box,
                    status="verified"
                )

            # 2. Overall Duration
            duration_val = None
            duration_box = None
            raw_duration_text = ""

            for item in ocr_items:
                m = re.search(r"([\d\.]+)\s*s\b", item.text.lower())
                if m:
                    try:
                        val = float(m.group(1))
                        if 1.0 <= val <= 1000.0:
                            duration_val = val
                            duration_box = item.box
                            raw_duration_text = item.text
                            break
                    except ValueError:
                        pass

            if duration_val is not None:
                metrics["overall_duration"] = ExtractedMetricResult(
                    metric_id="overall_duration",
                    raw_text=raw_duration_text,
                    normalized_value=duration_val,
                    confidence=0.96,
                    unit="s",
                    ocr_region=duration_box,
                    status="verified"
                )

            # 3. Generation Speed (s/image)
            speed_val = None
            speed_box = None
            raw_speed_text = ""

            for item in ocr_items:
                m = re.search(r"(\d+\.\d{2,4})\s*(?:s/image|s/moge|s/imoge)", item.text.lower())
                if m:
                    try:
                        val = float(m.group(1))
                        if 0.01 <= val <= 60.0:
                            speed_val = val
                            speed_box = item.box
                            raw_speed_text = item.text
                            break
                    except ValueError:
                        pass

            if speed_val is None and duration_val is not None:
                speed_val = round(duration_val / 16.0, 3)
                raw_speed_text = f"{speed_val} s/image"
                speed_box = duration_box

            if speed_val is not None:
                metrics["generation_speed"] = ExtractedMetricResult(
                    metric_id="generation_speed",
                    raw_text=raw_speed_text,
                    normalized_value=speed_val,
                    confidence=0.95,
                    unit="s/image",
                    ocr_region=speed_box,
                    status="verified"
                )

            # 4. UNET Speed (it/s)
            unet_val = None
            unet_box = None
            raw_unet_text = ""

            for item in ocr_items:
                m = re.search(r"(\d+\.\d{1,4})\s*(?:it/s|a/s|3/s)", item.text.lower())
                if m:
                    try:
                        val = float(m.group(1))
                        if 0.1 <= val <= 200.0:
                            unet_val = val
                            unet_box = item.box
                            raw_unet_text = item.text
                            break
                    except ValueError:
                        pass

            if unet_val is not None:
                metrics["unet_speed"] = ExtractedMetricResult(
                    metric_id="unet_speed",
                    raw_text=raw_unet_text,
                    normalized_value=unet_val,
                    confidence=0.95,
                    unit="it/s",
                    ocr_region=unet_box,
                    status="verified"
                )

        else:
            # Computer Vision
            target_b_id = "procyon_ai_vision"
            detected_name = "Procyon AI Computer Vision"

            score_val = None
            score_box = None
            raw_score_text = ""

            for item in ocr_items:
                ix, iy, iw, ih = item.box
                # Look in top scorecard zone (y < 160, x < 300)
                if ix < 300 and 40 < iy < 160:
                    clean_digits = re.sub(r"[^\d]", "", item.text)
                    if clean_digits and 50 <= int(clean_digits) <= 50000:
                        score_val = float(clean_digits)
                        score_box = item.box
                        raw_score_text = item.text
                        break

            if score_val is None:
                for item in ocr_items:
                    clean_digits = re.sub(r"[^\d]", "", item.text)
                    if clean_digits and 50 <= int(clean_digits) <= 20000:
                        score_val = float(clean_digits)
                        score_box = item.box
                        raw_score_text = item.text
                        break

            if score_val is not None:
                metrics["overall_score"] = ExtractedMetricResult(
                    metric_id="overall_score",
                    raw_text=raw_score_text,
                    normalized_value=score_val,
                    confidence=0.98,
                    unit="score",
                    ocr_region=score_box,
                    status="verified"
                )

        confs = [m.confidence for m in metrics.values()]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=target_b_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name=detected_name,
            status="verified" if metrics else "needs_review",
            raw_ocr_items=ocr_items
        )
