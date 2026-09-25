from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import difflib
from pathlib import Path
import re
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer

@dataclass
class ExtractedMetricResult:
    metric_id: str
    raw_text: str
    normalized_value: Optional[float]
    confidence: float
    unit: str = "score"
    ocr_region: Optional[Tuple[int, int, int, int]] = None  # x, y, w, h
    status: str = "needs_review"  # verified, needs_review, low_confidence, error
    error_message: Optional[str] = None

@dataclass
class ParserExtractionResult:
    benchmark_id: str
    parser_id: str
    parser_version: str
    overall_confidence: float
    metrics: Dict[str, ExtractedMetricResult] = field(default_factory=dict)
    detected_benchmark_name: Optional[str] = None
    status: str = "needs_review"
    raw_ocr_items: List[OCRItem] = field(default_factory=list)

class BaseBenchmarkParser(ABC):
    id: str = "base"
    name: str = "Base Parser"
    version: str = "1.0"
    target_benchmark_id: str = "unknown"

    GENERIC_TOKENS = {
        "benchmark", "benchmarks", "bench", "test", "tests", "run", "runs",
        "result", "results", "score", "scores", "profile", "config",
        "screen", "screenshot", "standard", "whisper", "performance",
        "storage", "disk", "ssd", "cpu", "gpu", "ram"
    }

    @classmethod
    def fuzzy_match_filename(
        cls,
        filename: str,
        candidates: List[str],
        threshold: float = 0.78
    ) -> Tuple[bool, float]:
        """
        Tolerates spelling mistakes and typos in filenames (e.g. 'belnder' for 'blender',
        'corna' for 'corona', 'suoeropi' for 'superpi', 'wpirme' for 'wprime', 'occtane' for 'octane').
        Checks both the entire stem and individual tokens extracted from delimiters.
        """
        stem = Path(filename).stem.lower()
        clean_stem = re.sub(r'[^a-z0-9]', '', stem)
        tokens = [re.sub(r'[^a-z0-9]', '', t) for t in re.split(r'[\s_\-\.]+', stem) if t]
        tokens = [t for t in tokens if len(t) >= 3 and t not in cls.GENERIC_TOKENS]

        best_ratio = 0.0

        for cand in candidates:
            clean_cand = re.sub(r'[^a-z0-9]', '', cand.lower())
            if len(clean_cand) < 3 or clean_cand in cls.GENERIC_TOKENS:
                continue

            # Exact or substring containment
            if clean_cand in clean_stem:
                return True, 1.0

            # Full stem sequence matching
            r_full = difflib.SequenceMatcher(None, clean_stem, clean_cand).ratio()
            if r_full > best_ratio:
                best_ratio = r_full

            # Token sequence matching
            for tok in tokens:
                r_tok = difflib.SequenceMatcher(None, tok, clean_cand).ratio()
                if r_tok > best_ratio:
                    best_ratio = r_tok

                # Token substring containment (if length difference is small and not generic)
                if len(tok) >= 5 and len(clean_cand) >= 5:
                    if tok in clean_cand or clean_cand in tok:
                        r_sub = len(min(tok, clean_cand, key=len)) / len(max(tok, clean_cand, key=len))
                        if r_sub > best_ratio:
                            best_ratio = r_sub

        return (best_ratio >= threshold), best_ratio

    @staticmethod
    def fuzzy_match_text(
        text_or_items: Union[str, List[OCRItem]],
        keywords: List[str],
        threshold: float = 0.75
    ) -> Tuple[bool, float]:
        """
        Checks if any keyword appears in OCR text, tolerating character recognition typos
        (e.g., 'Biender' for 'Blender', 'Geekbenvh' for 'Geekbench', 'OctaneBenoh' for 'OctaneBench').
        """
        if isinstance(text_or_items, str):
            full_text = text_or_items.lower()
        else:
            full_text = " ".join(item.text.lower() for item in text_or_items)

        best_ratio = 0.0
        ocr_words = [w for w in re.split(r'[\s_\-\.:\(\),]+', full_text) if len(w) >= 3]

        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower in full_text:
                return True, 1.0

            kw_words = [w for w in re.split(r'[\s_\-\.:\(\),]+', kw_lower) if len(w) >= 2]
            if not kw_words:
                continue

            if len(kw_words) == 1:
                target_word = kw_words[0]
                for ocr_w in ocr_words:
                    if abs(len(target_word) - len(ocr_w)) <= 2:
                        r = difflib.SequenceMatcher(None, ocr_w, target_word).ratio()
                        if r > best_ratio:
                            best_ratio = r
            else:
                n = len(kw_words)
                for i in range(len(ocr_words) - n + 1):
                    window = " ".join(ocr_words[i:i+n])
                    r = difflib.SequenceMatcher(None, window, kw_lower).ratio()
                    if r > best_ratio:
                        best_ratio = r

        return (best_ratio >= threshold), best_ratio

    @abstractmethod
    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        """
        Returns confidence score from 0.0 to 1.0 that this parser
        matches the given screenshot.
        """
        pass

    @classmethod
    def is_system_monitoring_image(cls, filename: str, ocr_items: Optional[List[OCRItem]] = None) -> bool:
        """
        Detects hardware telemetry / sensor monitoring screenshots (e.g. HWiNFO, GPU-Z, CPU-Z, AIDA64)
        to prevent benchmark parsers from claiming them as false positives.
        """
        stem = Path(filename).stem.lower()
        if any(h in stem for h in ["hwinfo", "hiwnfo", "hwmon", "afterburner", "aida64"]):
            return True
        if re.match(r'^hw[0-9]+$', stem):
            return True
        if ocr_items:
            full_text = " ".join(item.text.lower() for item in ocr_items)
            if any(term in full_text for term in ["hwinfo64", "sensors status", "current minimum maximum average", "sensor status", "task manager", "processes performance"]):
                return True
        return False

    @abstractmethod
    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        """
        Extracts structured benchmark metrics from the image.
        """
        pass

    def validate_metrics(
        self,
        metrics: Dict[str, ExtractedMetricResult]
    ) -> Tuple[bool, List[str]]:
        """
        Runs domain checks on extracted metrics.
        Returns (is_valid, list_of_warning_messages).
        """
        warnings = []
        for m_id, m in metrics.items():
            if m.normalized_value is None:
                warnings.append(f"Metric '{m_id}' could not be parsed as a valid number.")
            elif m.confidence < 0.70:
                warnings.append(f"Metric '{m_id}' has low OCR confidence ({int(m.confidence * 100)}%).")
        return len(warnings) == 0, warnings
