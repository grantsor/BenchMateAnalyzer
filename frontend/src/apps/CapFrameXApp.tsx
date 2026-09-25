import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "../components/capframex/Header";
import { GameSidebar } from "../components/capframex/GameSidebar";
import { TriResolutionTabs } from "../components/capframex/TriResolutionTabs";
import { ChartControls } from "../components/capframex/ChartControls";
import { RawRunsModal } from "../components/capframex/RawRunsModal";
import { GpuHierarchyModal } from "../components/capframex/GpuHierarchyModal";
import { GameProfilesModal } from "../components/capframex/GameProfilesModal";
import { CustomChartEditorModal } from "../components/capframex/CustomChartEditorModal";
import {
  GroupedBenchmarkDataset,
  ChartDesignOptions,
  ExportConfig,
  ExportAspectRatio,
  ExportResolution,
  ExportFormat,
  ChartSortMode,
  WithinTierSortOrder,
  BenchmarkMode,
  DEFAULT_HIGHLIGHT_OPTIONS,
  GameProfilesMap,
  GameProfile,
  CustomChart
} from "../types/capframex";
import { api, convertToGroupedDataset, convertCustomChartToGroupedDataset } from "../api/capframexClient";
import {
  exportSingleChart,
  renderChartToDataUrl,
  buildChartFileName
} from "../utils/capframex/chartExporter";
import { GRADIENT_PRESETS, samplePresetColors } from "../utils/capframex/colorPalettes";
import { useThemeStore } from "../stores/themeStore";
import { useBrandingDefaultsStore } from "../stores/brandingDefaultsStore";
import JSZip from "jszip";

const DEFAULT_BLUE_PRESET = GRADIENT_PRESETS.find((p) => p.id === "excel-blue")!;
const DEFAULT_COLORS = samplePresetColors(DEFAULT_BLUE_PRESET.colors, 2);

const CX_STORAGE_KEY_PREFERENCES = "cx_benchmark_chart_preferences_v2";
const CX_STORAGE_KEY_EXPORT_PHRASE = "cx_export_naming_phrase_v1";

interface ModeSessionState {
  folder: string;
  runsCount: number;
  games: string[];
  selectedGame: string;
  datasets: Record<string, GroupedBenchmarkDataset | undefined>;
  availableResolutions: string[];
  availableGpus: string[];
  availableCpus: string[];
  availableMotherboards: string[];
  availableLaptops: string[];
  availablePowerProfiles: string[];
  groupBy: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu";
  productName: string;
  subHeaderPreset: string;
  customTitle: string;
  activeTab: string;
  filterGpu: string;
  filterCpu: string;
  filterMotherboard: string;
  filterLaptop: string;
  filterPowerProfile: string;
  customCharts?: CustomChart[];
  selectedCustomChartId?: string | null;
}

interface StoredAppPreferences {
  exportConfig?: ExportConfig;
  productName?: string;
  exportPhrase?: string;
  subHeaderPreset?: string;
  activeTab?: string;
  groupBy?: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu";
  aggregation?: "average" | "best" | "latest";
  benchmarkMode?: BenchmarkMode;
  theme?: "light" | "dark";
  activeGradientPreset?: string;
  barColors?: string[];
  customMetricColors?: Record<string, string>;
  showValues?: boolean;
  showDecorations?: boolean;
  barValuePosition?: "auto" | "inside" | "outside";
  chartSortMode?: ChartSortMode;
  withinTierSortOrder?: WithinTierSortOrder;
  highlightOptions?: any;
  barLayout?: "auto" | "merged" | "grouped";
  aspectRatio?: ExportAspectRatio;
  exportResolution?: ExportResolution;
  exportFormat?: ExportFormat;
}

function getStoredPreferences(): StoredAppPreferences {
  try {
    const raw =
      localStorage.getItem(CX_STORAGE_KEY_PREFERENCES) ||
      localStorage.getItem("cx_chart_preferences_v1");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not load stored chart preferences:", e);
  }
  return {};
}

function storePreferences(prefs: StoredAppPreferences) {
  try {
    const serialized = JSON.stringify(prefs);
    localStorage.setItem(CX_STORAGE_KEY_PREFERENCES, serialized);
  } catch (e) {
    console.warn("Could not save chart preferences:", e);
  }
}

