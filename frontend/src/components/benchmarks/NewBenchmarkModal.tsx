import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  FileImage,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Loader2,
  Zap,
  FlaskConical,
  Bot,
  AlertCircle
} from "lucide-react";
import {
  api,
  BenchmarkProfile,
  CandidateScore,
  ScoreDetectionResult,
  AIDetectResult,
  TestExtractResult
} from "../../api/client";

interface NewBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newBenchmark: BenchmarkProfile) => void;
  initialData?: {
    name?: string;
    version?: string;
    category?: string;
    sampleImagePath?: string;
    resultId?: string;
    projectId?: string;
    configurationId?: string;
  };
}

interface MetricRow {
  id?: string;
  name: string;
  display_name: string;
  unit: string;
  higher_is_better: boolean;
  decimal_places: number;
  initial_value?: number;
}

const CATEGORY_PRESETS = [
  "Gaming",
  "CPU",
  "GPU",
  "Render",
  "AI",
  "System",
  "Storage",
  "Browser"
];

export const NewBenchmarkModal: React.FC<NewBenchmarkModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [version, setVersion] = useState(initialData?.version || "");
  const [category, setCategory] = useState(initialData?.category || "Gaming");
  const [keywords, setKeywords] = useState("");
  const [metrics, setMetrics] = useState<MetricRow[]>([
    {
      name: "Score",
      display_name: "Score",
      unit: "score",
      higher_is_better: true,
      decimal_places: 0
    }
  ]);

  // Image & OCR state
  const [sampleImagePath, setSampleImagePath] = useState<string | null>(
    initialData?.sampleImagePath || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [aiProposal, setAiProposal] = useState<AIDetectResult | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isTestingExtract, setIsTestingExtract] = useState(false);
  const [testExtractResult, setTestExtractResult] = useState<TestExtractResult | null>(null);
  const [detectionResult, setDetectionResult] = useState<ScoreDetectionResult | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData?.name) setName(initialData.name);
      if (initialData?.version) setVersion(initialData.version);
      if (initialData?.category) setCategory(initialData.category);
      if (initialData?.sampleImagePath) {
        setSampleImagePath(initialData.sampleImagePath);
        handleDetectFromPath(initialData.sampleImagePath);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleDetectFromPath = async (path: string) => {
    setIsDetecting(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file_path", path);
      const res = await api.detectScores(formData);
      setDetectionResult(res);
    } catch (err: any) {
      console.warn("Could not auto-detect scores:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAIDetect = async (fileOverride?: File, pathOverride?: string) => {
    const fileToAnalyze = fileOverride || uploadedFile;
    const pathToAnalyze = pathOverride || sampleImagePath;

    if (!fileToAnalyze && !pathToAnalyze) {
      fileInputRef.current?.click();
      return;
    }

    setIsAiDetecting(true);
    setErrorMessage(null);
    setAiNotice(null);
    try {
      const formData = new FormData();
      if (fileToAnalyze) {
        formData.append("image", fileToAnalyze);
      } else if (pathToAnalyze) {
        formData.append("image_path", pathToAnalyze);
      }

      const proposal = await api.aiDetectBenchmark(formData);
      setAiProposal(proposal);

      if (proposal.name) setName(proposal.name);
      if (proposal.category) setCategory(proposal.category);
      if (proposal.keywords && proposal.keywords.length > 0) {
        setKeywords(proposal.keywords.join(", "));
      }
      if (proposal.metrics && proposal.metrics.length > 0) {
        setMetrics(
          proposal.metrics.map((m) => ({
            id: m.id,
            name: m.name,
            display_name: m.display_name,
            unit: m.unit,
            higher_is_better: m.higher_is_better,
            decimal_places: m.decimal_places,
            initial_value: m.value
          }))
        );
      }

      setAiNotice(
        `✨ AI identified "${proposal.name}" (${proposal.category}) with ${proposal.metrics?.length || 0} candidate metrics.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze benchmark with AI vision.");
    } finally {
      setIsAiDetecting(false);
    }
  };

  const handleTestDynamicExtraction = async () => {
    if (!uploadedFile && !sampleImagePath) {
      setErrorMessage("Please upload or select a screenshot to test dynamic extraction.");
      return;
    }

    setIsTestingExtract(true);
    setTestExtractResult(null);
    setErrorMessage(null);
    try {
      const b_id = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "custom_test";
      const benchmarkData = {
        id: b_id,
        name: name.trim() || "Test Benchmark",
        version: version.trim() || "1.0",
        category: category.trim() || "General",
        keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        metrics: metrics.map((m, idx) => ({
          id: m.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || `metric_${idx + 1}`,
          name: m.name.trim(),
          display_name: (m.display_name || m.name).trim(),
          unit: m.unit.trim() || "score",
          higher_is_better: m.higher_is_better,
          decimal_places: m.decimal_places,
          sort_order: idx
        }))
      };

      const formData = new FormData();
      if (uploadedFile) {
        formData.append("image", uploadedFile);
      } else if (sampleImagePath) {
        formData.append("image_path", sampleImagePath);
      }
      formData.append("benchmark_data", JSON.stringify(benchmarkData));

      const result = await api.testExtractDynamicBenchmark(formData);
      setTestExtractResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to test dynamic template extraction.");
    } finally {
      setIsTestingExtract(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsDetecting(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("image_file", file);
      const res = await api.detectScores(formData);
      setDetectionResult(res);
      setSampleImagePath(res.file_path);

      // Auto-suggest benchmark name from filename if empty
      if (!name) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        if (cleanName) setName(cleanName);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze image with OCR.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAddCandidateAsMetric = (candidate: CandidateScore) => {
    setSelectedCandidateIds((prev) => new Set([...prev, candidate.id]));

    // Determine clean name and unit
    const metricName = candidate.suggested_name || `Score ${metrics.length + 1}`;
    const metricUnit = candidate.unit || (metricName.toLowerCase().includes("fps") ? "fps" : "score");
    const isHigher = !metricName.toLowerCase().includes("time") && !metricName.toLowerCase().includes("delay");

    // Check if default placeholder row is untouched, replace it
    if (metrics.length === 1 && metrics[0].name === "Score" && !metrics[0].initial_value) {
      setMetrics([
        {
          name: metricName,
          display_name: metricName,
          unit: metricUnit,
          higher_is_better: isHigher,
          decimal_places: Number.isInteger(candidate.value) ? 0 : 1,
          initial_value: candidate.value
        }
      ]);
    } else {
      setMetrics((prev) => [
        ...prev,
        {
          name: metricName,
          display_name: metricName,
          unit: metricUnit,
          higher_is_better: isHigher,
          decimal_places: Number.isInteger(candidate.value) ? 0 : 1,
          initial_value: candidate.value
        }
      ]);
    }
  };

  const handleAddCustomMetric = () => {
    setMetrics((prev) => [
      ...prev,
      {
        name: `Metric ${prev.length + 1}`,
        display_name: `Metric ${prev.length + 1}`,
        unit: "score",
        higher_is_better: true,
        decimal_places: 0
      }
    ]);
  };

  const handleUpdateMetric = (index: number, field: keyof MetricRow, value: any) => {
    setMetrics((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "name" && !copy[index].display_name) {
        copy[index].display_name = value;
      }
      return copy;
    });
  };

  const handleRemoveMetric = (index: number) => {
    if (metrics.length <= 1) {
      alert("At least one metric is required for each benchmark.");
      return;
    }
    setMetrics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter a benchmark name.");
      return;
    }
    if (metrics.length === 0) {
      setErrorMessage("Please specify at least one metric.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const kwList = keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await api.createBenchmark({
        name: name.trim(),
        version: version.trim(),
        category: category.trim(),
        keywords: kwList.length > 0 ? kwList : [name.trim()],
        aliases: [name.trim().toLowerCase()],
        metrics: metrics.map((m, idx) => ({
          name: m.name.trim(),
          display_name: (m.display_name || m.name).trim(),
          unit: m.unit.trim() || "score",
          higher_is_better: m.higher_is_better,
          decimal_places: m.decimal_places,
          sort_order: idx
        }))
      });

      // If initial result or project configuration exists, assign values
      if (initialData?.projectId && initialData?.configurationId) {
        const metricValues: Record<string, number> = {};
        metrics.forEach((m, idx) => {
          const targetMetricId = created.metrics[idx]?.id || m.name.toLowerCase().replace(/\s+/g, "_");
          if (m.initial_value !== undefined) {
            metricValues[targetMetricId] = m.initial_value;
          }
        });

        if (Object.keys(metricValues).length > 0) {
          try {
            await api.assignResult({
              project_id: initialData.projectId,
              configuration_id: initialData.configurationId,
              benchmark_id: created.id,
              result_id: initialData.resultId,
              metric_values: metricValues
            });
          } catch (assignErr) {
            console.warn("Benchmark created, but could not auto-assign result scores:", assignErr);
          }
        }
      }

      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create benchmark profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveTitle = version.trim() ? `${name.trim()} ${version.trim()}` : name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-brand-border/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-brand-red/10 text-brand-red border border-brand-red/20">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Add New Benchmark Profile
              </h2>
              <p className="text-xs text-slate-400">
                Register a new benchmark to track its scores, define charts, and standardize export labeling.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-brand-surface transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* 1. Benchmark Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-red" />
              <span>1. Benchmark Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Benchmark Name <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cyberpunk 2077, Speedometer 3.0"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Version Note
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 2.1, 3.0"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CATEGORY_PRESETS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        category === cat
                          ? "bg-brand-red text-white shadow"
                          : "bg-brand-surface border border-brand-border text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Keywords / Filename Hints (Optional)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. cyberpunk, cp2077, rt_ultra"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                />
                <span className="text-[10px] text-slate-500">
                  Comma-separated keywords used to automatically recognize screenshot files.
                </span>
              </div>
            </div>
          </div>

          <hr className="border-brand-border/60" />

          {/* 2. Interactive Screenshot Score Selector & AI Vision */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <FileImage className="w-3.5 h-3.5 text-brand-red" />
                <span>2. Screenshot & AI Vision Analysis</span>
              </h3>
              <div className="flex items-center space-x-2">
                {(uploadedFile || sampleImagePath) && (
                  <button
                    type="button"
                    disabled={isAiDetecting}
                    onClick={() => handleAIDetect()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
                  >
                    {isAiDetecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    )}
                    <span>{isAiDetecting ? "Analyzing with AI..." : "✨ Auto-Detect with AI"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-surface border border-brand-border text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-brand-red" />
                  <span>{sampleImagePath ? "Change Screenshot" : "Upload Screenshot"}</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* AI Notice Banner */}
            {aiNotice && (
              <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-800 text-xs font-semibold text-purple-200 flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{aiNotice}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-900/80 text-purple-300 border border-purple-700">
                  GPU/NPU Accelerated
                </span>
              </div>
            )}

            {isDetecting && (
              <div className="flex items-center justify-center space-x-2 py-6 bg-brand-surface/40 rounded-2xl border border-brand-border text-xs text-slate-400">
                <Loader2 className="w-4 h-4 text-brand-red animate-spin" />
                <span>Scanning screenshot and detecting score candidates...</span>
              </div>
            )}

            {/* Detected Candidates Box */}
            {detectionResult && detectionResult.candidates.length > 0 && (
              <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Detected Numeric Scores from Screenshot</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click any score below to add it to your benchmark metrics:
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
                  {detectionResult.candidates.map((c) => {
                    const isSelected = selectedCandidateIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddCandidateAsMetric(c)}
                        className={`p-2 rounded-xl text-left border transition flex items-center space-x-2.5 ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                            : "bg-brand-card border-brand-border/80 hover:border-brand-red text-slate-200"
                        }`}
                        title={`Raw text: "${c.raw_text}" (Confidence: ${Math.round(c.confidence * 100)}%)`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate max-w-[140px]">
                            {c.suggested_name}
                          </div>
                          <div className="text-xs font-mono font-extrabold text-brand-red">
                            {c.value} <span className="text-[10px] text-slate-400 font-sans">{c.unit}</span>
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-white" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <hr className="border-brand-border/60" />

          {/* 3. Benchmark Metrics to Plot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-red" />
                <span>3. Configured Metrics ({metrics.length})</span>
              </h3>
              <div className="flex items-center space-x-2">
                {(uploadedFile || sampleImagePath) && (
                  <button
                    type="button"
                    disabled={isTestingExtract}
                    onClick={handleTestDynamicExtraction}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition disabled:opacity-50"
                  >
                    {isTestingExtract ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FlaskConical className="w-3.5 h-3.5" />
                    )}
                    <span>{isTestingExtract ? "Testing..." : "🧪 Test Dynamic Extraction"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddCustomMetric}
                  className="flex items-center space-x-1 text-xs font-bold text-brand-red hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Metric</span>
                </button>
              </div>
            </div>

            {/* Test Extraction Preview Card */}
            {testExtractResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Dynamic Extraction Verified (Confidence: {Math.round(testExtractResult.overall_confidence * 100)}%)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700 uppercase font-bold">
                    Zero-Recompile Ready
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {Object.entries(testExtractResult.metrics).map(([mId, mData]) => (
                    <div key={mId} className="bg-brand-surface/90 p-2.5 rounded-xl border border-brand-border/60">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">{mData.metric_id || mId}</div>
                      <div className="text-sm font-extrabold text-emerald-400 font-mono">
                        {mData.normalized_value ?? "N/A"} <span className="text-[10px] text-slate-400 font-sans">{mData.unit}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        Raw: "{mData.raw_text}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-brand-surface rounded-2xl border border-brand-border flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  {/* Metric Name */}
                  <div className="flex-1 space-y-1 min-w-[140px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Metric Name
                    </label>
                    <input
                      type="text"
                      required
                      value={m.name}
                      onChange={(e) => handleUpdateMetric(idx, "name", e.target.value)}
                      placeholder="e.g. Average FPS"
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-24 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={m.unit}
                      onChange={(e) => handleUpdateMetric(idx, "unit", e.target.value)}
                      placeholder="fps, pts, s"
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold text-center"
                    />
                  </div>

                  {/* Direction: Higher is Better vs Lower */}
                  <div className="w-36 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Direction
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateMetric(idx, "higher_is_better", !m.higher_is_better)}
                      className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 border ${
                        m.higher_is_better
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {m.higher_is_better ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          <span>Higher Better</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          <span>Lower Better</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Initial Value (if applicable) */}
                  {m.initial_value !== undefined && (
                    <div className="w-24 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        Sample Score
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={m.initial_value}
                        onChange={(e) => handleUpdateMetric(idx, "initial_value", parseFloat(e.target.value) || 0)}
                        className="w-full bg-brand-card border border-brand-border rounded-xl px-2 py-1.5 text-xs text-brand-red font-mono font-bold text-center"
                      />
                    </div>
                  )}

                  {/* Delete Button */}
                  <div className="pt-4 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveMetric(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 transition"
                      title="Remove metric"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-brand-surface/40 border border-brand-border space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center space-x-1">
              <Info className="w-3 h-3 text-brand-red" />
              <span>Live Chart Header & Filename Preview</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-1">
              <div>
                <span className="text-slate-500">Chart Title: </span>
                <span className="font-extrabold text-white uppercase tracking-wider">
                  {effectiveTitle ? effectiveTitle.toUpperCase() : "UNTITLED BENCHMARK"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Export Filename: </span>
                <span className="font-mono text-slate-300 font-semibold">
                  [Product] - {effectiveTitle || "Benchmark"}.webp
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand-red hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-brand-red/30 flex items-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Profile...</span>
                </>
              ) : (
                <>
                  <span>Create Benchmark Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
