import React, { useState, useEffect, useRef, useMemo } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api, GroupedBenchmarkDataset } from "../api/client";
import { BenchmarkChart, ChartDesignOptions, ChartHighlightOptions } from "../components/charts/BenchmarkChart";
import {
  BarChart3,
  Check,
  ChevronDown,
  Cpu,
  Download,
  Edit2,
  Eye,
  FileArchive,
  FolderOpen,
  HardDrive,
  Layers,
  Loader2,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Type,
  Upload,
  Zap,
  ListChecks,
  X,
  Search,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Bookmark,
  Star,
  ArrowLeftRight
} from "lucide-react";
import {
  ExportConfig,
  ExportAspectRatio,
  ExportResolution,
  ExportFormat,
  getExportDimensions,
  exportSingleChart,
  batchExportAllCharts,
  batchExportIndividualCharts,
  buildChartFileName
} from "../utils/chartExporter";
import {
  GRADIENT_PRESETS,
  samplePresetColors
} from "../utils/colorPalettes";
import { calculatePerformanceSummary } from "../utils/summaryCalculator";
import { COMPONENT_CATEGORIES } from "./Import";
import {
  BenchmarkSubGroup,
  getSubGroupsForBenchmark,
  findSubGroup,
  AvailableExportTarget,
  getAllAvailableExportTargets
} from "../utils/benchmarkSubGroups";

export interface CustomExportPreset {
  id: string;
  name: string;
  keys: string[];
}

interface SavedChartPreferences {
  productName?: string;
  productCategory?: string;
  includeCategoryTag?: boolean;
  exportPhrase?: string;
  batchExportMode?: "individual" | "zip";
  summaryReferenceConfigId?: string;
  lastSelectedBenchmarkId?: string;
  activeGradientPreset?: string;
  barColors?: string[];
  subtitleColor?: string;
  logoPosition?: "top-left" | "top-right";
  logoWidth?: number;
  logoWidth_16_9?: number;
  logoWidth_9_16?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  logoOffsetX_16_9?: number;
  logoOffsetY_16_9?: number;
  logoOffsetX_9_16?: number;
  logoOffsetY_9_16?: number;
  logoUrl?: string;
  logoAspectRatio?: number;
  isCustomLogo?: boolean;
  theme?: "light" | "dark";
  sortOrder?: "desc" | "asc" | "alpha" | "original";
  labelFontSize?: number;
  gridLeftMargin?: number;
  barValuePosition?: "auto" | "inside" | "outside";
  barValuePositionV2?: boolean;
  showValues?: boolean;
  showDecorations?: boolean;
  aspectRatio?: ExportAspectRatio;
  exportResolution?: ExportResolution;
  exportFormat?: ExportFormat;
  customBenchmarkTitles?: Record<string, string>;
  customMetricColors?: Record<string, string>;
  batchSelectedKeys?: string[];
  customExportPresets?: CustomExportPreset[];
  highlightOptions?: ChartHighlightOptions;
  selectedConfigIds?: string[];
  selectedConfigIdsByProject?: Record<string, string[]>;
  manuallyExcludedConfigIdsByProject?: Record<string, string[]>;
  lastSelectedProjectId?: string;
  scope?: "project" | "all";
  categoryFilter?: "same" | "all";
  includeProductNameInLabels?: boolean;
}

const STORAGE_KEY_PREFERENCES = "gp_benchmark_chart_preferences_v1";
const STORAGE_KEY_EXPORT_PHRASE = "gp_export_naming_phrase_v1";

function getStoredPreferences(): SavedChartPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read stored chart preferences:", err);
  }
  return {};
}

function storePreferences(prefs: SavedChartPreferences) {
  try {
    const existing = getStoredPreferences();
    const merged = { ...existing, ...prefs };
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(merged));
  } catch (err) {
    console.warn("Could not save chart preferences:", err);
  }
}


export function hexToRgba(hex: string, alpha: number = 0.15): string {
  if (!hex) return `rgba(249, 115, 22, ${alpha})`;
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.startsWith("rgba") || cleanHex.startsWith("rgb")) {
    return cleanHex;
  }
  let r = 249, g = 115, b = 22;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const DEFAULT_HIGHLIGHT_OPTIONS: ChartHighlightOptions = {
  enabled: false,
  highlightedConfigIds: [],
  useHighlightBarColor: true,
  highlightBarColor: "#f97316",
  highlightBarGradient: ["#f97316", "#ea580c"],
  activePresetId: "excel-amber",
  useRowBackgroundShade: true,
  rowShadeColor: "rgba(249, 115, 22, 0.15)",
  useRowDividingLine: true,
  dividingLineColor: "rgba(249, 115, 22, 0.6)",
  useReferenceLine: false,
  referenceLineValue: 60,
  referenceLineLabel: "60 FPS TARGET",
  referenceLineColor: "#eab308"
};

export function getPresetHighlightColors(presetId: string): [string, string] {
  switch (presetId) {
    case "excel-blue":
      return ["#2563eb", "#60a5fa"];
    case "excel-red":
      return ["#e11d48", "#f43f5e"];
    case "excel-green":
      return ["#059669", "#34d399"];
    case "excel-purple":
      return ["#7c3aed", "#c4b5fd"];
    case "excel-amber":
      return ["#f97316", "#ea580c"];
    case "excel-teal":
      return ["#0d9488", "#2dd4bf"];
    case "excel-gray":
      return ["#475569", "#94a3b8"];
    case "gp-classic":
    default:
      return ["#e63946", "#f4a261"];
  }
}

interface ComparisonBuilderProps {
  initialBenchmarkId?: string;
  onBenchmarkChange?: (benchmarkId: string) => void;
  onNavigate?: (tab: any) => void;
  isActive?: boolean;
}

