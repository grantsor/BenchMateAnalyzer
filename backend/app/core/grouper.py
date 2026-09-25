import statistics
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

@dataclass
class GroupedMetricValue:
    metric_id: str
    metric_display_name: str
    unit: str
    higher_is_better: bool
    value: Optional[float]
    raw_values: List[float] = field(default_factory=list)
    confidence: float = 0.0
    status: str = "verified"
    source_file: Optional[str] = None
    delta_vs_baseline: Optional[float] = None
    pct_gain_vs_baseline: Optional[float] = None

@dataclass
class GroupedConfigurationRow:
    configuration_id: str
    configuration_name: str
    display_name: str
    sort_order: int
    is_baseline: bool = False
    metrics: Dict[str, GroupedMetricValue] = field(default_factory=dict)
    project_id: Optional[str] = None
    project_name: Optional[str] = None

@dataclass
class GroupedBenchmarkDataset:
    benchmark_id: str
    benchmark_name: str
    metric_ids: List[str]
    rows: List[GroupedConfigurationRow] = field(default_factory=list)

class BenchmarkGrouper:
    """
    Groups benchmark results across configurations and aggregates multiple runs.
    Calculates deltas and percentage comparisons against a selected baseline.
    """

    @classmethod
    def aggregate_runs(
        cls,
        values: List[float],
        aggregation_method: str = "best",
        higher_is_better: bool = True
    ) -> Optional[float]:
        if not values:
            return None
        if len(values) == 1:
            return values[0]

        method = aggregation_method.lower()
        if method == "best":
            return max(values) if higher_is_better else min(values)
        elif method == "worst":
            return min(values) if higher_is_better else max(values)
        elif method == "average" or method == "mean":
            return round(statistics.mean(values), 2)
        elif method == "median":
            return round(statistics.median(values), 2)
        else:
            return max(values) if higher_is_better else min(values)

    @classmethod
    def compute_deltas(
        cls,
        rows: List[GroupedConfigurationRow],
        baseline_config_id: Optional[str] = None
    ):
        """
        Calculates delta and percentage gain/loss relative to baseline configuration.
        """
        # Find baseline row
        baseline_row: Optional[GroupedConfigurationRow] = None
        if baseline_config_id:
            for r in rows:
                if r.configuration_id == baseline_config_id:
                    baseline_row = r
                    r.is_baseline = True
                    break

        # If no explicit baseline found, default to first configuration
        if not baseline_row and rows:
            baseline_row = rows[0]
            baseline_row.is_baseline = True

        if not baseline_row:
            return

        for row in rows:
            for m_id, m_val in row.metrics.items():
                base_m = baseline_row.metrics.get(m_id)
                if base_m and base_m.value is not None and m_val.value is not None and base_m.value != 0:
                    delta = m_val.value - base_m.value
                    pct = (delta / base_m.value) * 100.0
                    m_val.delta_vs_baseline = round(delta, 2)
                    m_val.pct_gain_vs_baseline = round(pct, 2)
