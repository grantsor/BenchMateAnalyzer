import numpy as np
from typing import List, Dict, Any, Optional

class FrameMetricCalculator:
    @staticmethod
    def calculate_fps_metrics(ms_between_presents: List[float]) -> Dict[str, float]:
        if not ms_between_presents:
            return {
                'average_fps': 0.0,
                'p1_fps': 0.0,
                'p01_fps': 0.0,
                'median_fps': 0.0,
                'min_fps': 0.0,
                'max_fps': 0.0,
                'total_frames': 0,
                'total_duration_s': 0.0
            }

        ms_arr = np.array(ms_between_presents, dtype=float)
        # Filter out invalid / zero or negative ms
        ms_arr = ms_arr[ms_arr > 0.01]
        if len(ms_arr) == 0:
            return {
                'average_fps': 0.0,
                'p1_fps': 0.0,
                'p01_fps': 0.0,
                'median_fps': 0.0,
                'min_fps': 0.0,
                'max_fps': 0.0,
                'total_frames': 0,
                'total_duration_s': 0.0
            }

        total_frames = int(len(ms_arr))
        total_duration_s = float(np.sum(ms_arr) / 1000.0)

        # Average FPS = total frames / total time
        avg_fps = float(total_frames / total_duration_s) if total_duration_s > 0 else 0.0

        fps_arr = 1000.0 / ms_arr

        # 1% Low FPS (1st percentile)
        p1_fps = float(np.percentile(fps_arr, 1.0))

        # 0.1% Low FPS (0.1 percentile)
        p01_fps = float(np.percentile(fps_arr, 0.1))

        median_fps = float(np.median(fps_arr))
        min_fps = float(np.min(fps_arr))
        max_fps = float(np.max(fps_arr))

        return {
            'average_fps': round(avg_fps, 1),
            'p1_fps': round(p1_fps, 1),
            'p01_fps': round(p01_fps, 1),
            'median_fps': round(median_fps, 1),
            'min_fps': round(min_fps, 1),
            'max_fps': round(max_fps, 1),
            'total_frames': total_frames,
            'total_duration_s': round(total_duration_s, 2)
        }