export const ComparisonBuilderPage: React.FC<ComparisonBuilderProps> = ({
  initialBenchmarkId,
  onBenchmarkChange,
  onNavigate,
  isActive
}) => {
  const { currentProject, projects, selectProject, fetchProjects, refreshCurrentProject } = useProjectStore();

  const [scope, setScope] = useState<"project" | "all">(() => {
    const p = getStoredPreferences();
    return p.scope || "project";
  });
  const [categoryFilter, setCategoryFilter] = useState<"same" | "all">(() => {
    const p = getStoredPreferences();
    return p.categoryFilter || "same";
  });
  const [datasets, setDatasets] = useState<GroupedBenchmarkDataset[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(() => {
    let candidate = initialBenchmarkId;
    if (!candidate) {
      const p = getStoredPreferences();
      candidate = p.lastSelectedBenchmarkId || "";
    }
    if (candidate === "superpi_benchmark" || candidate === "wprime_benchmark") {
      return "arithmetic_benchmark";
    }
    if (candidate === "threedmark_speedway" || candidate === "threedmark_steelnomad") {
      return "threedmark_speedway_steelnomad";
    }
    return candidate;
  });
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>("all");
  const [splitSubChartsInBatch, setSplitSubChartsInBatch] = useState<boolean>(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<Set<string>>(() => {
    const p = getStoredPreferences();
    return p.batchSelectedKeys && p.batchSelectedKeys.length > 0
      ? new Set(p.batchSelectedKeys)
      : new Set();
  });
  const selectedExportKeysRef = useRef<Set<string>>(selectedExportKeys);
  selectedExportKeysRef.current = selectedExportKeys;
  const [customExportPresets, setCustomExportPresets] = useState<CustomExportPreset[]>(() => {
    const p = getStoredPreferences();
    return p.customExportPresets || [];
  });
  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [batchSearchFilter, setBatchSearchFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeImportProgress, setActiveImportProgress] = useState<{
    status: string;
    current?: number;
    total?: number;
    current_file?: string;
  } | null>(null);
  const [isAutoLoadingFolder, setIsAutoLoadingFolder] = useState(false);

  // Configuration / Model inline rename state
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingConfigName, setEditingConfigName] = useState<string>("");

  const handleSaveConfigName = async (configId: string) => {
    const newName = editingConfigName.trim();
    if (!newName) {
      setEditingConfigId(null);
      return;
    }
    try {
      await api.updateConfigName(configId, newName);

      // Update datasets in memory so chart immediately re-renders
      setDatasets((prev) =>
        prev.map((d) => ({
          ...d,
          rows: d.rows.map((row) =>
            row.configuration_id === configId
              ? { ...row, display_name: newName, model_name: newName }
              : row
          )
        }))
      );
    } catch (err: any) {
      console.error("Failed to rename configuration / model:", err);
      alert(err.message || "Failed to rename configuration / model");
    } finally {
      setEditingConfigId(null);
    }
  };

  // Default Logo Data from API
  const [defaultLogoData, setDefaultLogoData] = useState<{
    data_url: string;
    aspect_ratio: number;
    width: number;
    height: number;
  } | null>(null);

  // Export Settings State with localStorage persistence (Default: 16:9, 720p, webp)
  const [exportConfig, setExportConfig] = useState<ExportConfig>(() => {
    const p = getStoredPreferences();
    return {
      aspectRatio: (p.aspectRatio as ExportAspectRatio) || "16:9",
      resolution: (p.exportResolution as ExportResolution) || "720p",
      format: (p.exportFormat as ExportFormat) || "webp"
    };
  });

  // Active aspect-ratio profile being configured in the Publication Logo card
  const [logoConfigRatio, setLogoConfigRatio] = useState<"16:9" | "9:16">(() => {
    const p = getStoredPreferences();
    return (p.aspectRatio as "16:9" | "9:16") || "16:9";
  });

  const [activeConfigTab, setActiveConfigTab] = useState<"data" | "style" | "branding">("data");
  const [isGradientDropdownOpen, setIsGradientDropdownOpen] = useState(false);
  const gradientDropdownRef = useRef<HTMLDivElement>(null);
  const [isHighlightPresetDropdownOpen, setIsHighlightPresetDropdownOpen] = useState(false);
  const highlightPresetDropdownRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    benchmarkName: string;
  } | null>(null);

  // Product Name & Hardware Component Classification
  const [productName, setProductName] = useState<string>(() => {
    const p = getStoredPreferences();
    return p.productName || "";
  });
  const [productCategory, setProductCategory] = useState<string>(() => {
    const p = getStoredPreferences();
    return p.productCategory || currentProject?.product_category || "Laptop";
  });
  const [includeCategoryTag, setIncludeCategoryTag] = useState<boolean>(() => {
    const p = getStoredPreferences();
    return p.includeCategoryTag ?? false;
  });
  const [exportPhrase, setExportPhraseState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPORT_PHRASE);
      if (saved !== null) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    const p = getStoredPreferences();
    return typeof p.exportPhrase === "string" ? p.exportPhrase : "";
  });

  const setExportPhrase = (val: string) => {
    setExportPhraseState(val);
    try {
      localStorage.setItem(STORAGE_KEY_EXPORT_PHRASE, val);
    } catch (e) {
      console.warn("Failed to persist export phrase:", e);
    }
  };

  // Batch Export Mode: "individual" (No ZIP) or "zip"
  const [batchMode, setBatchMode] = useState<"individual" | "zip">(() => {
    const p = getStoredPreferences();
    return p.batchExportMode || "individual";
  });

  // Summary Chart Configuration State (Reference baseline profile)
  const [summaryReferenceConfigId, setSummaryReferenceConfigId] = useState<string>(() => {
    const p = getStoredPreferences();
    return p.summaryReferenceConfigId || "";
  });
  const [summaryIncludedBenchmarkIds, setSummaryIncludedBenchmarkIds] = useState<string[]>([]);
  const [isCustomLogo, setIsCustomLogo] = useState<boolean>(() => {
    return !!getStoredPreferences().isCustomLogo;
  });

  // Chart Design Options State with localStorage persistence
  const [chartOptions, setChartOptions] = useState<ChartDesignOptions>(() => {
    const p = getStoredPreferences();
    return {
      theme: p.theme || "light",
      title: "",
      subtitle: "HIGHER IS BETTER",
      subtitleColor: p.subtitleColor,
      showValues: p.showValues ?? true,
      barColors: p.barColors || ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
      fontFamily: "Inter",
      aspectRatio: p.aspectRatio || "16:9",
      publicationLogoText: "GADGET PILIPINAS",
      showDecorations: p.showDecorations ?? true,
      sortOrder: p.sortOrder || "desc",
      selectedMetrics: [],
      selectedConfigIds: p.selectedConfigIds || [],
      logoUrl: p.isCustomLogo ? p.logoUrl : (p.logoUrl || "/default_logo.png"),
      logoPosition: p.logoPosition || "top-right",
      logoWidth: p.logoWidth ?? 170,
      logoWidth_16_9: p.logoWidth_16_9 ?? 170,
      logoWidth_9_16: p.logoWidth_9_16 ?? 140,
      logoAspectRatio: p.logoAspectRatio || 2.7778,
      logoOffsetX: p.logoOffsetX ?? 12,
      logoOffsetY: p.logoOffsetY ?? 10,
      logoOffsetX_16_9: p.logoOffsetX_16_9 ?? 12,
      logoOffsetY_16_9: p.logoOffsetY_16_9 ?? 10,
      logoOffsetX_9_16: p.logoOffsetX_9_16 ?? 10,
      logoOffsetY_9_16: p.logoOffsetY_9_16 ?? 12,
      activeGradientPreset: p.activeGradientPreset !== undefined ? p.activeGradientPreset : "excel-blue",
      labelFontSize: p.labelFontSize ?? 11,
      gridLeftMargin: p.gridLeftMargin ?? (p.aspectRatio === "9:16" ? 135 : 240),
      barValuePosition: (() => {
        if (p.barValuePositionV2) {
          return p.barValuePosition || "auto";
        }
        if (p.barValuePosition === "inside") return "inside";
        return "auto";
      })(),
      customMetricColors: p.customMetricColors || {},
      customBenchmarkTitles: p.customBenchmarkTitles || {},
      productName: p.productName || "",
      includeProductNameInLabels: p.includeProductNameInLabels ?? false,
      highlightOptions: p.highlightOptions
        ? {
            ...DEFAULT_HIGHLIGHT_OPTIONS,
            ...p.highlightOptions,
            highlightedConfigIds: p.highlightOptions.highlightedConfigIds || []
          }
        : DEFAULT_HIGHLIGHT_OPTIONS
    };
  });

  // Tracking refs to manage automatic configuration checking, newly imported SSD inclusion, and project isolation
  // Tracking refs to manage automatic configuration checking, scope transitions, and project isolation
  const lastLoadedProjectIdRef = useRef<string | null>(null);
  const lastLoadedScopeRef = useRef<string | null>(null);
  const lastLoadedCategoryFilterRef = useRef<string | null>(null);
  const knownConfigIdsRef = useRef<Set<string>>(new Set());

  const getExclusionKey = () => {
    if (scope === "all") {
      return `cross_project_${categoryFilter === "same" ? (productCategory || "category") : "all"}`;
    }
    return currentProject?.id || "default";
  };

  // Tracking user manual exclusions: configurations explicitly unchecked by the user in this project/scope
  const manuallyExcludedConfigIdsRef = useRef<Set<string>>(new Set());
  const [manuallyExcludedConfigIds, setManuallyExcludedConfigIds] = useState<Set<string>>(() => {
    const prefs = getStoredPreferences();
    const projKey = getExclusionKey();
    const saved = prefs.manuallyExcludedConfigIdsByProject?.[projKey];
    const initialSet = new Set<string>(saved || []);
    manuallyExcludedConfigIdsRef.current = initialSet;
    return initialSet;
  });

  // Load saved exclusions when project, scope, or categoryFilter changes
  useEffect(() => {
    const prefs = getStoredPreferences();
    const projKey = getExclusionKey();
    const saved = prefs.manuallyExcludedConfigIdsByProject?.[projKey];
    const newSet = new Set<string>(saved || []);
    manuallyExcludedConfigIdsRef.current = newSet;
    setManuallyExcludedConfigIds(newSet);
  }, [currentProject?.id, scope, categoryFilter, productCategory]);

  // Sync currentProject name & category if available
  useEffect(() => {
    if (currentProject) {
      const projName = currentProject.product_name || currentProject.name;
      setProductName(projName);
      if (currentProject.product_category) {
        setProductCategory(currentProject.product_category);
      }
    }
  }, [currentProject?.id, currentProject?.name, currentProject?.product_name, currentProject?.product_category]);

  const toggleHighlightConfig = (configId: string) => {
    setChartOptions((prev) => {
      const cur = prev.highlightOptions || {
        enabled: true,
        highlightedConfigIds: [],
        useHighlightBarColor: true,
        highlightBarColor: "#f97316",
        highlightBarGradient: ["#f97316", "#ea580c"],
        useRowBackgroundShade: true,
        rowShadeColor: "rgba(249, 115, 22, 0.15)",
        useRowDividingLine: true,
        dividingLineColor: "rgba(249, 115, 22, 0.6)",
        useReferenceLine: false,
        referenceLineValue: 60,
        referenceLineLabel: "60 FPS TARGET",
        referenceLineColor: "#eab308"
      };
      const existing = cur.highlightedConfigIds || [];
      const isAlready = existing.includes(configId);
      const updated = isAlready ? existing.filter((id) => id !== configId) : [...existing, configId];
      return {
        ...prev,
        highlightOptions: {
          ...cur,
          enabled: true,
          highlightedConfigIds: updated
        }
      };
    });
  };

  const handleUpdateProductCategory = async (newCategory: string) => {
    setProductCategory(newCategory);
    if (currentProject?.id) {
      try {
        await api.updateProject(currentProject.id, { product_category: newCategory });
        await refreshCurrentProject();
      } catch (err) {
        console.error("Failed to update project category:", err);
      }
    }
  };

  // Sync productName with chartOptions
  useEffect(() => {
    setChartOptions((prev) => ({ ...prev, productName }));
  }, [productName]);

  // Sync selected benchmark with parent App component for session continuity
  useEffect(() => {
    if (selectedBenchmarkId && onBenchmarkChange) {
      onBenchmarkChange(selectedBenchmarkId);
    }
  }, [selectedBenchmarkId, onBenchmarkChange]);

  // Close gradient preset dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        gradientDropdownRef.current &&
        !gradientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGradientDropdownOpen(false);
      }
      if (
        highlightPresetDropdownRef.current &&
        !highlightPresetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsHighlightPresetDropdownOpen(false);
      }
    };
    if (isGradientDropdownOpen || isHighlightPresetDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGradientDropdownOpen, isHighlightPresetDropdownOpen]);

  // Automatically persist design preferences to localStorage whenever user changes them
  useEffect(() => {
    // Guard against saving uninitialized state
    if (isLoading && !currentProject?.id) {
      return;
    }
    const existingPrefs = getStoredPreferences();
    const exclusionKey = getExclusionKey();

    storePreferences({
      productName: productName || existingPrefs.productName || "",
      productCategory: productCategory || existingPrefs.productCategory || "Laptop",
      includeCategoryTag: includeCategoryTag,
      exportPhrase: exportPhrase,
      batchExportMode: batchMode,
      summaryReferenceConfigId: summaryReferenceConfigId,
      lastSelectedBenchmarkId: selectedBenchmarkId || existingPrefs.lastSelectedBenchmarkId,
      activeGradientPreset: chartOptions.activeGradientPreset,
      barColors: chartOptions.barColors,
      subtitleColor: chartOptions.subtitleColor,
      logoPosition: chartOptions.logoPosition,
      logoWidth: chartOptions.logoWidth,
      logoWidth_16_9: chartOptions.logoWidth_16_9,
      logoWidth_9_16: chartOptions.logoWidth_9_16,
      logoOffsetX: chartOptions.logoOffsetX,
      logoOffsetY: chartOptions.logoOffsetY,
      logoOffsetX_16_9: chartOptions.logoOffsetX_16_9,
      logoOffsetY_16_9: chartOptions.logoOffsetY_16_9,
      logoOffsetX_9_16: chartOptions.logoOffsetX_9_16,
      logoOffsetY_9_16: chartOptions.logoOffsetY_9_16,
      logoUrl: chartOptions.logoUrl,
      logoAspectRatio: chartOptions.logoAspectRatio,
      isCustomLogo: isCustomLogo,
      theme: chartOptions.theme,
      sortOrder: chartOptions.sortOrder,
      labelFontSize: chartOptions.labelFontSize,
      gridLeftMargin: chartOptions.gridLeftMargin,
      barValuePosition: chartOptions.barValuePosition,
      barValuePositionV2: true,
      showValues: chartOptions.showValues,
      showDecorations: chartOptions.showDecorations,
      aspectRatio: exportConfig.aspectRatio,
      exportResolution: exportConfig.resolution,
      exportFormat: exportConfig.format,
      customBenchmarkTitles: chartOptions.customBenchmarkTitles,
      customMetricColors: chartOptions.customMetricColors,
      batchSelectedKeys: selectedExportKeys.size > 0
        ? Array.from(selectedExportKeys)
        : (existingPrefs.batchSelectedKeys || []),
      customExportPresets: customExportPresets,
      highlightOptions: chartOptions.highlightOptions,
      selectedConfigIds: chartOptions.selectedConfigIds && chartOptions.selectedConfigIds.length > 0
        ? chartOptions.selectedConfigIds
        : existingPrefs.selectedConfigIds,
      selectedConfigIdsByProject: currentProject?.id && chartOptions.selectedConfigIds && chartOptions.selectedConfigIds.length > 0
        ? {
            ...(existingPrefs.selectedConfigIdsByProject || {}),
            [currentProject.id]: chartOptions.selectedConfigIds
          }
        : existingPrefs.selectedConfigIdsByProject,
      manuallyExcludedConfigIdsByProject: exclusionKey && exclusionKey !== "default"
        ? {
            ...(existingPrefs.manuallyExcludedConfigIdsByProject || {}),
            [exclusionKey]: Array.from(manuallyExcludedConfigIdsRef.current)
          }
        : existingPrefs.manuallyExcludedConfigIdsByProject,
      lastSelectedProjectId: currentProject?.id || existingPrefs.lastSelectedProjectId,
      scope: scope,
      categoryFilter: categoryFilter,
      includeProductNameInLabels: chartOptions.includeProductNameInLabels
    });
  }, [
    productName,
    productCategory,
    includeCategoryTag,
    exportPhrase,
    chartOptions.includeProductNameInLabels,
    batchMode,
    summaryReferenceConfigId,
    selectedBenchmarkId,
    selectedExportKeys,
    customExportPresets,
    scope,
    categoryFilter,
    currentProject?.id,
    chartOptions.customBenchmarkTitles,
    chartOptions.customMetricColors,
    chartOptions.activeGradientPreset,
    chartOptions.barColors,
    chartOptions.subtitleColor,
    chartOptions.logoPosition,
    chartOptions.logoWidth,
    chartOptions.logoWidth_16_9,
    chartOptions.logoWidth_9_16,
    chartOptions.logoOffsetX,
    chartOptions.logoOffsetY,
    chartOptions.logoOffsetX_16_9,
    chartOptions.logoOffsetY_16_9,
    chartOptions.logoOffsetX_9_16,
    chartOptions.logoOffsetY_9_16,
    chartOptions.logoUrl,
    chartOptions.logoAspectRatio,
    chartOptions.theme,
    chartOptions.sortOrder,
    chartOptions.labelFontSize,
    chartOptions.gridLeftMargin,
    chartOptions.barValuePosition,
    chartOptions.showValues,
    chartOptions.showDecorations,
    exportConfig.aspectRatio,
    exportConfig.resolution,
    exportConfig.format,
    chartOptions.highlightOptions,
    chartOptions.selectedConfigIds,
    manuallyExcludedConfigIds
  ]);

  // Alphabetical Benchmark Dataset sorting
  const sortedDatasets = useMemo(() => {
    if (!datasets || datasets.length === 0) return [];
    return [...datasets].sort((a, b) =>
      a.benchmark_name.localeCompare(b.benchmark_name, undefined, { sensitivity: "base", numeric: true })
    );
  }, [datasets]);

  // Load default publication logo from backend
  useEffect(() => {
    api.getDefaultLogoData()
      .then((data) => {
        setDefaultLogoData(data);
        setChartOptions((prev) => {
          const stored = getStoredPreferences();
          // If the user hasn't explicitly uploaded a custom logo, or if logoUrl is a fallback/missing,
          // ensure the full default logo data URL is set as default.
          if (!stored.isCustomLogo || !prev.logoUrl || prev.logoUrl === "/default_logo.png") {
            return {
              ...prev,
              logoUrl: data.data_url,
              logoAspectRatio: data.aspect_ratio || 2.7778
            };
          }
          return {
            ...prev,
            logoAspectRatio: prev.logoAspectRatio || data.aspect_ratio || 2.7778
          };
        });
      })
      .catch((err) => {
        console.warn("Could not load default logo:", err);
      });
  }, []);

  const loadDatasets = async (
    targetProjId?: string,
    scopeOverride?: "project" | "all",
    categoryFilterOverride?: "same" | "all"
  ) => {
    const activeScope = scopeOverride || scope;
    const activeCategoryFilter = categoryFilterOverride || categoryFilter;
    setIsLoading(true);
    try {
      const pId = targetProjId || currentProject?.id;
      if (!pId) {
        setIsLoading(false);
        return;
      }
      const catParam = activeCategoryFilter === "same" ? (productCategory || currentProject?.product_category || undefined) : undefined;
      const data = await api.getGroupedResults(pId, undefined, "best", undefined, activeScope, catParam);
      setDatasets(data);
      if (data.length > 0) {
        const stored = getStoredPreferences().lastSelectedBenchmarkId;
        let candidateId = initialBenchmarkId || stored || selectedBenchmarkId;
        if (candidateId === "superpi_benchmark" || candidateId === "wprime_benchmark") {
          candidateId = "arithmetic_benchmark";
        } else if (candidateId === "threedmark_speedway" || candidateId === "threedmark_steelnomad") {
          candidateId = "threedmark_speedway_steelnomad";
        }
        const targetId = (candidateId && (candidateId === "summary_relative_performance" || data.some(d => d.benchmark_id === candidateId)))
          ? candidateId
          : data[0].benchmark_id;
        setSelectedBenchmarkId(targetId);
      } else {
        setSelectedBenchmarkId("");
      }
    } catch (err) {
      console.error("Failed to load grouped results:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && currentProject?.id) {
      loadDatasets(currentProject.id);
    }
  }, [isActive]);

  useEffect(() => {
    if (!currentProject?.id) return;
    loadDatasets(currentProject.id);

    let isMounted = true;
    let pollTimer: any = null;

    // Check if background extraction is in progress and auto-refresh on completion
    const checkImportStatus = async () => {
      try {
        const prog = await api.getImportProgress(currentProject.id);
        if (!isMounted) return;
        if (prog.status === "processing") {
          setActiveImportProgress(prog);
          pollTimer = setInterval(async () => {
            try {
              const updated = await api.getImportProgress(currentProject.id);
              if (!isMounted) return;
              setActiveImportProgress(updated);
              if (updated.status === "completed") {
                clearInterval(pollTimer);
                pollTimer = null;
                setActiveImportProgress(null);
                await loadDatasets(currentProject.id);
              } else if (updated.status === "failed") {
                clearInterval(pollTimer);
                pollTimer = null;
                setActiveImportProgress(null);
              }
            } catch {}
          }, 1000);
        } else {
          setActiveImportProgress(null);
        }
      } catch {}
    };

    checkImportStatus();

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [currentProject?.id, initialBenchmarkId]);

  const handleAutoLoadFolder = async () => {
    setIsAutoLoadingFolder(true);
    try {
      const res = await api.browseFolder();
      if (!res.cancelled && res.folder_path) {
        const folder = res.folder_path;
        const baseName = folder.trim().replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "Benchmark Review";
        let targetProj = currentProject;
        if (!targetProj) {
          const existing = projects.find((p) => p.name.toLowerCase() === baseName.toLowerCase());
          if (existing) {
            targetProj = existing;
            await selectProject(existing.id);
          } else {
            const created = await api.createProject({
              name: baseName,
              product_name: baseName,
              product_category: "Laptop"
            });
            await fetchProjects();
            await selectProject(created.id);
            targetProj = created;
          }
        }

        // Immediately trigger background import into project
        await api.startImport(targetProj.id, folder, baseName);
        setActiveImportProgress({ status: "processing", current: 0, total: 0 });
      }
    } catch (err: any) {
      alert("Failed to auto-load review folder: " + err.message);
    } finally {
      setIsAutoLoadingFolder(false);
    }
  };

  const isSummaryActive = selectedBenchmarkId === "summary_relative_performance";

  const summaryResult = useMemo(() => {
    if (datasets.length === 0) return null;
    return calculatePerformanceSummary(
      datasets,
      summaryReferenceConfigId,
      summaryIncludedBenchmarkIds.length > 0 ? summaryIncludedBenchmarkIds : undefined
    );
  }, [datasets, summaryReferenceConfigId, summaryIncludedBenchmarkIds]);

  const activeDataset = isSummaryActive
    ? summaryResult?.summaryDataset || datasets[0]
    : datasets.find((d) => d.benchmark_id === selectedBenchmarkId) || datasets[0];

  // When active dataset changes, initialize options for that dataset while preserving user design preferences
  useEffect(() => {
    if (activeDataset) {
      const firstRow = activeDataset.rows[0];
      const firstMetricKey = activeDataset.metric_ids[0];
      const hib = firstRow?.metrics[firstMetricKey]?.higher_is_better ?? true;
      const unit = firstRow?.metrics[firstMetricKey]?.unit || "";
      const refName = summaryResult?.referenceConfigName || "Reference";
      const defaultSub = isSummaryActive
        ? `HIGHER IS BETTER (BASELINE: ${refName.toUpperCase()} = 100%)`
        : hib
        ? (unit ? `HIGHER IS BETTER (${unit})` : "HIGHER IS BETTER")
        : (unit ? `LOWER IS BETTER (${unit})` : "LOWER IS BETTER");

      setChartOptions((prev) => {
        let updatedBarColors = prev.barColors;
        let updatedCustomColors = { ...(prev.customMetricColors || {}) };

        // If an Excel gradient preset is active, dynamically scale and sample across active dataset metrics
        if (prev.activeGradientPreset) {
          const preset = GRADIENT_PRESETS.find((p) => p.id === prev.activeGradientPreset);
          if (preset) {
            const sampled = samplePresetColors(preset.colors, activeDataset.metric_ids.length);
            updatedBarColors = sampled;
            activeDataset.metric_ids.forEach((mId, idx) => {
              updatedCustomColors[mId] = sampled[idx % sampled.length];
            });
          }
        }

        const savedCustomTitle =
          prev.customBenchmarkTitles?.[activeDataset.benchmark_id] ||
          getStoredPreferences().customBenchmarkTitles?.[activeDataset.benchmark_id];
        let effectiveTitle = isSummaryActive
          ? "Overall Performance Summary"
          : savedCustomTitle || activeDataset.benchmark_name;
        let effectiveSubtitle = defaultSub;
        let resolvedMetrics = activeDataset.metric_ids;

        // Check Batch Export Checklist preference for this benchmark
        const bSubGroups = getSubGroupsForBenchmark(activeDataset.benchmark_id, activeDataset.metric_ids);
        if (bSubGroups.length > 0 && !isSummaryActive) {
          const exportKeys = selectedExportKeysRef.current;
          const allKey = `${activeDataset.benchmark_id}__all`;
          const isAllChecked = exportKeys.has(allKey);

          if (!isAllChecked) {
            // Find first checked sub-group for this benchmark
            const firstCheckedSubGroup = bSubGroups.find((sg) =>
              exportKeys.has(`${activeDataset.benchmark_id}__${sg.id}`)
            );
            if (firstCheckedSubGroup) {
              const matchingMetrics = firstCheckedSubGroup.metrics.filter((m) =>
                activeDataset.metric_ids.includes(m)
              );
              if (matchingMetrics.length > 0) {
                resolvedMetrics = matchingMetrics;
                effectiveTitle = `${effectiveTitle}${firstCheckedSubGroup.titleSuffix}`;
                effectiveSubtitle = firstCheckedSubGroup.subtitle;
                setSelectedSubGroupId(firstCheckedSubGroup.id);
              }
            } else {
              setSelectedSubGroupId("all");
            }
          } else {
            setSelectedSubGroupId("all");
          }
        } else {
          setSelectedSubGroupId("all");
        }

        return {
          ...prev,
          title: effectiveTitle,
          subtitle: effectiveSubtitle,
          selectedMetrics: resolvedMetrics,
          sortOrder: prev.sortOrder === "original" || prev.sortOrder === "alpha"
            ? prev.sortOrder
            : hib ? "desc" : "asc",
          selectedConfigIds: (() => {
            const allRowIds = activeDataset.rows.map((r) => r.configuration_id);
            const prefs = getStoredPreferences();
            const isProjectChange = lastLoadedProjectIdRef.current !== (currentProject?.id || null);
            const isScopeChange = lastLoadedScopeRef.current !== scope || lastLoadedCategoryFilterRef.current !== categoryFilter;

            let excludedSet = manuallyExcludedConfigIdsRef.current;

            if (isProjectChange || isScopeChange) {
              const projKey = getExclusionKey();
              const savedExcluded = prefs.manuallyExcludedConfigIdsByProject?.[projKey];
              if (savedExcluded && savedExcluded.length > 0) {
                excludedSet = new Set(savedExcluded);
              } else if (currentProject?.id && prefs.selectedConfigIdsByProject?.[currentProject.id]?.length) {
                const savedSelected = new Set(prefs.selectedConfigIdsByProject[currentProject.id]);
                excludedSet = new Set(allRowIds.filter((id) => !savedSelected.has(id)));
              } else {
                excludedSet = new Set();
              }
              manuallyExcludedConfigIdsRef.current = excludedSet;
              setManuallyExcludedConfigIds(excludedSet);
            }

            let resolvedConfigIds = allRowIds.filter((id) => !excludedSet.has(id));

            if (resolvedConfigIds.length === 0 && allRowIds.length > 0) {
              resolvedConfigIds = [allRowIds[0]];
            }

            allRowIds.forEach((id) => knownConfigIdsRef.current.add(id));
            lastLoadedProjectIdRef.current = currentProject?.id || null;
            lastLoadedScopeRef.current = scope;
            lastLoadedCategoryFilterRef.current = categoryFilter;

            return resolvedConfigIds;
          })(),
          manuallyExcludedConfigIds: Array.from(manuallyExcludedConfigIdsRef.current),
          customConfigLabels: prev.customConfigLabels || {},
          customMetricLabels: prev.customMetricLabels || {},
          customMetricColors: updatedCustomColors,
          barColors: updatedBarColors
        };
      });
    }
  }, [
    activeDataset?.benchmark_id,
    currentProject?.id,
    scope,
    categoryFilter,
    activeDataset?.rows.map((r) => r.configuration_id).join(","),
    isSummaryActive,
    summaryResult?.referenceConfigName
  ]);

  const availableSubGroups = useMemo(() => {
    if (!activeDataset || isSummaryActive) return [];
    return getSubGroupsForBenchmark(activeDataset.benchmark_id, activeDataset.metric_ids);
  }, [activeDataset?.benchmark_id, activeDataset?.metric_ids, isSummaryActive]);

  const handleSelectSubGroup = (subGroupId: string) => {
    setSelectedSubGroupId(subGroupId);
    if (!activeDataset) return;

    if (subGroupId === "all") {
      const firstRow = activeDataset.rows[0];
      const firstMetricKey = activeDataset.metric_ids[0];
      const hib = firstRow?.metrics[firstMetricKey]?.higher_is_better ?? true;
      const savedCustomTitle =
        chartOptions.customBenchmarkTitles?.[activeDataset.benchmark_id] ||
        getStoredPreferences().customBenchmarkTitles?.[activeDataset.benchmark_id];
      const effectiveTitle = isSummaryActive
        ? "Overall Performance Summary"
        : savedCustomTitle || activeDataset.benchmark_name;

      setChartOptions((prev) => {
        let updatedBarColors = prev.barColors;
        let updatedCustomColors = { ...(prev.customMetricColors || {}) };

        if (prev.activeGradientPreset) {
          const preset = GRADIENT_PRESETS.find((p) => p.id === prev.activeGradientPreset);
          if (preset) {
            const sampled = samplePresetColors(preset.colors, activeDataset.metric_ids.length);
            updatedBarColors = sampled;
            activeDataset.metric_ids.forEach((mId, idx) => {
              updatedCustomColors[mId] = sampled[idx % sampled.length];
            });
          }
        }

        return {
          ...prev,
          title: effectiveTitle,
          subtitle: hib ? "HIGHER IS BETTER" : "LOWER IS BETTER",
          selectedMetrics: activeDataset.metric_ids,
          sortOrder: prev.sortOrder === "original" || prev.sortOrder === "alpha"
            ? prev.sortOrder
            : hib ? "desc" : "asc",
          barColors: updatedBarColors,
          customMetricColors: updatedCustomColors
        };
      });
    } else {
      const sg = findSubGroup(activeDataset.benchmark_id, subGroupId);
      if (sg) {
        const matchingMetrics = sg.metrics.filter((m) => activeDataset.metric_ids.includes(m));
        const activeM = matchingMetrics.length > 0 ? matchingMetrics : sg.metrics;

        setChartOptions((prev) => {
          let updatedBarColors = prev.barColors;
          let updatedCustomColors = { ...(prev.customMetricColors || {}) };

          if (prev.activeGradientPreset) {
            const preset = GRADIENT_PRESETS.find((p) => p.id === prev.activeGradientPreset);
            if (preset) {
              const sampled = samplePresetColors(preset.colors, activeM.length);
              updatedBarColors = sampled;
              activeM.forEach((mId, idx) => {
                updatedCustomColors[mId] = sampled[idx % sampled.length];
              });
            }
          }

          return {
            ...prev,
            title: `${activeDataset.benchmark_name}${sg.titleSuffix}`,
            subtitle: sg.subtitle,
            selectedMetrics: activeM,
            sortOrder: sg.higherIsBetter ? "desc" : "asc",
            barColors: updatedBarColors,
            customMetricColors: updatedCustomColors
          };
        });
      }
    }
  };

  const toggleMetric = (metricId: string) => {
    setChartOptions((prev) => {
      const exists = prev.selectedMetrics.includes(metricId);
      let updated: string[];
      if (exists) {
        updated = prev.selectedMetrics.filter((id) => id !== metricId);
      } else {
        // Keep canonical order from activeDataset.metric_ids
        updated = activeDataset.metric_ids.filter(
          (id) => prev.selectedMetrics.includes(id) || id === metricId
        );
      }
      const newSelectedMetrics = updated.length > 0 ? updated : [metricId];

      let updatedCustomColors = { ...(prev.customMetricColors || {}) };
      let updatedBarColors = prev.barColors;

      // If an Excel gradient preset is active, dynamically scale and re-sample across active metrics
      if (prev.activeGradientPreset) {
        const preset = GRADIENT_PRESETS.find((p) => p.id === prev.activeGradientPreset);
        if (preset) {
          const sampled = samplePresetColors(preset.colors, newSelectedMetrics.length);
          updatedBarColors = sampled;
          newSelectedMetrics.forEach((mId, idx) => {
            updatedCustomColors[mId] = sampled[idx % sampled.length];
          });
        }
      }

      return {
        ...prev,
        selectedMetrics: newSelectedMetrics,
        customMetricColors: updatedCustomColors,
        barColors: updatedBarColors
      };
    });
  };

  const handleSelectGradientPreset = (presetId: string) => {
    const preset = GRADIENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const activeCount = chartOptions.selectedMetrics.length || activeDataset.metric_ids.length;
    const sampled = samplePresetColors(preset.colors, activeCount);

    const newCustomColors = { ...(chartOptions.customMetricColors || {}) };
    chartOptions.selectedMetrics.forEach((mId, idx) => {
      newCustomColors[mId] = sampled[idx % sampled.length];
    });

    setChartOptions((prev) => ({
      ...prev,
      activeGradientPreset: presetId,
      barColors: sampled,
      customMetricColors: newCustomColors
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        setIsCustomLogo(true);
        setChartOptions((prev) => ({
          ...prev,
          logoUrl: result,
          logoAspectRatio: Math.round(aspect * 10000) / 10000
        }));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultLogo = () => {
    setIsCustomLogo(false);
    if (defaultLogoData) {
      setChartOptions((prev) => ({
        ...prev,
        logoUrl: defaultLogoData.data_url,
        logoAspectRatio: defaultLogoData.aspect_ratio || 2.7778
      }));
    } else {
      setChartOptions((prev) => ({
        ...prev,
        logoUrl: "/default_logo.png",
        logoAspectRatio: 2.7778
      }));
    }
  };

  const handleAspectRatioChange = (ratio: ExportAspectRatio) => {
    setExportConfig((prev) => ({ ...prev, aspectRatio: ratio }));
    setLogoConfigRatio(ratio === "9:16" ? "9:16" : "16:9");
    setChartOptions((prev) => ({
      ...prev,
      aspectRatio: ratio,
      gridLeftMargin: ratio === "9:16" ? 135 : 240
    }));
  };

  const handleExportSingle = async () => {
    if (!activeDataset) return;
    setIsExporting(true);
    try {
      await exportSingleChart(
        activeDataset,
        chartOptions,
        exportConfig,
        productName,
        undefined,
        productCategory,
        includeCategoryTag,
        exportPhrase
      );
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export chart image.");
    } finally {
      setIsExporting(false);
    }
  };

  const allAvailableTargets = useMemo(() => {
    return getAllAvailableExportTargets(datasets);
  }, [datasets]);

  // Group available export targets by benchmarkId
  const groupedTargets = useMemo(() => {
    const map = new Map<string, {
      benchmarkId: string;
      benchmarkName: string;
      hasSubGroups: boolean;
      items: AvailableExportTarget[];
    }>();

    for (const t of allAvailableTargets) {
      if (!map.has(t.benchmarkId)) {
        map.set(t.benchmarkId, {
          benchmarkId: t.benchmarkId,
          benchmarkName: t.benchmarkName,
          hasSubGroups: false,
          items: []
        });
      }
      const group = map.get(t.benchmarkId)!;
      if (t.isSubGroup) {
        group.hasSubGroups = true;
      }
      group.items.push(t);
    }

    return Array.from(map.values());
  }, [allAvailableTargets]);

  // Initialize selection with stored keys if available, otherwise Split Sub-Charts Only by default
  useEffect(() => {
    if (allAvailableTargets.length > 0 && selectedExportKeys.size === 0) {
      const stored = getStoredPreferences();
      if (stored.batchSelectedKeys && stored.batchSelectedKeys.length > 0) {
        const availableKeySet = new Set(allAvailableTargets.map((t) => t.exportKey));
        const validStoredKeys = stored.batchSelectedKeys.filter((k) => availableKeySet.has(k));
        if (validStoredKeys.length > 0) {
          setSelectedExportKeys(new Set(validStoredKeys));
          return;
        }
      }

      const defaultKeys = new Set<string>();
      const benchmarkIdsWithSubGroups = new Set(
        allAvailableTargets.filter((t) => t.isSubGroup).map((t) => t.benchmarkId)
      );

      for (const t of allAvailableTargets) {
        if (benchmarkIdsWithSubGroups.has(t.benchmarkId)) {
          if (t.isSubGroup) {
            defaultKeys.add(t.exportKey);
          }
        } else {
          defaultKeys.add(t.exportKey);
        }
      }
      setSelectedExportKeys(defaultKeys);
    }
  }, [allAvailableTargets]);

  const handleSaveCustomPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      alert("Please enter a name for your preset.");
      return;
    }
    if (selectedExportKeys.size === 0) {
      alert("Please select at least one benchmark/sub-chart to save in this preset.");
      return;
    }
    const newPreset: CustomExportPreset = {
      id: "preset_" + Date.now(),
      name: trimmed,
      keys: Array.from(selectedExportKeys)
    };
    const updated = [
      ...customExportPresets.filter((p) => p.name.toLowerCase() !== trimmed.toLowerCase()),
      newPreset
    ];
    setCustomExportPresets(updated);
    setNewPresetName("");
    setIsCreatingPreset(false);
  };

  const handleApplyCustomPreset = (preset: CustomExportPreset) => {
    const availableKeySet = new Set(allAvailableTargets.map((t) => t.exportKey));
    const matching = preset.keys.filter((k) => availableKeySet.has(k));
    if (matching.length > 0) {
      setSelectedExportKeys(new Set(matching));
    } else {
      setSelectedExportKeys(new Set(preset.keys));
    }
  };

  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomExportPresets((prev) => prev.filter((p) => p.id !== presetId));
  };

  const selectAllTargets = () => {
    const allKeys = new Set(allAvailableTargets.map((t) => t.exportKey));
    setSelectedExportKeys(allKeys);
  };

  const deselectAllTargets = () => {
    setSelectedExportKeys(new Set());
  };

  const selectSubChartsOnly = () => {
    const keys = new Set<string>();
    const benchmarkIdsWithSubGroups = new Set(
      allAvailableTargets.filter((t) => t.isSubGroup).map((t) => t.benchmarkId)
    );
    for (const t of allAvailableTargets) {
      if (benchmarkIdsWithSubGroups.has(t.benchmarkId)) {
        if (t.isSubGroup) keys.add(t.exportKey);
      } else {
        keys.add(t.exportKey);
      }
    }
    setSelectedExportKeys(keys);
  };

  const selectCombinedOnly = () => {
    const keys = new Set<string>();
    const benchmarkIdsWithSubGroups = new Set(
      allAvailableTargets.filter((t) => t.isSubGroup).map((t) => t.benchmarkId)
    );
    for (const t of allAvailableTargets) {
      if (benchmarkIdsWithSubGroups.has(t.benchmarkId)) {
        if (!t.isSubGroup && t.exportKey.endsWith("__all")) keys.add(t.exportKey);
      } else {
        keys.add(t.exportKey);
      }
    }
    setSelectedExportKeys(keys);
  };

  const toggleTarget = (key: string) => {
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleGroupTargets = (items: AvailableExportTarget[]) => {
    const allSelected = items.every((item) => selectedExportKeys.has(item.exportKey));
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((item) => next.delete(item.exportKey));
      } else {
        items.forEach((item) => next.add(item.exportKey));
      }
      return next;
    });
  };

  const handleExecuteBatchExport = async () => {
    const selectedTargets = allAvailableTargets.filter((t) =>
      selectedExportKeys.has(t.exportKey)
    );
    if (selectedTargets.length === 0) {
      alert("Please select at least one chart to export.");
      return;
    }

    setIsExporting(true);
    setExportProgress({
      current: 0,
      total: selectedTargets.length,
      benchmarkName: "Starting batch..."
    });

    try {
      if (batchMode === "individual") {
        await batchExportIndividualCharts(
          selectedTargets,
          chartOptions,
          exportConfig,
          productName,
          (current, total, benchmarkName) => {
            setExportProgress({ current, total, benchmarkName });
          },
          productCategory,
          includeCategoryTag,
          true,
          exportPhrase
        );
      } else {
        await batchExportAllCharts(
          selectedTargets,
          chartOptions,
          exportConfig,
          productName,
          (current, total, benchmarkName) => {
            setExportProgress({ current, total, benchmarkName });
          },
          productCategory,
          includeCategoryTag,
          true,
          exportPhrase
        );
      }
      setTimeout(() => {
        setIsBatchModalOpen(false);
      }, 500);
    } catch (err) {
      console.error("Batch export error:", err);
      alert("Failed to complete batch export.");
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const toggleConfig = (configId: string) => {
    setChartOptions((prev) => {
      const isCurrentlyChecked = prev.selectedConfigIds.includes(configId);
      if (isCurrentlyChecked && prev.selectedConfigIds.length <= 1) {
        return prev;
      }
      const updated = isCurrentlyChecked
        ? prev.selectedConfigIds.filter((id) => id !== configId)
        : [...prev.selectedConfigIds, configId];

      const nextExcluded = new Set(manuallyExcludedConfigIdsRef.current);
      if (isCurrentlyChecked) {
        nextExcluded.add(configId);
      } else {
        nextExcluded.delete(configId);
      }
      manuallyExcludedConfigIdsRef.current = nextExcluded;
      setManuallyExcludedConfigIds(nextExcluded);

      return {
        ...prev,
        selectedConfigIds: updated,
        manuallyExcludedConfigIds: Array.from(nextExcluded)
      };
    });
  };

  const handleValueChange = (configId: string, metricId: string, newVal: number) => {
    setDatasets((prev) =>
      prev.map((ds) => {
        if (ds.benchmark_id !== selectedBenchmarkId) return ds;
        return {
          ...ds,
          rows: ds.rows.map((r) => {
            if (r.configuration_id !== configId) return r;
            const existingMetric = r.metrics[metricId];
            return {
              ...r,
              metrics: {
                ...r.metrics,
                [metricId]: {
                  ...existingMetric,
                  value: newVal
                }
              }
            };
          })
        };
      })
    );
  };

  const handleConfigLabelChange = (configId: string, newLabel: string) => {
    setChartOptions((prev) => ({
      ...prev,
      customConfigLabels: {
        ...(prev.customConfigLabels || {}),
        [configId]: newLabel
      }
    }));
  };

  const handleMetricLabelChange = (metricId: string, newLabel: string) => {
    setChartOptions((prev) => ({
      ...prev,
      customMetricLabels: {
        ...(prev.customMetricLabels || {}),
        [metricId]: newLabel
      }
    }));
  };

  const handleColorChange = (index: number, newColor: string) => {
    setChartOptions((prev) => {
      const colors = [...prev.barColors];
      colors[index] = newColor;
      const updatedCustom = { ...(prev.customMetricColors || {}) };
      if (prev.selectedMetrics[index]) {
        updatedCustom[prev.selectedMetrics[index]] = newColor;
      }
      return { ...prev, barColors: colors, customMetricColors: updatedCustom };
    });
  };

  const handleResetAllPreferences = () => {
    if (confirm("Reset all chart visual settings and preferences back to default?")) {
      try {
        localStorage.removeItem(STORAGE_KEY_PREFERENCES);
      } catch (err) {
        console.warn("Error clearing stored preferences:", err);
      }
      setExportConfig({
        aspectRatio: "16:9",
        resolution: "720p",
        format: "webp"
      });
      setProductName(currentProject?.name || "Product");
      setBatchMode("individual");
      setManuallyExcludedConfigIds(new Set());
      manuallyExcludedConfigIdsRef.current = new Set();
      setIsCustomLogo(false);
      setChartOptions((prev) => ({
        ...prev,
        theme: "light",
        subtitleColor: undefined,
        showValues: true,
        barColors: ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
        aspectRatio: "16:9",
        showDecorations: true,
        sortOrder: "desc",
        logoPosition: "top-right",
        logoWidth: 170,
        logoWidth_16_9: 170,
        logoWidth_9_16: 140,
        logoOffsetX: 12,
        logoOffsetY: 10,
        logoOffsetX_16_9: 12,
        logoOffsetY_16_9: 10,
        logoOffsetX_9_16: 10,
        logoOffsetY_9_16: 12,
        activeGradientPreset: "excel-blue",
        labelFontSize: 11,
        gridLeftMargin: 240,
        barValuePosition: "auto",
        customMetricColors: {},
        logoUrl: defaultLogoData?.data_url || "/default_logo.png",
        logoAspectRatio: defaultLogoData?.aspect_ratio || 2.7778,
        productName: currentProject?.name || "Product",
        includeProductNameInLabels: false
      }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-white">Comparison Chart Builder</h2>
            {/* Data Source Switcher: Configurations vs SSD Master Database */}
            {/* Scope Switcher: This Project vs All Scanned Models */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-brand-surface border border-brand-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setScope("project");
                  loadDatasets(undefined, "project", categoryFilter);
                }}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  scope === "project"
                    ? "bg-brand-card text-white shadow-sm border border-brand-border/70"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-brand-red" />
                <span>This Project</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  loadDatasets(undefined, "all", categoryFilter);
                }}
                className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  scope === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Scanned Models</span>
              </button>
            </div>

            {/* Category Filter when in All Scanned Models mode */}
            {scope === "all" && (
              <div className="flex items-center gap-1 bg-brand-surface/90 border border-brand-border rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("same");
                    loadDatasets(undefined, "all", "same");
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-medium transition ${
                    categoryFilter === "same"
                      ? "bg-indigo-700 text-white font-bold shadow-sm border border-indigo-600"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Same Category ({productCategory || "Category"})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    loadDatasets(undefined, "all", "all");
                  }}
                  className={`px-2.5 py-0.5 rounded-lg font-medium transition ${
                    categoryFilter === "all"
                      ? "bg-indigo-700 text-white font-bold shadow-sm border border-indigo-600"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Categories
                </button>
              </div>
            )}

            {/* Component Category Badge with Inline Switcher */}
            <div className="relative group">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border cursor-pointer transition ${
                  COMPONENT_CATEGORIES.find(
                    (c) => c.id.toLowerCase() === productCategory.toLowerCase()
                  )?.badgeBg || "bg-brand-border text-slate-300 border-brand-border"
                }`}
              >
                <span>
                  {COMPONENT_CATEGORIES.find(
                    (c) => c.id.toLowerCase() === productCategory.toLowerCase()
                  )?.icon || "💻"}
                </span>
                <span>{productCategory}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </span>
              <select
                value={productCategory}
                onChange={(e) => handleUpdateProductCategory(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Click to switch PC component classification"
              >
                {COMPONENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven benchmark comparison chart engine matching the Gadget Pilipinas design reference.
          </p>
        </div>

        {/* Active Project Switcher Widget */}
        <div className="flex items-center space-x-3 bg-brand-card/90 border border-brand-border px-4 py-2 rounded-2xl shadow-md">
          <Cpu className="w-4 h-4 text-brand-red shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Project</span>
            {projects.length > 0 ? (
              <select
                value={currentProject?.id || ""}
                onChange={async (e) => {
                  const newId = e.target.value;
                  await selectProject(newId);
                  loadDatasets(newId, scope, categoryFilter);
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1 max-w-[220px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-brand-card text-white">
                    {p.name} {p.product_name ? `(${p.product_name})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400 italic">No project active</span>
            )}
          </div>
          {currentProject?.id && (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Re-scan and re-evaluate all screenshots in "${currentProject.name}" using the latest parsers?`)) {
                  try {
                    await api.reprocessProject(currentProject.id);
                    setActiveImportProgress({ status: "processing", current: 0, total: 0 });
                  } catch (err: any) {
                    alert("Failed to start reprocessing: " + err.message);
                  }
                }
              }}
              title="Re-scan and re-evaluate all screenshots with latest benchmark parsers"
              className="p-1.5 rounded-lg bg-brand-surface hover:bg-slate-700 text-slate-400 hover:text-white transition border border-brand-border/60 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {activeImportProgress && activeImportProgress.status === "processing" ? (
        <div className="text-center py-20 px-6 bg-brand-card/80 rounded-3xl border border-brand-red/40 max-w-xl mx-auto space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center mx-auto shadow-inner">
            <Loader2 className="w-7 h-7 text-brand-red animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">
              Auto-Extracting Benchmark Scores for "{currentProject?.name || "Project"}"
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              RapidOCR is scanning and extracting scores from screenshots. Graphs will automatically render here as soon as extraction finishes!
            </p>
          </div>
          {activeImportProgress.total && activeImportProgress.total > 0 ? (
            <div className="space-y-2 max-w-md mx-auto pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  Progress: {activeImportProgress.current} / {activeImportProgress.total} screenshots
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {Math.round(((activeImportProgress.current || 0) / (activeImportProgress.total || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-brand-surface rounded-full overflow-hidden border border-brand-border p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-brand-red to-rose-500 rounded-full transition-all duration-300 shadow-md shadow-rose-900/40"
                  style={{
                    width: `${Math.round(((activeImportProgress.current || 0) / (activeImportProgress.total || 1)) * 100)}%`
                  }}
                />
              </div>
              {activeImportProgress.current_file && (
                <p className="text-[11px] text-slate-400 font-mono truncate pt-1">
                  Analyzing: {activeImportProgress.current_file}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Initializing neural OCR scanner...</p>
          )}
        </div>
      ) : isLoading ? (
        <div className="text-center py-24 bg-brand-card/40 rounded-3xl border border-brand-border/60 space-y-4">
          <Loader2 className="w-10 h-10 text-brand-red animate-spin mx-auto" />
          <h3 className="text-base font-bold text-white">Loading Benchmark Comparison Data...</h3>
          <p className="text-xs text-slate-400">Fetching extracted scores and configurations for {currentProject?.name || "active project"}</p>
        </div>
      ) : activeDataset && datasets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Controls Column */}
          <div className="lg:col-span-4 space-y-5">
            {/* CARD 1: INCLUDED CONFIGURATIONS & HIGHLIGHT */}
            <div className="bg-brand-card rounded-3xl border border-brand-border p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-brand-border pb-2.5">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-brand-red" />
                  <span>Included Configurations</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const rows = isSummaryActive && summaryResult ? summaryResult.summaryDataset.rows : activeDataset?.rows || [];
                      const allIds = rows.map((r) => r.configuration_id);
                      const emptySet = new Set<string>();
                      setManuallyExcludedConfigIds(emptySet);
                      manuallyExcludedConfigIdsRef.current = emptySet;
                      setChartOptions((prev) => ({
                        ...prev,
                        selectedConfigIds: allIds,
                        manuallyExcludedConfigIds: []
                      }));
                    }}
                    className="text-brand-red hover:underline font-semibold"
                  >
                    All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const rows = isSummaryActive && summaryResult ? summaryResult.summaryDataset.rows : activeDataset?.rows || [];
                      if (rows.length > 0) {
                        const keepId = rows[0].configuration_id;
                        const toExclude = rows.slice(1).map((r) => r.configuration_id);
                        const nextExcluded = new Set(manuallyExcludedConfigIdsRef.current);
                        toExclude.forEach((id) => nextExcluded.add(id));
                        nextExcluded.delete(keepId);
                        setManuallyExcludedConfigIds(nextExcluded);
                        manuallyExcludedConfigIdsRef.current = nextExcluded;
                        setChartOptions((prev) => ({
                          ...prev,
                          selectedConfigIds: [keepId],
                          manuallyExcludedConfigIds: Array.from(nextExcluded)
                        }));
                      }
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Include Product Name in Bar Labels Toggle */}
              <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-brand-surface/70 border border-brand-border/60 hover:border-brand-border cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={chartOptions.includeProductNameInLabels ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setChartOptions((prev) => ({
                      ...prev,
                      includeProductNameInLabels: checked
                    }));
                  }}
                  className="accent-brand-red w-4 h-4 rounded shrink-0 cursor-pointer"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Include Product Name in Labels</span>
                    {chartOptions.includeProductNameInLabels && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-red/20 text-rose-300 font-mono">ACTIVE</span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    Prefix bars: <span className="text-slate-300 font-mono font-medium">{productName || "Product"} - Profile</span>
                  </span>
                </div>
              </label>

              {/* Configurations List with Checkboxes & Star Highlighting */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {(isSummaryActive && summaryResult ? summaryResult.summaryDataset.rows : activeDataset?.rows || []).map((r) => {
                  const isChecked = chartOptions.selectedConfigIds.includes(r.configuration_id);
                  const isHighlighted =
                    chartOptions.highlightOptions?.enabled &&
                    chartOptions.highlightOptions.highlightedConfigIds?.includes(r.configuration_id);
                  const isRef = isSummaryActive && summaryResult && r.configuration_id === summaryResult.referenceConfigId;

                  return (
                    <div
                      key={r.configuration_id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                        isHighlighted
                          ? "bg-amber-500/10 border-amber-500/40"
                          : isRef
                          ? "bg-brand-red/10 border-brand-red/40"
                          : isChecked
                          ? "bg-brand-surface border-brand-border/60 hover:border-slate-500"
                          : "bg-brand-surface/40 border-brand-border/30 opacity-50 hover:opacity-75"
                      }`}
                    >
                      {editingConfigId === r.configuration_id ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingConfigName}
                            onChange={(e) => setEditingConfigName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveConfigName(r.configuration_id);
                              if (e.key === "Escape") setEditingConfigId(null);
                            }}
                            className="bg-brand-bg border border-amber-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400 w-full font-semibold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveConfigName(r.configuration_id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shrink-0"
                            title="Save new name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingConfigId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2.5 flex-1 min-w-0 group">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleConfig(r.configuration_id)}
                            className="accent-brand-red w-4 h-4 rounded shrink-0 cursor-pointer"
                          />
                          <span
                            className={`font-semibold truncate cursor-pointer hover:underline ${
                              isHighlighted
                                ? "text-amber-300"
                                : isRef
                                ? "text-rose-400"
                                : isChecked
                                ? "text-slate-200"
                                : "text-slate-400"
                            }`}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingConfigId(r.configuration_id);
                              setEditingConfigName(r.display_name);
                            }}
                            title="Double click or click pencil to rename"
                          >
                            {r.display_name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingConfigId(r.configuration_id);
                              setEditingConfigName(r.display_name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-300 rounded transition shrink-0"
                            title="Rename configuration / model"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {isRef && (
                            <span className="px-1.5 py-0.2 rounded bg-brand-red/20 text-rose-400 text-[9px] font-bold shrink-0">
                              BASE
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleHighlightConfig(r.configuration_id);
                        }}
                        className={`p-1 ml-1.5 rounded-lg transition shrink-0 ${
                          isHighlighted
                            ? "text-amber-400 hover:text-amber-300 bg-amber-500/20"
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        }`}
                        title={isHighlighted ? "Remove highlight" : "Highlight this product on chart"}
                      >
                        <Star className={`w-3.5 h-3.5 ${isHighlighted ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Highlight Controls Section Inside Top Card */}
              <div className="pt-3 border-t border-brand-border/60 space-y-3">
                {/* Master Switch Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className={`w-4 h-4 ${chartOptions.highlightOptions?.enabled ? "text-amber-400 fill-amber-400" : "text-slate-500"}`} />
                    <span className="text-xs font-bold text-slate-200">Highlighting Controls</span>
                    {chartOptions.highlightOptions?.enabled &&
                      (chartOptions.highlightOptions.highlightedConfigIds?.length || 0) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                          {chartOptions.highlightOptions.highlightedConfigIds.length} starred
                        </span>
                      )}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chartOptions.highlightOptions?.enabled ?? false}
                      onChange={(e) => {
                        const isEnabled = e.target.checked;
                        setChartOptions((prev) => {
                          const cur = prev.highlightOptions || DEFAULT_HIGHLIGHT_OPTIONS;
                          const highlighted =
                            cur.highlightedConfigIds && cur.highlightedConfigIds.length > 0
                              ? cur.highlightedConfigIds
                              : activeDataset?.rows[0]
                              ? [activeDataset.rows[0].configuration_id]
                              : [];
                          return {
                            ...prev,
                            highlightOptions: {
                              ...cur,
                              enabled: isEnabled,
                              highlightedConfigIds: highlighted
                            }
                          };
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {chartOptions.highlightOptions?.enabled && (
                  <div className="space-y-3 pt-1">
                    {/* Highlight Color Presets Dropdown */}
                    <div className="space-y-1.5 relative" ref={highlightPresetDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-300">
                          Color Gradient Preset
                        </label>
                        {chartOptions.highlightOptions?.activePresetId && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            {GRADIENT_PRESETS.find((p) => p.id === chartOptions.highlightOptions?.activePresetId)?.name}
                          </span>
                        )}
                      </div>

                      {/* Custom Dropdown Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsHighlightPresetDropdownOpen(!isHighlightPresetDropdownOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-brand-surface border border-brand-border text-xs text-white hover:border-slate-500 transition shadow-sm"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {(() => {
                            const activeStart =
                              chartOptions.highlightOptions?.highlightBarGradient?.[0] ||
                              chartOptions.highlightOptions?.highlightBarColor ||
                              "#f97316";
                            const activeEnd =
                              chartOptions.highlightOptions?.highlightBarGradient?.[1] ||
                              "#ea580c";
                            return (
                              <div
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${activeStart}, ${activeEnd})`
                                }}
                              />
                            );
                          })()}
                          <span className="truncate font-semibold text-[11px]">
                            {GRADIENT_PRESETS.find(
                              (p) => p.id === chartOptions.highlightOptions?.activePresetId
                            )?.name || "Custom / Manual Colors"}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isHighlightPresetDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu Popup with Actual Gradient Previews */}
                      {isHighlightPresetDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-56 overflow-y-auto bg-slate-900 border border-brand-border rounded-xl shadow-2xl p-1.5 space-y-1">
                          {/* Custom / Manual Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setChartOptions((prev) => ({
                                ...prev,
                                highlightOptions: {
                                  ...prev.highlightOptions!,
                                  activePresetId: undefined
                                }
                              }));
                              setIsHighlightPresetDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition ${
                              !chartOptions.highlightOptions?.activePresetId
                                ? "bg-amber-500/20 text-white font-bold"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <span className="truncate">Custom / Manual Colors</span>
                            {!chartOptions.highlightOptions?.activePresetId && (
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />
                            )}
                          </button>

                          {/* GRADIENT_PRESETS with Actual Gradient Previews */}
                          {GRADIENT_PRESETS.map((p) => {
                            const isSelected = chartOptions.highlightOptions?.activePresetId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  const [startCol, endCol] = getPresetHighlightColors(p.id);
                                  setChartOptions((prev) => ({
                                    ...prev,
                                    highlightOptions: {
                                      ...prev.highlightOptions!,
                                      activePresetId: p.id,
                                      highlightBarColor: startCol,
                                      highlightBarGradient: [startCol, endCol],
                                      rowShadeColor: hexToRgba(startCol, 0.15),
                                      dividingLineColor: hexToRgba(startCol, 0.6)
                                    }
                                  }));
                                  setIsHighlightPresetDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2 rounded-lg transition group ${
                                  isSelected
                                    ? "bg-slate-800 border border-amber-400/60 text-white shadow-sm"
                                    : "hover:bg-slate-800 text-slate-300 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-semibold truncate group-hover:text-white">
                                    {p.name}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />
                                  )}
                                </div>
                                <div
                                  className="h-2.5 w-full rounded shadow-inner border border-white/10"
                                  style={{
                                    background: `linear-gradient(to right, ${p.colors.join(", ")})`
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bar Color & Switch Controls */}
                    <div className="space-y-2 p-2.5 bg-brand-surface/60 rounded-xl border border-brand-border/60">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-200">
                          <input
                            type="checkbox"
                            checked={chartOptions.highlightOptions.useHighlightBarColor ?? true}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setChartOptions((prev) => ({
                                ...prev,
                                highlightOptions: {
                                  ...prev.highlightOptions!,
                                  useHighlightBarColor: val
                                }
                              }));
                            }}
                            className="accent-amber-500 w-3.5 h-3.5 rounded"
                          />
                          <span className="text-[11px]">Vibrant Bar Color & Gradient</span>
                        </label>

                        {/* Switch Colors Button */}
                        {chartOptions.highlightOptions.useHighlightBarColor && (
                          <button
                            type="button"
                            onClick={() => {
                              const curStart =
                                chartOptions.highlightOptions?.highlightBarGradient?.[0] ||
                                chartOptions.highlightOptions?.highlightBarColor ||
                                "#f97316";
                              const curEnd =
                                chartOptions.highlightOptions?.highlightBarGradient?.[1] ||
                                "#ea580c";
                              setChartOptions((prev) => ({
                                ...prev,
                                highlightOptions: {
                                  ...prev.highlightOptions!,
                                  highlightBarColor: curEnd,
                                  highlightBarGradient: [curEnd, curStart],
                                  rowShadeColor: hexToRgba(curEnd, 0.15),
                                  dividingLineColor: hexToRgba(curEnd, 0.6)
                                }
                              }));
                            }}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-brand-border text-[10px] font-bold transition active:scale-95 shadow-sm"
                            title="Switch Start & End Colors (Reverse Gradient Direction)"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        )}
                      </div>

                      {chartOptions.highlightOptions.useHighlightBarColor && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Start</span>
                              <div className="flex items-center space-x-1.5 bg-brand-bg px-2 py-1 rounded-lg border border-brand-border">
                                <input
                                  type="color"
                                  value={
                                    chartOptions.highlightOptions.highlightBarGradient?.[0] ||
                                    chartOptions.highlightOptions.highlightBarColor ||
                                    "#f97316"
                                  }
                                  onChange={(e) => {
                                    const col = e.target.value;
                                    setChartOptions((prev) => ({
                                      ...prev,
                                      highlightOptions: {
                                        ...prev.highlightOptions!,
                                        activePresetId: undefined,
                                        highlightBarColor: col,
                                        highlightBarGradient: [
                                          col,
                                          prev.highlightOptions?.highlightBarGradient?.[1] || col
                                        ],
                                        rowShadeColor: hexToRgba(col, 0.15),
                                        dividingLineColor: hexToRgba(col, 0.6)
                                      }
                                    }));
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-slate-300 uppercase truncate">
                                  {chartOptions.highlightOptions.highlightBarGradient?.[0] ||
                                    chartOptions.highlightOptions.highlightBarColor ||
                                    "#f97316"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">End</span>
                              <div className="flex items-center space-x-1.5 bg-brand-bg px-2 py-1 rounded-lg border border-brand-border">
                                <input
                                  type="color"
                                  value={
                                    chartOptions.highlightOptions.highlightBarGradient?.[1] ||
                                    "#ea580c"
                                  }
                                  onChange={(e) => {
                                    const col = e.target.value;
                                    setChartOptions((prev) => ({
                                      ...prev,
                                      highlightOptions: {
                                        ...prev.highlightOptions!,
                                        activePresetId: undefined,
                                        highlightBarGradient: [
                                          prev.highlightOptions?.highlightBarGradient?.[0] ||
                                            "#f97316",
                                          col
                                        ]
                                      }
                                    }));
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-slate-300 uppercase truncate">
                                  {chartOptions.highlightOptions.highlightBarGradient?.[1] ||
                                    "#ea580c"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Preset Color Swatches for Quick Shade Selection */}
                          {(() => {
                            const activeP = GRADIENT_PRESETS.find(
                              (p) => p.id === chartOptions.highlightOptions?.activePresetId
                            );
                            if (!activeP) return null;
                            return (
                              <div className="space-y-1 pt-1 border-t border-brand-border/40">
                                <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                                  <span>Swatches ({activeP.name})</span>
                                  <span>Left: Start • Right: End</span>
                                </div>
                                <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
                                  {activeP.colors.map((c, idx) => {
                                    const isStart =
                                      (chartOptions.highlightOptions?.highlightBarGradient?.[0] ||
                                        chartOptions.highlightOptions?.highlightBarColor) === c;
                                    const isEnd =
                                      chartOptions.highlightOptions?.highlightBarGradient?.[1] === c;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setChartOptions((prev) => ({
                                            ...prev,
                                            highlightOptions: {
                                              ...prev.highlightOptions!,
                                              highlightBarColor: c,
                                              highlightBarGradient: [
                                                c,
                                                prev.highlightOptions?.highlightBarGradient?.[1] || c
                                              ],
                                              rowShadeColor: hexToRgba(c, 0.15),
                                              dividingLineColor: hexToRgba(c, 0.6)
                                            }
                                          }));
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          setChartOptions((prev) => ({
                                            ...prev,
                                            highlightOptions: {
                                              ...prev.highlightOptions!,
                                              highlightBarGradient: [
                                                prev.highlightOptions?.highlightBarGradient?.[0] ||
                                                  "#f97316",
                                                c
                                              ]
                                            }
                                          }));
                                        }}
                                        className={`w-5 h-5 rounded border transition shadow-sm shrink-0 flex items-center justify-center ${
                                          isStart || isEnd
                                            ? "border-white ring-2 ring-amber-400 scale-110"
                                            : "border-white/20 hover:scale-105"
                                        }`}
                                        style={{ backgroundColor: c }}
                                        title={`Left-click: Set Start Color | Right-click: Set End Color (${c})`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Row Shade & Line Division */}
                    <div className="space-y-1.5 p-2.5 bg-brand-surface/60 rounded-xl border border-brand-border/60">
                      <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={chartOptions.highlightOptions.useRowBackgroundShade ?? true}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setChartOptions((prev) => ({
                              ...prev,
                              highlightOptions: {
                                ...prev.highlightOptions!,
                                useRowBackgroundShade: val
                              }
                            }));
                          }}
                          className="accent-amber-500 w-3.5 h-3.5 rounded"
                        />
                        <span>Row Background Shade Strip</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={chartOptions.highlightOptions.useRowDividingLine ?? true}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setChartOptions((prev) => ({
                              ...prev,
                              highlightOptions: {
                                ...prev.highlightOptions!,
                                useRowDividingLine: val
                              }
                            }));
                          }}
                          className="accent-amber-500 w-3.5 h-3.5 rounded"
                        />
                        <span>Top & Bottom Dividing Lines</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: CHART CONFIGURATION */}
            <div className="bg-brand-card rounded-3xl border border-brand-border p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-brand-red" />
                <span>Chart Configuration</span>
              </div>
              <button
                type="button"
                onClick={handleResetAllPreferences}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-brand-surface border border-brand-border/60 hover:border-slate-500 text-[10px] text-slate-400 hover:text-white transition cursor-pointer"
                title="Reset all visual customizations to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {/* Benchmark Selector Dropdown (Alphabetical listing) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Benchmark Dataset
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Alphabetical (A-Z)
                </span>
              </div>
              <select
                value={
                  selectedSubGroupId !== "all"
                    ? `${selectedBenchmarkId}::${selectedSubGroupId}`
                    : selectedBenchmarkId
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes("::")) {
                    const [bId, sId] = val.split("::");
                    setSelectedBenchmarkId(bId);
                    handleSelectSubGroup(sId);
                  } else {
                    setSelectedBenchmarkId(val);
                    const ds = datasets.find((d) => d.benchmark_id === val);
                    if (ds) {
                      const sgs = getSubGroupsForBenchmark(ds.benchmark_id, ds.metric_ids);
                      const allKey = `${ds.benchmark_id}__all`;
                      if (sgs.length > 0 && !selectedExportKeys.has(allKey)) {
                        const firstChecked = sgs.find((sg) =>
                          selectedExportKeys.has(`${ds.benchmark_id}__${sg.id}`)
                        );
                        if (firstChecked) {
                          handleSelectSubGroup(firstChecked.id);
                          return;
                        }
                      }
                    }
                    handleSelectSubGroup("all");
                  }
                }}
                className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-brand-red cursor-pointer"
              >
                <optgroup label="Summary Charts">
                  <option value="summary_relative_performance">
                    ⭐ Overall Performance Summary (Relative %)
                  </option>
                </optgroup>
                <optgroup label={`Individual Benchmarks (${sortedDatasets.length})`}>
                  {sortedDatasets.map((d) => {
                    const sgs = getSubGroupsForBenchmark(d.benchmark_id, d.metric_ids);
                    if (sgs.length === 0) {
                      return (
                        <option key={d.benchmark_id} value={d.benchmark_id}>
                          {d.benchmark_name} {d.category ? `[${d.category}]` : ""} ({d.rows.length} configs)
                        </option>
                      );
                    }
                    return (
                      <React.Fragment key={d.benchmark_id}>
                        <option value={d.benchmark_id}>
                          {d.benchmark_name} [Full / All Metrics] ({d.rows.length} configs)
                        </option>
                        {sgs.map((sg) => (
                          <option key={`${d.benchmark_id}::${sg.id}`} value={`${d.benchmark_id}::${sg.id}`}>
                            &nbsp;&nbsp;↳ {d.benchmark_name} - {sg.label}
                          </option>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            {/* Compact Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border/70">
              <button
                type="button"
                onClick={() => setActiveConfigTab("data")}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeConfigTab === "data"
                    ? "bg-brand-red text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Data</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveConfigTab("style")}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeConfigTab === "style"
                    ? "bg-brand-red text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Style</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveConfigTab("branding")}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1.5 ${
                  activeConfigTab === "branding"
                    ? "bg-brand-red text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Branding</span>
              </button>


            </div>

            {/* TAB 1: DATA & METRICS */}
            {activeConfigTab === "data" && (
              <div className="space-y-4">
                {/* Mode Selector Toggle: Single vs Summary */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBenchmarkId === "summary_relative_performance") {
                        setSelectedBenchmarkId(datasets[0]?.benchmark_id || "");
                      }
                    }}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                      !isSummaryActive
                        ? "bg-brand-red text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Single Tests</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBenchmarkId("summary_relative_performance")}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                      isSummaryActive
                        ? "bg-brand-red text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>⭐ Overall Summary</span>
                  </button>
                </div>

                {/* SUMMARY MODE CONTROLS */}
                {isSummaryActive ? (
                  <div className="space-y-4">
                    {/* 1. Reference Baseline Selector */}
                    <div className="p-3 bg-brand-surface border border-brand-border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                          <span>Compare Against (100% Baseline)</span>
                        </label>
                        <span className="text-[10px] text-brand-red font-semibold uppercase tracking-wider">
                          100% Reference
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Select which configuration represents 100% performance:
                      </p>

                      {/* 1-Click Baseline Selection Buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {summaryResult?.allConfigs.map((c) => {
                          const isCurrent = c.id === (summaryReferenceConfigId || summaryResult?.referenceConfigId);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSummaryReferenceConfigId(c.id)}
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                                isCurrent
                                  ? "bg-brand-red text-white shadow-md shadow-brand-red/30 border border-brand-red ring-1 ring-white/20"
                                  : "bg-brand-bg text-slate-300 border border-brand-border hover:border-slate-400 hover:text-white"
                              }`}
                              title={`Set ${c.name} as 100% baseline`}
                            >
                              <span>{c.name}</span>
                              {isCurrent && <span className="text-[10px] font-semibold text-rose-100">(100%)</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Calculated Summary Relative Results */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300">
                          Relative Average Results
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Checkbox toggles chart display
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {summaryResult?.summaryDataset.rows.map((row) => {
                          const deltaInfo = summaryResult.deltas[row.configuration_id];
                          const isRef = row.configuration_id === summaryResult.referenceConfigId;
                          const isChecked = chartOptions.selectedConfigIds.includes(row.configuration_id);

                          return (
                            <div
                              key={row.configuration_id}
                              className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                isChecked
                                  ? isRef
                                    ? "bg-brand-red/10 border-brand-red/40"
                                    : "bg-brand-surface border-brand-border"
                                  : "bg-brand-surface/40 border-brand-border/30 opacity-50"
                              }`}
                            >
                              <label className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleConfig(row.configuration_id)}
                                  className="accent-brand-red w-4 h-4 rounded shrink-0"
                                />
                                <span className="text-xs font-semibold text-white truncate">
                                  {row.configuration_name}
                                </span>
                              </label>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="text-xs font-mono font-bold text-white">
                                  {deltaInfo ? `${deltaInfo.percent.toFixed(1)}%` : "100.0%"}
                                </span>
                                {isRef ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-red/20 text-brand-red border border-brand-red/30">
                                    100% BASE
                                  </span>
                                ) : (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      (deltaInfo?.delta ?? 0) > 0
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : (deltaInfo?.delta ?? 0) < 0
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                    }`}
                                  >
                                    {(deltaInfo?.delta ?? 0) > 0
                                      ? `+${deltaInfo?.delta.toFixed(1)}%`
                                      : `${deltaInfo?.delta.toFixed(1)}%`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Included Benchmarks in Average Calculation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">
                          Included Datasets in Average ({summaryIncludedBenchmarkIds.length === 0 ? datasets.length : summaryIncludedBenchmarkIds.length}/{datasets.length})
                        </label>
                        <div className="flex items-center space-x-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setSummaryIncludedBenchmarkIds(datasets.map((d) => d.benchmark_id))}
                            className="text-brand-red hover:underline font-semibold"
                          >
                            All
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (datasets.length > 0) {
                                setSummaryIncludedBenchmarkIds([datasets[0].benchmark_id]);
                              }
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {datasets.map((d) => {
                          const isIncluded =
                            summaryIncludedBenchmarkIds.length === 0 ||
                            summaryIncludedBenchmarkIds.includes(d.benchmark_id);
                          return (
                            <label
                              key={d.benchmark_id}
                              className="flex items-center space-x-2.5 p-2 rounded-xl bg-brand-surface/70 border border-brand-border/50 hover:border-slate-500 cursor-pointer text-xs transition"
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => {
                                  const current =
                                    summaryIncludedBenchmarkIds.length === 0
                                      ? datasets.map((x) => x.benchmark_id)
                                      : [...summaryIncludedBenchmarkIds];
                                  let updated: string[];
                                  if (current.includes(d.benchmark_id)) {
                                    updated = current.filter((id) => id !== d.benchmark_id);
                                  } else {
                                    updated = [...current, d.benchmark_id];
                                  }
                                  if (updated.length > 0) {
                                    setSummaryIncludedBenchmarkIds(updated);
                                  }
                                }}
                                className="accent-brand-red w-4 h-4 rounded"
                              />
                              <span className="text-slate-200 font-medium truncate flex-1">
                                {d.benchmark_name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {d.metric_ids.length} {d.metric_ids.length === 1 ? "metric" : "metrics"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SINGLE BENCHMARK MODE CONTROLS */
                  <>
                    {/* Sub-Chart Group Preset Pills in Controls Panel */}
                    {availableSubGroups.length > 0 && (
                      <div className="space-y-1.5 p-2.5 bg-brand-surface/70 rounded-2xl border border-brand-border/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-brand-red" />
                            <span>Quick Metric Views</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Separate clutter</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleSelectSubGroup("all")}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                              selectedSubGroupId === "all"
                                ? "bg-brand-red text-white shadow"
                                : "bg-brand-surface border border-brand-border text-slate-400 hover:text-white"
                            }`}
                          >
                            All ({activeDataset.metric_ids.length})
                          </button>
                          {availableSubGroups.map((sg) => (
                            <button
                              key={sg.id}
                              type="button"
                              onClick={() => handleSelectSubGroup(sg.id)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center space-x-1 ${
                                selectedSubGroupId === sg.id
                                  ? "bg-cyan-600 text-white shadow"
                                  : "bg-brand-surface border border-brand-border text-slate-300 hover:text-white hover:border-cyan-500/50"
                              }`}
                            >
                              <span>{sg.shortLabel}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metrics to Plot */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300">
                          Metrics to Plot
                        </label>
                        <span className="text-[10px] text-slate-400">Swatch to override color</span>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {activeDataset.metric_ids.map((m_id) => {
                          const isChecked = chartOptions.selectedMetrics.includes(m_id);
                          const canonicalIndex = activeDataset.metric_ids.indexOf(m_id);
                          const defaultColors =
                            chartOptions.barColors.length > 0
                              ? chartOptions.barColors
                              : ["#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#8338ec", "#3a86ff"];
                          const currentColor =
                            chartOptions.customMetricColors?.[m_id] ||
                            defaultColors[canonicalIndex % defaultColors.length];

                          return (
                            <div
                              key={m_id}
                              className={`flex items-center justify-between p-2 rounded-xl border transition ${
                                isChecked
                                  ? "bg-brand-surface border-brand-border/80"
                                  : "bg-brand-surface/40 border-brand-border/30 opacity-60"
                              }`}
                            >
                              <label className="flex items-center space-x-2.5 cursor-pointer text-xs flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleMetric(m_id)}
                                  className="accent-brand-red w-4 h-4 rounded shrink-0"
                                />
                                <span className="font-semibold text-white capitalize truncate">
                                  {m_id.replace(/_/g, " ")}
                                </span>
                              </label>

                              <div className="flex items-center space-x-1.5 pl-2 shrink-0">
                                <input
                                  type="color"
                                  value={currentColor}
                                  disabled={!isChecked}
                                  onChange={(e) => {
                                    setChartOptions((prev) => ({
                                      ...prev,
                                      customMetricColors: {
                                        ...(prev.customMetricColors || {}),
                                        [m_id]: e.target.value
                                      }
                                    }));
                                  }}
                                  title={`Change bar color for ${m_id.replace(/_/g, " ")}`}
                                  className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border border-brand-border/80 overflow-hidden disabled:opacity-40"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>


                  </>
                )}
              </div>
            )}

            {/* TAB 2: STYLE & COLORS */}
            {activeConfigTab === "style" && (
              <div className="space-y-4">
                {/* Product Name (Defaults to folder name, user editable for filenames) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-300 font-semibold flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-brand-red" />
                      <span>Product Name</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Default: Folder Name</span>
                  </div>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. ASUS Zenbook S16 2026"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  />

                  {/* Include Product Name in Bar Labels toggle */}
                  <label className="flex items-center space-x-2.5 mt-2.5 p-2 rounded-xl bg-brand-surface border border-brand-border/60 hover:border-brand-border cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={chartOptions.includeProductNameInLabels ?? false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChartOptions((prev) => ({
                          ...prev,
                          includeProductNameInLabels: checked
                        }));
                      }}
                      className="accent-brand-red w-4 h-4 rounded shrink-0 cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Include Product Name in Bar Labels</span>
                        {chartOptions.includeProductNameInLabels && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-red/20 text-rose-300 font-mono">ACTIVE</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        E.g. <span className="text-slate-300 font-mono">{productName || "Product"} - Performance</span>
                      </span>
                    </div>
                  </label>
                </div>

                {/* Main Title & Subtitle in compact 2-column grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Main Title
                    </span>
                    <input
                      type="text"
                      value={chartOptions.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setChartOptions((prev) => ({
                          ...prev,
                          title: newTitle,
                          customBenchmarkTitles: {
                            ...(prev.customBenchmarkTitles || {}),
                            [activeDataset.benchmark_id]: newTitle
                          }
                        }));
                        if (activeDataset.benchmark_id && !isSummaryActive) {
                          api.updateBenchmark(activeDataset.benchmark_id, { name: newTitle }).catch(() => {});
                        }
                      }}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-bold tracking-wider"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400 font-semibold">
                        Subtitle
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] text-slate-400">Color:</span>
                        <input
                          type="color"
                          value={
                            chartOptions.subtitleColor ||
                            (chartOptions.subtitle.includes("LOWER") ? "#f59e0b" : "#e63946")
                          }
                          onChange={(e) =>
                            setChartOptions((prev) => ({ ...prev, subtitleColor: e.target.value }))
                          }
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border border-brand-border/80 overflow-hidden"
                          title="Choose subtitle font color"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={chartOptions.subtitle}
                      onChange={(e) =>
                        setChartOptions({ ...chartOptions, subtitle: e.target.value })
                      }
                      style={{
                        color:
                          chartOptions.subtitleColor ||
                          (chartOptions.subtitle.includes("LOWER") ? "#f59e0b" : "#e63946")
                      }}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-red font-bold uppercase tracking-wider"
                    />
                  </div>
                </div>

                {/* Theme & Sorting in 2-column grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Theme
                    </span>
                    <select
                      value={chartOptions.theme}
                      onChange={(e) =>
                        setChartOptions({ ...chartOptions, theme: e.target.value as any })
                      }
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="light">Clean Light (Reference)</option>
                      <option value="dark">Modern Dark</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Sorting
                    </span>
                    <select
                      value={chartOptions.sortOrder}
                      onChange={(e) =>
                        setChartOptions({ ...chartOptions, sortOrder: e.target.value as any })
                      }
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="desc">Highest First</option>
                      <option value="asc">Lowest First</option>
                      <option value="alpha">Alphabetical (A-Z)</option>
                      <option value="original">Folder Order</option>
                    </select>
                  </div>
                </div>

                {/* Excel Color Gradient Preset Dropdown Menu with Live Previews */}
                <div className="space-y-2 pt-2 border-t border-brand-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block">
                      Color Gradient Preset
                    </span>
                    {chartOptions.activeGradientPreset && (
                      <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                    )}
                  </div>

                  <div className="space-y-1.5 relative" ref={gradientDropdownRef}>
                    {/* Custom Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsGradientDropdownOpen((prev) => !prev)}
                      className="w-full bg-brand-surface border border-brand-border hover:border-slate-500 rounded-xl px-3 py-2 text-xs font-semibold text-white flex items-center justify-between transition focus:outline-none focus:border-brand-red cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {(() => {
                          const activeP = GRADIENT_PRESETS.find(
                            (p) => p.id === chartOptions.activeGradientPreset
                          );
                          if (activeP) {
                            return (
                              <div
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${activeP.colors[0]}, ${activeP.colors[activeP.colors.length - 1]})`
                                }}
                              />
                            );
                          }
                          return (
                            <div className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-600 bg-slate-700" />
                          );
                        })()}
                        <span className="truncate">
                          {GRADIENT_PRESETS.find((p) => p.id === chartOptions.activeGradientPreset)?.name ||
                            "Custom / Manual Colors"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                          isGradientDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Popup with Actual Gradient Color Previews */}
                    {isGradientDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto bg-slate-900 border border-brand-border rounded-xl shadow-2xl p-1.5 space-y-1">
                        {/* Option: Custom / Manual */}
                        <button
                          type="button"
                          onClick={() => {
                            setChartOptions((prev) => ({ ...prev, activeGradientPreset: undefined }));
                            setIsGradientDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition ${
                            !chartOptions.activeGradientPreset
                              ? "bg-brand-red/20 text-white font-bold"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span className="truncate">Custom / Manual Colors</span>
                          {!chartOptions.activeGradientPreset && (
                            <Check className="w-3.5 h-3.5 text-brand-red shrink-0 ml-2" />
                          )}
                        </button>

                        {/* Preset Options with Actual Gradient Previews */}
                        {GRADIENT_PRESETS.map((p) => {
                          const isSelected = chartOptions.activeGradientPreset === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleSelectGradientPreset(p.id);
                                setIsGradientDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg transition group ${
                                isSelected
                                  ? "bg-slate-800 border border-brand-red/60 text-white shadow-sm"
                                  : "hover:bg-slate-800 text-slate-300 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold truncate group-hover:text-white">
                                  {p.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-brand-red shrink-0 ml-1.5" />
                                )}
                              </div>
                              {/* Actual Gradient Color Preview Bar */}
                              <div
                                className="h-3 w-full rounded-md shadow-inner border border-white/10"
                                style={{
                                  background: `linear-gradient(to right, ${p.colors.join(", ")})`
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected Gradient Ribbon / Line Preview Color */}
                    {(() => {
                      const activeP = GRADIENT_PRESETS.find(
                        (p) => p.id === chartOptions.activeGradientPreset
                      );
                      if (!activeP) return null;
                      return (
                        <div
                          className="h-2.5 w-full rounded-md shadow-inner border border-black/20 mt-1"
                          style={{
                            background: `linear-gradient(to right, ${activeP.colors.join(", ")})`
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Active Bar Colors Palette Swatches */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Bar Colors ({chartOptions.barColors.length} active)
                    </span>
                    <span className="text-[10px] text-slate-500">Click swatch to tweak</span>
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                    {chartOptions.barColors.map((col, idx) => (
                      <input
                        key={idx}
                        type="color"
                        value={col}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-brand-border overflow-hidden shrink-0"
                        title={`Override bar color ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Size & Margin Sliders in 2-column grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-brand-border/60">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Font Size
                      </span>
                      <span className="text-[10px] text-brand-red font-mono font-bold">
                        {chartOptions.labelFontSize ?? 11}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="14"
                      step="0.5"
                      value={chartOptions.labelFontSize ?? 11}
                      onChange={(e) =>
                        setChartOptions({
                          ...chartOptions,
                          labelFontSize: parseFloat(e.target.value)
                        })
                      }
                      className="w-full accent-brand-red cursor-pointer h-1.5 bg-brand-surface rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Margin
                      </span>
                      <span className="text-[10px] text-brand-red font-mono font-bold">
                        {chartOptions.gridLeftMargin ??
                          (chartOptions.aspectRatio === "9:16" ? 135 : 240)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={chartOptions.aspectRatio === "9:16" ? "80" : "160"}
                      max={chartOptions.aspectRatio === "9:16" ? "220" : "340"}
                      step={chartOptions.aspectRatio === "9:16" ? "5" : "10"}
                      value={
                        chartOptions.gridLeftMargin ??
                        (chartOptions.aspectRatio === "9:16" ? 135 : 240)
                      }
                      onChange={(e) =>
                        setChartOptions({
                          ...chartOptions,
                          gridLeftMargin: parseInt(e.target.value)
                        })
                      }
                      className="w-full accent-brand-red cursor-pointer h-1.5 bg-brand-surface rounded-lg"
                    />
                  </div>
                </div>

                {/* Score Values Position & Display Toggles */}
                <div className="pt-2 border-t border-brand-border/60 space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Values Position
                      </span>
                      {(chartOptions.barValuePosition === "auto" || !chartOptions.barValuePosition) && (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          Smart: {((chartOptions.selectedConfigIds?.length || activeDataset?.rows.length || 0) > 5) ? "Inside (>5)" : "Outside (≤5)"}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setChartOptions({ ...chartOptions, barValuePosition: "auto" })
                        }
                        className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition text-center ${
                          chartOptions.barValuePosition === "auto" || !chartOptions.barValuePosition
                            ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/30"
                            : "bg-brand-surface text-slate-400 border-brand-border hover:text-white"
                        }`}
                        title="Smart Auto: Automatically places scores inside bars when > 5 configurations/products are shown, and outside when ≤ 5"
                      >
                        Auto (Smart)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setChartOptions({ ...chartOptions, barValuePosition: "outside" })
                        }
                        className={`px-2 py-1 rounded-xl text-[10px] font-semibold border transition text-center ${
                          chartOptions.barValuePosition === "outside"
                            ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/30"
                            : "bg-brand-surface text-slate-400 border-brand-border hover:text-white"
                        }`}
                        title="Force score values outside bars"
                      >
                        Outside
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setChartOptions({ ...chartOptions, barValuePosition: "inside" })
                        }
                        className={`px-2 py-1 rounded-xl text-[10px] font-semibold border transition text-center ${
                          chartOptions.barValuePosition === "inside"
                            ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/30"
                            : "bg-brand-surface text-slate-400 border-brand-border hover:text-white"
                        }`}
                        title="Force score values inside bars"
                      >
                        Inside
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center space-x-2 text-[11px] cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={chartOptions.showValues}
                        onChange={(e) =>
                          setChartOptions({ ...chartOptions, showValues: e.target.checked })
                        }
                        className="accent-brand-red w-3.5 h-3.5 rounded"
                      />
                      <span>Show Scores</span>
                    </label>

                    <label className="flex items-center space-x-2 text-[11px] cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={chartOptions.showDecorations}
                        onChange={(e) =>
                          setChartOptions({ ...chartOptions, showDecorations: e.target.checked })
                        }
                        className="accent-brand-red w-3.5 h-3.5 rounded"
                      />
                      <span>Corner Accents</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BRANDING & LOGO */}
            {activeConfigTab === "branding" && (
              <div className="space-y-4">
                {/* Logo Preview & Upload */}
                <div className="flex items-center space-x-3 p-2.5 bg-brand-surface rounded-xl border border-brand-border/70">
                  <div className="w-20 h-10 bg-white/90 rounded-lg flex items-center justify-center p-1 overflow-hidden border border-slate-300 shrink-0 shadow-inner">
                    {chartOptions.logoUrl ? (
                      <img
                        src={chartOptions.logoUrl}
                        alt="Brand Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-semibold">No Logo</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-1">
                    <label className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-brand-red hover:bg-rose-600 text-white text-[11px] font-semibold cursor-pointer transition shadow">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {(isCustomLogo || (defaultLogoData && chartOptions.logoUrl !== defaultLogoData.data_url)) && (
                      <button
                        type="button"
                        onClick={handleResetDefaultLogo}
                        className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-brand-surface border border-brand-border hover:border-slate-500 text-slate-300 text-[10px] font-semibold transition"
                        title="Reset back to default Gadget Pilipinas logo"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Default</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Logo Placement */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Logo Placement
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setChartOptions((prev) => ({ ...prev, logoPosition: "top-left" }))
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        chartOptions.logoPosition === "top-left"
                          ? "bg-brand-red text-white border-brand-red shadow"
                          : "bg-brand-surface text-slate-400 border-brand-border hover:text-white"
                      }`}
                    >
                      Upper Left
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setChartOptions((prev) => ({ ...prev, logoPosition: "top-right" }))
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        chartOptions.logoPosition === "top-right"
                          ? "bg-brand-red text-white border-brand-red shadow"
                          : "bg-brand-surface text-slate-400 border-brand-border hover:text-white"
                      }`}
                    >
                      Upper Right
                    </button>
                  </div>
                </div>

                {/* Aspect Ratio Profile Switcher */}
                <div className="pt-2 border-t border-brand-border/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                      Configure Profile:
                    </span>
                    <div className="flex bg-slate-900/90 rounded-lg p-0.5 border border-brand-border/80">
                      <button
                        type="button"
                        onClick={() => setLogoConfigRatio("16:9")}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          logoConfigRatio === "16:9"
                            ? "bg-brand-red text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        16:9 Wide
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoConfigRatio("9:16")}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                          logoConfigRatio === "9:16"
                            ? "bg-brand-red text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        9:16 Mobile
                      </button>
                    </div>
                  </div>

                  {/* Logo Width Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Logo Size ({logoConfigRatio})
                      </span>
                      <span className="text-[10px] text-brand-red font-mono font-bold">
                        {logoConfigRatio === "9:16"
                          ? (chartOptions.logoWidth_9_16 ?? 140)
                          : (chartOptions.logoWidth_16_9 ?? chartOptions.logoWidth ?? 170)}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="320"
                      step="10"
                      value={
                        logoConfigRatio === "9:16"
                          ? (chartOptions.logoWidth_9_16 ?? 140)
                          : (chartOptions.logoWidth_16_9 ?? chartOptions.logoWidth ?? 170)
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setChartOptions((prev) => ({
                          ...prev,
                          ...(logoConfigRatio === "9:16"
                            ? {
                                logoWidth_9_16: val,
                                ...(prev.aspectRatio === "9:16" ? { logoWidth: val } : {})
                              }
                            : {
                                logoWidth_16_9: val,
                                ...(prev.aspectRatio === "16:9" ? { logoWidth: val } : {})
                              })
                        }));
                      }}
                      className="w-full accent-brand-red cursor-pointer h-1.5 bg-brand-surface rounded-lg"
                    />
                  </div>

                  {/* Logo Edge Offset Sliders in 2-column grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 font-semibold truncate">
                          Horizontal
                        </span>
                        <span className="text-[10px] text-brand-red font-mono font-bold">
                          {logoConfigRatio === "9:16"
                            ? (chartOptions.logoOffsetX_9_16 ?? 10)
                            : (chartOptions.logoOffsetX_16_9 ?? chartOptions.logoOffsetX ?? 12)}
                          px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="2"
                        value={
                          logoConfigRatio === "9:16"
                            ? (chartOptions.logoOffsetX_9_16 ?? 10)
                            : (chartOptions.logoOffsetX_16_9 ?? chartOptions.logoOffsetX ?? 12)
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setChartOptions((prev) => ({
                            ...prev,
                            ...(logoConfigRatio === "9:16"
                              ? {
                                  logoOffsetX_9_16: val,
                                  ...(prev.aspectRatio === "9:16" ? { logoOffsetX: val } : {})
                                }
                              : {
                                  logoOffsetX_16_9: val,
                                  ...(prev.aspectRatio === "16:9" ? { logoOffsetX: val } : {})
                                })
                          }));
                        }}
                        className="w-full accent-brand-red cursor-pointer h-1.5 bg-brand-surface rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 font-semibold truncate">
                          Vertical
                        </span>
                        <span className="text-[10px] text-brand-red font-mono font-bold">
                          {logoConfigRatio === "9:16"
                            ? (chartOptions.logoOffsetY_9_16 ?? 12)
                            : (chartOptions.logoOffsetY_16_9 ?? chartOptions.logoOffsetY ?? 10)}
                          px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="2"
                        value={
                          logoConfigRatio === "9:16"
                            ? (chartOptions.logoOffsetY_9_16 ?? 12)
                            : (chartOptions.logoOffsetY_16_9 ?? chartOptions.logoOffsetY ?? 10)
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setChartOptions((prev) => ({
                            ...prev,
                            ...(logoConfigRatio === "9:16"
                              ? {
                                  logoOffsetY_9_16: val,
                                  ...(prev.aspectRatio === "9:16" ? { logoOffsetY: val } : {})
                                }
                              : {
                                  logoOffsetY_16_9: val,
                                  ...(prev.aspectRatio === "16:9" ? { logoOffsetY: val } : {})
                                })
                          }));
                        }}
                        className="w-full accent-brand-red cursor-pointer h-1.5 bg-brand-surface rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>
          </div>

          {/* Right Live Interactive Chart Preview & Data Editor */}
          <div className="lg:col-span-8 space-y-6">
            {/* Top Toolbar: Aspect Ratio, Resolution, Format & Batch Export Controls */}
            <div className="bg-brand-card rounded-3xl border border-brand-border p-4 shadow-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-brand-red" />
                    <span>Chart Sizing & Export Engine</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {exportConfig.aspectRatio === "16:9" ? "Landscape 16:9" : "Vertical 9:16"} •{" "}
                    {exportConfig.resolution.toUpperCase()} • {exportConfig.format.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Aspect Ratio Selector */}
                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Aspect Ratio
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-brand-surface p-1 rounded-xl border border-brand-border/70">
                    <button
                      type="button"
                      onClick={() => handleAspectRatioChange("16:9")}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        exportConfig.aspectRatio === "16:9"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>16:9 (Wide)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAspectRatioChange("9:16")}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        exportConfig.aspectRatio === "9:16"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>9:16 (Mobile)</span>
                    </button>
                  </div>
                </div>

                {/* Resolution Selector */}
                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Resolution
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border/70">
                    {(["720p", "1080p", "4k"] as ExportResolution[]).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setExportConfig((prev) => ({ ...prev, resolution: res }))}
                        className={`py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                          exportConfig.resolution === res
                            ? "bg-brand-red text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format Selector */}
                <div className="md:col-span-4 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Format
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border/70">
                    {(["png", "jpg", "webp"] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportConfig((prev) => ({ ...prev, format: fmt }))}
                        className={`py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                          exportConfig.format === fmt
                            ? "bg-brand-red text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Name Override & Hardware Component Tag in Export Sizing & Naming Engine */}
              <div className="p-3.5 bg-brand-surface/70 rounded-2xl border border-brand-border/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3.5 h-3.5 text-brand-red" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Export Naming & SEO Configuration
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Default: {currentProject?.name || "Folder Name"})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {productName !== currentProject?.name && currentProject?.name && (
                      <button
                        type="button"
                        onClick={() => setProductName(currentProject.name)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 hover:underline transition cursor-pointer"
                        title="Reset Product Name back to folder name"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Follow Folder Name</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Product Name Input */}
                  <div className="md:col-span-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product Name</span>
                      {chartOptions.includeProductNameInLabels ? (
                        <span className="text-[9px] text-rose-400 font-medium">In graph bar labels</span>
                      ) : (
                        <span className="text-[9px] text-slate-500">In file name</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder={currentProject?.name || "e.g. ASUS Zenbook S16 2026"}
                      className="w-full bg-slate-900 border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* File Naming Phrase (SEO / Editorial Suffix) */}
                  <div className="md:col-span-7 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">File Naming Phrase (SEO / Tag)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                          File Only (Graph Untouched)
                        </span>
                      </div>
                      {exportPhrase && (
                        <button
                          type="button"
                          onClick={() => setExportPhrase("")}
                          className="text-[10px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Clear phrase"
                        >
                          Clear (✕)
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={exportPhrase}
                        onChange={(e) => setExportPhrase(e.target.value)}
                        placeholder="e.g. Review, First Impressions, Unboxing..."
                        className="w-full bg-slate-900 border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red pr-7"
                      />
                      {exportPhrase && (
                        <button
                          type="button"
                          onClick={() => setExportPhrase("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Filename Preview */}
                <div className="pt-2 border-t border-brand-border/40 flex items-center space-x-2 text-[11px] text-slate-400 min-w-0 max-w-full">
                  <span className="text-slate-500 shrink-0 font-medium">Export Filename:</span>
                  <span className="text-brand-red font-mono font-bold truncate">
                    {buildChartFileName(
                      productName || currentProject?.name,
                      chartOptions.title || activeDataset?.benchmark_name,
                      exportConfig.format,
                      productCategory,
                      includeCategoryTag,
                      exportPhrase
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Output Dimensions:{" "}
                  <span className="text-white font-mono font-bold">
                    {getExportDimensions(exportConfig.aspectRatio, exportConfig.resolution).width} ×{" "}
                    {getExportDimensions(exportConfig.aspectRatio, exportConfig.resolution).height} px
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSingle}
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:scale-95 transition disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    <span>Export Current ({exportConfig.format.toUpperCase()})</span>
                  </button>

                  {/* Batch Mode Switcher: Separate Images (No ZIP) vs ZIP Archive */}
                  <div className="flex items-center bg-brand-surface p-1 rounded-xl border border-brand-border/70">
                    <button
                      type="button"
                      onClick={() => setBatchMode("individual")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        batchMode === "individual"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Download individual image files sequentially without creating a ZIP"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Separate Images</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchMode("zip")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        batchMode === "zip"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Package all charts into a single ZIP archive"
                    >
                      <FileArchive className="w-3.5 h-3.5" />
                      <span>ZIP File</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isExporting || datasets.length === 0}
                    onClick={() => setIsBatchModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-900/40 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    title="Open checklist to pick which benchmarks and split sub-charts to export"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>
                      Batch Export Checklist (
                      {selectedExportKeys.size > 0
                        ? `${selectedExportKeys.size} Selected`
                        : "Select"}
                      )
                    </span>
                  </button>
                </div>
              </div>

              {/* Batch Export Progress Banner */}
              {isExporting && exportProgress && (
                <div className="p-3 bg-brand-surface rounded-2xl border border-brand-red/40 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Exporting {exportProgress.current} of {exportProgress.total}:{" "}
                      <span className="text-brand-red">{exportProgress.benchmarkName}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-red transition-all duration-300"
                      style={{
                        width: `${(exportProgress.current / exportProgress.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Interactive Chart Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Live Interactive Preview</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {chartOptions.aspectRatio === "9:16" ? "9:16 Vertical Preview" : "16:9 Landscape Preview"}
                </span>
              </div>

              {/* Quick Sub-Chart Switcher Pills */}
              {availableSubGroups.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-brand-surface/90 rounded-2xl border border-brand-border/80 shadow-sm">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 pr-1 shrink-0">
                    <Sparkles className="w-4 h-4 text-brand-red" />
                    <span>Split Sub-Chart View:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectSubGroup("all")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      selectedSubGroupId === "all"
                        ? "bg-brand-red text-white shadow-md shadow-rose-900/30"
                        : "bg-brand-card text-slate-400 hover:text-white border border-brand-border/60"
                    }`}
                  >
                    <span>All Metrics</span>
                    <span className="text-[10px] opacity-75">({activeDataset.metric_ids.length})</span>
                  </button>

                  {availableSubGroups.map((sg) => {
                    const isSelected = selectedSubGroupId === sg.id;
                    return (
                      <button
                        key={sg.id}
                        type="button"
                        onClick={() => handleSelectSubGroup(sg.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                          isSelected
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/40"
                            : "bg-brand-card text-slate-300 hover:text-white border border-brand-border/60 hover:border-cyan-500/50"
                        }`}
                      >
                        <span>{sg.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                            isSelected
                              ? "bg-cyan-700/80 text-white"
                              : "bg-brand-surface text-slate-400"
                          }`}
                        >
                          {sg.higherIsBetter ? "↑ Higher" : "↓ Lower"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <BenchmarkChart
                dataset={activeDataset}
                options={chartOptions}
                onOptionsChange={(opts) => setChartOptions((prev) => ({ ...prev, ...opts }))}
              />
            </div>

            {/* Interactive Data & Values Quick Editor */}
            <div className="bg-brand-card rounded-3xl border border-brand-border p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-brand-red" />
                  <span>Interactive Data & Values Editor</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Edit scores or profile names directly; graph updates live
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-brand-surface/70 uppercase text-[10px] tracking-wider text-slate-400 border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-2.5">Power Profile / Configuration</th>
                      {chartOptions.selectedMetrics.map((m_id) => (
                        <th key={m_id} className="px-4 py-2.5">
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-200 block capitalize">
                              {m_id.replace('_', ' ')}
                            </span>
                            <input
                              type="text"
                              value={chartOptions.customMetricLabels?.[m_id] ?? ""}
                              placeholder="Custom label..."
                              onChange={(e) => handleMetricLabelChange(m_id, e.target.value)}
                              className="w-28 bg-brand-surface border border-brand-border/80 rounded px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-brand-red"
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40">
                    {activeDataset.rows
                      .filter((r) => chartOptions.selectedConfigIds.includes(r.configuration_id))
                      .map((r) => {
                        const currentLabel = chartOptions.customConfigLabels?.[r.configuration_id] ?? r.display_name;
                        return (
                          <tr key={r.configuration_id} className="hover:bg-brand-surface/30">
                            <td className="px-4 py-3 font-medium text-white">
                              <input
                                type="text"
                                value={currentLabel}
                                onChange={(e) => handleConfigLabelChange(r.configuration_id, e.target.value)}
                                className="w-48 bg-brand-surface border border-brand-border/80 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                              />
                            </td>
                            {chartOptions.selectedMetrics.map((m_id) => {
                              const metricVal = r.metrics[m_id]?.value ?? 0;
                              const unit = r.metrics[m_id]?.unit ?? "";
                              return (
                                <td key={m_id} className="px-4 py-3">
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="number"
                                      step="any"
                                      value={metricVal}
                                      onChange={(e) =>
                                        handleValueChange(
                                          r.configuration_id,
                                          m_id,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-28 bg-brand-surface border border-brand-border/80 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-brand-red"
                                    />
                                    <span className="text-[10px] text-slate-400">{unit}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-brand-card/60 rounded-3xl border border-dashed border-brand-border max-w-2xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center mx-auto shadow-inner">
            <BarChart3 className="w-7 h-7 text-brand-red" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">
              No Benchmark Data in "{currentProject?.name || "Active Project"}"
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              This project does not have any extracted benchmark scores yet. Scan screenshot folders using OCR or import a CSV/JSON file to generate comparison charts.
            </p>
          </div>

          {/* If there are other projects, offer direct project switcher */}
          {projects.filter((p) => p.id !== currentProject?.id).length > 0 && (
            <div className="p-4 bg-brand-surface/80 rounded-2xl border border-brand-border/80 max-w-md mx-auto text-left space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Looking for data in another project?
              </span>
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) selectProject(e.target.value);
                  }}
                  className="flex-1 bg-brand-card border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red cursor-pointer"
                >
                  <option value="">-- Switch to another project --</option>
                  {projects
                    .filter((p) => p.id !== currentProject?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.product_name ? `(${p.product_name})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (currentProject?.id) loadDatasets(currentProject.id);
              }}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition active:scale-95 cursor-pointer"
              title="Reload benchmark scores from database"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Benchmark Data</span>
            </button>
            <button
              onClick={handleAutoLoadFolder}
              disabled={isAutoLoadingFolder}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isAutoLoadingFolder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Auto-Load Benchmark Folder & Plot Charts</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("import")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Tab</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("projects")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-surface hover:bg-brand-border border border-brand-border text-slate-200 font-semibold text-xs transition cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Manage Projects</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Export Checklist Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-brand-border/80 flex items-center justify-between bg-brand-surface/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Batch Export Checklist</h3>
                  <p className="text-xs text-slate-400">
                    Select exactly which benchmarks and split sub-charts to export
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isExporting && setIsBatchModalOpen(false)}
                disabled={isExporting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-surface transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls & Presets */}
            <div className="p-4 border-b border-brand-border/60 bg-brand-dark/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Mode Selector inside Modal */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-400">Export As:</span>
                  <div className="flex items-center bg-brand-surface p-1 rounded-xl border border-brand-border/70">
                    <button
                      type="button"
                      onClick={() => setBatchMode("individual")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                        batchMode === "individual"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Separate Images</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchMode("zip")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                        batchMode === "zip"
                          ? "bg-brand-red text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileArchive className="w-3.5 h-3.5" />
                      <span>ZIP File</span>
                    </button>
                  </div>
                </div>

                {/* Export Format Info Pill */}
                <div className="text-[11px] font-mono text-slate-400 bg-brand-surface px-2.5 py-1 rounded-lg border border-brand-border/40 flex items-center space-x-2">
                  <span>{exportConfig.aspectRatio} • {exportConfig.resolution.toUpperCase()} • {exportConfig.format.toUpperCase()}</span>
                  {exportPhrase && (
                    <span className="text-emerald-400 font-semibold border-l border-brand-border/60 pl-2">
                      Tag: &quot;{exportPhrase}&quot;
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Preset Buttons & Search */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  <span className="text-xs text-slate-400 mr-1 font-medium flex items-center space-x-1">
                    <Bookmark className="w-3 h-3 text-slate-400" />
                    <span>Presets:</span>
                  </span>
                  <button
                    type="button"
                    onClick={selectSubChartsOnly}
                    className="px-2.5 py-1 rounded-lg bg-brand-red/15 hover:bg-brand-red/25 text-brand-red border border-brand-red/30 text-xs font-bold transition active:scale-95 cursor-pointer"
                    title="Export only split sub-charts for multi-metric benchmarks, skipping the combined chart"
                  >
                    ★ Split Sub-Charts Only
                  </button>
                  <button
                    type="button"
                    onClick={selectCombinedOnly}
                    className="px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-slate-700 text-slate-300 border border-brand-border text-xs font-semibold transition active:scale-95 cursor-pointer"
                    title="Export only all-metrics combined charts"
                  >
                    Combined Only
                  </button>
                  <button
                    type="button"
                    onClick={selectAllTargets}
                    className="px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-slate-700 text-slate-300 border border-brand-border text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllTargets}
                    className="px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-slate-700 text-slate-400 border border-brand-border text-xs font-semibold transition active:scale-95 cursor-pointer"
                  >
                    Deselect All
                  </button>

                  {/* Render Custom User Presets */}
                  {customExportPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="inline-flex items-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold overflow-hidden shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyCustomPreset(preset)}
                        className="px-2.5 py-1 hover:bg-cyan-500/25 transition cursor-pointer flex items-center space-x-1"
                        title={`Apply preset '${preset.name}' (${preset.keys.length} charts)`}
                      >
                        <span>{preset.name}</span>
                        <span className="text-[10px] text-cyan-400/80 font-mono">({preset.keys.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                        className="px-1.5 py-1 hover:bg-rose-600/60 hover:text-white text-cyan-400 border-l border-cyan-500/30 transition cursor-pointer"
                        title={`Delete preset '${preset.name}'`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Save Current as Preset Button / Inline Input */}
                  {!isCreatingPreset ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatingPreset(true)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-brand-surface hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
                      title="Save current checklist selection as a reusable preset"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Save as Preset</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center space-x-1 bg-brand-surface border border-emerald-500/50 rounded-lg p-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCustomPreset();
                          if (e.key === "Escape") setIsCreatingPreset(false);
                        }}
                        placeholder="Preset Name..."
                        className="px-2 py-0.5 text-xs bg-brand-dark/80 text-white rounded border border-brand-border/60 focus:outline-none focus:border-emerald-500 w-32"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomPreset}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded transition cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingPreset(false)}
                        className="px-1.5 py-0.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Search / Filter */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={batchSearchFilter}
                    onChange={(e) => setBatchSearchFilter(e.target.value)}
                    placeholder="Filter charts..."
                    className="w-full pl-8 pr-3 py-1 text-xs bg-brand-surface border border-brand-border/70 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-red"
                  />
                  {batchSearchFilter && (
                    <button
                      type="button"
                      onClick={() => setBatchSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist Items Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
              {groupedTargets
                .filter((group) => {
                  if (!batchSearchFilter.trim()) return true;
                  const q = batchSearchFilter.toLowerCase();
                  return (
                    group.benchmarkName.toLowerCase().includes(q) ||
                    group.items.some(
                      (item) =>
                        item.effectiveTitle.toLowerCase().includes(q) ||
                        item.label.toLowerCase().includes(q)
                    )
                  );
                })
                .map((group) => {
                  const matchingItems = group.items.filter((item) => {
                    if (!batchSearchFilter.trim()) return true;
                    const q = batchSearchFilter.toLowerCase();
                    return (
                      group.benchmarkName.toLowerCase().includes(q) ||
                      item.effectiveTitle.toLowerCase().includes(q) ||
                      item.label.toLowerCase().includes(q)
                    );
                  });

                  const allSelected = matchingItems.length > 0 && matchingItems.every((item) =>
                    selectedExportKeys.has(item.exportKey)
                  );
                  const someSelected = matchingItems.some((item) =>
                    selectedExportKeys.has(item.exportKey)
                  );

                  return (
                    <div
                      key={group.benchmarkId}
                      className="bg-brand-surface/50 border border-brand-border/60 rounded-xl overflow-hidden"
                    >
                      {/* Group Header with master checkbox */}
                      <div className="px-3.5 py-2 bg-brand-surface/90 border-b border-brand-border/40 flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={() => toggleGroupTargets(matchingItems)}
                            className="accent-brand-red w-4 h-4 rounded cursor-pointer"
                          />
                          <span className="font-bold text-xs text-white">
                            {group.benchmarkName}
                          </span>
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          {matchingItems.filter((i) => selectedExportKeys.has(i.exportKey)).length} / {matchingItems.length} selected
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-brand-border/30">
                        {matchingItems.map((item) => {
                          const isSelected = selectedExportKeys.has(item.exportKey);
                          const isCombined = item.exportKey.endsWith("__all");
                          return (
                            <label
                              key={item.exportKey}
                              className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition select-none ${
                                isSelected
                                  ? "bg-brand-red/5 hover:bg-brand-red/10"
                                  : "hover:bg-brand-surface/40"
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTarget(item.exportKey)}
                                  className="accent-brand-red w-3.5 h-3.5 rounded cursor-pointer"
                                />
                                <div className="truncate">
                                  <div className="flex items-center space-x-2">
                                    {item.isSubGroup ? (
                                      <span className="text-slate-400 text-xs font-mono">↳</span>
                                    ) : null}
                                    <span
                                      className={`text-xs font-semibold truncate ${
                                        isSelected ? "text-white" : "text-slate-300"
                                      }`}
                                    >
                                      {item.isSubGroup
                                        ? item.subGroupLabel || item.label
                                        : isCombined
                                        ? "All Metrics Combined"
                                        : item.label}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate pl-4">
                                    {item.selectedMetrics.join(", ")}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                {isCombined ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                    Combined
                                  </span>
                                ) : (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                      item.higherIsBetter
                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    }`}
                                  >
                                    {item.higherIsBetter ? "Higher Better" : "Lower Better"}
                                  </span>
                                )}
                                {item.unit && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                    {item.unit}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {allAvailableTargets.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No benchmarks available in current dataset.
                </div>
              )}
            </div>

            {/* Live Progress Bar when Exporting */}
            {isExporting && exportProgress && (
              <div className="p-3 bg-brand-dark/80 border-t border-brand-red/40 space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-red" />
                    <span>
                      Exporting {exportProgress.current} of {exportProgress.total}:{" "}
                      <span className="text-brand-red">{exportProgress.benchmarkName}</span>
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-red to-rose-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-brand-border/80 bg-brand-surface/60 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-300">
                <span className="text-brand-red font-bold">{selectedExportKeys.size}</span> of{" "}
                <span className="text-white font-bold">{allAvailableTargets.length}</span> charts selected
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-surface hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isExporting || selectedExportKeys.size === 0}
                  onClick={handleExecuteBatchExport}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-900/40 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting...</span>
                    </>
                  ) : batchMode === "individual" ? (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export {selectedExportKeys.size} Charts (Separate)</span>
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-4 h-4" />
                      <span>Export {selectedExportKeys.size} Charts (ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
