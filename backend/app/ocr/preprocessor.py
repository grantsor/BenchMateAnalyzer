import hashlib
from pathlib import Path
from typing import Tuple, Optional, Union
import cv2
import numpy as np

class ImagePreprocessor:
    """
    Provides image loading, hashing, bounding box cropping,
    and visual preprocessing (contrast enhancement, thresholding) for OCR.
    """

    @staticmethod
    def compute_sha256(file_path: Union[str, Path]) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def compute_difference_hash(image: np.ndarray, hash_size: int = 8) -> str:
        """
        Computes a perceptual dHash for near-duplicate image detection.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        resized = cv2.resize(gray, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
        # Compare adjacent pixels
        diff = resized[:, 1:] > resized[:, :-1]
        # Convert bool array to hex string
        return "".join(f"{b:02x}" for b in np.packbits(diff))

    @staticmethod
    def load_image(file_path: Union[str, Path]) -> Optional[np.ndarray]:
        path_str = str(file_path)
        # Use cv2.imdecode to avoid Windows non-ASCII path encoding issues
        try:
            with open(path_str, "rb") as f:
                bytes_data = bytearray(f.read())
            arr = np.asarray(bytes_data, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return img
        except Exception:
            return None

    @staticmethod
    def crop_region(
        image: np.ndarray,
        box: Union[Tuple[int, int, int, int], list]
    ) -> np.ndarray:
        """
        Crops [x, y, width, height] from image safely within bounds.
        """
        h, w = image.shape[:2]
        x, y, box_w, box_h = [int(v) for v in box]
        x1 = max(0, min(x, w - 1))
        y1 = max(0, min(y, h - 1))
        x2 = max(x1 + 1, min(x + box_w, w))
        y2 = max(y1 + 1, min(y + box_h, h))
        return image[y1:y2, x1:x2].copy()

    @staticmethod
    def preprocess_for_ocr(image: np.ndarray, mode: str = "standard") -> np.ndarray:
        """
        Enhances contrast and sharpness for text recognition.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        if mode == "clahe":
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            return clahe.apply(gray)
        elif mode == "threshold":
            # Otsu thresholding
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return thresh
        else:
            # Standard resize if too small + gentle sharpening
            h, w = gray.shape[:2]
            if h < 50:
                scale = 50.0 / h
                gray = cv2.resize(gray, (int(w * scale), 50), interpolation=cv2.INTER_CUBIC)
            return gray
