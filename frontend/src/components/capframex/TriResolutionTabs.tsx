import React, { useMemo, useState } from "react";
import { Monitor, Download, Grid, Type, Tv, Edit3, Save, Check, BarChart3 } from "lucide-react";
import { GroupedBenchmarkDataset, ChartDesignOptions, ExportConfig, BenchmarkMode, CustomChart } from "../../types/capframex";
import { BenchmarkChart } from "./BenchmarkChart";
import { buildChartFileName } from "../../utils/capframex/chartExporter";

interface TriResolutionTabsProps {
  gameName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  datasets: Record<string, GroupedBenchmarkDataset | undefined>;
  availableResolutions?: string[];
  benchmarkMode?: BenchmarkMode;
  options: ChartDesignOptions;
  onOptionsChange: (opts: Partial<ChartDesignOptions>) => void;
  exportConfig: ExportConfig;
  onExportConfigChange: (cfg: Partial<ExportConfig>) => void;
  customTitle: string;
  onCustomTitleChange: (title: string) => void;
  subHeaderPreset: string;
  onSubHeaderPresetChange: (preset: string) => void;
  productName: string;
  onProductNameChange: (val: string) => void;
  exportPhrase: string;
  onExportPhraseChange: (val: string) => void;
  onExportSingle: (res: string) => void;
  onExportActive: () => void;
  onExportTriResZip: () => void;
  onExportAllGamesZip: () => void;
  isExporting: boolean;
  exportProgressText?: string;
  onSaveGameProfile?: (game: string, title: string, subHeader: string) => void;
  hasSavedProfile?: boolean;
  isCustomChart?: boolean;
  customChart?: CustomChart | null;
  onOpenCustomChartEditor?: () => void;
}

