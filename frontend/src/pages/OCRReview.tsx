import React, { useState, useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api, OCRReviewItem, BenchmarkProfile } from "../api/client";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileImage,
  History,
  Layers,
  Loader2,
  RefreshCw,
  Slash,
  X,
  Plus,
  Tag,
  Sparkles,
  BarChart3,
  ArrowRight,
  FolderSync,
  FolderTree
} from "lucide-react";
import { NewBenchmarkModal } from "../components/benchmarks/NewBenchmarkModal";

interface OCRReviewProps {
  onNavigate: (tab: any) => void;
}

export const OCRReviewPage: React.FC<OCRReviewProps> = ({ onNavigate }) => {
  const { currentProject, projects, selectProject } = useProjectStore();

  const [items, setItems] = useState<OCRReviewItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<OCRReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "unknown" | "needs_review" | "verified" | "ignored">("all");
  const [actionNotice, setActionNotice] = useState<{ text: string; type: "success" | "info" | "warning" } | null>(null);

  // Benchmarks list and Reassignment state
  const [benchmarks, setBenchmarks] = useState<BenchmarkProfile[]>([]);
  const [reassignBenchmarkId, setReassignBenchmarkId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Edit metric state
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("Reviewer verification");

  // Fullscreen image modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    api.getBenchmarks().then(setBenchmarks).catch(console.error);
  }, []);

  // Auto-dismiss notification banner
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  const loadReviewItems = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const list = await api.getOCRReview(currentProject.id);
      setItems(list);
      if (list.length > 0 && !selectedItem) {
        setSelectedItem(list[0]);
      } else if (selectedItem) {
        // Keep selected updated
        const updated = list.find((i) => i.result_id === selectedItem.result_id);
        if (updated) setSelectedItem(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviewItems();
  }, [currentProject?.id]);

  const handleAccept = async (resultId: string) => {
    try {
      await api.updateResultStatus(resultId, "verified");
      setActionNotice({ text: "✓ Result accepted and verified with 100% confidence!", type: "success" });
      await loadReviewItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleRevert = async (resultId: string) => {
    try {
      await api.updateResultStatus(resultId, "needs_review");
      setActionNotice({ text: "Result status reverted back to Needs Review.", type: "info" });
      await loadReviewItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleIgnore = async (resultId: string) => {
    try {
      await api.updateResultStatus(resultId, "ignored");
      setActionNotice({ text: "Result marked as ignored.", type: "info" });
      await loadReviewItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleReprocess = async (resultId: string) => {
    try {
      await api.reprocessResult(resultId);
      setActionNotice({ text: "OCR reprocessed successfully.", type: "info" });
      await loadReviewItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleReassignBenchmark = async (resultId: string, benchmarkId: string) => {
    if (!benchmarkId) return;
    setIsReassigning(true);
    try {
      const resp = await api.reassignResultBenchmark(resultId, benchmarkId, true);
      const chosen = benchmarks.find((b) => b.id === benchmarkId);

      // If the backend returned the freshly updated item, immediately update local state
      if (resp && resp.item) {
        setItems((prev) =>
          prev.map((i) => (i.result_id === resultId ? resp.item : i))
        );
        if (selectedItem?.result_id === resultId) {
          setSelectedItem(resp.item);
        }
      }

      setActionNotice({
        text: `✓ Screenshot assigned to ${chosen ? chosen.name : benchmarkId} and reparsed!`,
        type: "success"
      });
      await loadReviewItems();
    } catch (err: any) {
      alert("Failed to reassign benchmark: " + err.message);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleSaveOverride = async (metricId: string) => {
    const num = parseFloat(overrideValue);
    if (isNaN(num)) {
      alert("Please enter a valid numeric value.");
      return;
    }

    try {
      await api.overrideMetric(metricId, num, overrideReason);
      setEditingMetricId(null);
      setActionNotice({ text: "Metric correction saved and marked as manual override.", type: "success" });
      await loadReviewItems();
    } catch (err: any) {
      alert("Failed to save correction: " + err.message);
    }
  };

  // Sync reassign dropdown with current selection
  useEffect(() => {
    if (selectedItem) {
      setReassignBenchmarkId(selectedItem.benchmark_id !== "unknown" ? selectedItem.benchmark_id : "");
    }
  }, [selectedItem?.result_id]);

  // Filter calculations
  const unknownCount = items.filter((i) => i.benchmark_id === "unknown").length;
  const needsReviewCount = items.filter((i) => i.status === "needs_review" && i.benchmark_id !== "unknown").length;
  const verifiedCount = items.filter((i) => i.status === "verified" || i.status === "manual_override").length;
  const ignoredCount = items.filter((i) => i.status === "ignored").length;

  const filteredItems = items.filter((i) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unknown") return i.benchmark_id === "unknown";
    if (statusFilter === "needs_review") return i.status === "needs_review";
    if (statusFilter === "verified") return i.status === "verified" || i.status === "manual_override";
    if (statusFilter === "ignored") return i.status === "ignored";
    return true;
  });

  if (statusFilter === "needs_review") {
    filteredItems.sort((a, b) => (a.overall_confidence ?? 0) - (b.overall_confidence ?? 0));
  }

  // Keep selected item within current filter
  useEffect(() => {
    if (filteredItems.length > 0) {
      if (!selectedItem || !filteredItems.some((i) => i.result_id === selectedItem.result_id)) {
        setSelectedItem(filteredItems[0]);
      }
    }
  }, [statusFilter, items]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">OCR Verification & Audit Review</h2>
          <p className="text-xs text-slate-400 mt-1">
            Never trust OCR blindly. Inspect raw screenshot regions, verify confidence, and log manual corrections with an audit trail.
          </p>
        </div>
      </div>

      {/* Methodical Workflow Stepper Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-brand-card border border-brand-border/80 shadow-md">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onNavigate("projects")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer border border-brand-border/60"
          >
            <FolderTree className="w-3.5 h-3.5 text-slate-400" />
            <span>1. New Project</span>
          </button>
          <span className="text-slate-500 font-bold">→</span>
          <button
            type="button"
            onClick={() => onNavigate("import")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer border border-brand-border/60"
          >
            <FolderSync className="w-3.5 h-3.5 text-slate-400" />
            <span>2. Import & Scan</span>
          </button>
          <span className="text-slate-500 font-bold">→</span>
          <div className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-brand-red text-white font-bold shadow-md shadow-rose-900/30">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>3. OCR Review (Active)</span>
          </div>
          <span className="text-slate-500 font-bold">→</span>
          <button
            type="button"
            onClick={() => onNavigate("compare")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer border border-brand-border/60"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <span>4. Comparison Charts</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {projects.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Project:</span>
              <select
                value={currentProject?.id || ""}
                onChange={(e) => selectProject(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-brand-red cursor-pointer max-w-[200px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate("compare")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 flex items-center space-x-2 active:scale-95 cursor-pointer shrink-0"
          >
            <span>Proceed to Comparison Charts</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionNotice.type === "success"
              ? "bg-emerald-950/90 border-emerald-600 text-emerald-200"
              : actionNotice.type === "warning"
              ? "bg-amber-950/90 border-amber-600 text-amber-200"
              : "bg-sky-950/90 border-sky-600 text-sky-200"
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-semibold">
            {actionNotice.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20 space-x-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
          <span className="text-sm font-medium">Loading review items...</span>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Items List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Extracted Screenshots ({filteredItems.length}/{items.length})
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-brand-surface rounded-xl border border-brand-border text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition text-center ${
                  statusFilter === "all"
                    ? "bg-brand-card text-white shadow-sm border border-brand-border"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setStatusFilter("unknown")}
                className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition text-center ${
                  statusFilter === "unknown"
                    ? "bg-rose-950/70 text-rose-300 border border-rose-600 shadow-sm"
                    : unknownCount > 0
                    ? "text-rose-400 hover:text-rose-300 font-bold"
                    : "text-slate-500 hover:text-slate-400"
                }`}
              >
                Unknown ({unknownCount})
              </button>
              <button
                onClick={() => setStatusFilter("needs_review")}
                className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition text-center ${
                  statusFilter === "needs_review"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/80 shadow-sm"
                    : "text-slate-400 hover:text-amber-300"
                }`}
              >
                Review ({needsReviewCount})
              </button>
              <button
                onClick={() => setStatusFilter("verified")}
                className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition text-center ${
                  statusFilter === "verified"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 shadow-sm"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => setStatusFilter("ignored")}
                className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition text-center ${
                  statusFilter === "ignored"
                    ? "bg-slate-800 text-slate-200 border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ignored ({ignoredCount})
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-brand-surface/40 rounded-2xl border border-dashed border-brand-border text-xs text-slate-400">
                No screenshots found in this category.
              </div>
            ) : (
              <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.result_id === item.result_id;
                  const isVerified = item.status === "verified";
                  const isOverridden = item.status === "manual_override";
                  const isIgnored = item.status === "ignored";

                  const confPercent = isVerified || isOverridden ? 100 : Math.round(item.overall_confidence * 100);

                  let badgeColor = "bg-emerald-950/80 text-emerald-400 border-emerald-800";
                  let badgeText = `${confPercent}% Conf`;

                  if (isVerified) {
                    badgeColor = "bg-emerald-950/90 text-emerald-300 border-emerald-600";
                    badgeText = "✓ 100% Conf";
                  } else if (isOverridden) {
                    badgeColor = "bg-sky-950/90 text-sky-300 border-sky-600";
                    badgeText = "100% Override";
                  } else if (isIgnored) {
                    badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
                    badgeText = "Ignored";
                  } else if (confPercent < 70) {
                    badgeColor = "bg-rose-950/80 text-rose-400 border-rose-800";
                  } else if (confPercent < 85) {
                    badgeColor = "bg-amber-950/80 text-amber-400 border-amber-800";
                  }

                  return (
                    <div
                      key={item.result_id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-2xl border cursor-pointer transition shadow-md ${
                        isSelected
                          ? "bg-brand-card border-brand-red shadow-brand-red/10"
                          : "bg-brand-card/60 border-brand-border hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 truncate pr-2">
                          <span className="font-bold text-sm text-white truncate block">
                            {item.benchmark_name}
                          </span>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <span className="font-medium text-slate-300">
                              {item.configuration_name}
                            </span>
                            <span>·</span>
                            <span className="font-mono text-[11px] truncate">
                              {item.image?.file_name || "image"}
                            </span>
                          </div>
                          {item.benchmark_id === "unknown" && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-bold mt-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Needs Benchmark Tag</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${badgeColor}`}>
                            {badgeText}
                          </span>
                          <span className={`text-[10px] font-semibold capitalize ${
                            isVerified ? "text-emerald-400 font-bold" : isOverridden ? "text-sky-400" : isIgnored ? "text-slate-500" : "text-slate-400"
                          }`}>
                            {isVerified ? "✓ Verified" : item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Metric preview badges */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-brand-border/40 text-[11px]">
                        {item.metrics.map((m) => (
                          <div
                            key={m.metric_id}
                            className="px-2 py-1 rounded bg-brand-surface border border-brand-border/60 text-slate-300 font-mono"
                          >
                            <span className="text-slate-400 font-sans mr-1">{m.metric_name}:</span>
                            <span className="font-bold text-white">
                              {m.normalized_value !== null ? m.normalized_value.toLocaleString() : "N/A"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Inspection Card */}
          {selectedItem ? (
            <div className="lg:col-span-7 bg-brand-card rounded-3xl border border-brand-border p-6 shadow-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Benchmark & Configuration Banner */}
                <div className="flex items-start justify-between border-b border-brand-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {selectedItem.benchmark_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configuration:{" "}
                      <span className="text-slate-200 font-semibold">
                        {selectedItem.configuration_name}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-red hover:brightness-110 text-white font-semibold text-xs transition shadow-md flex items-center space-x-1.5"
                      title="Create a new custom benchmark profile using this screenshot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Benchmark Profile</span>
                    </button>

                    {selectedItem.status === "verified" ? (
                      <div className="flex items-center space-x-2">
                        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 font-bold text-xs flex items-center space-x-1.5 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>✓ Verified (100% Conf)</span>
                        </div>
                        <button
                          onClick={() => handleRevert(selectedItem.result_id)}
                          className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-border text-slate-300 hover:text-white font-medium text-xs transition border border-brand-border"
                          title="Revert back to Needs Review"
                        >
                          Revert
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAccept(selectedItem.result_id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md flex items-center space-x-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>✓ Accept Result</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleReprocess(selectedItem.result_id)}
                      className="p-2 hover:bg-brand-border rounded-xl text-slate-400 hover:text-white transition"
                      title="Reprocess OCR"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleIgnore(selectedItem.result_id)}
                      className="p-2 hover:bg-rose-950/40 rounded-xl text-slate-400 hover:text-rose-400 transition"
                      title="Ignore screenshot"
                    >
                      <Slash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Benchmark Assignment Toolbar */}
                {selectedItem.benchmark_id === "unknown" && (
                  <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/80 text-amber-200 flex items-center justify-between shadow-md animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-300">Unclassified Screenshot</p>
                        <p className="text-xs text-amber-300/80">
                          Select the correct benchmark below and click Apply & Reparse to extract all scores automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-brand-surface border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center space-x-2.5 flex-1 min-w-[280px]">
                    <Tag className="w-4 h-4 text-brand-red shrink-0" />
                    <span className="text-xs font-bold text-slate-300 shrink-0">
                      {selectedItem.benchmark_id === "unknown" ? "Assign Benchmark:" : "Change Benchmark:"}
                    </span>
                    <select
                      value={reassignBenchmarkId}
                      onChange={(e) => setReassignBenchmarkId(e.target.value)}
                      className="flex-1 bg-brand-card text-xs text-white rounded-xl border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-red font-medium"
                    >
                      <option value="">-- Choose Benchmark Definition --</option>
                      {[...benchmarks]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.category || "General"})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReassignBenchmark(selectedItem.result_id, reassignBenchmarkId)}
                      disabled={!reassignBenchmarkId || isReassigning}
                      className="px-4 py-2 rounded-xl bg-brand-red hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md flex items-center space-x-1.5"
                    >
                      {isReassigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Apply & Reparse</span>
                    </button>
                  </div>
                </div>

                {/* Screenshot Preview */}
                {selectedItem.image?.file_path ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-brand-border bg-black/60 aspect-video flex items-center justify-center">
                    <img
                      src={api.getImageUrl(selectedItem.image.file_path)}
                      alt={selectedItem.image.file_name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setPreviewImageUrl(api.getImageUrl(selectedItem.image!.file_path))}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur text-xs font-semibold text-white flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Resolution</span>
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video rounded-2xl border border-dashed border-brand-border flex items-center justify-center text-xs text-slate-500">
                    No image file attached
                  </div>
                )}

                {/* Extracted Metrics with Inline Override */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Extracted Metric Values
                  </span>

                  <div className="space-y-3">
                    {selectedItem.metrics.map((m) => {
                      const isEditing = editingMetricId === m.result_metric_id;
                      const confPct = Math.round(m.confidence * 100);

                      return (
                        <div
                          key={m.result_metric_id}
                          className="bg-brand-surface rounded-2xl border border-brand-border/70 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-white">
                                {m.metric_name}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">({m.unit})</span>
                              {m.has_override && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-950 text-sky-400 border border-sky-800">
                                  MANUAL OVERRIDE
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs font-mono font-bold flex items-center space-x-1 ${
                                  selectedItem.status === "verified" || confPct >= 85
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {selectedItem.status === "verified" ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>100% Conf (Verified)</span>
                                  </>
                                ) : (
                                  <span>{confPct}% Confidence</span>
                                )}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingMetricId(m.result_metric_id);
                                  setOverrideValue(String(m.normalized_value ?? ""));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-brand-border/80 hover:bg-brand-border text-slate-200 text-xs font-semibold"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          {/* Metric Display / Edit Form */}
                          {isEditing ? (
                            <div className="p-3 bg-brand-card rounded-xl border border-brand-red space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                    Corrected Value (Number)
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={overrideValue}
                                    onChange={(e) => setOverrideValue(e.target.value)}
                                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                    Reason for Correction
                                  </label>
                                  <input
                                    type="text"
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setEditingMetricId(null)}
                                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveOverride(m.result_metric_id)}
                                  className="px-4 py-1 rounded-lg bg-brand-red text-white text-xs font-semibold shadow"
                                >
                                  Save Correction
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="space-y-0.5">
                                <div className="text-xl font-bold font-mono text-white">
                                  {m.normalized_value !== null ? m.normalized_value.toLocaleString() : "N/A"}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Raw OCR String: <span className="font-mono text-slate-300">"{m.raw_ocr_value}"</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Audit Trail History */}
                          {m.override_history.length > 0 && (
                            <div className="pt-2 border-t border-brand-border/40 text-[11px] space-y-1">
                              <div className="flex items-center space-x-1 text-slate-400 font-semibold">
                                <History className="w-3 h-3 text-sky-400" />
                                <span>Correction History (Audit Trail):</span>
                              </div>
                              {m.override_history.map((h, i) => (
                                <div key={i} className="text-slate-400 pl-4">
                                  Changed from <span className="text-slate-200 font-mono">{h.original}</span> to{" "}
                                  <span className="text-emerald-400 font-mono">{h.corrected}</span> ({h.reason})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Source Traceability info */}
              <div className="pt-4 border-t border-brand-border text-xs text-slate-400 flex items-center justify-between">
                <span className="font-mono text-[11px] truncate max-w-sm">
                  Source: {selectedItem.image?.file_path}
                </span>
                <span className="text-[11px] font-semibold text-slate-300">
                  Status: {selectedItem.status.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-brand-card/40 rounded-3xl border border-dashed border-brand-border/80 p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[400px]">
              <CheckCircle className="w-12 h-12 text-slate-600" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-300">No Item Selected</h4>
                <p className="text-xs text-slate-500">
                  Select a benchmark screenshot from the list on the left to inspect and verify OCR data.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Floating/Fixed Workflow Action Bar */}
      {!isLoading && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-brand-card/95 border border-brand-border/80 shadow-2xl backdrop-blur">
          <div className="flex items-center space-x-3 text-xs text-slate-300">
            <span className="font-bold text-white">Review Summary:</span>
            <span>{verifiedCount} of {items.length} verified</span>
            {unknownCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px] font-semibold">
                {unknownCount} unassigned
              </span>
            )}
            {needsReviewCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold">
                {needsReviewCount} need review
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("compare")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center space-x-2 active:scale-95 transition cursor-pointer"
          >
            <span>All Done Reviewing? Generate Comparison Charts</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="py-16 text-center space-y-4 bg-brand-card/60 rounded-3xl border border-brand-border p-8 max-w-xl mx-auto my-6 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center mx-auto text-slate-400">
            <FileImage className="w-7 h-7 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-white">
            No Extracted Screenshots in "{currentProject?.name || "Selected Project"}"
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            This project has no extracted benchmark results yet. If you recently selected or scanned a folder in{" "}
            <strong className="text-slate-200">Import & Scan</strong>, please click{" "}
            <strong className="text-brand-red">"Extract Scores"</strong> on that page to process the screenshots and review them here.
          </p>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={() => onNavigate("import")}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition active:scale-95 cursor-pointer"
            >
              <FolderSync className="w-4 h-4" />
              <span>Go to Import & Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={previewImageUrl}
            alt="Fullscreen Source"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Create Benchmark Profile Modal */}
      {selectedItem && (
        <NewBenchmarkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={async () => {
            await loadReviewItems();
          }}
          initialData={{
            name:
              selectedItem.benchmark_id === "unknown" && selectedItem.image?.file_name
                ? selectedItem.image.file_name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
                : selectedItem.benchmark_name,
            sampleImagePath: selectedItem.image?.file_path,
            resultId: selectedItem.result_id,
            projectId: currentProject?.id,
            configurationId: selectedItem.configuration_id
          }}
        />
      )}
    </div>
  );
};
