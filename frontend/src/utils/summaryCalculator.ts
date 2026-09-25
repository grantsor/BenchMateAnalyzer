import { GroupedBenchmarkDataset } from "../api/client";

export interface SummaryConfigOption {
  id: string;
  name: string;
  sort_order: number;
}

export interface SummaryCalculationResult {
  summaryDataset: GroupedBenchmarkDataset;
  allConfigs: SummaryConfigOption[];
  referenceConfigId: string;
  referenceConfigName: string;
  deltas: Record<string, { percent: number; delta: number; benchmarkCount: number }>;
}

/**
 * Calculates the overall performance summary across all benchmark datasets.
 * Computes the relative performance of each configuration against the chosen reference (100% baseline).
 * Handles Higher is Better (HIB) and Lower is Better (LIB) appropriately.
 */
export function calculatePerformanceSummary(
  datasets: GroupedBenchmarkDataset[],
  referenceConfigId?: string,
  includedBenchmarkIds?: string[]
): SummaryCalculationResult | null {
  if (!datasets || datasets.length === 0) return null;

  // 1. Gather all unique configuration IDs and names in stable order
  const configMap = new Map<string, SummaryConfigOption>();
  datasets.forEach((ds) => {
    ds.rows.forEach((r) => {
      if (!configMap.has(r.configuration_id)) {
        configMap.set(r.configuration_id, {
          id: r.configuration_id,
          name: r.configuration_name,
          sort_order: r.sort_order
        });
      }
    });
  });

  const allConfigs = Array.from(configMap.values()).sort((a, b) => a.sort_order - b.sort_order);
  if (allConfigs.length === 0) return null;

  // Resolve reference configuration (if not specified, default to first or is_baseline)
  let validRefId = referenceConfigId;
  if (!validRefId || !configMap.has(validRefId)) {
    const baselineRow = datasets[0]?.rows.find((r) => r.is_baseline);
    validRefId = baselineRow ? baselineRow.configuration_id : allConfigs[0].id;
  }

  const refConfigName = configMap.get(validRefId)?.name || "Reference";

  // Filter datasets if includedBenchmarkIds provided
  const activeDatasets =
    includedBenchmarkIds && includedBenchmarkIds.length > 0
      ? datasets.filter((d) => includedBenchmarkIds.includes(d.benchmark_id))
      : datasets;

  // 2. For each configuration, collect relative percentage ratios across all valid benchmark metrics
  const configRatios: Record<string, number[]> = {};
  allConfigs.forEach((c) => {
    configRatios[c.id] = [];
  });

  activeDatasets.forEach((ds) => {
    const refRow = ds.rows.find((r) => r.configuration_id === validRefId);
    if (!refRow) return;

    ds.metric_ids.forEach((mId) => {
      const refMetric = refRow.metrics[mId];
      if (!refMetric || refMetric.value == null || refMetric.value <= 0) return;
      const refVal = refMetric.value;

      const hib = refMetric.higher_is_better;

      allConfigs.forEach((c) => {
        const targetRow = ds.rows.find((r) => r.configuration_id === c.id);
        const targetMetric = targetRow?.metrics[mId];
        if (!targetMetric || targetMetric.value == null || targetMetric.value <= 0) return;
        const targetVal = targetMetric.value;

        let ratio = 1.0;
        if (c.id === validRefId) {
          ratio = 1.0;
        } else if (hib) {
          // Higher is Better: e.g. 135 / 100 = 1.35
          ratio = targetVal / refVal;
        } else {
          // Lower is Better: e.g. ref was 100s, target was 70s => 100 / 70 = 1.4285 (42.9% faster)
          ratio = refVal / targetVal;
        }

        if (isFinite(ratio) && ratio > 0 && ratio < 100) {
          configRatios[c.id].push(ratio);
        }
      });
    });
  });

  // 3. Compute arithmetic mean percentage for each configuration
  const deltas: Record<string, { percent: number; delta: number; benchmarkCount: number }> = {};

  const rows = allConfigs.map((c) => {
    const ratios = configRatios[c.id];
    let avgPercent = 100.0;
    if (c.id === validRefId) {
      avgPercent = 100.0;
    } else if (ratios && ratios.length > 0) {
      const sum = ratios.reduce((acc, v) => acc + v, 0);
      avgPercent = Math.round((sum / ratios.length) * 1000) / 10; // 1 decimal place
    }

    const delta = Math.round((avgPercent - 100.0) * 10) / 10;
    deltas[c.id] = {
      percent: avgPercent,
      delta: delta,
      benchmarkCount: ratios ? ratios.length : 0
    };

    return {
      configuration_id: c.id,
      configuration_name: c.name,
      display_name: c.name,
      sort_order: c.sort_order,
      is_baseline: c.id === validRefId,
      metrics: {
        relative_performance: {
          metric_id: "relative_performance",
          metric_display_name: "Average Relative Performance",
          value: avgPercent,
          unit: "%",
          higher_is_better: true,
          confidence: 1,
          raw_values: [avgPercent],
          status: "verified"
        } as any
      }
    };
  });

  const summaryDataset: GroupedBenchmarkDataset = {
    benchmark_id: "summary_relative_performance",
    benchmark_name: "Overall Performance Summary",
    metric_ids: ["relative_performance"],
    rows
  };

  return {
    summaryDataset,
    allConfigs,
    referenceConfigId: validRefId,
    referenceConfigName: refConfigName,
    deltas
  };
}