export const CapFrameXApp: React.FC = () => {
  const [folder, setFolder] = useState("N:\\BenchMarkTool\\Sample CapframeX Data");
  const [runsCount, setRunsCount] = useState(0);
  const [games, setGames] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(() => {
    const p = getStoredPreferences();
    return p.activeTab || "all";
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isRunsModalOpen, setIsRunsModalOpen] = useState(false);
  const [gpuHierarchy, setGpuHierarchy] = useState<string[]>([]);
  const [isGpuHierarchyModalOpen, setIsGpuHierarchyModalOpen] = useState(false);
  const [isGameProfilesModalOpen, setIsGameProfilesModalOpen] = useState(false);
  const [gameProfiles, setGameProfiles] = useState<GameProfilesMap>({});
  const gameProfilesRef = useRef<GameProfilesMap>({});

  useEffect(() => {
    gameProfilesRef.current = gameProfiles;
  }, [gameProfiles]);

  // Custom Metric Charts (Temperatures, Power Consumption, Battery Life, etc.)
  const [customCharts, setCustomCharts] = useState<CustomChart[]>([]);
  const [selectedCustomChartId, setSelectedCustomChartId] = useState<string | null>(null);
  const [isCustomChartEditorOpen, setIsCustomChartEditorOpen] = useState(false);
  const [editingCustomChart, setEditingCustomChart] = useState<CustomChart | null>(null);

  // Title & Sub-header Preset customization (Persists across resolutions of the game)
  const [customTitle, setCustomTitle] = useState("");
  const [subHeaderPreset, setSubHeaderPreset] = useState<string>(() => {
    const p = getStoredPreferences();
    return typeof p.subHeaderPreset === "string" ? p.subHeaderPreset : "DX 11 | BEST LOOKING PRESET";
  });

  // Benchmark Mode: PC Components vs Laptop (Power Profiles)
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>(() => {
    const p = getStoredPreferences();
    return p.benchmarkMode || "pc";
  });

  // Isolated in-memory sessions for PC Components vs Laptop
  const modeSessionsRef = useRef<Record<BenchmarkMode, ModeSessionState | null>>({
    pc: null,
    laptop: null
  });

  // Hardware and Laptop comparison state
  const [groupBy, setGroupBy] = useState<"gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu">(() => {
    const p = getStoredPreferences();
    return p.groupBy || "gpu";
  });
  const [aggregation, setAggregation] = useState<"average" | "best" | "latest">(() => {
    const p = getStoredPreferences();
    return p.aggregation || "average";
  });
  const [availableGpus, setAvailableGpus] = useState<string[]>([]);
  const [availableCpus, setAvailableCpus] = useState<string[]>([]);
  const [availableMotherboards, setAvailableMotherboards] = useState<string[]>([]);
  const [availableLaptops, setAvailableLaptops] = useState<string[]>([]);
  const [availablePowerProfiles, setAvailablePowerProfiles] = useState<string[]>([]);
  const [availableResolutions, setAvailableResolutions] = useState<string[]>([]);
  const [filterGpu, setFilterGpu] = useState("");
  const [filterCpu, setFilterCpu] = useState("");
  const [filterMotherboard, setFilterMotherboard] = useState("");
  const [filterLaptop, setFilterLaptop] = useState("");
  const [filterPowerProfile, setFilterPowerProfile] = useState("");

  // Product & SEO phrase with persistent localStorage default
  const [productName, setProductName] = useState<string>(() => {
    const p = getStoredPreferences();
    return typeof p.productName === "string" ? p.productName : "COLORFUL iGAME RTX 5060 Ti ULTRA OC 8GB";
  });
  const [exportPhrase, setExportPhrase] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CX_STORAGE_KEY_EXPORT_PHRASE);
      if (saved !== null && saved !== undefined && saved !== "") return saved;
    } catch (e) {}
    const p = getStoredPreferences();
    return typeof p.exportPhrase === "string" ? p.exportPhrase : "REVIEW";
  });

  // Multi-resolution / multi-profile datasets
  const [datasets, setDatasets] = useState<Record<string, GroupedBenchmarkDataset | undefined>>({});

  // Chart Design Options (Default: Pure White Theme, Monochromatic Blue) with localStorage persistence
  const [chartOptions, setChartOptions] = useState<ChartDesignOptions>(() => {
    const p = getStoredPreferences();
    const ratio = p.exportConfig?.aspectRatio || (p.aspectRatio as ExportAspectRatio) || "16:9";
    const colors = p.barColors && p.barColors.length > 0 ? p.barColors : DEFAULT_COLORS;
    return {
      theme: p.theme || "light",
      title: "",
      subtitle: "",
      showValues: p.showValues ?? true,
      barColors: colors,
      activeGradientPreset: p.activeGradientPreset || "excel-blue",
      customMetricColors: p.customMetricColors || {
        average_fps: colors[0],
        p1_fps: colors[1]
      },
      fontFamily: "'Open Sans', Inter, system-ui, sans-serif",
      headerFontFamily: "'Open Sans Condensed', 'Open Sans', 'Inter', sans-serif",
      aspectRatio: ratio,
      publicationLogoText: "GADGET PILIPINAS",
      showDecorations: p.showDecorations ?? true,
      sortOrder: "desc",
      chartSortMode: p.chartSortMode || "gpu_hierarchy",
      withinTierSortOrder: p.withinTierSortOrder || "desc",
      groupBy: p.groupBy || "gpu",
      useGpuHierarchySort: true,
      gpuHierarchy: [],
      selectedMetrics: ["average_fps", "p1_fps"],
      selectedConfigIds: [],
      barValuePosition: p.barValuePosition || "auto",
      barLayout: p.barLayout || "auto",
      logoPosition: "top-right",
      logoUrl: "/Full Logo Horizontal Colored.png",
      logoAspectRatio: 2.7778,
      logoWidth: 170,
      logoWidth_16_9: 170,
      logoWidth_9_16: 140,
      logoOffsetX: 12,
      logoOffsetY: 10,
      logoOffsetX_16_9: 12,
      logoOffsetY_16_9: 10,
      logoOffsetX_9_16: 10,
      logoOffsetY_9_16: 12,
      highlightOptions: (() => {
        const ho = p.highlightOptions;
        if (!ho || ho.activePresetId === "excel-amber" || ho.highlightBarColor === "#f97316") {
          return {
            ...DEFAULT_HIGHLIGHT_OPTIONS,
            ...(ho ? { enabled: ho.enabled, highlightedConfigIds: ho.highlightedConfigIds } : {})
          };
        }
        return ho;
      })()
    };
  });

  const [defaultLogoData, setDefaultLogoData] = useState<{
    data_url: string;
    width: number;
    height: number;
    aspect_ratio: number;
  } | undefined>(undefined);

  const [exportConfig, setExportConfig] = useState<ExportConfig>(() => {
    const p = getStoredPreferences();
    return {
      aspectRatio: p.exportConfig?.aspectRatio || (p.aspectRatio as ExportAspectRatio) || "16:9",
      resolution: p.exportConfig?.resolution || (p.exportResolution as ExportResolution) || "720p",
      format: p.exportConfig?.format || (p.exportFormat as ExportFormat) || "webp"
    };
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressText, setExportProgressText] = useState("");

  // Automatically persist user settings to localStorage so they remain the default until changed
  useEffect(() => {
    storePreferences({
      exportConfig,
      productName,
      exportPhrase,
      subHeaderPreset,
      activeTab,
      groupBy,
      aggregation,
      benchmarkMode,
      theme: chartOptions.theme,
      activeGradientPreset: chartOptions.activeGradientPreset,
      barColors: chartOptions.barColors,
      customMetricColors: chartOptions.customMetricColors,
      showValues: chartOptions.showValues,
      showDecorations: chartOptions.showDecorations,
      barValuePosition: chartOptions.barValuePosition,
      chartSortMode: chartOptions.chartSortMode,
      withinTierSortOrder: chartOptions.withinTierSortOrder,
      highlightOptions: chartOptions.highlightOptions,
      barLayout: chartOptions.barLayout,
      aspectRatio: exportConfig.aspectRatio,
      exportResolution: exportConfig.resolution,
      exportFormat: exportConfig.format
    });

    try {
      localStorage.setItem(CX_STORAGE_KEY_EXPORT_PHRASE, exportPhrase);
    } catch (e) {}
  }, [
    exportConfig,
    productName,
    exportPhrase,
    subHeaderPreset,
    activeTab,
    groupBy,
    aggregation,
    benchmarkMode,
    chartOptions.theme,
    chartOptions.activeGradientPreset,
    chartOptions.barColors,
    chartOptions.customMetricColors,
    chartOptions.showValues,
    chartOptions.showDecorations,
    chartOptions.barValuePosition,
    chartOptions.barLayout,
    chartOptions.chartSortMode,
    chartOptions.withinTierSortOrder,
    chartOptions.highlightOptions
  ]);

  // Load branding logo, GPU hierarchy & initial data
  useEffect(() => {
    const init = async () => {
      try {
        const logoData = await api.getDefaultLogoData();
        if (logoData && logoData.data_url) {
          setDefaultLogoData(logoData);
          setChartOptions((prev) => ({
            ...prev,
            logoUrl: logoData.data_url,
            logoAspectRatio: logoData.aspect_ratio || 2.7778
          }));
        }
      } catch (e) {
        console.warn("Branding logo fetch skipped:", e);
      }

      try {
        const hData = await api.getGpuHierarchy();
        if (hData && hData.hierarchy) {
          setGpuHierarchy(hData.hierarchy);
          setChartOptions((prev) => ({ ...prev, gpuHierarchy: hData.hierarchy }));
        }
      } catch (e) {
        console.warn("GPU hierarchy fetch skipped:", e);
      }

      try {
        const gpData = await api.getGameProfiles();
        if (gpData && gpData.profiles) {
          gameProfilesRef.current = gpData.profiles;
          setGameProfiles(gpData.profiles);
        }
      } catch (e) {
        console.warn("Game profiles fetch skipped:", e);
      }

      try {
        const cCharts = await api.getCustomCharts(benchmarkMode);
        setCustomCharts(cCharts.charts || []);
      } catch (e) {
        console.warn("Custom charts fetch skipped:", e);
      }

      handleScan();
    };

    init();
  }, []);

  const applyGameProfile = (gameName: string, profilesMap: GameProfilesMap = gameProfilesRef.current) => {
    if (!gameName) return;
    const trimmed = gameName.trim().toLowerCase();
    const profileKey = Object.keys(profilesMap).find((k) => k.trim().toLowerCase() === trimmed);
    const profile = profileKey ? profilesMap[profileKey] : undefined;
    if (profile?.title) {
      setCustomTitle(profile.title);
    } else {
      setCustomTitle(gameName.toUpperCase());
    }
    if (profile?.sub_header) {
      setSubHeaderPreset(profile.sub_header);
    }
  };

  const handleToggleBenchmarkMode = async (newMode: BenchmarkMode) => {
    if (newMode === benchmarkMode) return;

    // 1. Snapshot the current session state before switching
    modeSessionsRef.current[benchmarkMode] = {
      folder,
      runsCount,
      games,
      selectedGame,
      datasets,
      availableResolutions,
      availableGpus,
      availableCpus,
      availableMotherboards,
      availableLaptops,
      availablePowerProfiles,
      groupBy,
      productName,
      subHeaderPreset,
      customTitle,
      activeTab,
      filterGpu,
      filterCpu,
      filterMotherboard,
      filterLaptop,
      filterPowerProfile,
      customCharts,
      selectedCustomChartId
    };

    // 2. Notify backend of mode change
    try {
      await api.setMode(newMode);
    } catch (e) {
      console.warn("Failed to set backend mode:", e);
    }

    setBenchmarkMode(newMode);

    // 3. Restore session if previously saved
    const saved = modeSessionsRef.current[newMode];
    if (saved && saved.runsCount > 0) {
      setFolder(saved.folder);
      setRunsCount(saved.runsCount);
      setGames(saved.games);
      setSelectedGame(saved.selectedGame);
      setDatasets(saved.datasets);
      setAvailableResolutions(saved.availableResolutions);
      setAvailableGpus(saved.availableGpus);
      setAvailableCpus(saved.availableCpus);
      setAvailableMotherboards(saved.availableMotherboards);
      setAvailableLaptops(saved.availableLaptops);
      setAvailablePowerProfiles(saved.availablePowerProfiles);
      setGroupBy(saved.groupBy);
      setChartOptions((prev) => ({ ...prev, groupBy: saved.groupBy }));
      setProductName(saved.productName);
      setSubHeaderPreset(saved.subHeaderPreset);
      setCustomTitle(saved.customTitle);
      setActiveTab(saved.activeTab);
      setFilterGpu(saved.filterGpu);
      setFilterCpu(saved.filterCpu);
      setFilterMotherboard(saved.filterMotherboard);
      setFilterLaptop(saved.filterLaptop);
      setFilterPowerProfile(saved.filterPowerProfile);
      if (saved.customCharts) {
        setCustomCharts(saved.customCharts);
        setSelectedCustomChartId(saved.selectedCustomChartId || null);
      } else {
        try {
          const cCharts = await api.getCustomCharts(newMode);
          setCustomCharts(cCharts.charts || []);
          setSelectedCustomChartId(null);
        } catch (e) {
          console.warn("Failed to fetch custom charts on mode restore:", e);
        }
      }
    } else {
      try {
        const cCharts = await api.getCustomCharts(newMode);
        setCustomCharts(cCharts.charts || []);
        setSelectedCustomChartId(null);
      } catch (e) {
        console.warn("Failed to fetch custom charts on mode switch:", e);
      }
      // 4. Query backend in case session already has data on server
      try {
        const info = await api.getDatasetInfo(newMode);
        if (info && info.total_runs > 0) {
          setRunsCount(info.total_runs);
          if (info.folder) setFolder(info.folder);
          const gamesList = await api.getGames(newMode);
          setGames(gamesList);
          const hw = await api.getHardware(undefined, newMode);
          setAvailableGpus(hw.gpus || []);
          setAvailableCpus(hw.cpus || []);
          setAvailableMotherboards(hw.motherboards || []);
          setAvailableLaptops(hw.laptops || []);
          setAvailablePowerProfiles(hw.power_profiles || []);

          const defaultGroupBy = newMode === "laptop" ? "laptop_power" : "gpu";
          setGroupBy(defaultGroupBy);
          setChartOptions((prev) => ({ ...prev, groupBy: defaultGroupBy }));

          if (newMode === "laptop") {
            if (info.laptop_names && info.laptop_names.length > 0) {
              setProductName(info.laptop_names[0]);
            }
            setSubHeaderPreset("POWER PROFILES COMPARISON");
          } else {
            setSubHeaderPreset("DX 11 | BEST LOOKING PRESET");
            setProductName("COLORFUL iGAME RTX 5060 Ti ULTRA OC 8GB");
          }

          if (gamesList.length > 0) {
            setSelectedGame(gamesList[0]);
            applyGameProfile(gamesList[0], gameProfilesRef.current);
          } else {
            setSelectedGame("");
            setDatasets({});
          }
        } else {
          // Fresh session initialization
          setRunsCount(0);
          setGames([]);
          setSelectedGame("");
          setDatasets({});
          setAvailableResolutions([]);
          setAvailableGpus([]);
          setAvailableCpus([]);
          setAvailableMotherboards([]);
          setAvailableLaptops([]);
          setAvailablePowerProfiles([]);
          setFilterGpu("");
          setFilterCpu("");
          setFilterMotherboard("");
          setFilterLaptop("");
          setFilterPowerProfile("");
          if (newMode === "laptop") {
            setGroupBy("laptop_power");
            setChartOptions((prev) => ({ ...prev, groupBy: "laptop_power" }));
            setSubHeaderPreset("POWER PROFILES COMPARISON");
            setProductName("Gaming Laptop");
          } else {
            setGroupBy("gpu");
            setChartOptions((prev) => ({ ...prev, groupBy: "gpu" }));
            setSubHeaderPreset("DX 11 | BEST LOOKING PRESET");
            setProductName("COLORFUL iGAME RTX 5060 Ti ULTRA OC 8GB");
          }
        }
      } catch (err) {
        console.error("Failed to sync backend dataset info for mode:", err);
      }
    }
  };

  const handleGroupByChange = (val: "gpu" | "cpu" | "motherboard" | "laptop_power" | "power_profile" | "laptop_model" | "laptop_gpu") => {
    setGroupBy(val);
    setChartOptions((prev) => ({ ...prev, groupBy: val }));
  };

  const handleHierarchySaved = (newHierarchy: string[]) => {
    setGpuHierarchy(newHierarchy);
    setChartOptions((prev) => ({ ...prev, gpuHierarchy: newHierarchy }));
    loadGameData();
  };

  const updateStateFromScan = (res: any) => {
    setFolder(res.folder);
    setRunsCount(res.runs_count);
    setGames(res.games || []);
    if (res.games && res.games.length > 0) {
      setSelectedGame(res.games[0]);
      applyGameProfile(res.games[0], gameProfilesRef.current);
    }

    if (res.detected_mode === "laptop" || benchmarkMode === "laptop") {
      setBenchmarkMode("laptop");
      if (groupBy !== "laptop_power" && groupBy !== "power_profile" && groupBy !== "laptop_model" && groupBy !== "laptop_gpu") {
        setGroupBy("laptop_power");
        setChartOptions((prev) => ({ ...prev, groupBy: "laptop_power" }));
      }
      if (res.laptop_names && res.laptop_names.length > 0) {
        setProductName(res.laptop_names[0]);
      }
      setSubHeaderPreset("POWER PROFILES COMPARISON");
    } else if (res.detected_mode === "pc_components" || benchmarkMode === "pc") {
      setBenchmarkMode("pc");
      if (groupBy === "laptop_power" || groupBy === "power_profile" || groupBy === "laptop_model" || groupBy === "laptop_gpu") {
        setGroupBy("gpu");
        setChartOptions((prev) => ({ ...prev, groupBy: "gpu" }));
      }
    }
  };

  const refreshCustomCharts = async (modeToUse: BenchmarkMode = benchmarkMode) => {
    try {
      const cCharts = await api.getCustomCharts(modeToUse);
      if (cCharts && cCharts.charts) {
        setCustomCharts(cCharts.charts);
        if (selectedCustomChartId) {
          const activeC = cCharts.charts.find((c) => c.id === selectedCustomChartId);
          if (activeC) {
            setDatasets({ custom: convertCustomChartToGroupedDataset(activeC) });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to refresh custom charts:", e);
    }
  };

  const handleScan = async (targetFolder?: string) => {
    setIsScanning(true);
    try {
      const res = await api.scan(targetFolder, benchmarkMode);
      setSelectedCustomChartId(null);
      setFilterGpu("");
      setFilterCpu("");
      setFilterMotherboard("");
      setFilterLaptop("");
      setFilterPowerProfile("");
      setChartOptions((prev) => ({ ...prev, selectedConfigIds: [] }));

      updateStateFromScan(res);

      const targetMode: BenchmarkMode =
        res.detected_mode === "laptop"
          ? "laptop"
          : res.detected_mode === "pc_components"
          ? "pc"
          : benchmarkMode;
      const nextGame = res.games && res.games.length > 0 ? res.games[0] : "";

      const hw = await api.getHardware(nextGame || undefined, targetMode);
      setAvailableGpus(hw.gpus || []);
      setAvailableCpus(hw.cpus || []);
      setAvailableMotherboards(hw.motherboards || []);
      setAvailableLaptops(hw.laptops || []);
      setAvailablePowerProfiles(hw.power_profiles || []);

      if (nextGame) {
        setSelectedGame(nextGame);
        applyGameProfile(nextGame, gameProfilesRef.current);
        await loadGameData(nextGame, targetMode, true);
        if (activeTab === "custom") {
          setActiveTab("all");
        }
      } else {
        setSelectedGame("");
        setDatasets({});
      }

      await refreshCustomCharts(targetMode);
    } catch (e) {
      console.error("Scan error:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const { theme: uiTheme, cycleTheme: handleToggleUiTheme } = useThemeStore();
  const branding = useBrandingDefaultsStore();

  const handleSelectFiles = async (files: FileList | File[]) => {
    if (!files) return;
    const fileArray: File[] = (
      Array.isArray(files) ? files : Array.from(files)
    ).filter(
      (f): f is File =>
        Boolean(f && typeof f === "object" && "name" in f && f.name.toLowerCase().endsWith(".json"))
    );
    if (fileArray.length === 0) {
      alert("No CapFrameX .json benchmark files found in the selection.");
      return;
    }

    setIsScanning(true);
    setExportProgressText(`Parsing ${fileArray.length} CapFrameX capture files...`);
    try {
      const res = await api.uploadCaptures(fileArray, benchmarkMode, (text) => setExportProgressText(text));
      if (res.status === "success") {
        setSelectedCustomChartId(null);
        setFilterGpu("");
        setFilterCpu("");
        setFilterMotherboard("");
        setFilterLaptop("");
        setFilterPowerProfile("");
        setChartOptions((prev) => ({ ...prev, selectedConfigIds: [] }));

        updateStateFromScan(res);

        const targetMode: BenchmarkMode =
          res.detected_mode === "laptop"
            ? "laptop"
            : res.detected_mode === "pc_components"
            ? "pc"
            : benchmarkMode;
        const nextGame = res.games && res.games.length > 0 ? res.games[0] : "";

        const hw = await api.getHardware(nextGame || undefined, targetMode);
        setAvailableGpus(hw.gpus || []);
        setAvailableCpus(hw.cpus || []);
        setAvailableMotherboards(hw.motherboards || []);
        setAvailableLaptops(hw.laptops || []);
        setAvailablePowerProfiles(hw.power_profiles || []);

        if (nextGame) {
          setSelectedGame(nextGame);
          applyGameProfile(nextGame, gameProfilesRef.current);
          await loadGameData(nextGame, targetMode, true);
          if (activeTab === "custom") {
            setActiveTab("all");
          }
        } else {
          setSelectedGame("");
          setDatasets({});
        }

        await refreshCustomCharts(targetMode);
      }
    } catch (e: any) {
      console.error("Upload captures error:", e);
      alert(e.message || "Failed to parse selected CapFrameX files");
    } finally {
      setIsScanning(false);
      setExportProgressText("");
    }
  };

  const handleBrowse = async (targetFolder?: string) => {
    setIsScanning(true);
    try {
      const res = await Promise.race([
        api.browseFolder(targetFolder || folder, benchmarkMode),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout waiting for folder selection")), 20000)
        )
      ]);
      if (res && res.status === "success") {
        setSelectedCustomChartId(null);
        setFilterGpu("");
        setFilterCpu("");
        setFilterMotherboard("");
        setFilterLaptop("");
        setFilterPowerProfile("");
        setChartOptions((prev) => ({ ...prev, selectedConfigIds: [] }));

        updateStateFromScan(res);

        const targetMode: BenchmarkMode =
          res.detected_mode === "laptop"
            ? "laptop"
            : res.detected_mode === "pc_components"
            ? "pc"
            : benchmarkMode;
        const nextGame = res.games && res.games.length > 0 ? res.games[0] : "";

        const hw = await api.getHardware(nextGame || undefined, targetMode);
        setAvailableGpus(hw.gpus || []);
        setAvailableCpus(hw.cpus || []);
        setAvailableMotherboards(hw.motherboards || []);
        setAvailableLaptops(hw.laptops || []);
        setAvailablePowerProfiles(hw.power_profiles || []);

        if (nextGame) {
          setSelectedGame(nextGame);
          applyGameProfile(nextGame, gameProfilesRef.current);
          await loadGameData(nextGame, targetMode, true);
          if (activeTab === "custom") {
            setActiveTab("all");
          }
        } else {
          setSelectedGame("");
          setDatasets({});
        }

        await refreshCustomCharts(targetMode);
      }
    } catch (e) {
      console.warn("Browse folder cancelled or timed out:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunsUpdated = async () => {
    loadGameData();
    try {
      const hw = await api.getHardware(undefined, benchmarkMode);
      setAvailableGpus(hw.gpus || []);
      setAvailableCpus(hw.cpus || []);
      setAvailableMotherboards(hw.motherboards || []);
      setAvailableLaptops(hw.laptops || []);
      setAvailablePowerProfiles(hw.power_profiles || []);

      const gamesList = await api.getGames(benchmarkMode);
      setGames(gamesList);

      const rData = await api.getRuns(undefined, benchmarkMode);
      setRunsCount(rData.total || rData.runs?.length || 0);

      await refreshCustomCharts(benchmarkMode);
    } catch (e) {
      console.error("Failed to refresh app state after run edit:", e);
    }
  };

  // Custom Chart handlers
  const handleSelectCustomChart = (chart: CustomChart) => {
    setSelectedCustomChartId(chart.id);
    setSelectedGame("");
    setCustomTitle(chart.title);
    const hib = chart.higher_is_better ? "HIGHER IS BETTER" : "LOWER IS BETTER";
    setSubHeaderPreset(chart.sub_header || `${chart.metric_name.toUpperCase()} (${chart.unit}) | ${hib}`);

    // If chart rows are empty, intelligently prefill from active hardware models or power profiles
    let effectiveChart = chart;
    if (!chart.rows || chart.rows.length === 0) {
      let prefilledRows: any[] = [];
      if (benchmarkMode === "laptop" && availablePowerProfiles.length > 0) {
        prefilledRows = availablePowerProfiles.map((p, idx) => ({
          id: `row_profile_${idx}`,
          label: p,
          value: null
        }));
      } else if (benchmarkMode === "pc" && availableGpus.length > 0) {
        prefilledRows = availableGpus.map((g, idx) => ({
          id: `row_gpu_${idx}`,
          label: g,
          value: null
        }));
      }
      if (prefilledRows.length > 0) {
        effectiveChart = { ...chart, rows: prefilledRows };
      }
    }

    const ds = convertCustomChartToGroupedDataset(effectiveChart);
    setDatasets({ custom: ds });
    setActiveTab("custom");
  };

  const handleAddNewCustomChart = () => {
    setEditingCustomChart(null);
    setIsCustomChartEditorOpen(true);
  };

  const handleEditCustomChart = (chart: CustomChart) => {
    setEditingCustomChart(chart);
    setIsCustomChartEditorOpen(true);
  };

  const handleSaveCustomChart = async (chart: CustomChart) => {
    try {
      const res = await api.saveCustomChart(chart);
      if (res.status === "success") {
        setCustomCharts(res.charts);
        if (selectedCustomChartId === chart.id || !selectedCustomChartId) {
          setSelectedCustomChartId(chart.id);
          setSelectedGame("");
          setCustomTitle(chart.title);
          const hib = chart.higher_is_better ? "HIGHER IS BETTER" : "LOWER IS BETTER";
          setSubHeaderPreset(chart.sub_header || `${chart.metric_name.toUpperCase()} (${chart.unit}) | ${hib}`);
          const ds = convertCustomChartToGroupedDataset(chart);
          setDatasets({ custom: ds });
          setActiveTab("custom");
        }
        setIsCustomChartEditorOpen(false);
        setEditingCustomChart(null);
      }
    } catch (e: any) {
      console.error("Failed to save custom chart:", e);
      alert(e.message || "Failed to save custom chart");
    }
  };

  const handleDeleteCustomChart = async (chartId: string) => {
    try {
      const res = await api.deleteCustomChart(chartId);
      if (res.status === "success") {
        setCustomCharts(res.charts);
        if (selectedCustomChartId === chartId) {
          setSelectedCustomChartId(null);
          if (games.length > 0) {
            setSelectedGame(games[0]);
            applyGameProfile(games[0], gameProfilesRef.current);
            setActiveTab("all");
          } else {
            setDatasets({});
          }
        }
        setIsCustomChartEditorOpen(false);
        setEditingCustomChart(null);
      }
    } catch (e: any) {
      console.error("Failed to delete custom chart:", e);
      alert(e.message || "Failed to delete custom chart");
    }
  };

  // When selected game changes, apply configured game profile or uppercase game name
  const handleSelectGame = (game: string) => {
    setSelectedCustomChartId(null);
    setSelectedGame(game);
    if (activeTab === "custom") {
      setActiveTab("all");
    }
    applyGameProfile(game, gameProfilesRef.current);
  };

  // Helper to build the uniform red sub-header: "[RES] | [PRESET] | HIGHER IS BETTER"
  const buildSubHeader = useCallback(
    (res: string): string => {
      if (selectedCustomChartId) {
        const c = customCharts.find((x) => x.id === selectedCustomChartId);
        if (c) {
          if (subHeaderPreset.trim()) return subHeaderPreset.trim();
          const hib = c.higher_is_better ? "HIGHER IS BETTER" : "LOWER IS BETTER";
          return `${c.metric_name.toUpperCase()} (${c.unit}) | ${hib}`;
        }
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
    },
    [subHeaderPreset, benchmarkMode, selectedCustomChartId, customCharts]
  );

  const handleSaveCurrentAsGameProfile = async (game: string, title: string, subHeader: string) => {
    if (selectedCustomChartId) {
      const current = customCharts.find((c) => c.id === selectedCustomChartId);
      if (current) {
        const updated: CustomChart = {
          ...current,
          title: title || current.title,
          sub_header: subHeader || current.sub_header
        };
        await handleSaveCustomChart(updated);
      }
      return;
    }
    if (!game) return;
    try {
      const res = await api.saveGameProfile({
        game_name: game,
        title: title || game.toUpperCase(),
        sub_header: subHeader,
        notes: gameProfiles[game]?.notes || ""
      });
      if (res.status === "success") {
        setGameProfiles(res.profiles);
        gameProfilesRef.current = res.profiles;
      }
    } catch (e) {
      console.error("Failed to save game profile from chart toolbar:", e);
    }
  };

  // Load tri-resolution chart data for selected game
  const loadGameData = useCallback(
    async (
      overrideGame?: string,
      overrideMode?: BenchmarkMode,
      resetFilters?: boolean
    ) => {
      const effectiveGame = overrideGame !== undefined ? overrideGame : selectedGame;
      const effectiveMode = overrideMode !== undefined ? overrideMode : benchmarkMode;

      if (!overrideGame && selectedCustomChartId) return;
      if (!effectiveGame) {
        setDatasets({});
        return;
      }

      try {
        const res = await api.getTriResolution({
          game: effectiveGame,
          groupBy: groupBy,
          filterGpu: resetFilters ? undefined : (filterGpu || undefined),
          filterCpu: resetFilters ? undefined : (filterCpu || undefined),
          filterMotherboard: resetFilters ? undefined : (filterMotherboard || undefined),
          filterLaptop: resetFilters ? undefined : (filterLaptop || undefined),
          filterPowerProfile: resetFilters ? undefined : (filterPowerProfile || undefined),
          aggregation: aggregation,
          customProductName: productName,
          mode: effectiveMode
        });

        const newDatasets: Record<string, GroupedBenchmarkDataset> = {};
        if (res.data) {
          for (const [resKey, items] of Object.entries(res.data)) {
            newDatasets[resKey] = convertToGroupedDataset(effectiveGame, resKey, items || []);
          }
        }
        setDatasets(newDatasets);

        const rList = await api.getResolutions(effectiveGame, effectiveMode);
        setAvailableResolutions(rList);
      } catch (e) {
        console.error("Failed to load tri-resolution data:", e);
      }
    },
    [selectedCustomChartId, selectedGame, groupBy, filterGpu, filterCpu, filterMotherboard, filterLaptop, filterPowerProfile, aggregation, productName, benchmarkMode]
  );

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  // Determine which dataset is currently active
  const activeDataset = (() => {
    if (selectedCustomChartId && datasets["custom"]) {
      return datasets["custom"];
    }
    if (activeTab !== "all" && datasets[activeTab]) {
      return datasets[activeTab];
    }
    const keys = Object.keys(datasets);
    if (keys.includes("1080p") && datasets["1080p"]?.rows?.length) {
      return datasets["1080p"];
    }
    for (const k of keys) {
      if ((datasets[k]?.rows?.length || 0) > 0) {
        return datasets[k];
      }
    }
    return datasets[keys[0]];
  })();

  // Smart auto-switch to 9:16 when product row count exceeds threshold (> 8)
  const lastCxAutoRatioKeyRef = useRef<string>("");
  useEffect(() => {
    if (!activeDataset || !activeDataset.rows || activeDataset.rows.length === 0) return;
    const currentKey = `${selectedGame}_${selectedCustomChartId || "std"}_${activeTab}_${activeDataset.rows.length}`;
    if (lastCxAutoRatioKeyRef.current !== currentKey) {
      lastCxAutoRatioKeyRef.current = currentKey;
      if (branding.autoSwitchVerticalEnabled) {
        if (activeDataset.rows.length > branding.autoSwitchThreshold) {
          if (exportConfig.aspectRatio !== "9:16") {
            setExportConfig((prev) => ({ ...prev, aspectRatio: "9:16" }));
            setChartOptions((prev) => ({ ...prev, aspectRatio: "9:16" }));
          }
        } else {
          const targetDefault = branding.defaultAspectRatio || "16:9";
          if (exportConfig.aspectRatio !== targetDefault) {
            setExportConfig((prev) => ({ ...prev, aspectRatio: targetDefault }));
            setChartOptions((prev) => ({ ...prev, aspectRatio: targetDefault }));
          }
        }
      }
    }
  }, [
    selectedGame,
    selectedCustomChartId,
    activeTab,
    activeDataset,
    branding.autoSwitchVerticalEnabled,
    branding.autoSwitchThreshold,
    branding.defaultAspectRatio
  ]);

  // Synchronize global branding settings to active chart options
  useEffect(() => {
    setChartOptions((prev) => ({
      ...prev,
      publicationLogoText: branding.publicationName,
      logoUrl: branding.logoUrl,
      logoAspectRatio: branding.logoAspectRatio
    }));
  }, [branding.publicationName, branding.logoUrl, branding.logoAspectRatio]);

  const effectiveTitle = selectedCustomChartId
    ? customTitle || (customCharts.find((c) => c.id === selectedCustomChartId)?.title || "CUSTOM CHART")
    : customTitle || selectedGame.toUpperCase();

  // Export active chart
  const handleExportActive = async () => {
    if (selectedCustomChartId) {
      const ds = datasets["custom"];
      if (!ds || ds.rows.length === 0) return;
      setIsExporting(true);
      setExportProgressText("Rendering custom chart...");
      try {
        const activeCustom = customCharts.find((c) => c.id === selectedCustomChartId);
        const opts = {
          ...chartOptions,
          title: effectiveTitle,
          subtitle: buildSubHeader("custom")
        };
        await exportSingleChart(
          ds,
          opts,
          exportConfig,
          productName,
          undefined,
          exportPhrase,
          effectiveTitle || activeCustom?.name || "Custom Chart",
          activeCustom?.unit || "Metric"
        );
      } catch (e) {
        console.error("Export custom chart error:", e);
      } finally {
        setIsExporting(false);
        setExportProgressText("");
      }
      return;
    }

    let targetRes = activeTab;
    if (targetRes === "all") {
      const keys = Object.keys(datasets).filter((k) => (datasets[k]?.rows?.length || 0) > 0);
      targetRes = keys[0] || (benchmarkMode === "laptop" ? "Native" : "1080p");
    }

    const ds = datasets[targetRes];
    if (!ds || ds.rows.length === 0) return;

    setIsExporting(true);
    setExportProgressText(`Rendering ${targetRes}...`);
    try {
      const opts = {
        ...chartOptions,
        title: effectiveTitle,
        subtitle: buildSubHeader(targetRes)
      };
      await exportSingleChart(
        ds,
        opts,
        exportConfig,
        productName,
        undefined,
        exportPhrase,
        effectiveTitle || selectedGame,
        targetRes
      );
    } catch (e) {
      console.error("Export active error:", e);
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  // Export tri-resolution / all profiles ZIP
  const handleExportTriResZip = async () => {
    setIsExporting(true);
    const zip = new JSZip();

    try {
      const keys = Object.keys(datasets).filter((k) => (datasets[k]?.rows?.length || 0) > 0);
      const resList = keys.length > 0 ? keys : ["1080p", "1440p", "4K"];

      for (const res of resList) {
        setExportProgressText(`Rendering ${res} chart...`);
        const ds = datasets[res];
        if (!ds || ds.rows.length === 0) continue;

        const opts: ChartDesignOptions = {
          ...chartOptions,
          title: effectiveTitle,
          subtitle: buildSubHeader(res)
        };

        const dataUrl = await renderChartToDataUrl(ds, opts, exportConfig);
        const base64Data = dataUrl.split(",")[1];
        const fileName = buildChartFileName(
          productName,
          effectiveTitle || selectedGame,
          res,
          exportConfig.format,
          exportPhrase
        );
        zip.file(fileName, base64Data, { base64: true });
      }

      setExportProgressText("Compressing into ZIP archive...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanProduct = (productName || "Product").trim().replace(/[\\/:*?"<>|]/g, "-");
      const cleanGame = (effectiveTitle || selectedGame).trim().replace(/[\\/:*?"<>|]/g, "-");
      link.download = `${cleanProduct} ${exportPhrase} - ${cleanGame} (${exportConfig.aspectRatio.replace(":", "x")}_${exportConfig.resolution}).zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Tri-res export error:", e);
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  // Batch Export ALL Games
  const handleExportAllGamesZip = async () => {
    if (games.length === 0 && customCharts.length === 0) return;

    setIsExporting(true);
    const zip = new JSZip();

    try {
      for (let gIdx = 0; gIdx < games.length; gIdx++) {
        const game = games[gIdx];
        setExportProgressText(`Processing ${gIdx + 1}/${games.length}: ${game}...`);

        const resData = await api.getTriResolution({
          game,
          groupBy,
          filterGpu: filterGpu || undefined,
          filterCpu: filterCpu || undefined,
          filterMotherboard: filterMotherboard || undefined,
          filterLaptop: filterLaptop || undefined,
          filterPowerProfile: filterPowerProfile || undefined,
          aggregation,
          customProductName: productName,
          mode: benchmarkMode
        });

        const profileKey = Object.keys(gameProfiles).find((k) => k.trim().toLowerCase() === game.trim().toLowerCase());
        const profile = profileKey ? gameProfiles[profileKey] : undefined;
        const gameTitle = profile?.title || game.toUpperCase();
        const gamePreset = profile?.sub_header || subHeaderPreset;
        const availableKeys = Object.keys(resData.data || {}).filter((k) => (resData.data?.[k]?.length || 0) > 0);
        const resList = availableKeys.length > 0 ? availableKeys : ["1080p", "1440p", "4K"];

        for (const res of resList) {
          const items = resData.data?.[res] || [];
          if (items.length === 0) continue;

          const ds = convertToGroupedDataset(game, res, items);
          const cleanPreset = gamePreset.trim();
          let subtitle = `${res.toUpperCase()} | ${cleanPreset} | HIGHER IS BETTER`;
          if (res.toLowerCase() === "native" || res.toLowerCase() === "all" || benchmarkMode === "laptop") {
            subtitle = cleanPreset ? `${cleanPreset} | HIGHER IS BETTER` : "AVERAGE & 1% LOW FPS | HIGHER IS BETTER";
          } else if (!cleanPreset) {
            subtitle = `${res.toUpperCase()} | AVERAGE & 1% LOW FPS | HIGHER IS BETTER`;
          }

          const opts: ChartDesignOptions = {
            ...chartOptions,
            title: gameTitle,
            subtitle
          };

          const dataUrl = await renderChartToDataUrl(ds, opts, exportConfig);
          const base64Data = dataUrl.split(",")[1];
          const fileName = buildChartFileName(productName, game, res, exportConfig.format, exportPhrase);
          zip.file(fileName, base64Data, { base64: true });
        }
      }

      // Also export non-empty custom charts
      for (const chart of customCharts) {
        if (!chart.rows || chart.rows.length === 0) continue;
        setExportProgressText(`Rendering custom chart: ${chart.name}...`);
        const ds = convertCustomChartToGroupedDataset(chart);
        const hib = chart.higher_is_better ? "HIGHER IS BETTER" : "LOWER IS BETTER";
        const sub = chart.sub_header || `${chart.metric_name.toUpperCase()} (${chart.unit}) | ${hib}`;
        const opts: ChartDesignOptions = {
          ...chartOptions,
          title: chart.title || chart.name,
          subtitle: sub
        };
        const dataUrl = await renderChartToDataUrl(ds, opts, exportConfig);
        const base64Data = dataUrl.split(",")[1];
        const fileName = buildChartFileName(
          productName,
          chart.title || chart.name,
          chart.unit || "Chart",
          exportConfig.format,
          exportPhrase
        );
        zip.file(fileName, base64Data, { base64: true });
      }

      setExportProgressText("Compressing all benchmark charts into ZIP...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanProduct = (productName || "Gaming").trim().replace(/[\\/:*?"<>|]/g, "-");
      link.download = `${cleanProduct} - All Benchmark Charts (${exportConfig.aspectRatio.replace(":", "x")}_${exportConfig.resolution}).zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Batch all games export failed:", e);
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-slate-100 font-sans">
      <Header
        folder={folder}
        runsCount={runsCount}
        gamesCount={games.length}
        isScanning={isScanning}
        onScan={handleScan}
        onBrowse={handleBrowse}
        onSelectFiles={handleSelectFiles}
        uiTheme={uiTheme}
        onToggleUiTheme={handleToggleUiTheme}
        onOpenRunsModal={() => setIsRunsModalOpen(true)}
        onOpenGpuHierarchyModal={() => setIsGpuHierarchyModalOpen(true)}
        gpuHierarchyCount={gpuHierarchy.length}
        onOpenGameProfilesModal={() => setIsGameProfilesModalOpen(true)}
        gameProfilesCount={Object.keys(gameProfiles).length}
        benchmarkMode={benchmarkMode}
        onToggleBenchmarkMode={handleToggleBenchmarkMode}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Game Selector Sidebar */}
        <GameSidebar
          games={games}
          selectedGame={selectedGame}
          onSelectGame={handleSelectGame}
          customCharts={customCharts}
          selectedCustomChartId={selectedCustomChartId}
          onSelectCustomChart={handleSelectCustomChart}
          onAddNewCustomChart={handleAddNewCustomChart}
          onEditCustomChart={handleEditCustomChart}
          benchmarkMode={benchmarkMode}
        />

        {/* Center Resolution Tabs & Chart Viewport */}
        <TriResolutionTabs
          gameName={selectedGame}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          datasets={datasets}
          availableResolutions={availableResolutions}
          benchmarkMode={benchmarkMode}
          options={chartOptions}
          onOptionsChange={(opts) => setChartOptions((prev) => ({ ...prev, ...opts }))}
          exportConfig={exportConfig}
          onExportConfigChange={(cfg) => setExportConfig((prev) => ({ ...prev, ...cfg }))}
          customTitle={customTitle}
          onCustomTitleChange={setCustomTitle}
          subHeaderPreset={subHeaderPreset}
          onSubHeaderPresetChange={setSubHeaderPreset}
          productName={productName}
          onProductNameChange={setProductName}
          exportPhrase={exportPhrase}
          onExportPhraseChange={setExportPhrase}
          onExportSingle={(res) => {
            const ds = datasets[res];
            if (ds) {
              const opts = {
                ...chartOptions,
                title: effectiveTitle,
                subtitle: buildSubHeader(res)
              };
              const gameForFile = selectedGame || effectiveTitle;
              exportSingleChart(
                ds,
                opts,
                exportConfig,
                productName,
                undefined,
                exportPhrase,
                gameForFile,
                res
              );
            }
          }}
          onExportActive={handleExportActive}
          onExportTriResZip={handleExportTriResZip}
          onExportAllGamesZip={handleExportAllGamesZip}
          isExporting={isExporting}
          exportProgressText={exportProgressText}
          onSaveGameProfile={handleSaveCurrentAsGameProfile}
          hasSavedProfile={!!gameProfiles[selectedGame]}
          isCustomChart={Boolean(selectedCustomChartId)}
          customChart={customCharts.find((c) => c.id === selectedCustomChartId) || null}
          onOpenCustomChartEditor={() => {
            const c = customCharts.find((c) => c.id === selectedCustomChartId);
            if (c) handleEditCustomChart(c);
          }}
        />

        {/* Right Sizing, Styling & Hardware Comparison Controls */}
        <ChartControls
          options={chartOptions}
          onOptionsChange={(opts) => setChartOptions((prev) => ({ ...prev, ...opts }))}
          exportConfig={exportConfig}
          onExportConfigChange={(cfg) => setExportConfig((prev) => ({ ...prev, ...cfg }))}
          groupBy={groupBy}
          onGroupByChange={handleGroupByChange}
          aggregation={aggregation}
          onAggregationChange={(val) => setAggregation(val)}
          availableGpus={availableGpus}
          availableCpus={availableCpus}
          availableMotherboards={availableMotherboards}
          availableLaptops={availableLaptops}
          availablePowerProfiles={availablePowerProfiles}
          benchmarkMode={benchmarkMode}
          filterGpu={filterGpu}
          onFilterGpuChange={setFilterGpu}
          filterCpu={filterCpu}
          onFilterCpuChange={setFilterCpu}
          filterMotherboard={filterMotherboard}
          onFilterMotherboardChange={setFilterMotherboard}
          filterLaptop={filterLaptop}
          onFilterLaptopChange={setFilterLaptop}
          filterPowerProfile={filterPowerProfile}
          onFilterPowerProfileChange={setFilterPowerProfile}
          productName={productName}
          onProductNameChange={setProductName}
          exportPhrase={exportPhrase}
          onExportPhraseChange={setExportPhrase}
          activeDataset={activeDataset}
          defaultLogoData={defaultLogoData}
          onExportActive={handleExportActive}
          onExportTriResZip={handleExportTriResZip}
          onExportAllGamesZip={handleExportAllGamesZip}
          isExporting={isExporting}
          exportProgressText={exportProgressText}
          onOpenGpuHierarchyModal={() => setIsGpuHierarchyModalOpen(true)}
          gpuHierarchy={gpuHierarchy}
        />
      </div>

      <RawRunsModal
        isOpen={isRunsModalOpen}
        onClose={() => setIsRunsModalOpen(false)}
        selectedGame={selectedGame}
        onRunsUpdated={handleRunsUpdated}
        benchmarkMode={benchmarkMode}
      />

      <GpuHierarchyModal
        isOpen={isGpuHierarchyModalOpen}
        onClose={() => setIsGpuHierarchyModalOpen(false)}
        currentHierarchy={gpuHierarchy}
        onHierarchySaved={handleHierarchySaved}
      />

      <GameProfilesModal
        isOpen={isGameProfilesModalOpen}
        onClose={() => setIsGameProfilesModalOpen(false)}
        scannedGames={games}
        selectedGame={selectedGame}
        onApplyProfileToActiveChart={(title, subHeader) => {
          if (title) setCustomTitle(title);
          if (subHeader) setSubHeaderPreset(subHeader);
        }}
        onProfilesUpdated={(updated) => {
          setGameProfiles(updated);
          gameProfilesRef.current = updated;
          if (selectedGame) {
            applyGameProfile(selectedGame, updated);
          }
        }}
      />

      <CustomChartEditorModal
        isOpen={isCustomChartEditorOpen}
        onClose={() => {
          setIsCustomChartEditorOpen(false);
          setEditingCustomChart(null);
        }}
        chart={editingCustomChart}
        benchmarkMode={benchmarkMode}
        availableGpus={availableGpus}
        availableCpus={availableCpus}
        availablePowerProfiles={availablePowerProfiles}
        availableLaptops={availableLaptops}
        onSave={handleSaveCustomChart}
        onDelete={handleDeleteCustomChart}
      />
    </div>
  );
};

export default CapFrameXApp;
