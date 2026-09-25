import re
from typing import Dict, List
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class GenericOCRParser(BaseBenchmarkParser):
    id: str = "generic_parser"
    name: str = "Generic OCR Fallback"
    version: str = "1.0"
    target_benchmark_id: str = "unknown"

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        # Fallback parser can always parse if there are any OCR items
        return 0.10 if ocr_items else 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}

        # Look for numbers in the OCR items
        num_count = 0
        for i, item in enumerate(ocr_items):
            val, unit, conf_mod = NumberNormalizer.normalize_score_text(item.text)
            if val is not None and val > 0:
                # Find a possible label nearby (preceding item or item on left)
                label = f"metric_{num_count + 1}"
                if i > 0:
                    prev_text = ocr_items[i - 1].text.strip()
                    if not re.search(r'^\d+$', prev_text) and len(prev_text) < 40:
                        clean_label = re.sub(r'[^\w\s-]', '', prev_text).strip()
                        if clean_label:
                            label = clean_label.lower().replace(' ', '_')[:30]

                # Ensure unique metric id
                m_id = label
                counter = 1
                while m_id in metrics:
                    m_id = f"{label}_{counter}"
                    counter += 1

                conf = round(item.confidence * conf_mod * 0.70, 2)  # Penalize generic parser
                metrics[m_id] = ExtractedMetricResult(
                    metric_id=m_id,
                    raw_text=item.text,
                    normalized_value=val,
                    confidence=conf,
                    unit=unit or "score",
                    ocr_region=item.box,
                    status="needs_review",
                    error_message="Extracted with generic OCR fallback. Verification recommended."
                )
                num_count += 1
                if num_count >= 10:  # Cap at 10 to avoid noise
                    break

        confs = [m.confidence for m in metrics.values()]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id="unknown",
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Unknown Benchmark",
            status="needs_review",
            raw_ocr_items=ocr_items
        )
