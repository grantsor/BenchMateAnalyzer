import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  api,
  SSDDatabaseModel,
  SSDMetricColumn
} from "../api/client";
import {
  BarChart3,
  Check,
  Download,
  Edit2,
  FolderOpen,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X
} from "lucide-react";

interface SSDDatabasePageProps {
  onNavigate?: (tab: any) => void;
  onSelectBenchmarkForChart?: (bId: string) => void;
}

type BenchmarkCategoryTab = "all" | "crystaldiskmark" | "as_ssd" | "as_ssd_copy" | "storage_suites";

export const SSDDatabasePage: React.FC<SSDDatabasePageProps> = ({
  onNavigate,
  onSelectBenchmarkForChart
}) => {
  const [models, setModels] = useState<SSDDatabaseModel[]>([]);
  const [metricColumns, setMetricColumns] = useState<SSDMetricColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BenchmarkCategoryTab>("all");

  // Inline editing state: { modelId, benchmarkId, metricId, value }
  const [editingCell, setEditingCell] = useState<{
    modelId: string;
    benchmarkId: string;
    metricId: string;
    currentValue: string;
  } | null>(null);
  const [recentlySavedCell, setRecentlySavedCell] = useState<string | null>(null);

  // Ingestion / Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);

  // Add Model Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModelForm, setNewModelForm] = useState({
    model_name: "",
    brand: "",
    capacity: "",
    interface: "",
    form_factor: "",
    notes: ""
  });
  const [isSavingNewModel, setIsSavingNewModel] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDatabase = async () => {
    setIsLoading(true);
    try {
      const [modelsData, colsData] = await Promise.all([
        api.getSSDModels(),
        api.getSSDMetricColumns()
      ]);
      setModels(modelsData);
      setMetricColumns(colsData);
    } catch (err) {
      console.error("Failed to load SSD database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  // Filter columns by category
  const filteredColumns = useMemo(() => {
    if (activeCategory === "all") return metricColumns;
    if (activeCategory === "crystaldiskmark") {
      return metricColumns.filter(c => c.benchmark_id.startsWith("crystaldiskmark"));
    }
    if (activeCategory === "as_ssd") {
      return metricColumns.filter(c => c.benchmark_id.startsWith("as_ssd_"));
    }
    if (activeCategory === "as_ssd_copy") {
      return metricColumns.filter(c => c.benchmark_id === "as_ssd_copy");
    }
    if (activeCategory === "storage_suites") {
      return metricColumns.filter(c => c.benchmark_id.includes("3dmark") || c.benchmark_id.includes("pcmark"));
    }
    return metricColumns;
  }, [metricColumns, activeCategory]);

  // Filter models by search
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(m =>
      m.model_name.toLowerCase().includes(q) ||
      (m.brand && m.brand.toLowerCase().includes(q)) ||
      (m.capacity && m.capacity.toLowerCase().includes(q))
    );
  }, [models, searchQuery]);

  // Handle inline score save
  const handleSaveCell = async (modelId: string, benchmarkId: string, metricId: string, valueStr: string) => {
    setEditingCell(null);
    if (!valueStr.trim()) return;
    const numVal = parseFloat(valueStr);
    if (isNaN(numVal)) return;

    const cellKey = `${modelId}:${benchmarkId}:${metricId}`;
    try {
      await api.updateSSDScore({
        model_id: modelId,
        benchmark_id: benchmarkId,
        metric_id: metricId,
        value: numVal,
        is_manual: true
      });

      // Update local state immediately for snappy response
      setModels(prev => prev.map(m => {
        if (m.id !== modelId) return m;
        const sKey = `${benchmarkId}:${metricId}`;
        return {
          ...m,
          scores: {
            ...m.scores,
            [sKey]: {
              id: m.scores[sKey]?.id || "new",
              benchmark_id: benchmarkId,
              metric_id: metricId,
              value: numVal,
              unit: m.scores[sKey]?.unit || "",
              is_manual: true
            }
          }
        };
      }));

      // Flash cell
      setRecentlySavedCell(cellKey);
      setTimeout(() => setRecentlySavedCell(null), 1500);
    } catch (err) {
      console.error("Failed to save cell value:", err);
      alert("Failed to save score update");
    }
  };

  // Model Name Inline Renaming state
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelName, setEditingModelName] = useState<string>("");

  const handleSaveModelName = async (modelId: string) => {
    const newName = editingModelName.trim();
    if (!newName) {
      setEditingModelId(null);
      return;
    }
    try {
      await api.updateSSDModel(modelId, { model_name: newName });
      setModels(prev => prev.map(m => m.id === modelId ? { ...m, model_name: newName } : m));
      setRecentlySavedCell(`${modelId}:model_name`);
      setTimeout(() => setRecentlySavedCell(null), 1500);
    } catch (err: any) {
      alert(err.message || "Failed to rename SSD model");
    } finally {
      setEditingModelId(null);
    }
  };

  // Handle Add Model
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.model_name.trim()) return;
    setIsSavingNewModel(true);
    try {
      await api.createSSDModel(newModelForm);
      setIsAddModalOpen(false);
      setNewModelForm({
        model_name: "",
        brand: "",
        capacity: "",
        interface: "",
        form_factor: "",
        notes: ""
      });
      await fetchDatabase();
    } catch (err: any) {
      alert(err.message || "Failed to create model");
    } finally {
      setIsSavingNewModel(false);
    }
  };

  // Handle Delete Model
  const handleDeleteModel = async (model: SSDDatabaseModel) => {
    if (!confirm(`Are you sure you want to remove "${model.model_name}" from the SSD Database?`)) {
      return;
    }
    try {
      await api.deleteSSDModel(model.id);
      setModels(prev => prev.filter(m => m.id !== model.id));
    } catch (err) {
      console.error("Failed to delete model:", err);
      alert("Failed to delete SSD model");
    }
  };

  // Handle Folder Browse & Ingest
  const handleBrowseAndScan = async () => {
    try {
      const browseRes = await api.browseFolder();
      if (browseRes.cancelled || !browseRes.folder_path) return;

      const folderPath = browseRes.folder_path;
      setIsScanning(true);
      setScanStatusMessage(`Scanning and running OCR on ${folderPath}...`);

      const res = await api.scanSSDFolder(folderPath);
      setScanStatusMessage(`Ingested ${res.models_updated.join(", ")} (${res.total_scores_saved} scores)!`);
      await fetchDatabase();
      setTimeout(() => setScanStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to scan folder");
      setScanStatusMessage(null);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Pre-populate helper (scan external SSD 2026 reference folder)
  const handlePreloadReferenceFolder = async () => {
    const defaultRef = "N:\\BenchMarkTool\\SSD Data Reference\\External SSD DATA 2026";
    if (!confirm(`Scan and load all SSDs from:\n${defaultRef}?`)) return;

    setIsScanning(true);
    setScanStatusMessage("Scanning all external SSD benchmark models...");
    try {
      const res = await api.scanSSDFolder(defaultRef);
      setScanStatusMessage(`Successfully ingested ${res.models_updated.length} SSD models (${res.total_scores_saved} scores)!`);
      await fetchDatabase();
      setTimeout(() => setScanStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to scan reference folder");
      setScanStatusMessage(null);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle CSV Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const res = await api.importSSDCSV(file);
      alert(`Import complete: ${res.models_imported} models imported, ${res.scores_imported} scores updated!`);
      await fetchDatabase();
    } catch (err: any) {
      alert(err.message || "Failed to import CSV");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLaunchChart = (benchmarkId: string) => {
    if (onSelectBenchmarkForChart) {
      onSelectBenchmarkForChart(benchmarkId);
    }
    if (onNavigate) {
      onNavigate("compare");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Hidden CSV File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />

      {/* Top Banner & Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                SSD Master Database
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Storage Repository
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Persistent cross-SSD benchmark repository. Directly click any cell to edit values inline, export/import CSV, or compare all models in charts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {/* Scan SSD Folder Button */}
          <button
            onClick={handleBrowseAndScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4" />
            )}
            <span>Scan SSD Folder...</span>
          </button>

          {/* Add Model Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-card hover:bg-brand-card/80 text-white text-sm font-medium border border-brand-border transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Model</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={() => window.open(api.getSSDExportCsvUrl(), "_blank")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-card hover:bg-brand-card/80 text-slate-200 hover:text-white text-sm font-medium border border-brand-border transition-all"
            title="Download full database as CSV for Excel"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-card hover:bg-brand-card/80 text-slate-200 hover:text-white text-sm font-medium border border-brand-border transition-all"
            title="Upload CSV to update or add SSD models"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Import CSV</span>
          </button>

          {/* Jump to Comparison Charts */}
          <button
            onClick={() => onNavigate && onNavigate("compare")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-sm font-medium border border-indigo-500/30 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Open Charts</span>
          </button>
        </div>
      </div>

      {/* Progress / Status Notification Banner */}
      {scanStatusMessage && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-medium">{scanStatusMessage}</span>
          </div>
          <button
            onClick={() => setScanStatusMessage(null)}
            className="p-1 hover:bg-emerald-800/40 rounded-lg text-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-brand-surface border border-brand-border/70 overflow-x-auto">
          {[
            { id: "all", label: "All Benchmarks" },
            { id: "crystaldiskmark", label: "CrystalDiskMark" },
            { id: "as_ssd", label: "AS SSD" },
            { id: "as_ssd_copy", label: "AS SSD Copy" },
            { id: "storage_suites", label: "3DMark & PCMark" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as BenchmarkCategoryTab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-brand-card/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Stats */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search SSD models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-xl bg-brand-surface border border-brand-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-56 transition-all"
            />
          </div>
          <button
            onClick={fetchDatabase}
            className="p-2 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-slate-400 hover:text-white transition-all"
            title="Refresh Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-xs font-medium text-slate-400 bg-brand-surface px-3 py-1.5 rounded-xl border border-brand-border">
            {filteredModels.length} Models
          </span>
        </div>
      </div>

      {/* Spreadsheet Data Grid */}
      <div className="bg-brand-surface border border-brand-border/80 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {isLoading && models.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-medium">Loading SSD Database...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="p-4 rounded-2xl bg-brand-card border border-brand-border/80 text-slate-400">
              <HardDrive className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-white">No SSD Models In Database</h3>
              <p className="text-xs text-slate-400">
                You haven't added any SSDs yet. You can scan an SSD folder, load the external SSD reference repository, or add a model manually.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handlePreloadReferenceFolder}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Preload 2026 Reference SSDs</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-card hover:bg-brand-card/80 text-white text-xs font-semibold border border-brand-border transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add First Model Manually</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-left border-collapse text-xs">
              {/* Table Header */}
              <thead className="bg-brand-card/90 sticky top-0 z-20 border-b border-brand-border backdrop-blur-md">
                <tr>
                  {/* Sticky Model Name Column */}
                  <th className="py-3 px-4 font-bold text-slate-300 uppercase tracking-wider sticky left-0 z-30 bg-brand-card border-r border-brand-border/70 min-w-[240px]">
                    SSD Model
                  </th>

                  {/* Benchmark Metric Columns */}
                  {filteredColumns.map((col) => (
                    <th
                      key={`${col.benchmark_id}:${col.metric_id}`}
                      className="py-2.5 px-3 font-semibold text-slate-300 uppercase tracking-wider text-right border-r border-brand-border/40 min-w-[140px] group select-none hover:bg-brand-card"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="truncate" title={col.title}>
                          {col.title}
                        </span>
                        {/* 1-Click Launch into Comparison Charts */}
                        <button
                          onClick={() => handleLaunchChart(col.benchmark_id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-opacity"
                          title={`Plot ${col.title} in Comparison Charts`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}

                  {/* Row Action Column */}
                  <th className="py-3 px-3 text-center text-slate-400 w-12 sticky right-0 z-20 bg-brand-card border-l border-brand-border/70">
                    <SlidersHorizontal className="w-3.5 h-3.5 mx-auto" />
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-brand-border/40">
                {filteredModels.map((model) => (
                  <tr
                    key={model.id}
                    className="hover:bg-brand-card/40 transition-colors group"
                  >
                    {/* Sticky Model Name Cell (Editable in place) */}
                    <td className={`py-3 px-4 font-semibold text-white sticky left-0 z-10 border-r border-brand-border/70 transition-colors ${
                      recentlySavedCell === `${model.id}:model_name`
                        ? "bg-emerald-950/70 ring-1 ring-emerald-500/80"
                        : "bg-brand-surface group-hover:bg-brand-card/90"
                    }`}>
                      {editingModelId === model.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingModelName}
                            onChange={(e) => setEditingModelName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveModelName(model.id);
                              if (e.key === "Escape") setEditingModelId(null);
                            }}
                            className="bg-brand-card border border-emerald-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 w-full font-bold"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveModelName(model.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shrink-0"
                            title="Save new name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingModelId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-bold text-slate-100 hover:text-emerald-400 cursor-pointer transition-colors truncate"
                                onDoubleClick={() => {
                                  setEditingModelId(model.id);
                                  setEditingModelName(model.model_name);
                                }}
                                title="Double click or click pencil to rename"
                              >
                                {model.model_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingModelId(model.id);
                                  setEditingModelName(model.model_name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition shrink-0"
                                title="Rename SSD model"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            {(model.brand || model.capacity) && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {model.brand && (
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {model.brand}
                                  </span>
                                )}
                                {model.capacity && (
                                  <span className="text-[10px] font-semibold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                    {model.capacity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Metric Score Cells (Direct Click-to-Edit) */}
                    {filteredColumns.map((col) => {
                      const scoreKey = `${col.benchmark_id}:${col.metric_id}`;
                      const cellKey = `${model.id}:${scoreKey}`;
                      const score = model.scores[scoreKey];
                      const isEditing =
                        editingCell?.modelId === model.id &&
                        editingCell?.benchmarkId === col.benchmark_id &&
                        editingCell?.metricId === col.metric_id;
                      const isRecentlySaved = recentlySavedCell === cellKey;

                      return (
                        <td
                          key={scoreKey}
                          onClick={() => {
                            if (!isEditing) {
                              setEditingCell({
                                modelId: model.id,
                                benchmarkId: col.benchmark_id,
                                metricId: col.metric_id,
                                currentValue: score?.value !== undefined ? String(score.value) : ""
                              });
                            }
                          }}
                          className={`py-2 px-3 text-right font-mono text-xs cursor-pointer border-r border-brand-border/30 transition-all ${
                            isRecentlySaved
                              ? "bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/50"
                              : isEditing
                              ? "bg-slate-900/90 ring-2 ring-emerald-400"
                              : "hover:bg-brand-card/80 text-slate-200"
                          }`}
                          title={score?.is_manual ? "Manually edited" : "Double-click to edit"}
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              autoFocus
                              value={editingCell.currentValue}
                              onChange={(e) =>
                                setEditingCell(prev =>
                                  prev ? { ...prev, currentValue: e.target.value } : null
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveCell(
                                    model.id,
                                    col.benchmark_id,
                                    col.metric_id,
                                    editingCell.currentValue
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingCell(null);
                                }
                              }}
                              onBlur={() =>
                                handleSaveCell(
                                  model.id,
                                  col.benchmark_id,
                                  col.metric_id,
                                  editingCell.currentValue
                                )
                              }
                              className="w-full bg-slate-950 text-emerald-300 font-bold px-1 py-0.5 rounded border border-emerald-500/50 text-right text-xs focus:outline-none"
                            />
                          ) : score?.value !== undefined && score.value !== null ? (
                            <span className="flex items-center justify-end gap-1 font-semibold">
                              <span>{score.value}</span>
                              {score.is_manual && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" title="Manual edit" />
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-normal hover:text-slate-400">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Delete Model Action */}
                    <td className="py-2 px-2 text-center sticky right-0 z-10 bg-brand-surface group-hover:bg-brand-card/90 border-l border-brand-border/70">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(model);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete SSD model"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add SSD Model Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add New SSD Model</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateModel} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  SSD Model Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kingston XS2000 2TB"
                  value={newModelForm.model_name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, model_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Kingston"
                    value={newModelForm.brand}
                    onChange={(e) => setNewModelForm({ ...newModelForm, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Capacity</label>
                  <input
                    type="text"
                    placeholder="e.g. 2TB"
                    value={newModelForm.capacity}
                    onChange={(e) => setNewModelForm({ ...newModelForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Interface</label>
                  <input
                    type="text"
                    placeholder="e.g. USB 3.2 Gen 2x2"
                    value={newModelForm.interface}
                    onChange={(e) => setNewModelForm({ ...newModelForm, interface: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Form Factor</label>
                  <input
                    type="text"
                    placeholder="e.g. Portable SSD"
                    value={newModelForm.form_factor}
                    onChange={(e) => setNewModelForm({ ...newModelForm, form_factor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional hardware specs or controller details..."
                  value={newModelForm.notes}
                  onChange={(e) => setNewModelForm({ ...newModelForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-card border border-brand-border text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-card text-slate-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewModel || !newModelForm.model_name.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50"
                >
                  {isSavingNewModel ? "Saving..." : "Add to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
