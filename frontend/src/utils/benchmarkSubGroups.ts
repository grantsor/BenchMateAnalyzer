import { GroupedBenchmarkDataset } from "../api/client";

export interface BenchmarkSubGroup {
  id: string;
  label: string;
  shortLabel: string;
  metrics: string[];
  titleSuffix: string;
  subtitle: string;
  higherIsBetter: boolean;
  unit: string;
}

export const BENCHMARK_SUB_GROUPS: Record<string, BenchmarkSubGroup[]> = {
  // CrystalDiskMark 1GB & 16GB
  crystaldiskmark_1gb: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "rnd_4k",
      label: "Random 4K (MB/s)",
      shortLabel: "Random 4K",
      metrics: ["rnd_4k_read", "rnd_4k_write"],
      titleSuffix: " - Random 4K",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    }
  ],
  crystaldiskmark_16gb: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "rnd_4k",
      label: "Random 4K (MB/s)",
      shortLabel: "Random 4K",
      metrics: ["rnd_4k_read", "rnd_4k_write"],
      titleSuffix: " - Random 4K",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    }
  ],
  crystaldiskmark: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "rnd_4k",
      label: "Random 4K (MB/s)",
      shortLabel: "Random 4K",
      metrics: ["rnd_4k_read", "rnd_4k_write"],
      titleSuffix: " - Random 4K",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    }
  ],

  // AS SSD Benchmark 1GB
  as_ssd_1gb: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "four_k",
      label: "4K Read / Write (MB/s)",
      shortLabel: "4K",
      metrics: ["four_k_read", "four_k_write"],
      titleSuffix: " - 4K",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "four_k_64",
      label: "4K-64Thrd (MB/s)",
      shortLabel: "4K-64Thrd",
      metrics: ["four_k_64_read", "four_k_64_write"],
      titleSuffix: " - 4K-64Thrd",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "acc_time",
      label: "Access Time (ms)",
      shortLabel: "Access Time",
      metrics: ["acc_time_read", "acc_time_write"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (ms)",
      higherIsBetter: false,
      unit: "ms"
    },
    {
      id: "score",
      label: "Score (pts)",
      shortLabel: "Score",
      metrics: ["score"],
      titleSuffix: " - Total Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // AS SSD Benchmark 10GB
  as_ssd_10gb: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "four_k",
      label: "4K Read / Write (MB/s)",
      shortLabel: "4K",
      metrics: ["four_k_read", "four_k_write"],
      titleSuffix: " - 4K",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "four_k_64",
      label: "4K-64Thrd (MB/s)",
      shortLabel: "4K-64Thrd",
      metrics: ["four_k_64_read", "four_k_64_write"],
      titleSuffix: " - 4K-64Thrd",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "acc_time",
      label: "Access Time (ms)",
      shortLabel: "Access Time",
      metrics: ["acc_time_read", "acc_time_write"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (ms)",
      higherIsBetter: false,
      unit: "ms"
    },
    {
      id: "score",
      label: "Score (pts)",
      shortLabel: "Score",
      metrics: ["score"],
      titleSuffix: " - Total Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // AS SSD Copy Benchmark
  as_ssd_copy: [
    {
      id: "speed",
      label: "Copy Speed (MB/s)",
      shortLabel: "Speed",
      metrics: ["iso_speed", "program_speed", "game_speed"],
      titleSuffix: " - Copy Speed",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "duration",
      label: "Copy Duration (s)",
      shortLabel: "Duration",
      metrics: ["iso_duration", "program_duration", "game_duration"],
      titleSuffix: " - Copy Duration",
      subtitle: "LOWER IS BETTER (Seconds)",
      higherIsBetter: false,
      unit: "s"
    }
  ],

  // OCCT Benchmark (Laptop / Desktop CPU)
  occt_benchmark: [
    {
      id: "avx",
      label: "AVX Instructions (Multi & Single)",
      shortLabel: "AVX",
      metrics: ["multi_avx", "single_avx"],
      titleSuffix: " - AVX",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    },
    {
      id: "sse",
      label: "SSE Instructions (Multi & Single)",
      shortLabel: "SSE",
      metrics: ["multi_sse", "single_sse"],
      titleSuffix: " - SSE",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],
  occt: [
    {
      id: "avx",
      label: "AVX Instructions (Multi & Single)",
      shortLabel: "AVX",
      metrics: ["multi_avx", "single_avx"],
      titleSuffix: " - AVX",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    },
    {
      id: "sse",
      label: "SSE Instructions (Multi & Single)",
      shortLabel: "SSE",
      metrics: ["multi_sse", "single_sse"],
      titleSuffix: " - SSE",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // OCCT Storage Benchmark (SSD)
  occt_storage: [
    {
      id: "sequential",
      label: "Sequential (MB/s)",
      shortLabel: "Sequential",
      metrics: ["seq_read", "seq_write"],
      titleSuffix: " - Sequential",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "random",
      label: "Random (MB/s)",
      shortLabel: "Random",
      metrics: ["rnd_read", "rnd_write"],
      titleSuffix: " - Random",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    }
  ],

  // 3DMark and PCMark Storage Benchmark (Merged Suite)
  threedmark_pcmark_storage: [
    {
      id: "bandwidth",
      label: "Bandwidth (MB/s)",
      shortLabel: "Bandwidth",
      metrics: ["tdm_bandwidth", "pcm_quick_bandwidth", "pcm_data_bandwidth"],
      titleSuffix: " - Bandwidth",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "access_time",
      label: "Access Time (µs)",
      shortLabel: "Access Time",
      metrics: ["tdm_access_time", "pcm_quick_access_time", "pcm_data_access_time"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (µs)",
      higherIsBetter: false,
      unit: "µs"
    },
    {
      id: "scores",
      label: "Benchmark Scores (pts)",
      shortLabel: "Scores",
      metrics: ["tdm_score", "pcm_quick_score", "pcm_data_score"],
      titleSuffix: " - Scores",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // 3DMark Storage Benchmark
  threedmark_storage: [
    {
      id: "bandwidth",
      label: "Bandwidth (MB/s)",
      shortLabel: "Bandwidth",
      metrics: ["bandwidth"],
      titleSuffix: " - Bandwidth",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "access_time",
      label: "Average Access Time (µs)",
      shortLabel: "Access Time",
      metrics: ["average_access_time", "access_time"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (µs)",
      higherIsBetter: false,
      unit: "µs"
    },
    {
      id: "score",
      label: "Storage Score (pts)",
      shortLabel: "Score",
      metrics: ["storage_score", "score"],
      titleSuffix: " - Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // PCMark 10 Quick System Drive
  pcmark10_quick_system_drive: [
    {
      id: "bandwidth",
      label: "Bandwidth (MB/s)",
      shortLabel: "Bandwidth",
      metrics: ["bandwidth"],
      titleSuffix: " - Bandwidth",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "access_time",
      label: "Access Time (µs)",
      shortLabel: "Access Time",
      metrics: ["access_time"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (µs)",
      higherIsBetter: false,
      unit: "µs"
    },
    {
      id: "score",
      label: "Quick System Score (pts)",
      shortLabel: "Score",
      metrics: ["score"],
      titleSuffix: " - Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // PCMark 10 Data Drive
  pcmark10_data_drive: [
    {
      id: "bandwidth",
      label: "Bandwidth (MB/s)",
      shortLabel: "Bandwidth",
      metrics: ["bandwidth"],
      titleSuffix: " - Bandwidth",
      subtitle: "HIGHER IS BETTER (MB/s)",
      higherIsBetter: true,
      unit: "MB/s"
    },
    {
      id: "access_time",
      label: "Access Time (µs)",
      shortLabel: "Access Time",
      metrics: ["access_time"],
      titleSuffix: " - Access Time",
      subtitle: "LOWER IS BETTER (µs)",
      higherIsBetter: false,
      unit: "µs"
    },
    {
      id: "score",
      label: "Data Drive Score (pts)",
      shortLabel: "Score",
      metrics: ["score"],
      titleSuffix: " - Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // CrossMark
  crossmark: [
    {
      id: "overall",
      label: "Overall Score (pts)",
      shortLabel: "Overall",
      metrics: ["overall_score"],
      titleSuffix: " - Overall Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    },
    {
      id: "subscores",
      label: "Detailed Scores (Productivity, Creativity & Responsiveness)",
      shortLabel: "Detailed Scores",
      metrics: ["productivity", "creativity", "responsiveness"],
      titleSuffix: " - Detailed Scores",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // 3DMark Time Spy
  threedmark_timespy: [
    {
      id: "overall",
      label: "Overall Score (pts)",
      shortLabel: "Overall",
      metrics: ["overall_score"],
      titleSuffix: " - Overall Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    },
    {
      id: "components",
      label: "Component Scores (Graphics & CPU)",
      shortLabel: "Graphics / CPU",
      metrics: ["graphics_score", "cpu_score"],
      titleSuffix: " - Component Scores",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ],

  // 3DMark Fire Strike
  threedmark_firestrike: [
    {
      id: "overall",
      label: "Overall Score (pts)",
      shortLabel: "Overall",
      metrics: ["overall_score"],
      titleSuffix: " - Overall Score",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    },
    {
      id: "components",
      label: "Component Scores (Graphics, Physics & Combined)",
      shortLabel: "Component Scores",
      metrics: ["graphics_score", "physics_score", "combined_score"],
      titleSuffix: " - Component Scores",
      subtitle: "HIGHER IS BETTER (pts)",
      higherIsBetter: true,
      unit: "pts"
    }
  ]
};

/**
 * Returns the defined sub-groups for a benchmark if any exist, filtering to only groups
 * whose metrics are present in the dataset.
 */
export function getSubGroupsForBenchmark(
  benchmarkId: string,
  availableMetricIds?: string[]
): BenchmarkSubGroup[] {
  const groups = BENCHMARK_SUB_GROUPS[benchmarkId];
  if (!groups) return [];

  if (!availableMetricIds || availableMetricIds.length === 0) {
    return groups;
  }

  const set = new Set(availableMetricIds);
  // Return groups where at least one metric is present in the dataset
  return groups.filter((g) => g.metrics.some((m) => set.has(m)));
}

/**
 * Resolves a specific sub-group by ID for a benchmark.
 */
export function findSubGroup(
  benchmarkId: string,
  subGroupId: string
): BenchmarkSubGroup | undefined {
  const groups = BENCHMARK_SUB_GROUPS[benchmarkId];
  if (!groups) return undefined;
  return groups.find((g) => g.id === subGroupId);
}

/**
 * Generates an expanded list of export targets. For benchmarks that define sub-groups,
 * creates distinct sub-chart export targets so each group gets its own dedicated,
 * uncluttered chart.
 */
export function getSplitExportTargets(
  datasets: GroupedBenchmarkDataset[]
): {
  dataset: GroupedBenchmarkDataset;
  subGroup?: BenchmarkSubGroup;
  exportKey: string;
  effectiveTitle: string;
  effectiveSubtitle: string;
  selectedMetrics: string[];
}[] {
  const targets: {
    dataset: GroupedBenchmarkDataset;
    subGroup?: BenchmarkSubGroup;
    exportKey: string;
    effectiveTitle: string;
    effectiveSubtitle: string;
    selectedMetrics: string[];
  }[] = [];

  for (const ds of datasets) {
    const subGroups = getSubGroupsForBenchmark(ds.benchmark_id, ds.metric_ids);
    if (subGroups.length > 0) {
      for (const sg of subGroups) {
        const matchingMetrics = sg.metrics.filter((m) => ds.metric_ids.includes(m));
        if (matchingMetrics.length > 0) {
          targets.push({
            dataset: ds,
            subGroup: sg,
            exportKey: `${ds.benchmark_id}__${sg.id}`,
            effectiveTitle: `${ds.benchmark_name}${sg.titleSuffix}`,
            effectiveSubtitle: sg.subtitle,
            selectedMetrics: matchingMetrics
          });
        }
      }
    } else {
      const firstRow = ds.rows[0];
      const firstMetric = ds.metric_ids[0];
      const hib = firstRow?.metrics[firstMetric]?.higher_is_better ?? true;
      const unit = firstRow?.metrics[firstMetric]?.unit || "";
      const baseSub = hib ? "HIGHER IS BETTER" : "LOWER IS BETTER";
      targets.push({
        dataset: ds,
        exportKey: ds.benchmark_id,
        effectiveTitle: ds.benchmark_name,
        effectiveSubtitle: unit ? `${baseSub} (${unit})` : baseSub,
        selectedMetrics: ds.metric_ids
      });
    }
  }

  return targets;
}

export interface AvailableExportTarget {
  exportKey: string;
  benchmarkId: string;
  benchmarkName: string;
  isSubGroup: boolean;
  subGroupId?: string;
  subGroupLabel?: string;
  titleSuffix?: string;
  label: string;
  effectiveTitle: string;
  effectiveSubtitle: string;
  selectedMetrics: string[];
  unit: string;
  higherIsBetter: boolean;
  dataset: GroupedBenchmarkDataset;
}

/**
 * Returns all exportable targets for a list of datasets, including both the "All Metrics Combined"
 * target and all individual sub-groups for multi-metric benchmarks, plus standalone benchmarks.
 */
export function getAllAvailableExportTargets(
  datasets: GroupedBenchmarkDataset[]
): AvailableExportTarget[] {
  const targets: AvailableExportTarget[] = [];

  for (const ds of datasets) {
    const subGroups = getSubGroupsForBenchmark(ds.benchmark_id, ds.metric_ids);
    const firstMetric = ds.metric_ids[0];
    const firstRow = ds.rows[0];
    const firstHib = firstRow?.metrics[firstMetric]?.higher_is_better ?? true;
    const defaultUnit = firstRow?.metrics[firstMetric]?.unit || "";

    if (subGroups.length > 0) {
      // 1. All Metrics Combined target
      targets.push({
        exportKey: `${ds.benchmark_id}__all`,
        benchmarkId: ds.benchmark_id,
        benchmarkName: ds.benchmark_name,
        isSubGroup: false,
        label: `${ds.benchmark_name} (All Combined)`,
        effectiveTitle: ds.benchmark_name,
        effectiveSubtitle: firstHib ? "HIGHER IS BETTER" : "LOWER IS BETTER",
        selectedMetrics: ds.metric_ids,
        unit: defaultUnit,
        higherIsBetter: firstHib,
        dataset: ds
      });

      // 2. Individual Sub-Groups
      for (const sg of subGroups) {
        const matchingMetrics = sg.metrics.filter((m) => ds.metric_ids.includes(m));
        if (matchingMetrics.length > 0) {
          targets.push({
            exportKey: `${ds.benchmark_id}__${sg.id}`,
            benchmarkId: ds.benchmark_id,
            benchmarkName: ds.benchmark_name,
            isSubGroup: true,
            subGroupId: sg.id,
            subGroupLabel: sg.label,
            titleSuffix: sg.titleSuffix,
            label: sg.label,
            effectiveTitle: `${ds.benchmark_name}${sg.titleSuffix}`,
            effectiveSubtitle: sg.subtitle,
            selectedMetrics: matchingMetrics,
            unit: sg.unit,
            higherIsBetter: sg.higherIsBetter,
            dataset: ds
          });
        }
      }
    } else {
      // Standalone benchmark without sub-groups
      const baseSub = firstHib ? "HIGHER IS BETTER" : "LOWER IS BETTER";
      targets.push({
        exportKey: ds.benchmark_id,
        benchmarkId: ds.benchmark_id,
        benchmarkName: ds.benchmark_name,
        isSubGroup: false,
        label: ds.benchmark_name,
        effectiveTitle: ds.benchmark_name,
        effectiveSubtitle: defaultUnit ? `${baseSub} (${defaultUnit})` : baseSub,
        selectedMetrics: ds.metric_ids,
        unit: defaultUnit,
        higherIsBetter: firstHib,
        dataset: ds
      });
    }
  }

  return targets;
}