export const TriResolutionTabs: React.FC<TriResolutionTabsProps> = ({
  gameName,
  activeTab,
  onTabChange,
  datasets,
  availableResolutions = [],
  benchmarkMode = "pc",
  options,
  onOptionsChange,
  exportConfig,
  onExportConfigChange,
  customTitle,
  onCustomTitleChange,
  subHeaderPreset,
  onSubHeaderPresetChange,
  productName,
  onProductNameChange,
  exportPhrase,
  onExportPhraseChange,
  onExportSingle,
  onExportActive,
  onExportTriResZip,
  onExportAllGamesZip,
  isExporting,
  exportProgressText,
  onSaveGameProfile,
  hasSavedProfile,
  isCustomChart = false,
  customChart = null,
  onOpenCustomChartEditor
}) => {
  const [savedJustNow, setSavedJustNow] = useState(false);

  // Determine dynamically which resolutions to display
  const resolutionKeys = useMemo(() => {
    const fromProps = availableResolutions && availableResolutions.length > 0 ? availableResolutions : [];
    const fromDatasets = Object.keys(datasets).filter((k) => (datasets[k]?.rows?.length || 0) > 0);
    const set = new Set([...fromProps, ...fromDatasets]);
    const allKeys = Array.from(set);

    if (allKeys.length === 0) {
      return ["1080p", "1440p", "4K"];
    }

    // Sort: 1080p, 1440p, 4K first, then Native or other custom resolutions
    const std = ["1080p", "1440p", "4K"].filter((r) => allKeys.includes(r));
    const others = allKeys.filter((r) => !["1080p", "1440p", "4K"].includes(r));
    return [...std, ...others];
  }, [availableResolutions, datasets]);

  // Helper to build the uniform sub-header
  const buildSubHeader = (res: string): string => {
    if (isCustomChart) {
      return subHeaderPreset || (customChart?.sub_header || "");
    }
    const cleanPreset = subHeaderPreset.trim();
    if (res.toLowerCase() === "native" || res.toLowerCase() === "all" || benchmarkMode === "laptop") {
      if (cleanPreset) {
        return `${cleanPreset} | HIGHER IS BETTER`;
      }
      return "AVERAGE & 1% LOW FPS | HIGHER IS BETTER";
    }
    const resUpper = res.toUpperCase();
    if (cleanPreset) {
      return `${resUpper} | ${cleanPreset} | HIGHER IS BETTER`;
    }
    return `${resUpper} | AVERAGE & 1% LOW FPS | HIGHER IS BETTER`;
  };

  const currentTitle = customTitle || (isCustomChart ? (customChart?.title || gameName) : gameName.toUpperCase());
  const liveRes = isCustomChart
    ? (customChart?.unit || "System")
    : (activeTab === "all" ? (resolutionKeys[0] || "1080p") : activeTab);
  const liveFileName = buildChartFileName(
    productName,
    currentTitle || gameName,
    liveRes,
    exportConfig.format,
    exportPhrase
  );

  const activeDataset = isCustomChart
    ? (datasets["custom"] || datasets[activeTab] || Object.values(datasets)[0])
    : datasets[activeTab];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#0e0e11]">
      {/* 1. Horizontal Sizing & Export Bar */}
      <div className="bg-[#121216] border-b border-[#23232a] px-6 py-2.5 flex items-center justify-between gap-4 flex-shrink-0 text-xs">
        {/* Left: Aspect Ratio, Resolution & Format */}
        <div className="flex items-center gap-3">
          {/* Aspect Ratio Toggle */}
          <div className="flex items-center bg-[#18181c] p-1 rounded-lg border border-[#23232a]">
            <Tv className="w-3.5 h-3.5 text-blue-400 ml-1 mr-1" />
            <button
              type="button"
              onClick={() => {
                onOptionsChange({ aspectRatio: "16:9" });
                onExportConfigChange({ aspectRatio: "16:9" });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                exportConfig.aspectRatio === "16:9"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              16:9 Wide
            </button>
            <button
              type="button"
              onClick={() => {
                onOptionsChange({ aspectRatio: "9:16" });
                onExportConfigChange({ aspectRatio: "9:16" });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                exportConfig.aspectRatio === "9:16"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              9:16 Mobile
            </button>
          </div>

          {/* Export Resolution */}
          <div className="flex items-center bg-[#18181c] p-1 rounded-lg border border-[#23232a]">
            <Monitor className="w-3.5 h-3.5 text-blue-400 ml-1 mr-1" />
            {(["720p", "1080p", "4k"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onExportConfigChange({ resolution: r })}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  exportConfig.resolution === r
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* File Format */}
          <div className="flex items-center bg-[#18181c] p-1 rounded-lg border border-[#23232a]">
            {(["webp", "png", "jpg"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onExportConfigChange({ format: fmt })}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  exportConfig.format === fmt
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportActive}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
            title="Export currently active view as high-res image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export View</span>
          </button>

          <button
            onClick={onExportTriResZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
            title={benchmarkMode === "laptop" ? "Export All Resolutions for this game as ZIP" : "Export 1080p, 1440p, 4K for this game as ZIP"}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{benchmarkMode === "laptop" ? "Game ZIP" : "Tri-Res ZIP"}</span>
          </button>

          <button
            onClick={onExportAllGamesZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#23232a] hover:bg-[#2e2e38] text-slate-200 border border-[#32323d] text-xs font-semibold transition-colors disabled:opacity-50"
            title="Batch export publication images for all detected games into a single ZIP"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>All Games ZIP</span>
          </button>

          {isExporting && (
            <span className="text-xs text-blue-400 font-mono animate-pulse">
              {exportProgressText || "Exporting..."}
            </span>
          )}
        </div>
      </div>

      {/* 2. Resolution Tabs Bar or Custom Chart Controls Bar */}
      <div className="bg-[#141418] border-b border-[#23232a] px-6 py-2 flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0">
        {isCustomChart ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom / System Metric Chart</span>
                {customChart?.unit && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono">
                    {customChart.unit}
                  </span>
                )}
              </span>

              <span className="text-xs text-slate-400 font-mono">
                {activeDataset?.rows?.length || 0} {(activeDataset?.rows?.length || 0) === 1 ? "model" : "models"} configured
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenCustomChartEditor && (
                <button
                  type="button"
                  onClick={onOpenCustomChartEditor}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                  title="Edit values, add models, or pre-fill hardware"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data & Values</span>
                </button>
              )}

              {onSaveGameProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onSaveGameProfile(gameName, currentTitle, subHeaderPreset);
                    setSavedJustNow(true);
                    setTimeout(() => setSavedJustNow(false), 2500);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    savedJustNow
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#18181f] hover:bg-[#23232a] text-slate-300 border-[#2a2a32] hover:text-white"
                  }`}
                  title="Save title & sub-header to custom chart preset"
                >
                  {savedJustNow ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{savedJustNow ? "Saved!" : "Save Preset"}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {resolutionKeys.map((res) => {
              const ds = datasets[res];
              const rowCount = ds?.rows?.length || 0;
              const isCurrent = activeTab === res;
              const topFps = ds?.rows?.[0]?.metrics?.["average_fps"]?.value;

              return (
                <button
                  key={res}
                  onClick={() => onTabChange(res)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                    isCurrent
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-[#18181b] text-slate-300 border-[#23232a] hover:bg-[#23232a] hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{res}</span>
                  {rowCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isCurrent
                          ? "bg-blue-800 text-blue-100"
                          : "bg-[#23232a] text-slate-400"
                      }`}
                    >
                      {rowCount} {benchmarkMode === "laptop" ? (rowCount === 1 ? "profile" : "profiles") : (rowCount === 1 ? "card" : "cards")} {topFps ? `• ${topFps} FPS` : ""}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="h-5 w-[1px] bg-[#23232a] mx-1 shrink-0" />

            <button
              onClick={() => onTabChange("all")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
                activeTab === "all"
                  ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                  : "bg-[#18181b] text-slate-300 border-[#23232a] hover:bg-[#23232a] hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>
                {benchmarkMode === "laptop"
                  ? "All Profiles View"
                  : resolutionKeys.length <= 3 && resolutionKeys.every((r) => ["1080p", "1440p", "4K"].includes(r))
                  ? "All 3 (1080p • 1440p • 4K)"
                  : "All Resolutions View"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Product & Chart Metadata Inputs Bar */}
      <div className="bg-[#18181c] border-b border-[#23232a] px-6 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0 text-xs">
        {/* Product Name Quick Input */}
        <div className="flex items-center gap-2 bg-[#121215] px-3 py-1.5 rounded-lg border border-[#2a2a32] min-w-0">
          <span className="text-[11px] text-blue-400 font-semibold shrink-0">
            {benchmarkMode === "laptop" ? "Laptop:" : "Product:"}
          </span>
          <input
            type="text"
            value={productName}
            onChange={(e) => onProductNameChange(e.target.value)}
            placeholder={benchmarkMode === "laptop" ? "e.g. HP OMEN MAX 16" : "e.g. COLORFUL RTX 5060 Ti"}
            className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none w-full min-w-0"
            title={productName}
          />
        </div>

        {/* File Tag / SEO phrase */}
        <div className="flex items-center gap-2 bg-[#121215] px-3 py-1.5 rounded-lg border border-[#2a2a32] min-w-0">
          <span className="text-[11px] text-purple-400 font-semibold shrink-0">Tag:</span>
          <input
            type="text"
            value={exportPhrase}
            onChange={(e) => onExportPhraseChange(e.target.value)}
            placeholder="e.g. REVIEW"
            className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none w-full min-w-0"
            title={exportPhrase}
          />
        </div>

        {/* Chart Title */}
        <div className="flex items-center gap-2 bg-[#121215] px-3 py-1.5 rounded-lg border border-[#2a2a32] min-w-0">
          <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Title:</span>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => onCustomTitleChange(e.target.value)}
            placeholder={gameName.toUpperCase()}
            className="bg-transparent text-slate-100 text-xs font-bold w-full min-w-0 focus:outline-none"
            title={customTitle || gameName.toUpperCase()}
          />
        </div>

        {/* Sub-Header Settings Preset */}
        <div className="flex items-center gap-2 bg-[#121215] px-3 py-1.5 rounded-lg border border-[#2a2a32] min-w-0">
          <Edit3 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Preset:</span>
          <input
            type="text"
            value={subHeaderPreset}
            onChange={(e) => onSubHeaderPresetChange(e.target.value)}
            placeholder={benchmarkMode === "laptop" ? "e.g. POWER PROFILES COMPARISON" : "e.g. DX 11 | BEST LOOKING PRESET"}
            className="bg-transparent text-rose-300 text-xs font-semibold w-full min-w-0 focus:outline-none"
            title={subHeaderPreset}
          />
        </div>
      </div>

      {/* 4. Profile Actions & Live File Name Preview Bar */}
      <div className="bg-[#141418] border-b border-[#23232a] px-6 py-2 flex items-center gap-3 flex-shrink-0 text-xs">
        {onSaveGameProfile && gameName && (
          <button
            type="button"
            onClick={() => {
              onSaveGameProfile(gameName, customTitle || gameName.toUpperCase(), subHeaderPreset);
              setSavedJustNow(true);
              setTimeout(() => setSavedJustNow(false), 2500);
            }}
            title={hasSavedProfile ? "Update saved profile in game_profiles.json" : "Save as new profile in game_profiles.json"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 border ${
              savedJustNow
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
                : "bg-purple-600/15 hover:bg-purple-600/30 border-purple-500/30 text-purple-300"
            }`}
          >
            {savedJustNow ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved Profile!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-purple-400" />
                <span>{hasSavedProfile ? "Update Profile" : "Save as Profile"}</span>
              </>
            )}
          </button>
        )}

        {/* Live File Preview Badge */}
        <div className="flex items-center gap-2 bg-[#18181c] px-3 py-1.5 rounded-lg border border-[#23232a] text-xs flex-1 min-w-0">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">File:</span>
          <span
            className="text-[11px] font-mono font-bold text-emerald-400 truncate"
            title={liveFileName}
          >
            {liveFileName}
          </span>
        </div>
      </div>

      {/* Main Chart Canvas Viewport */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start">
        {isCustomChart ? (
          activeDataset && activeDataset.rows.length > 0 ? (
            <div className="w-full max-w-5xl flex flex-col items-center shadow-2xl rounded-xl">
              <BenchmarkChart
                dataset={activeDataset}
                options={{
                  ...options,
                  title: currentTitle,
                  subtitle: buildSubHeader("custom")
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-center space-y-3">
              <BarChart3 className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                No component rows configured for {gameName || "this chart"} yet.
              </p>
              {onOpenCustomChartEditor && (
                <button
                  type="button"
                  onClick={onOpenCustomChartEditor}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
                >
                  + Add Component Models & Input Values
                </button>
              )}
            </div>
          )
        ) : activeTab !== "all" ? (
          datasets[activeTab] && datasets[activeTab]!.rows.length > 0 ? (
            <div className="w-full max-w-5xl flex flex-col items-center shadow-2xl rounded-xl">
              <BenchmarkChart
                dataset={datasets[activeTab]!}
                options={{
                  ...options,
                  title: currentTitle,
                  subtitle: buildSubHeader(activeTab)
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-center">
              <Monitor className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                No capture data found for {gameName} at {activeTab}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {benchmarkMode === "laptop"
                  ? "Ensure CapFrameX JSON files are loaded for this game."
                  : `Ensure JSON captures contain "${activeTab}" in the Comment field.`}
              </p>
            </div>
          )
        ) : (
          /* All Resolutions / All Profiles Listed View */
          <div className="w-full max-w-5xl space-y-10 pb-12 flex flex-col items-center">
            {resolutionKeys.map((res) => {
              const ds = datasets[res];
              const rowCount = ds?.rows?.length || 0;
              if (!ds || rowCount === 0) return null;

              return (
                <div
                  key={res}
                  className="flex flex-col items-center w-full bg-[#121215] border border-[#23232a] p-4 rounded-xl shadow-xl"
                >
                  <div className="w-full mb-3 flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white text-sm">{currentTitle}</span>
                      <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
                        {res}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({rowCount} {benchmarkMode === "laptop" ? (rowCount === 1 ? "profile" : "profiles") : (rowCount === 1 ? "card" : "cards")})
                      </span>
                    </div>
                    <button
                      onClick={() => onExportSingle(res)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#18181b] hover:bg-[#23232a] border border-[#2a2a32] text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      title={`Export ${res} chart (${exportConfig.format.toUpperCase()})`}
                    >
                      <Download className="w-3 h-3" />
                      <span>Download {res}</span>
                    </button>
                  </div>
                  <BenchmarkChart
                    dataset={ds}
                    options={{
                      ...options,
                      title: currentTitle,
                      subtitle: buildSubHeader(res)
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
