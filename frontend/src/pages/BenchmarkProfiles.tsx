import React, { useState, useEffect, useRef } from "react";
import { api, BenchmarkProfile } from "../api/client";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Laptop,
  HardDrive,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Tag,
  Zap,
  Plus,
  Trash2
} from "lucide-react";
import { NewBenchmarkModal } from "../components/benchmarks/NewBenchmarkModal";

// The core laptop review benchmarks (Zenbook, ExpertBook Ultra, etc.)
const CORE_LAPTOP_BENCHMARKS = new Set([
  "blender_benchmark",
  "blender",
  "cinebench_r26",
  "corona_benchmark",
  "corona",
  "crossmark",
  "geekbench6",
  "geekbench_ai",
  "gbai",
  "occt_benchmark",
  "octane_benchmark",
  "octane",
  "pcmark10",
  "pcm10",
  "superpi_benchmark",
  "superpi",
  "threedmark_firestrike",
  "threedmark_speedway",
  "threedmark_steelnomad",
  "threedmark_timespy",
  "vray_benchmark",
  "vray",
  "wprime_benchmark",
  "wprime"
]);

// The 8 core SSD review benchmarks
const CORE_SSD_BENCHMARKS = new Set([
  "crystaldiskmark_1gb",
  "crystaldiskmark_16gb",
  "as_ssd_1gb",
  "as_ssd_10gb",
  "as_ssd_copy",
  "pcmark10_data_drive",
  "pcmark10_quick_system_drive",
  "threedmark_storage",
  "crystaldiskmark",
  "blackmagic_speed_test_1gb",
  "blackmagic_speed_test_5gb",
  "blackmagic_1gb",
  "blackmagic_5gb",
  "occt_storage"
]);

const STORAGE_KEY_PROFILES_CACHE = "gp_benchmark_profiles_cache_v1";

function getCachedProfiles(): Record<string, Partial<BenchmarkProfile>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES_CACHE);
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return {};
}

function storeCachedProfile(bId: string, partial: Partial<BenchmarkProfile>) {
  try {
    const current = getCachedProfiles();
    current[bId] = { ...(current[bId] || {}), ...partial };
    localStorage.setItem(STORAGE_KEY_PROFILES_CACHE, JSON.stringify(current));
  } catch (err) {}
}

function removeCachedProfile(bId: string) {
  try {
    const current = getCachedProfiles();
    delete current[bId];
    localStorage.setItem(STORAGE_KEY_PROFILES_CACHE, JSON.stringify(current));
  } catch (err) {}
}

interface BenchmarkProfilesPageProps {
  onNavigateToChart?: (benchmarkId: string) => void;
}

