import React, { useState, useEffect, useMemo } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api, GroupedBenchmarkDataset } from "../api/client";
import {
  BarChart2,
  CheckCircle2,
  Edit2,
  FileJson,
  FileSpreadsheet,
  Layers,
  Loader2,
  Radio,
  Sparkles,
  TrendingDown,
  TrendingUp
} from "lucide-react";

interface ResultsPageProps {
  onNavigate: (tab: any) => void;
  onSelectBenchmarkForChart: (benchmarkId: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  onNavigate,
  onSelectBenchmarkForChart
}) => {
  const { currentProject, refreshCurrentProject } = useProjectStore();

  const [datasets, setDatasets] = useState<GroupedBenchmarkDataset[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>("");
  const [aggregation, setAggregation] = useState<string>("best");
  const [baselineConfigId, setBaselineConfigId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Configuration editing state
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const loadResults = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const data = await api.getGroupedResults(
        currentProject.id,
        undefined,
        aggregation,
        baselineConfigId || undefined
      );
      const sorted = [...data].sort((a, b) => a.benchmark_name.localeCompare(b.benchmark_name));
      setDatasets(sorted);
      if (sorted.length > 0) {
        let currentTarget = selectedBenchmarkId;
        if (currentTarget === "superpi_benchmark" || currentTarget === "wprime_benchmark") {
          currentTarget = "arithmetic_benchmark";
        } else if (currentTarget === "threedmark_speedway" || currentTarget === "threedmark_steelnomad") {
          currentTarget = "threedmark_speedway_steelnomad";
        }
        if (!currentTarget || !sorted.some(d => d.benchmark_id === currentTarget)) {
          setSelectedBenchmarkId(sorted[0].benchmark_id);
        } else {
          setSelectedBenchmarkId(currentTarget);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [currentProject?.id, aggregation, baselineConfigId]);

  const handleSaveConfigName = async (configId: string) => {
    if (!editingName.trim()) return;
    try {
      await api.updateConfigName(configId, editingName.trim());
      setEditingConfigId(null);
      await refreshCurrentProject();
      await loadResults();
    } catch (err: any) {
      alert("Failed to update name: " + err.message);
    }
  };

  const sortedDatasets = useMemo(() => {
    return [...datasets].sort((a, b) => a.benchmark_name.localeCompare(b.benchmark_name));
  }, [datasets]);

  const activeDataset = sortedDatasets.find((d) => d.benchmark_id === selectedBenchmarkId) || sortedDatasets[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-white">Benchmark Results & Grouping</h2>
            {currentProject && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-brand-surface border border-brand-border text-slate-300">
                <span className="text-brand-red">●</span>
                <span>{currentProject.product_name || currentProject.name}</span>
                {currentProject.product_category && (
                  <span className="text-[10px] text-slate-400 bg-brand-card px-1.5 py-0.5 rounded border border-brand-border/60">
                    {currentProject.product_category}
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Scores automatically grouped across test configurations. Rename display labels and choose baseline for percentage comparisons.
          </p>
        </div>

        {activeDataset && (
          <button
            onClick={() => {
              onSelectBenchmarkForChart(activeDataset.benchmark_id);
              onNavigate("compare");
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition active:scale-95"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Generate Chart for {activeDataset.benchmark_name}</span>
          </button>
        )}
      </div>

      {/* Benchmark Selection & Multi-Run Aggregation Panel */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-5 shadow-xl space-y-4">
        {/* Header with Title, Count badge, and Aggregation Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border/60">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-brand-red" />
            <span className="text-sm font-bold text-white tracking-wide">Available Benchmarks</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-brand-surface border border-brand-border text-slate-300">
              {sortedDatasets.length}
            </span>
          </div>

          {/* Aggregation Selector */}
          <div className="flex items-center space-x-2.5 text-xs">
            <span className="text-slate-400 font-semibold whitespace-nowrap">Multi-Run Aggregation:</span>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-white font-medium focus:outline-none focus:border-brand-red text-xs transition"
            >
              <option value="best">Best Score</option>
              <option value="average">Average (Mean)</option>
              <option value="median">Median</option>
              <option value="worst">Worst Score</option>
            </select>
          </div>
        </div>

        {/* Multi-line Wrap Pills Grid */}
        <div className="flex flex-wrap gap-2.5">
          {sortedDatasets.map((d) => {
            const isActive = activeDataset?.benchmark_id === d.benchmark_id;
            return (
              <button
                key={d.benchmark_id}
                onClick={() => setSelectedBenchmarkId(d.benchmark_id)}
                className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-brand-red text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400/50 scale-[1.02]"
                    : "bg-brand-surface/80 text-slate-300 hover:text-white hover:bg-brand-border border border-brand-border/60"
                }`}
              >
                <span>{d.benchmark_name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? "bg-black/30 text-white/90"
                      : "bg-brand-card/90 text-slate-400 border border-brand-border/40 group-hover:text-slate-300"
                  }`}
                >
                  {d.rows.length} {d.rows.length === 1 ? "config" : "configs"}
                </span>
              </button>
            );
          })}

          {sortedDatasets.length === 0 && !isLoading && (
            <span className="text-xs text-slate-400 italic py-2">No benchmark results found in this project.</span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 space-x-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
          <span className="text-sm font-medium">Aggregating comparison dataset...</span>
        </div>
      )}

      {/* Grouped Table */}
      {!isLoading && activeDataset && (
        <div className="bg-brand-card rounded-2xl border border-brand-border overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-card/90">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{activeDataset.benchmark_name}</h3>
                <p className="text-xs text-slate-400">Grouped across {activeDataset.rows.length} test configurations</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={api.getExportCsvUrl(currentProject?.id || "")}
                download
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-border hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                title="Export tabular results as CSV including Product, Category, Configurations, and Scores"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </a>
              <a
                href={api.getExportJsonDownloadUrl(currentProject?.id || "")}
                download
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-border hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                title="Download full project JSON database backup"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>Export JSON (Backup)</span>
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-surface text-slate-400 font-bold uppercase tracking-wider border-b border-brand-border">
                <tr>
                  <th className="py-3.5 px-5">Baseline</th>
                  <th className="py-3.5 px-5">Configuration (Display Name)</th>
                  <th className="py-3.5 px-5">Source Folder</th>
                  {activeDataset.metric_ids.map((m_id) => (
                    <th key={m_id} className="py-3.5 px-5 text-right">
                      {m_id.replace('_', ' ').toUpperCase()}
                    </th>
                  ))}
                  <th className="py-3.5 px-5 text-right">Delta vs Baseline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {activeDataset.rows.map((row) => {
                  const isBaseline = row.is_baseline;
                  const primaryMetricId = activeDataset.metric_ids[0];
                  const primaryMetric = row.metrics[primaryMetricId];
                  const pctGain = primaryMetric?.pct_gain_vs_baseline;

                  return (
                    <tr
                      key={row.configuration_id}
                      className={`hover:bg-brand-surface/40 transition ${
                        isBaseline ? "bg-brand-blue/10" : ""
                      }`}
                    >
                      {/* Baseline Radio */}
                      <td className="py-4 px-5">
                        <input
                          type="radio"
                          name="baseline_config"
                          checked={isBaseline}
                          onChange={() => setBaselineConfigId(row.configuration_id)}
                          className="accent-brand-red cursor-pointer w-4 h-4"
                          title="Set as baseline for percentage comparisons"
                        />
                      </td>

                      {/* Configuration Display Name (Editable in place!) */}
                      <td className="py-4 px-5 font-semibold text-white">
                        {editingConfigId === row.configuration_id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="bg-brand-surface border border-brand-red rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveConfigName(row.configuration_id)}
                              className="px-2 py-1 rounded bg-brand-red text-white text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingConfigId(null)}
                              className="text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                            <span>{row.display_name}</span>
                            {isBaseline && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-950/80 text-sky-400 border border-sky-800">
                                BASELINE
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingConfigId(row.configuration_id);
                                setEditingName(row.display_name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-brand-border rounded text-slate-400 hover:text-white transition"
                              title="Rename display name for charts"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Internal Source Folder Name */}
                      <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                        {row.configuration_name}
                      </td>

                      {/* Metric Scores */}
                      {activeDataset.metric_ids.map((m_id) => {
                        const m = row.metrics[m_id];
                        return (
                          <td key={m_id} className="py-4 px-5 text-right font-bold text-sm text-slate-100 font-mono">
                            {m && m.value !== null ? (
                              <span>
                                {m.value.toLocaleString()}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {m.unit}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-xs">N/A</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Percentage Delta vs Baseline */}
                      <td className="py-4 px-5 text-right font-bold font-mono">
                        {isBaseline ? (
                          <span className="text-slate-400 text-xs">Reference (0.0%)</span>
                        ) : pctGain !== undefined && pctGain !== null ? (
                          <span
                            className={`inline-flex items-center space-x-1 ${
                              pctGain >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {pctGain >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            <span>{pctGain >= 0 ? `+${pctGain}%` : `${pctGain}%`}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {datasets.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-brand-card/40 rounded-3xl border border-dashed border-brand-border space-y-3">
          <Layers className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Results Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Scan a folder of benchmark screenshots in the Import tab to automatically extract results.
          </p>
          <button
            onClick={() => onNavigate("import")}
            className="px-4 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-xs font-semibold text-white shadow-lg"
          >
            Go to Import & Scan
          </button>
        </div>
      )}
    </div>
  );
};
