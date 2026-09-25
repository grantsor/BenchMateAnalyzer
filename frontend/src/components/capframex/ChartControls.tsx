import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Palette,
  Cpu,
  ArrowDownUp,
  Star,
  Check,
  ChevronDown,
  ArrowLeftRight,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Layers,
  Sparkles,
  Search
} from "lucide-react";
import {
  ChartDesignOptions,
  ExportConfig,
  GroupedBenchmarkDataset,
  DEFAULT_HIGHLIGHT_OPTIONS
} from "../../types/capframex";
import {
  GRADIENT_PRESETS,
  samplePresetColors,
  getPresetHighlightColors,
  hexToRgba
} from "../../utils/capframex/colorPalettes";

interface ChartControlsProps {
  options: ChartDesignOptions;
  onOptionsChange: (opts: Partial<ChartDesignOptions>) => void;
  exportConfig?: ExportConfig;
  onExportConfigChange?: (cfg: Partial<ExportConfig>) => void;
  groupBy: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu";
  onGroupByChange: (val: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu") => void;
  aggregation: "average" | "best" | "latest";
  onAggregationChange: (val: "average" | "best" | "latest") => void;
  availableGpus: string[];
  availableCpus: string[];
  availableMotherboards: string[];
  availableLaptops?: string[];
  availablePowerProfiles?: string[];
  benchmarkMode?: "pc" | "laptop";
  filterGpu: string;
  onFilterGpuChange: (gpu: string) => void;
  filterCpu: string;
  onFilterCpuChange: (cpu: string) => void;
  filterMotherboard: string;
  onFilterMotherboardChange: (mb: string) => void;
  filterLaptop?: string;
  onFilterLaptopChange?: (laptop: string) => void;
  filterPowerProfile?: string;
  onFilterPowerProfileChange?: (profile: string) => void;
  productName?: string;
  onProductNameChange?: (val: string) => void;
  exportPhrase?: string;
  onExportPhraseChange?: (val: string) => void;
  activeDataset?: GroupedBenchmarkDataset;
  defaultLogoData?: { data_url: string; width: number; height: number; aspect_ratio: number };
  onExportActive?: () => void;
  onExportTriResZip?: () => void;
  onExportAllGamesZip?: () => void;
  isExporting?: boolean;
  exportProgressText?: string;
  onOpenGpuHierarchyModal?: () => void;
  gpuHierarchy?: string[];
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  options,
  onOptionsChange,
  groupBy,
  onGroupByChange,
  aggregation,
  onAggregationChange,
  availableGpus,
  availableCpus,
  availableMotherboards,
  availableLaptops = [],
  availablePowerProfiles = [],
  benchmarkMode = "pc",
  filterGpu,
  onFilterGpuChange,
  filterCpu,
  onFilterCpuChange,
  filterMotherboard,
  onFilterMotherboardChange,
  filterLaptop = "",
  onFilterLaptopChange,
  filterPowerProfile = "",
  onFilterPowerProfileChange,
  activeDataset,
  defaultLogoData,
  onOpenGpuHierarchyModal,
  gpuHierarchy
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"style" | "branding">("style");
  const [isHighlightPresetDropdownOpen, setIsHighlightPresetDropdownOpen] = useState(false);
  const [logoConfigRatio, setLogoConfigRatio] = useState<"16:9" | "9:16">("16:9");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightDropdownRef = useRef<HTMLDivElement>(null);
  const [componentSearch, setComponentSearch] = useState("");
  const [isComponentListExpanded, setIsComponentListExpanded] = useState(false);

  const filteredRows = useMemo(() => {
    const rows = activeDataset?.rows || [];
    if (!componentSearch.trim()) return rows;
    const q = componentSearch.toLowerCase().trim();
    return rows.filter((r) => r.display_name.toLowerCase().includes(q));
  }, [activeDataset?.rows, componentSearch]);

  useEffect(() => {
    if (!isHighlightPresetDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (highlightDropdownRef.current && !highlightDropdownRef.current.contains(e.target as Node)) {
        setIsHighlightPresetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isHighlightPresetDropdownOpen]);

  const [isHighlightGradientCollapsed, setIsHighlightGradientCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gp_highlight_gradient_collapsed_v1");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return true; // Collapsed by default to maintain clean look
  });

  const [isStylingPillsCollapsed, setIsStylingPillsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gp_styling_pills_collapsed_v1");
      if (saved !== null) return saved === "true";
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem("gp_highlight_gradient_collapsed_v1", String(isHighlightGradientCollapsed));
    } catch (e) {}
  }, [isHighlightGradientCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem("gp_styling_pills_collapsed_v1", String(isStylingPillsCollapsed));
    } catch (e) {}
  }, [isStylingPillsCollapsed]);

  const handlePresetSelect = (presetId: string) => {
    const preset = GRADIENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const sampled = samplePresetColors(preset.colors, 2);
      onOptionsChange({
        activeGradientPreset: presetId,
        barColors: sampled,
        customMetricColors: {
          average_fps: sampled[0],
          p1_fps: sampled[1]
        }
      });
    }
  };

  const toggleHighlightConfig = (configId: string) => {
    const cur = options.highlightOptions || DEFAULT_HIGHLIGHT_OPTIONS;
    const existing = cur.highlightedConfigIds || [];
    const updated = existing.includes(configId)
      ? existing.filter((id) => id !== configId)
      : [...existing, configId];

    onOptionsChange({
      highlightOptions: {
        ...cur,
        enabled: updated.length > 0 ? true : cur.enabled,
        highlightedConfigIds: updated
      }
    });
  };

  const isHighlighted = (configId: string) =>
    options.highlightOptions?.enabled &&
    options.highlightOptions.highlightedConfigIds?.includes(configId);

  // Custom logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height;
          onOptionsChange({
            logoUrl: dataUrl,
            logoAspectRatio: aspect
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    onOptionsChange({
      ...(defaultLogoData
        ? {
            logoUrl: defaultLogoData.data_url,
            logoAspectRatio: defaultLogoData.aspect_ratio || 2.7778
          }
        : {}),
      logoWidth: 170,
      logoWidth_16_9: 170,
      logoWidth_9_16: 140,
      logoOffsetX: 12,
      logoOffsetY: 10,
      logoOffsetX_16_9: 12,
      logoOffsetY_16_9: 10,
      logoOffsetX_9_16: 10,
      logoOffsetY_9_16: 12,
      logoPosition: "top-right"
    });
  };

  return (
    <aside className="w-96 bg-[#121215] border-l border-[#23232a] flex flex-col h-full select-none overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-4">

        {/* ========================================================================= */}
        {/* CARD 1: DATA, COMPONENTS & PRODUCT HIGHLIGHTING (UNIFIED) */}
        {/* ========================================================================= */}
        <div className="bg-[#18181b] p-3.5 rounded-xl border border-[#23232a] space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Components & Highlighting</span>
            </div>

            {/* Highlighting Master Switch */}
            <div className="flex items-center gap-1.5">
              {options.highlightOptions?.enabled && (options.highlightOptions.highlightedConfigIds?.length || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                  {options.highlightOptions.highlightedConfigIds.length} starred
                </span>
              )}
              <label className="relative inline-flex items-center cursor-pointer" title="Enable/Disable Product Highlighting">
                <input
                  type="checkbox"
                  checked={options.highlightOptions?.enabled ?? false}
                  onChange={(e) => {
                    const isEnabled = e.target.checked;
                    const cur = options.highlightOptions || DEFAULT_HIGHLIGHT_OPTIONS;
                    const highlighted =
                      cur.highlightedConfigIds && cur.highlightedConfigIds.length > 0
                        ? cur.highlightedConfigIds
                        : activeDataset?.rows[0]
                        ? [activeDataset.rows[0].configuration_id]
                        : [];
                    onOptionsChange({
                      highlightOptions: {
                        ...cur,
                        enabled: isEnabled,
                        highlightedConfigIds: highlighted
                      }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 1. Hardware Component Selector (GPU / CPU / Motherboard) */}
          <div>
            <label className="text-[10.5px] font-medium text-slate-400 block mb-1">
              Chart Bars Represent:
            </label>
            {benchmarkMode === "laptop" ? (
              <div className="grid grid-cols-2 gap-1.5 bg-[#121215] p-1.5 rounded-lg border border-[#23232a]">
                <button
                  type="button"
                  onClick={() => onGroupByChange("laptop_power")}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold transition ${
                    groupBy === "laptop_power"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Laptop Name - Power Profile (e.g. HP OMEN MAX 16 - Unleashed)"
                >
                  Laptop - Power Profile
                </button>
                <button
                  type="button"
                  onClick={() => onGroupByChange("power_profile")}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold transition ${
                    groupBy === "power_profile"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Power Profile Only (e.g. Unleashed, Performance, Standard)"
                >
                  Power Profile Only
                </button>
                <button
                  type="button"
                  onClick={() => onGroupByChange("laptop_model")}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold transition ${
                    groupBy === "laptop_model"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Laptop Model (e.g. HP OMEN MAX 16)"
                >
                  Laptop Model
                </button>
                <button
                  type="button"
                  onClick={() => onGroupByChange("laptop_gpu")}
                  className={`py-1.5 px-2 rounded text-[11px] font-semibold transition ${
                    groupBy === "laptop_gpu"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="GPU Specs (with CPU marker)"
                >
                  GPU Spec
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 bg-[#121215] p-1 rounded-lg border border-[#23232a]">
                <button
                  type="button"
                  onClick={() => onGroupByChange("gpu")}
                  className={`py-1 rounded text-xs font-semibold transition ${
                    groupBy === "gpu"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  GPU
                </button>
                <button
                  type="button"
                  onClick={() => onGroupByChange("cpu")}
                  className={`py-1 rounded text-xs font-semibold transition ${
                    groupBy === "cpu"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  CPU
                </button>
                <button
                  type="button"
                  onClick={() => onGroupByChange("motherboard")}
                  className={`py-1 rounded text-xs font-semibold transition ${
                    groupBy === "motherboard"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Motherboard
                </button>
              </div>
            )}
          </div>

          {/* 2. Cross-Filters (Hardware Context Filters) */}
          <div className="space-y-2">
            {groupBy !== "gpu" && groupBy !== "laptop_gpu" && availableGpus.length > 1 && (
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  {benchmarkMode === "laptop" ? "Filter by Laptop GPU:" : "Filter by Graphics Card (GPU):"}
                </label>
                <select
                  value={filterGpu}
                  onChange={(e) => onFilterGpuChange(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All GPUs</option>
                  {availableGpus.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {groupBy !== "cpu" && availableCpus.length > 1 && (
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  {benchmarkMode === "laptop" ? "Filter by Laptop CPU:" : "Filter by Processor (CPU):"}
                </label>
                <select
                  value={filterCpu}
                  onChange={(e) => onFilterCpuChange(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All CPUs</option>
                  {availableCpus.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {benchmarkMode !== "laptop" && groupBy !== "motherboard" && availableMotherboards.length > 1 && (
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Filter by Motherboard:
                </label>
                <select
                  value={filterMotherboard}
                  onChange={(e) => onFilterMotherboardChange(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Motherboards</option>
                  {availableMotherboards.map((mb) => (
                    <option key={mb} value={mb}>
                      {mb}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {benchmarkMode === "laptop" && availablePowerProfiles && availablePowerProfiles.length > 1 && onFilterPowerProfileChange && groupBy !== "power_profile" && groupBy !== "laptop_power" && (
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Filter by Power Profile:
                </label>
                <select
                  value={filterPowerProfile}
                  onChange={(e) => onFilterPowerProfileChange(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Power Profiles</option>
                  {availablePowerProfiles.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {benchmarkMode === "laptop" && availableLaptops && availableLaptops.length > 1 && onFilterLaptopChange && groupBy !== "laptop_model" && groupBy !== "laptop_power" && (
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Filter by Laptop:
                </label>
                <select
                  value={filterLaptop}
                  onChange={(e) => onFilterLaptopChange(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Laptops</option>
                  {availableLaptops.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Component Selection List (Checkboxes to choose which are seen in graph + Star to Highlight) */}
          <div className="space-y-2 pt-1 border-t border-[#23232a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-[11px] font-semibold text-slate-300 block truncate">
                  Components on Graph ({activeDataset?.rows.length || 0}):
                </label>
                {componentSearch && (
                  <span className="text-[10px] text-blue-400 font-mono shrink-0">
                    ({filteredRows.length} match)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const idsToSelect = filteredRows.map((r) => r.configuration_id);
                    const existing = options.selectedConfigIds || [];
                    const merged = Array.from(new Set([...existing, ...idsToSelect]));
                    onOptionsChange({ selectedConfigIds: merged });
                  }}
                  className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    if (componentSearch) {
                      const idsToDeselect = new Set(filteredRows.map((r) => r.configuration_id));
                      const next = (options.selectedConfigIds || []).filter((id) => !idsToDeselect.has(id));
                      onOptionsChange({ selectedConfigIds: next });
                    } else {
                      onOptionsChange({ selectedConfigIds: [] });
                    }
                  }}
                  className="text-slate-400 hover:text-slate-300 hover:underline font-semibold"
                >
                  Reset
                </button>
                {(activeDataset?.rows.length || 0) > 6 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setIsComponentListExpanded(!isComponentListExpanded)}
                      className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
                      title={isComponentListExpanded ? "Limit list height" : "Expand list to show all components"}
                    >
                      {isComponentListExpanded ? "Compact" : "Expand"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Search filter when there are 6+ components */}
            {(activeDataset?.rows.length || 0) > 6 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search ${activeDataset?.rows.length || 0} components...`}
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                {componentSearch && (
                  <button
                    type="button"
                    onClick={() => setComponentSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            <div
              className={`${
                isComponentListExpanded
                  ? "max-h-none"
                  : "max-h-[34rem] sm:max-h-[38rem]"
              } overflow-y-auto space-y-1 pr-1 transition-all duration-200`}
            >
              {filteredRows.map((r) => {
                const highlighted = isHighlighted(r.configuration_id);
                const isChecked =
                  !options.selectedConfigIds ||
                  options.selectedConfigIds.length === 0 ||
                  options.selectedConfigIds.includes(r.configuration_id);

                const toggleRowCheck = () => {
                  const allIds = activeDataset?.rows.map((row) => row.configuration_id) || [];
                  const current =
                    options.selectedConfigIds && options.selectedConfigIds.length > 0
                      ? options.selectedConfigIds
                      : allIds;
                  const next = current.includes(r.configuration_id)
                    ? current.filter((id) => id !== r.configuration_id)
                    : [...current, r.configuration_id];
                  onOptionsChange({ selectedConfigIds: next });
                };

                return (
                  <div
                    key={r.configuration_id}
                    className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg border text-xs transition ${
                      highlighted
                        ? "bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-sm"
                        : isChecked
                        ? "bg-[#121215] border-[#23232a] text-slate-300 hover:border-slate-600"
                        : "bg-[#121215]/40 border-[#23232a]/40 text-slate-500 opacity-60"
                    }`}
                  >
                    <div
                      className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                      onClick={toggleRowCheck}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRowCheck();
                        }}
                        className="accent-blue-600 w-3.5 h-3.5 rounded shrink-0 cursor-pointer"
                        title={isChecked ? "Uncheck to hide from graph" : "Check to show on graph"}
                      />
                      <span
                        className={`font-semibold truncate ${
                          highlighted
                            ? "text-blue-300"
                            : isChecked
                            ? "text-slate-200"
                            : "text-slate-500 line-through"
                        }`}
                        title={r.display_name}
                      >
                        {r.display_name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleHighlightConfig(r.configuration_id);
                      }}
                      className={`p-1 ml-1.5 rounded-lg transition shrink-0 ${
                        highlighted
                          ? "text-blue-400 hover:text-blue-300 bg-blue-500/20"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                      title={highlighted ? "Remove highlight" : "Star to highlight on chart"}
                    >
                      <Star className={`w-3.5 h-3.5 ${highlighted ? "fill-blue-400 text-blue-400" : ""}`} />
                    </button>
                  </div>
                );
              })}
              {filteredRows.length === 0 && (
                <div className="py-4 text-center text-xs text-slate-500 italic">
                  No components match "{componentSearch}"
                </div>
              )}
            </div>
          </div>

          {/* 4. Product Highlighting Controls (Only Shown when Item is Highlighted) */}
          {options.highlightOptions?.enabled && (options.highlightOptions.highlightedConfigIds?.length || 0) > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#23232a]">
              {/* Collapsible Highlight Bar & Effects Section */}
              <div className="rounded-lg border border-[#23232a] bg-[#121215] relative z-20">
                <button
                  type="button"
                  onClick={() => setIsHighlightGradientCollapsed(!isHighlightGradientCollapsed)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition text-left rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-200">
                      Highlight Bar & Effects
                    </span>
                    {options.highlightOptions?.useHighlightBarColor ? (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                        Custom Gradient
                      </span>
                    ) : (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        Monochromatic Blue (Default)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {(() => {
                      const activeStart =
                        options.highlightOptions?.highlightBarGradient?.[0] ||
                        options.highlightOptions?.highlightBarColor ||
                        "#2563eb";
                      const activeEnd =
                        options.highlightOptions?.highlightBarGradient?.[1] ||
                        "#60a5fa";
                      return (
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                          style={{
                            background: options.highlightOptions?.useHighlightBarColor
                              ? `linear-gradient(135deg, ${activeStart}, ${activeEnd})`
                              : activeStart
                          }}
                        />
                      );
                    })()}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        !isHighlightGradientCollapsed ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {!isHighlightGradientCollapsed && (
                  <div className="p-2.5 pt-2 space-y-3 border-t border-[#23232a]">
                    {/* Highlight Gradient Preset Dropdown */}
                    <div className="space-y-1 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">
                          Highlight Gradient Preset
                        </label>
                        {options.highlightOptions?.activePresetId && (
                          <span className="text-[10px] text-blue-400 font-mono">
                            {GRADIENT_PRESETS.find((p) => p.id === options.highlightOptions?.activePresetId)?.name}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsHighlightPresetDropdownOpen(!isHighlightPresetDropdownOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-[#18181b] border border-[#2a2a32] text-xs text-white hover:border-slate-500 transition shadow-sm"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {(() => {
                            const activeStart =
                              options.highlightOptions?.highlightBarGradient?.[0] ||
                              options.highlightOptions?.highlightBarColor ||
                              "#2563eb";
                            const activeEnd =
                              options.highlightOptions?.highlightBarGradient?.[1] ||
                              "#60a5fa";
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
                              (p) => p.id === options.highlightOptions?.activePresetId
                            )?.name || "Custom / Manual Colors"}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                            isHighlightPresetDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isHighlightPresetDropdownOpen && (
                        <div
                          ref={highlightDropdownRef}
                          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto bg-slate-900 border border-[#2a2a32] rounded-xl shadow-2xl p-1.5 space-y-1"
                        >
                          {GRADIENT_PRESETS.map((p) => {
                            const isSelected = options.highlightOptions?.activePresetId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  const [startCol, endCol] = getPresetHighlightColors(p.id);
                                  onOptionsChange({
                                    highlightOptions: {
                                      ...options.highlightOptions!,
                                      activePresetId: p.id,
                                      highlightBarColor: startCol,
                                      highlightBarGradient: [startCol, endCol],
                                      rowShadeColor: hexToRgba(startCol, 0.15),
                                      dividingLineColor: hexToRgba(startCol, 0.6)
                                    }
                                  });
                                  setIsHighlightPresetDropdownOpen(false);
                                }}
                                className={`w-full text-left p-2 rounded-lg transition ${
                                  isSelected
                                    ? "bg-slate-800 border border-blue-500/60 text-white shadow-sm"
                                    : "hover:bg-slate-800 text-slate-300 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-semibold truncate">
                                    {p.name}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1.5" />
                                  )}
                                </div>
                                <div
                                  className="h-2 w-full rounded shadow-inner border border-white/10"
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

                    {/* Enable Highlight Bar Gradient Checkbox & Controls */}
                    <div className="space-y-2 p-2 bg-[#18181b] rounded-lg border border-[#2a2a32]">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-semibold text-slate-200">
                          <input
                            type="checkbox"
                            checked={options.highlightOptions?.useHighlightBarColor ?? false}
                            onChange={(e) =>
                              onOptionsChange({
                                highlightOptions: {
                                  ...options.highlightOptions!,
                                  useHighlightBarColor: e.target.checked
                                }
                              })
                            }
                            className="accent-blue-600 w-3.5 h-3.5 rounded"
                          />
                          <span>Enable Bar Gradient</span>
                        </label>

                        {options.highlightOptions?.useHighlightBarColor && (
                          <button
                            type="button"
                            onClick={() => {
                              const curStart =
                                options.highlightOptions?.highlightBarGradient?.[0] ||
                                options.highlightOptions?.highlightBarColor ||
                                "#2563eb";
                              const curEnd =
                                options.highlightOptions?.highlightBarGradient?.[1] ||
                                "#60a5fa";
                              onOptionsChange({
                                highlightOptions: {
                                  ...options.highlightOptions!,
                                  highlightBarColor: curEnd,
                                  highlightBarGradient: [curEnd, curStart],
                                  rowShadeColor: hexToRgba(curEnd, 0.15),
                                  dividingLineColor: hexToRgba(curEnd, 0.6)
                                }
                              });
                            }}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-bold transition shadow-sm"
                            title="Switch Start & End Colors (Reverse Gradient Direction)"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        )}
                      </div>

                      {options.highlightOptions?.useHighlightBarColor && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">Start Color</span>
                              <div className="flex items-center space-x-1.5 bg-[#121215] px-2 py-1 rounded border border-[#2a2a32]">
                                <input
                                  type="color"
                                  value={
                                    options.highlightOptions.highlightBarGradient?.[0] ||
                                    options.highlightOptions.highlightBarColor ||
                                    "#2563eb"
                                  }
                                  onChange={(e) => {
                                    const col = e.target.value;
                                    onOptionsChange({
                                      highlightOptions: {
                                        ...options.highlightOptions!,
                                        activePresetId: undefined,
                                        highlightBarColor: col,
                                        highlightBarGradient: [
                                          col,
                                          options.highlightOptions?.highlightBarGradient?.[1] || col
                                        ],
                                        rowShadeColor: hexToRgba(col, 0.15),
                                        dividingLineColor: hexToRgba(col, 0.6)
                                      }
                                    });
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-slate-300 uppercase truncate">
                                  {options.highlightOptions.highlightBarGradient?.[0] ||
                                    options.highlightOptions.highlightBarColor ||
                                    "#2563eb"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 block mb-0.5">End Color</span>
                              <div className="flex items-center space-x-1.5 bg-[#121215] px-2 py-1 rounded border border-[#2a2a32]">
                                <input
                                  type="color"
                                  value={options.highlightOptions.highlightBarGradient?.[1] || "#60a5fa"}
                                  onChange={(e) => {
                                    const col = e.target.value;
                                    onOptionsChange({
                                      highlightOptions: {
                                        ...options.highlightOptions!,
                                        activePresetId: undefined,
                                        highlightBarGradient: [
                                          options.highlightOptions?.highlightBarGradient?.[0] || "#2563eb",
                                          col
                                        ]
                                      }
                                    });
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                                />
                                <span className="text-[10px] font-mono text-slate-300 uppercase truncate">
                                  {options.highlightOptions.highlightBarGradient?.[1] || "#60a5fa"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Preset Color Swatches for Quick Shade Selection */}
                          {(() => {
                            const activeP = GRADIENT_PRESETS.find(
                              (p) => p.id === options.highlightOptions?.activePresetId
                            );
                            if (!activeP) return null;
                            return (
                              <div className="space-y-1 pt-1.5 border-t border-[#23232a]">
                                <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                                  <span>Swatches ({activeP.name})</span>
                                  <span>Left: Start • Right: End</span>
                                </div>
                                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
                                  {activeP.colors.map((c, idx) => {
                                    const isStart =
                                      (options.highlightOptions?.highlightBarGradient?.[0] ||
                                        options.highlightOptions?.highlightBarColor) === c;
                                    const isEnd =
                                      options.highlightOptions?.highlightBarGradient?.[1] === c;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          onOptionsChange({
                                            highlightOptions: {
                                              ...options.highlightOptions!,
                                              highlightBarColor: c,
                                              highlightBarGradient: [
                                                c,
                                                options.highlightOptions?.highlightBarGradient?.[1] || c
                                              ],
                                              rowShadeColor: hexToRgba(c, 0.15),
                                              dividingLineColor: hexToRgba(c, 0.6)
                                            }
                                          });
                                        }}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          onOptionsChange({
                                            highlightOptions: {
                                              ...options.highlightOptions!,
                                              highlightBarGradient: [
                                                options.highlightOptions?.highlightBarGradient?.[0] ||
                                                  "#2563eb",
                                                c
                                              ]
                                            }
                                          });
                                        }}
                                        className={`w-5 h-5 rounded border transition shadow-sm shrink-0 flex items-center justify-center ${
                                          isStart || isEnd
                                            ? "border-white ring-2 ring-blue-400 scale-110"
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

                    {/* Row Shade & Line Division Switches */}
                    <div className="space-y-1.5 p-2 bg-[#18181b] rounded-lg border border-[#2a2a32]">
                      <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={options.highlightOptions.useRowBackgroundShade ?? true}
                          onChange={(e) =>
                            onOptionsChange({
                              highlightOptions: {
                                ...options.highlightOptions!,
                                useRowBackgroundShade: e.target.checked
                              }
                            })
                          }
                          className="accent-blue-600 w-3.5 h-3.5 rounded"
                        />
                        <span>Row Background Shade Strip</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={options.highlightOptions.useRowDividingLine ?? true}
                          onChange={(e) =>
                            onOptionsChange({
                              highlightOptions: {
                                ...options.highlightOptions!,
                                useRowDividingLine: e.target.checked
                              }
                            })
                          }
                          className="accent-blue-600 w-3.5 h-3.5 rounded"
                        />
                        <span>Top & Bottom Dividing Lines</span>
                      </label>
                    </div>

                    {/* Target Reference Line */}
                    <div className="space-y-2 p-2 bg-[#18181b] rounded-lg border border-[#2a2a32]">
                      <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-200">
                        <input
                          type="checkbox"
                          checked={options.highlightOptions.useReferenceLine ?? false}
                          onChange={(e) =>
                            onOptionsChange({
                              highlightOptions: {
                                ...options.highlightOptions!,
                                useReferenceLine: e.target.checked
                              }
                            })
                          }
                          className="accent-blue-600 w-3.5 h-3.5 rounded"
                        />
                        <span>Target Reference Line</span>
                      </label>

                      {options.highlightOptions.useReferenceLine && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2a2a32]">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Target Value</span>
                            <input
                              type="number"
                              value={options.highlightOptions.referenceLineValue ?? 60}
                              onChange={(e) =>
                                onOptionsChange({
                                  highlightOptions: {
                                    ...options.highlightOptions!,
                                    referenceLineValue: parseFloat(e.target.value) || 0
                                  }
                                })
                              }
                              className="w-full bg-[#121215] border border-[#2a2a32] rounded px-2 py-1 text-xs text-slate-200 font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Line Label</span>
                            <input
                              type="text"
                              value={options.highlightOptions.referenceLineLabel ?? "60 FPS TARGET"}
                              onChange={(e) =>
                                onOptionsChange({
                                  highlightOptions: {
                                    ...options.highlightOptions!,
                                    referenceLineLabel: e.target.value
                                  }
                                })
                              }
                              className="w-full bg-[#121215] border border-[#2a2a32] rounded px-2 py-1 text-xs text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Chart Sorting Scope & Method Controls */}
          <div className="space-y-2.5 pt-2 border-t border-[#23232a]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ArrowDownUp className="w-3 h-3 text-blue-400" />
                  <span>Chart Sorting Method:</span>
                </label>
                <span className="text-[10px] font-medium text-slate-400">
                  {benchmarkMode !== "laptop" && ((options.chartSortMode ?? (options.useGpuHierarchySort && groupBy === "gpu" ? "gpu_hierarchy" : options.sortOrder === "asc" ? "score_asc" : options.sortOrder === "alpha" ? "alpha_asc" : options.sortOrder === "original" ? "original" : "score_desc")) === "gpu_hierarchy")
                    ? "Tier Ranked"
                    : "Whole Chart"}
                </span>
              </div>
              <select
                value={
                  options.chartSortMode ??
                  (options.useGpuHierarchySort && groupBy === "gpu" && benchmarkMode !== "laptop"
                    ? "gpu_hierarchy"
                    : options.sortOrder === "asc"
                    ? "score_asc"
                    : options.sortOrder === "alpha"
                    ? "alpha_asc"
                    : options.sortOrder === "original"
                    ? "original"
                    : "score_desc")
                }
                onChange={(e) => {
                  const mode = e.target.value;
                  if (mode === "gpu_hierarchy") {
                    onOptionsChange({
                      chartSortMode: "gpu_hierarchy",
                      useGpuHierarchySort: true
                    });
                  } else if (mode === "score_desc") {
                    onOptionsChange({
                      chartSortMode: "score_desc",
                      useGpuHierarchySort: false,
                      sortOrder: "desc"
                    });
                  } else if (mode === "score_asc") {
                    onOptionsChange({
                      chartSortMode: "score_asc",
                      useGpuHierarchySort: false,
                      sortOrder: "asc"
                    });
                  } else if (mode === "alpha_asc") {
                    onOptionsChange({
                      chartSortMode: "alpha_asc",
                      useGpuHierarchySort: false,
                      sortOrder: "alpha"
                    });
                  } else if (mode === "alpha_desc") {
                    onOptionsChange({
                      chartSortMode: "alpha_desc",
                      useGpuHierarchySort: false
                    });
                  } else if (mode === "original") {
                    onOptionsChange({
                      chartSortMode: "original",
                      useGpuHierarchySort: false,
                      sortOrder: "original"
                    });
                  }
                }}
                className="w-full bg-[#121215] border border-[#23232a] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                {benchmarkMode !== "laptop" && groupBy === "gpu" && (
                  <option value="gpu_hierarchy">
                    🏆 GPU Model Hierarchy (Tier Rank First)
                  </option>
                )}
                <option value="score_desc">
                  ⚡ Highest Score First (Sort Whole Chart)
                </option>
                <option value="score_asc">
                  📉 Lowest Score First (Sort Whole Chart)
                </option>
                <option value="alpha_asc">
                  🔤 Alphabetical: A to Z (Sort Whole Chart)
                </option>
                <option value="alpha_desc">
                  🔤 Alphabetical: Z to A (Sort Whole Chart)
                </option>
                <option value="original">
                  📄 Original Capture Order
                </option>
              </select>
            </div>

            {/* When GPU Hierarchy is active, show Within-Tier Sort & Configure Tiers button */}
            {benchmarkMode !== "laptop" && ((options.chartSortMode ?? (options.useGpuHierarchySort && groupBy === "gpu" ? "gpu_hierarchy" : options.sortOrder === "asc" ? "score_asc" : options.sortOrder === "alpha" ? "alpha_asc" : options.sortOrder === "original" ? "original" : "score_desc")) === "gpu_hierarchy") && groupBy === "gpu" && (
              <div className="p-2.5 bg-[#121215] rounded-lg border border-[#23232a] space-y-2">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-400 font-medium">Within-Tier Sorting:</span>
                  {onOpenGpuHierarchyModal && (
                    <button
                      type="button"
                      onClick={onOpenGpuHierarchyModal}
                      className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition text-[10px] font-semibold flex items-center gap-1"
                      title="Configure GPU model ranking tiers"
                    >
                      <Layers className="w-3 h-3" />
                      Configure Tiers ({gpuHierarchy?.length || 28})
                    </button>
                  )}
                </div>

                <select
                  value={options.withinTierSortOrder || options.sortOrder || "desc"}
                  onChange={(e) =>
                    onOptionsChange({
                      withinTierSortOrder: e.target.value as any,
                      sortOrder: e.target.value as any
                    })
                  }
                  className="w-full bg-[#18181b] border border-[#2a2a32] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="desc">Highest Score First (Within Model)</option>
                  <option value="asc">Lowest Score First (Within Model)</option>
                  <option value="alpha">Alphabetical (A - Z)</option>
                </select>
              </div>
            )}

            {/* Multiple Run Aggregation */}
            <div>
              <label className="text-[10.5px] font-medium text-slate-400 block mb-1">
                Multiple Run Aggregation:
              </label>
              <select
                value={aggregation}
                onChange={(e) => onAggregationChange(e.target.value as any)}
                className="w-full bg-[#121215] border border-[#23232a] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="average">Average of All Runs (Default)</option>
                <option value="best">Best Run (Highest Avg FPS)</option>
                <option value="latest">Latest Capture Timestamp</option>
              </select>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CARD 2: CHART STYLING & BRANDING (GROUPED WITH TABS) */}
        {/* ========================================================================= */}
        <div className="bg-[#18181b] p-3.5 rounded-xl border border-[#23232a] space-y-3">
          {/* Grouped Header with Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsStylingPillsCollapsed(!isStylingPillsCollapsed)}
            className="w-full flex items-center justify-between hover:opacity-90 transition text-left select-none"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Chart Styling & Branding</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-medium">
                {isStylingPillsCollapsed
                  ? "Collapsed"
                  : activeSettingsTab === "style"
                  ? "Style & Colors"
                  : "Branding & Logo"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  !isStylingPillsCollapsed ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {!isStylingPillsCollapsed && (
            <>
              {/* Pill Tabs */}
              <div className="flex bg-[#121215] p-1 rounded-lg border border-[#23232a]">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSettingsTab === "style" && !isStylingPillsCollapsed) {
                      setIsStylingPillsCollapsed(true);
                    } else {
                      setActiveSettingsTab("style");
                      setIsStylingPillsCollapsed(false);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded text-xs font-semibold transition ${
                    activeSettingsTab === "style"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Style & Colors</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSettingsTab === "branding" && !isStylingPillsCollapsed) {
                      setIsStylingPillsCollapsed(true);
                    } else {
                      setActiveSettingsTab("branding");
                      setIsStylingPillsCollapsed(false);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded text-xs font-semibold transition ${
                    activeSettingsTab === "branding"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Branding & Logo</span>
                </button>
              </div>

          {/* SUB-TAB 1: STYLE & COLORS */}
          {activeSettingsTab === "style" && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Color Gradient Preset:
                </label>
                <select
                  value={options.activeGradientPreset || "excel-blue"}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full bg-[#121215] border border-[#23232a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {GRADIENT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === "excel-blue" ? "(Monochromatic Blue Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric Colors */}
              <div className="space-y-2 pt-1 border-t border-[#23232a]">
                <label className="text-[11px] font-medium text-slate-400 block">
                  Metric Custom Colors:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 bg-[#121215] rounded-lg border border-[#23232a]">
                    <span className="text-[11px] font-medium text-slate-300">Average FPS</span>
                    <input
                      type="color"
                      value={options.customMetricColors?.["average_fps"] || options.barColors[0] || "#1e3a8a"}
                      onChange={(e) =>
                        onOptionsChange({
                          customMetricColors: {
                            ...options.customMetricColors,
                            average_fps: e.target.value
                          }
                        })
                      }
                      className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#121215] rounded-lg border border-[#23232a]">
                    <span className="text-[11px] font-medium text-slate-300">1% Low FPS</span>
                    <input
                      type="color"
                      value={options.customMetricColors?.["p1_fps"] || options.barColors[1] || "#2563eb"}
                      onChange={(e) =>
                        onOptionsChange({
                          customMetricColors: {
                            ...options.customMetricColors,
                            p1_fps: e.target.value
                          }
                        })
                      }
                      className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Canvas Theme & Toggles */}
              <div className="pt-2 border-t border-[#23232a] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Canvas Preview Theme</span>
                  <button
                    type="button"
                    onClick={() =>
                      onOptionsChange({
                        theme: options.theme === "light" ? "dark" : "light"
                      })
                    }
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition ${
                      options.theme === "light"
                        ? "bg-white text-slate-900 border-slate-300 shadow-sm"
                        : "bg-[#0d1b2a] text-white border-slate-700"
                    }`}
                  >
                    {options.theme === "light" ? "Pure White (#fff)" : "Dark (#0d1b2a)"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Corner Triangles</span>
                  <input
                    type="checkbox"
                    checked={options.showDecorations}
                    onChange={(e) => onOptionsChange({ showDecorations: e.target.checked })}
                    className="accent-blue-600 w-4 h-4 cursor-pointer rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Score Numbers</span>
                  <input
                    type="checkbox"
                    checked={options.showValues}
                    onChange={(e) => onOptionsChange({ showValues: e.target.checked })}
                    className="accent-blue-600 w-4 h-4 cursor-pointer rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Number Position</span>
                  <select
                    value={options.barValuePosition || "auto"}
                    onChange={(e) => onOptionsChange({ barValuePosition: e.target.value as any })}
                    className="bg-[#121215] border border-[#23232a] rounded px-2 py-0.5 text-[11px] text-slate-200"
                  >
                    <option value="auto">Auto (Adaptive)</option>
                    <option value="inside">Inside Bars</option>
                    <option value="outside">Outside Bars</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-slate-400">Bar Layout</span>
                    <span className="text-[10px] text-slate-500">Merged 1% + Avg for dense cards</span>
                  </div>
                  <select
                    value={options.barLayout || "auto"}
                    onChange={(e) => onOptionsChange({ barLayout: e.target.value as any })}
                    className="bg-[#121215] border border-[#23232a] rounded px-2 py-0.5 text-[11px] text-slate-200 font-semibold"
                  >
                    <option value="auto">Auto (Merged if ≥6 GPUs)</option>
                    <option value="merged">Merged (Combined 1% + Avg)</option>
                    <option value="grouped">Grouped (Separate Bars)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: BRANDING & LOGO */}
          {activeSettingsTab === "branding" && (
            <div className="space-y-3 pt-1">
              {/* Logo Preview & Upload */}
              <div className="flex items-center space-x-3 p-2.5 bg-[#121215] rounded-xl border border-[#23232a]">
                <div className="w-20 h-10 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden border border-slate-300 shrink-0 shadow-inner">
                  {options.logoUrl ? (
                    <img
                      src={options.logoUrl}
                      alt="Brand Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] text-slate-400 font-semibold">No Logo</span>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-1">
                  <label className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer transition shadow">
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#18181b] border border-[#23232a] hover:border-slate-500 text-slate-300 text-[10px] font-semibold transition"
                    title="Reset to default Gadget Pilipinas logo & dimensions"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const img = new Image();
                      img.onload = () => {
                        const aspect = img.naturalWidth / img.naturalHeight;
                        onOptionsChange({
                          logoUrl: "/capframex-logo.png",
                          logoAspectRatio: aspect,
                          publicationLogoText: "CAPFRAMEX"
                        });
                      };
                      img.src = "/capframex-logo.png";
                    }}
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#18181b] border border-[#23232a] hover:border-emerald-500/50 text-emerald-400 text-[10px] font-semibold transition"
                    title="Use official CapFrameX logo on charts"
                  >
                    <span>CapFrameX</span>
                  </button>
                </div>
              </div>

              {/* Logo Placement */}
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-semibold block">
                  Logo Placement
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ logoPosition: "top-left" })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      options.logoPosition === "top-left"
                        ? "bg-blue-600 text-white border-blue-500 shadow"
                        : "bg-[#121215] text-slate-400 border-[#23232a] hover:text-white"
                    }`}
                  >
                    Upper Left
                  </button>
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ logoPosition: "top-right" })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      options.logoPosition === "top-right"
                        ? "bg-blue-600 text-white border-blue-500 shadow"
                        : "bg-[#121215] text-slate-400 border-[#23232a] hover:text-white"
                    }`}
                  >
                    Upper Right
                  </button>
                </div>
              </div>

              {/* Profile Switcher & Sliders */}
              <div className="pt-2 border-t border-[#23232a] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Configure Profile:
                  </span>
                  <div className="flex bg-[#121215] p-0.5 rounded border border-[#23232a]">
                    <button
                      type="button"
                      onClick={() => setLogoConfigRatio("16:9")}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                        logoConfigRatio === "16:9"
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      16:9 Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoConfigRatio("9:16")}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                        logoConfigRatio === "9:16"
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      9:16 Mobile
                    </button>
                  </div>
                </div>

                {/* Logo Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-semibold">
                      Logo Size ({logoConfigRatio})
                    </span>
                    <span className="text-[11px] text-blue-400 font-mono font-bold">
                      {logoConfigRatio === "9:16"
                        ? (options.logoWidth_9_16 ?? 140)
                        : (options.logoWidth_16_9 ?? options.logoWidth ?? 170)}
                      {" "}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="320"
                    step="10"
                    value={
                      logoConfigRatio === "9:16"
                        ? (options.logoWidth_9_16 ?? 140)
                        : (options.logoWidth_16_9 ?? options.logoWidth ?? 170)
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onOptionsChange(
                        logoConfigRatio === "9:16"
                          ? {
                              logoWidth_9_16: val,
                              ...(options.aspectRatio === "9:16" ? { logoWidth: val } : {})
                            }
                          : {
                              logoWidth_16_9: val,
                              ...(options.aspectRatio === "16:9" ? { logoWidth: val } : {})
                            }
                      );
                    }}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#121215] rounded-lg"
                  />
                </div>

                {/* Edge Offset Sliders */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold truncate">
                        Horizontal
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono font-bold">
                        {logoConfigRatio === "9:16"
                          ? (options.logoOffsetX_9_16 ?? 10)
                          : (options.logoOffsetX_16_9 ?? options.logoOffsetX ?? 12)}
                        {" "}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="2"
                      value={
                        logoConfigRatio === "9:16"
                          ? (options.logoOffsetX_9_16 ?? 10)
                          : (options.logoOffsetX_16_9 ?? options.logoOffsetX ?? 12)
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onOptionsChange(
                          logoConfigRatio === "9:16"
                            ? {
                                logoOffsetX_9_16: val,
                                ...(options.aspectRatio === "9:16" ? { logoOffsetX: val } : {})
                              }
                            : {
                                logoOffsetX_16_9: val,
                                ...(options.aspectRatio === "16:9" ? { logoOffsetX: val } : {})
                              }
                        );
                      }}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#121215] rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold truncate">
                        Vertical
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono font-bold">
                        {logoConfigRatio === "9:16"
                          ? (options.logoOffsetY_9_16 ?? 12)
                          : (options.logoOffsetY_16_9 ?? options.logoOffsetY ?? 10)}
                        {" "}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="2"
                      value={
                        logoConfigRatio === "9:16"
                          ? (options.logoOffsetY_9_16 ?? 12)
                          : (options.logoOffsetY_16_9 ?? options.logoOffsetY ?? 10)
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onOptionsChange(
                          logoConfigRatio === "9:16"
                            ? {
                                logoOffsetY_9_16: val,
                                ...(options.aspectRatio === "9:16" ? { logoOffsetY: val } : {})
                              }
                            : {
                                logoOffsetY_16_9: val,
                                ...(options.aspectRatio === "16:9" ? { logoOffsetY: val } : {})
                              }
                        );
                      }}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#121215] rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

      </div>
    </aside>
  );
};