export const BenchmarkProfilesPage: React.FC<BenchmarkProfilesPageProps> = ({
  onNavigateToChart
}) => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [expandedMetricsId, setExpandedMetricsId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Local editing buffer for responsive, controlled inputs
  const [editBuffer, setEditBuffer] = useState<Record<string, BenchmarkProfile>>({});
  const autoSaveTimersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getBenchmarks();
      const cached = getCachedProfiles();
      const merged = data.map((b) => {
        if (cached[b.id]) {
          return { ...b, ...cached[b.id] };
        }
        return b;
      });
      setBenchmarks(merged);
      const initialBuffer: Record<string, BenchmarkProfile> = {};
      merged.forEach((b) => {
        initialBuffer[b.id] = JSON.parse(JSON.stringify(b));
      });
      setEditBuffer(initialBuffer);
    } catch (err: any) {
      console.error("Failed to load benchmarks:", err);
      setError(err?.message || "Failed to load benchmarks from server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (bId: string, field: "name" | "version" | "category", val: string) => {
    storeCachedProfile(bId, { [field]: val });

    // Sync to chart preferences immediately and dispatch real-time event
    if (field === "name") {
      try {
        const raw = localStorage.getItem("gp_benchmark_chart_preferences_v1");
        const prefs = raw ? JSON.parse(raw) : {};
        prefs.customBenchmarkTitles = {
          ...(prefs.customBenchmarkTitles || {}),
          [bId]: val
        };
        localStorage.setItem("gp_benchmark_chart_preferences_v1", JSON.stringify(prefs));
      } catch (err) {}

      window.dispatchEvent(
        new CustomEvent("gp_benchmark_profile_updated", {
          detail: { id: bId, name: val }
        })
      );
    }

    setEditBuffer((prev) => {
      const current = prev[bId];
      if (!current) return prev;
      const updated = {
        ...current,
        [field]: val
      };

      // Debounced auto-save to backend (350ms)
      if (autoSaveTimersRef.current[bId]) {
        clearTimeout(autoSaveTimersRef.current[bId]);
      }
      autoSaveTimersRef.current[bId] = setTimeout(() => {
        handleSaveBenchmark(bId, updated);
      }, 350);

      return {
        ...prev,
        [bId]: updated
      };
    });
  };

  const handleApplyPreset = (bId: string, formatType: "name_version" | "name_paren_version" | "name_only") => {
    const current = editBuffer[bId];
    if (!current) return;
    const base = current.name.split(" v")[0].split(" (")[0].trim();
    const ver = current.version?.trim();

    let newName = current.name;
    if (formatType === "name_version" && ver) {
      newName = `${base} ${ver}`;
    } else if (formatType === "name_paren_version" && ver) {
      newName = `${base} (v${ver})`;
    } else if (formatType === "name_only") {
      newName = base;
    }

    handleFieldChange(bId, "name", newName);
  };

  const handleMetricChange = (
    bId: string,
    mId: string,
    field: "display_name" | "unit" | "higher_is_better",
    val: any
  ) => {
    setEditBuffer((prev) => {
      const current = prev[bId];
      if (!current) return prev;
      const updatedMetrics = current.metrics.map((m) => {
        if (m.id === mId) {
          return { ...m, [field]: val };
        }
        return m;
      });
      const updated = {
        ...current,
        metrics: updatedMetrics
      };

      if (autoSaveTimersRef.current[bId]) {
        clearTimeout(autoSaveTimersRef.current[bId]);
      }
      autoSaveTimersRef.current[bId] = setTimeout(() => {
        handleSaveBenchmark(bId, updated);
      }, 600);

      return {
        ...prev,
        [bId]: updated
      };
    });
  };

  const handleSaveBenchmark = async (bId: string, customData?: BenchmarkProfile) => {
    const data = customData || editBuffer[bId];
    if (!data) return;
    setSavingId(bId);
    try {
      const updated = await api.updateBenchmark(bId, {
        name: data.name,
        version: data.version || "",
        category: data.category || "",
        metrics: data.metrics.map((m) => ({
          id: m.id,
          name: m.name,
          display_name: m.display_name,
          unit: m.unit,
          higher_is_better: m.higher_is_better,
          decimal_places: m.decimal_places,
          sort_order: m.sort_order
        }))
      });

      storeCachedProfile(bId, {
        name: updated.name,
        version: updated.version,
        category: updated.category
      });

      try {
        const raw = localStorage.getItem("gp_benchmark_chart_preferences_v1");
        const prefs = raw ? JSON.parse(raw) : {};
        prefs.customBenchmarkTitles = {
          ...(prefs.customBenchmarkTitles || {}),
          [bId]: updated.name
        };
        localStorage.setItem("gp_benchmark_chart_preferences_v1", JSON.stringify(prefs));
      } catch (err) {}

      setBenchmarks((prev) => prev.map((b) => (b.id === bId ? updated : b)));
      setSavedSuccessId(bId);
      setTimeout(() => setSavedSuccessId(null), 2500);
    } catch (err) {
      console.error("Failed to save benchmark:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleResetBenchmark = async (bId: string) => {
    if (!confirm("Are you sure you want to reset this benchmark to its factory default definition?")) {
      return;
    }
    removeCachedProfile(bId);
    setSavingId(bId);
    try {
      const reset = await api.resetBenchmark(bId);
      setBenchmarks((prev) => prev.map((b) => (b.id === bId ? reset : b)));
      setEditBuffer((prev) => ({
        ...prev,
        [bId]: JSON.parse(JSON.stringify(reset))
      }));

      try {
        const raw = localStorage.getItem("gp_benchmark_chart_preferences_v1");
        const prefs = raw ? JSON.parse(raw) : {};
        if (prefs.customBenchmarkTitles) {
          delete prefs.customBenchmarkTitles[bId];
          localStorage.setItem("gp_benchmark_chart_preferences_v1", JSON.stringify(prefs));
        }
      } catch (err) {}

      setSavedSuccessId(bId);
      setTimeout(() => setSavedSuccessId(null), 2000);
    } catch (err) {
      console.error("Failed to reset benchmark:", err);
      alert("Failed to reset benchmark.");
    } finally {
      setSavingId(null);
    }
  };

  // Filter benchmarks
  const filteredBenchmarks = benchmarks.filter((b) => {
    if (b.id === "unknown") return false;

    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.version && b.version.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === "all") return true;
    if (selectedCategory === "core_11") return CORE_LAPTOP_BENCHMARKS.has(b.id);
    if (selectedCategory === "core_ssd") return CORE_SSD_BENCHMARKS.has(b.id) || (b.category || "").toLowerCase().includes("storage");

    const catLower = (b.category || "").toLowerCase();
    const selLower = selectedCategory.toLowerCase();
    if (catLower === selLower) return true;
    if (selLower === "storage" && (catLower.includes("storage") || catLower.includes("ssd") || catLower.includes("disk"))) return true;
    if (selLower === "gpu" && (catLower.includes("gpu") || catLower === "gaming" || catLower === "render")) return true;
    if (selLower === "cpu" && (catLower.includes("cpu") || catLower.includes("browser"))) return true;
    if (catLower.includes(selLower)) return true;
    return false;
  });

  const visibleBenchmarksCount = benchmarks.filter((b) => b.id !== "unknown").length;
  const core11Count = benchmarks.filter((b) => CORE_LAPTOP_BENCHMARKS.has(b.id)).length;
  const coreSSDCount = benchmarks.filter((b) => CORE_SSD_BENCHMARKS.has(b.id) || (b.category || "").toLowerCase().includes("storage")).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border/60 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-brand-red/10 text-brand-red border border-brand-red/20">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Benchmark Profiles & Chart Labeling
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Customize benchmark naming, versions (e.g. <span className="text-white font-mono">Geekbench 6.7</span>, <span className="text-white font-mono">CrystalDiskMark 8.0</span>, <span className="text-white font-mono">AS SSD 2.0</span>), and metric units to standardize your laptop and SSD review charts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-red text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-brand-red/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Benchmark</span>
          </button>

          <button
            onClick={loadBenchmarks}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Profiles</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-brand-red text-white shadow"
                : "bg-brand-surface border border-brand-border text-slate-400 hover:text-white"
            }`}
          >
            All Benchmarks ({visibleBenchmarksCount})
          </button>

          <button
            onClick={() => setSelectedCategory("core_11")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              selectedCategory === "core_11"
                ? "bg-amber-500 text-slate-950 font-extrabold shadow"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop Review Core ({core11Count})</span>
          </button>

          <button
            onClick={() => setSelectedCategory("core_ssd")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              selectedCategory === "core_ssd"
                ? "bg-cyan-500 text-slate-950 font-extrabold shadow"
                : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>SSD Review Core ({coreSSDCount})</span>
          </button>

          {["CPU", "GPU", "Storage", "Render", "System", "AI"].map((cat) => {
            const count = benchmarks.filter((b) => {
              if (b.id === "unknown") return false;
              const catLower = (b.category || "").toLowerCase();
              const selLower = cat.toLowerCase();
              if (catLower === selLower) return true;
              if (selLower === "storage" && (catLower.includes("storage") || catLower.includes("ssd") || catLower.includes("disk"))) return true;
              if (selLower === "gpu" && (catLower.includes("gpu") || catLower === "gaming" || catLower === "render")) return true;
              if (selLower === "cpu" && (catLower.includes("cpu") || catLower.includes("browser"))) return true;
              return catLower.includes(selLower);
            }).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-brand-red text-white shadow"
                    : "bg-brand-surface border border-brand-border text-slate-400 hover:text-white"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] ${selectedCategory === cat ? "text-rose-200" : "text-slate-500"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search benchmarks..."
            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-red font-medium"
          />
        </div>
      </div>

      {/* Benchmark Profile Cards */}
      {error ? (
        <div className="text-center py-12 p-6 bg-rose-500/10 rounded-2xl border border-rose-500/30 space-y-3">
          <p className="text-sm font-bold text-rose-300">{error}</p>
          <button
            onClick={loadBenchmarks}
            className="px-4 py-2 rounded-xl bg-brand-red text-white text-xs font-bold hover:brightness-110 transition shadow inline-flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-16 text-xs text-slate-400">
          Loading benchmark profiles...
        </div>
      ) : filteredBenchmarks.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-400 bg-brand-card/50 rounded-2xl border border-brand-border space-y-2">
          <p>No benchmarks found matching your query.</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-brand-red hover:underline font-semibold text-xs"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBenchmarks.map((b) => {
            const buf = editBuffer[b.id] || b;
            const isCore = CORE_LAPTOP_BENCHMARKS.has(b.id);
            const isSaving = savingId === b.id;
            const isSaved = savedSuccessId === b.id;
            const isExpanded = expandedMetricsId === b.id;

            const isSsd = CORE_SSD_BENCHMARKS.has(b.id);

            return (
              <div
                key={b.id}
                className="bg-brand-card rounded-2xl border border-brand-border p-4 shadow-md space-y-3 transition hover:border-slate-600"
              >
                {/* Compact Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-red shrink-0">
                      {isCore ? (
                        <Laptop className="w-4 h-4 text-brand-red" />
                      ) : isSsd ? (
                        <HardDrive className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Cpu className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-xs text-white truncate">{b.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-surface text-slate-400 border border-brand-border font-mono">
                          {b.id}
                        </span>
                        {isCore && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                            Laptop Core
                          </span>
                        )}
                        {isSsd && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 font-semibold border border-blue-500/30">
                            SSD Core
                          </span>
                        )}
                        {b.category && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {b.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact Header Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {isSaved && (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </span>
                    )}

                    {onNavigateToChart && (
                      <button
                        type="button"
                        onClick={() => onNavigateToChart(b.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-slate-300 hover:text-white text-[11px] font-medium transition"
                        title="View this benchmark in Comparison Charts"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Chart</span>
                      </button>
                    )}

                    {!isCore && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete custom benchmark "${b.name}"?`)) {
                            try {
                              await api.deleteBenchmark(b.id);
                              loadBenchmarks();
                            } catch (err: any) {
                              alert("Failed to delete benchmark: " + err.message);
                            }
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-brand-surface border border-brand-border text-slate-400 hover:text-rose-400 hover:border-rose-500/40 text-[11px] font-medium transition"
                        title="Delete custom benchmark"
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResetBenchmark(b.id)}
                      disabled={isSaving}
                      className="px-2 py-1 rounded-lg bg-brand-surface border border-brand-border text-slate-400 hover:text-white text-[11px] font-medium transition"
                      title="Reset benchmark profile to default definition"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedMetricsId(isExpanded ? null : b.id)}
                      className="px-2 py-1 rounded-lg bg-brand-surface border border-brand-border text-slate-400 hover:text-white text-[11px] font-medium transition flex items-center space-x-1"
                    >
                      <span>Metrics ({buf.metrics.length})</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Compact Inputs: Chart Display Title & Version */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span>Chart Display Title</span>
                      {isSaving && <span className="text-[10px] text-amber-400 animate-pulse font-mono">Saving...</span>}
                    </label>
                    <input
                      type="text"
                      value={buf.name}
                      onChange={(e) => handleFieldChange(b.id, "name", e.target.value)}
                      onBlur={() => {
                        if (autoSaveTimersRef.current[b.id]) clearTimeout(autoSaveTimersRef.current[b.id]);
                        handleSaveBenchmark(b.id, buf);
                      }}
                      placeholder="e.g. Geekbench 6.7"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-brand-red transition"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 block">Version</label>
                    <input
                      type="text"
                      value={buf.version || ""}
                      onChange={(e) => handleFieldChange(b.id, "version", e.target.value)}
                      onBlur={() => {
                        if (autoSaveTimersRef.current[b.id]) clearTimeout(autoSaveTimersRef.current[b.id]);
                        handleSaveBenchmark(b.id, buf);
                      }}
                      placeholder="e.g. 6.7"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-brand-red transition"
                    />
                  </div>
                </div>

                {/* Expandable Metrics Subsection */}
                {isExpanded && (
                  <div className="mt-2 p-3 bg-brand-surface/30 rounded-xl border border-brand-border/40 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                      <span className="col-span-3">Metric ID</span>
                      <span className="col-span-4">Chart Display Name</span>
                      <span className="col-span-2">Unit</span>
                      <span className="col-span-3">Direction</span>
                    </div>

                    {buf.metrics.map((m) => (
                      <div
                        key={m.id}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-brand-surface border border-brand-border/60"
                      >
                        <span className="col-span-3 font-mono text-xs text-slate-300 truncate">
                          {m.id}
                        </span>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={m.display_name}
                            onChange={(e) =>
                              handleMetricChange(b.id, m.id, "display_name", e.target.value)
                            }
                            className="w-full bg-brand-bg border border-brand-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={m.unit}
                            onChange={(e) =>
                              handleMetricChange(b.id, m.id, "unit", e.target.value)
                            }
                            className="w-full bg-brand-bg border border-brand-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                          />
                        </div>
                        <div className="col-span-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleMetricChange(
                                b.id,
                                m.id,
                                "higher_is_better",
                                !m.higher_is_better
                              )
                            }
                            className={`w-full py-1 px-2 rounded-lg text-xs font-semibold border transition ${
                              m.higher_is_better
                                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60"
                                : "bg-amber-950/60 border-amber-500/40 text-amber-400 hover:bg-amber-900/60"
                            }`}
                          >
                            {m.higher_is_better ? "Higher Better" : "Lower Better"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Custom Benchmark Modal */}
      <NewBenchmarkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newBench) => {
          loadBenchmarks();
          setExpandedMetricsId(newBench.id);
        }}
      />
    </div>
  );
};
