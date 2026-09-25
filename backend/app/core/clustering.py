import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from app.core.identifier import benchmark_identifier
from app.ocr.engine import OCRItem
from app.ocr.normalizer import NumberNormalizer

@dataclass
class ImageFingerprint:
    file_path: str
    file_name: str
    configuration_name: str
    ocr_items: List[OCRItem]
    static_words: Set[str]
    detected_title: str
    identified_benchmark_id: Optional[str] = None
    cluster_id: Optional[str] = None

class BenchmarkClusteringEngine:
    """
    Groups screenshots into benchmark clusters based on OCR content,
    static UI vocabulary, and header detection, REGARDLESS of filename.
    """

    STOPWORDS = {
        "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
        "by", "is", "are", "was", "were", "it", "this", "that", "am", "pm", "cpu",
        "windows", "microsoft", "intel", "amd", "nvidia", "geforce", "radeon",
        "driver", "version", "system", "information", "test", "time", "date"
    }

    @classmethod
    def extract_fingerprint(
        cls,
        file_path: str,
        file_name: str,
        configuration_name: str,
        ocr_items: List[OCRItem],
        image_height: int = 1080
    ) -> ImageFingerprint:
        # 1. First, check if OCR keywords match a registered benchmark
        b_id, conf = benchmark_identifier.identify_by_content(file_name, ocr_items)
        if conf < 0.60:
            b_id = None

        # 2. Extract static text words (strip all numbers, symbols, and dates)
        static_words: Set[str] = set()
        title_candidates: List[Tuple[int, str]] = []  # (font_weight_estimate, text)

        for item in ocr_items:
            clean_text = re.sub(r'[\d\-.,:/\\]+', ' ', item.text).lower()
            tokens = [t.strip() for t in clean_text.split() if len(t.strip()) > 2]
            for token in tokens:
                if token not in cls.STOPWORDS:
                    static_words.add(token)

            # Check if item is in the top 35% of the image (header region)
            _, iy, _, ih = item.box
            if iy < image_height * 0.35 and len(item.text.strip()) > 3:
                # Prefer items with larger height (larger font size)
                if not re.search(r'^\d+$', item.text.strip()):
                    title_candidates.append((ih, item.text.strip()))

        # Determine best detected title
        detected_title = ""
        if title_candidates:
            title_candidates.sort(key=lambda x: x[0], reverse=True)
            detected_title = title_candidates[0][1]
        elif b_id and b_id in benchmark_identifier.benchmarks:
            detected_title = benchmark_identifier.benchmarks[b_id].name
        else:
            detected_title = Path(file_name).stem.replace('_', ' ').replace('-', ' ').title()

        return ImageFingerprint(
            file_path=file_path,
            file_name=file_name,
            configuration_name=configuration_name,
            ocr_items=ocr_items,
            static_words=static_words,
            detected_title=detected_title,
            identified_benchmark_id=b_id
        )

    @classmethod
    def cluster_fingerprints(
        cls,
        fingerprints: List[ImageFingerprint]
    ) -> Dict[str, List[ImageFingerprint]]:
        """
        Clusters all screenshots into benchmark groups:
        1. Known registered benchmarks
        2. Content-similarity clusters (sharing >= 40% static UI text)
        """
        clusters: Dict[str, List[ImageFingerprint]] = {}
        unassigned: List[ImageFingerprint] = []

        # Step 1: Assign to registered benchmarks if identified
        for fp in fingerprints:
            if fp.identified_benchmark_id:
                b_id = fp.identified_benchmark_id
                if b_id not in clusters:
                    clusters[b_id] = []
                clusters[b_id].append(fp)
                fp.cluster_id = b_id
            else:
                unassigned.append(fp)

        # Step 2: Cluster remaining unassigned screenshots by vocabulary similarity
        cluster_counter = 1
        for fp in unassigned:
            best_cluster_id = None
            best_sim = 0.0

            # Compare against existing cluster centroids
            for c_id, members in clusters.items():
                # Compare similarity with members
                sims = [cls._jaccard_similarity(fp.static_words, m.static_words) for m in members]
                avg_sim = sum(sims) / len(sims) if sims else 0.0
                if avg_sim > best_sim:
                    best_sim = avg_sim
                    best_cluster_id = c_id

            # If similarity >= 0.35, merge into existing cluster
            if best_cluster_id and best_sim >= 0.35:
                clusters[best_cluster_id].append(fp)
                fp.cluster_id = best_cluster_id
            else:
                # Create a new synthetic cluster named after the detected title
                clean_title = re.sub(r'[^\w\s]', '', fp.detected_title).strip()
                new_id = f"custom_{clean_title.lower().replace(' ', '_')[:24]}"
                if new_id in clusters:
                    new_id = f"{new_id}_{cluster_counter}"
                    cluster_counter += 1

                clusters[new_id] = [fp]
                fp.cluster_id = new_id

        return clusters

    @staticmethod
    def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0
