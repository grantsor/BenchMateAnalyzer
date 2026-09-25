from dataclasses import dataclass
from typing import List, Optional, Tuple, Union
import numpy as np
from app.ocr.preprocessor import ImagePreprocessor

@dataclass
class OCRItem:
    text: str
    confidence: float
    polygon: Optional[List[List[float]]] = None
    box: Tuple[int, int, int, int] = (0, 0, 0, 0)  # x, y, width, height

class OCREngine:
    """
    RapidOCR (PaddleOCR v4 ONNX runtime) wrapper.
    Provides fast, local, offline text detection and recognition with confidence scores.
    """
    _instance: Optional["OCREngine"] = None
    _engine = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCREngine, cls).__new__(cls)
            cls._instance._engine = None
        return cls._instance

    def _ensure_engine(self):
        if self._engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._engine = RapidOCR()
            except Exception as e:
                print(f"[OCREngine] Failed to load RapidOCR: {e}")
                self._engine = None

    def ocr_image(self, image: np.ndarray) -> List[OCRItem]:
        """
        Runs full image OCR and returns detected text items.
        """
        self._ensure_engine()
        if self._engine is None or image is None or image.size == 0:
            return []

        try:
            result, _ = self._engine(image)
            if not result:
                return []

            items: List[OCRItem] = []
            for entry in result:
                # RapidOCR format: [polygon, text, score]
                poly = entry[0]
                text = str(entry[1]).strip()
                score = float(entry[2])

                # Compute bounding rect [x, y, w, h]
                xs = [pt[0] for pt in poly]
                ys = [pt[1] for pt in poly]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                rect = (int(min_x), int(min_y), int(max_x - min_x), int(max_y - min_y))

                items.append(OCRItem(
                    text=text,
                    confidence=score,
                    polygon=poly,
                    box=rect
                ))
            return items
        except Exception as e:
            print(f"[OCREngine] Error during OCR: {e}")
            return []

    def ocr_region(
        self,
        image: np.ndarray,
        box: Union[Tuple[int, int, int, int], list]
    ) -> List[OCRItem]:
        """
        Crops region [x, y, w, h] and runs OCR, adjusting coordinates to original image.
        """
        rx, ry, rw, rh = [int(v) for v in box]
        cropped = ImagePreprocessor.crop_region(image, box)
        if cropped.size == 0:
            return []

        sub_items = self.ocr_image(cropped)
        # Adjust coordinates
        adjusted: List[OCRItem] = []
        for item in sub_items:
            adj_poly = [[pt[0] + rx, pt[1] + ry] for pt in item.polygon]
            bx, by, bw, bh = item.box
            adjusted.append(OCRItem(
                text=item.text,
                confidence=item.confidence,
                polygon=adj_poly,
                box=(bx + rx, by + ry, bw, bh)
            ))
        return adjusted

ocr_engine = OCREngine()
