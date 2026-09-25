import pytest
from app.core.grouper import BenchmarkGrouper, GroupedConfigurationRow, GroupedMetricValue

def test_aggregate_runs():
    runs = [21327.0, 21401.0, 21298.0]

    best = BenchmarkGrouper.aggregate_runs(runs, "best", higher_is_better=True)
    assert best == 21401.0

    worst = BenchmarkGrouper.aggregate_runs(runs, "worst", higher_is_better=True)
    assert worst == 21298.0

    avg = BenchmarkGrouper.aggregate_runs(runs, "average", higher_is_better=True)
    assert avg == 21342.0

    median = BenchmarkGrouper.aggregate_runs(runs, "median", higher_is_better=True)
    assert median == 21327.0

def test_compute_deltas():
    row1 = GroupedConfigurationRow(
        configuration_id="cfg_perf",
        configuration_name="Performance",
        display_name="Performance",
        sort_order=0,
        metrics={
            "multi_core": GroupedMetricValue(
                metric_id="multi_core",
                metric_display_name="Multi-Core",
                unit="score",
                higher_is_better=True,
                value=21327.0
            )
        }
    )

    row2 = GroupedConfigurationRow(
        configuration_id="cfg_bal",
        configuration_name="Balanced",
        display_name="Balanced",
        sort_order=1,
        metrics={
            "multi_core": GroupedMetricValue(
                metric_id="multi_core",
                metric_display_name="Multi-Core",
                unit="score",
                higher_is_better=True,
                value=20145.0
            )
        }
    )

    # Set row2 (Balanced) as baseline
    BenchmarkGrouper.compute_deltas([row1, row2], baseline_config_id="cfg_bal")

    # Balanced vs Balanced delta should be 0.0
    assert row2.metrics["multi_core"].delta_vs_baseline == 0.0
    assert row2.metrics["multi_core"].pct_gain_vs_baseline == 0.0

    # Performance vs Balanced: (21327 - 20145) = 1182.0
    # pct = (1182 / 20145) * 100 = 5.87%
    assert row1.metrics["multi_core"].delta_vs_baseline == 1182.0
    assert round(row1.metrics["multi_core"].pct_gain_vs_baseline, 1) == 5.9
