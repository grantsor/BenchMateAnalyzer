export interface MetricValue {
  metric_id: string;
  metric_display_name: string;
  unit: string;
  higher_is_better: boolean;
  value: number | null;
  raw_values?: number[];
  confidence?: number;
  status?: string;
  delta_vs_baseline?: number | null;
  pct_gain_vs_baseline?: number | null;
}

export interface GroupedRow {
  configuration_id: string;
  configuration_name: string;
  display_name: string;
  sort_order: number;
  is_baseline: boolean;
  gpu?: string;
  cpu?: string;
  motherboard?: string;
  tier_rank?: number;
  matched_model?: string;
  metrics: Record<string, MetricValue>;
}

export interface GroupedBenchmarkDataset {
  benchmark_id: string;
  benchmark_name: string;
  version?: string;
  category?: string;
  metric_ids: string[];
  rows: GroupedRow[];
}

export interface ChartHighlightOptions {
  enabled: boolean;
  highlightedConfigIds: string[];
  useHighlightBarColor: boolean;
  highlightBarColor: string;
  highlightBarGradient: string[];
  useRowBackgroundShade: boolean;
  rowShadeColor: string;
  useRowDividingLine: boolean;
  dividingLineColor: string;
  activePresetId?: string;
  useReferenceLine?: boolean;
  referenceLineValue?: number;
  referenceLineLabel?: string;
  referenceLineColor?: string;
}

export const DEFAULT_HIGHLIGHT_OPTIONS: ChartHighlightOptions = {
  enabled: false,
  highlightedConfigIds: [],
  useHighlightBarColor: false,
  highlightBarColor: "#2563eb",
  highlightBarGradient: ["#2563eb", "#60a5fa"],
  activePresetId: "excel-blue",
  useRowBackgroundShade: true,
  rowShadeColor: "rgba(37, 99, 235, 0.12)",
  useRowDividingLine: true,
  dividingLineColor: "rgba(37, 99, 235, 0.5)",
  useReferenceLine: false,
  referenceLineValue: 60,
  referenceLineLabel: "60 FPS TARGET",
  referenceLineColor: "#eab308"
};

export type ChartSortMode =
  | "gpu_hierarchy"
  | "score_desc"
  | "score_asc"
  | "alpha_asc"
  | "alpha_desc"
  | "original";

export type WithinTierSortOrder = "desc" | "asc" | "alpha" | "original";

export interface ChartDesignOptions {
  theme: "light" | "dark";
  title: string;
  subtitle: string;
  showValues: boolean;
  barColors: string[];
  fontFamily: string;
  headerFontFamily?: string;
  aspectRatio: "16:9" | "9:16" | "4:3" | "custom";
  publicationLogoText: string;
  showDecorations: boolean;
  sortOrder: "desc" | "asc" | "alpha" | "original";
  chartSortMode?: ChartSortMode;
  withinTierSortOrder?: WithinTierSortOrder;
  selectedMetrics: string[];

  selectedConfigIds: string[];
  manuallyExcludedConfigIds?: string[];
  customMetricLabels?: Record<string, string>;
  customConfigLabels?: Record<string, string>;
  customMetricColors?: Record<string, string>;
  customBenchmarkTitles?: Record<string, string>;
  labelFontSize?: number;
  gridLeftMargin?: number;
  barValuePosition?: "auto" | "inside" | "outside";
  logoUrl?: string;
  logoPosition?: "top-left" | "top-right";
  logoWidth?: number;
  logoWidth_16_9?: number;
  logoWidth_9_16?: number;
  logoAspectRatio?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  logoOffsetX_16_9?: number;
  logoOffsetY_16_9?: number;
  logoOffsetX_9_16?: number;
  logoOffsetY_9_16?: number;
  subtitleColor?: string;
  activeGradientPreset?: string;
  productName?: string;
  includeProductNameInLabels?: boolean;
  highlightOptions?: ChartHighlightOptions;
  groupBy?: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu";
  useGpuHierarchySort?: boolean;
  gpuHierarchy?: string[];
  benchmarkMode?: BenchmarkMode;
  barLayout?: "auto" | "merged" | "grouped";
}

export type BenchmarkMode = "pc" | "laptop";

export type ExportAspectRatio = "16:9" | "9:16";
export type ExportResolution = "720p" | "1080p" | "4k";
export type ExportFormat = "png" | "jpg" | "webp";

export interface ExportConfig {
  aspectRatio: ExportAspectRatio;
  resolution: ExportResolution;
  format: ExportFormat;
}

export interface CapFrameChartItem {
  label: string;
  raw_label: string;
  laptop_name?: string;
  power_profile?: string;
  power_rank?: number;
  is_laptop?: boolean;
  laptop_specs?: string;
  gpu: string;
  cpu: string;
  motherboard: string;
  api_info: string;
  resolution: string;
  game_name: string;
  run_count: number;
  metrics: {
    average_fps: number;
    p1_fps: number;
    p01_fps: number;
    median_fps: number;
    min_fps: number;
    max_fps: number;
    total_frames: number;
    total_duration_s: number;
  };
  average_fps: number;
  p1_fps: number;
  p01_fps: number;
  tier_rank?: number;
  matched_model?: string;
}

export interface CapFrameXRun {
  id: string;
  file_path: string;
  file_name: string;
  game_name: string;
  raw_game_name?: string;
  resolution: string;
  raw_comment: string;
  power_profile?: string;
  power_rank?: number;
  is_power_profile_mode?: boolean;
  is_laptop?: boolean;
  laptop_name?: string;
  laptop_specs?: string;
  laptop_power_profile_label?: string;
  gpu: string;
  raw_gpu?: string;
  cpu: string;
  raw_cpu?: string;
  motherboard?: string;
  system_ram?: string;
  gpu_driver?: string;
  api_info?: string;
  process_name?: string;
  creation_date?: string;
  metrics: {
    average_fps: number;
    p1_fps: number;
    p01_fps: number;
    median_fps: number;
    min_fps: number;
    max_fps: number;
    total_frames: number;
    total_duration_s: number;
  };
}

export interface GameProfile {
  title: string;
  sub_header: string;
  notes: string;
}

export type GameProfilesMap = Record<string, GameProfile>;

export interface CustomChartRow {
  id: string;
  label: string;
  value: number | null;
  value2?: number | null;
  gpu?: string;
  cpu?: string;
  motherboard?: string;
  tier_rank?: number;
}

export interface CustomChart {
  id: string;
  name: string;
  mode: BenchmarkMode;
  category: "temperatures" | "power" | "battery" | "custom";
  title: string;
  sub_header: string;
  unit: string;
  higher_is_better: boolean;
  metric_name: string;
  metric2_name?: string;
  metric2_unit?: string;
  rows: CustomChartRow[];
  notes?: string;
}
