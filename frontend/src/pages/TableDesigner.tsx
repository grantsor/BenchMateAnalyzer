import React, { useState, useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api, GroupedBenchmarkDataset } from "../api/client";
import {
  Check,
  Clipboard,
  FileSpreadsheet,
  Layers,
  Table as TableIcon
} from "lucide-react";

export const TableDesignerPage: React.FC = () => {
  const { currentProject } = useProjectStore();

  const [datasets, setDatasets] = useState<GroupedBenchmarkDataset[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>("");
  const [baselineConfigId, setBaselineConfigId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentProject) return;
    api.getGroupedResults(currentProject.id, undefined, "best", baselineConfigId || undefined).then((data) => {
      setDatasets(data);
      if (data.length > 0 && !selectedBenchmarkId) {
        setSelectedBenchmarkId(data[0].benchmark_id);
      }
    }).catch(console.error);
  }, [currentProject?.id, baselineConfigId]);

  const activeDataset = datasets.find((d) => d.benchmark_id === selectedBenchmarkId) || datasets[0];

  const handleCopyMarkdown = () => {
    if (!activeDataset) return;
    let md = `| Configuration | ${activeDataset.metric_ids.map(m => m.replace('_', ' ').toUpperCase()).join(" | ")} | Delta vs Baseline |\n`;
    md += `| --- | ${activeDataset.metric_ids.map(() => "---:").join(" | ")} | ---: |\n`;

    activeDataset.rows.forEach((r) => {
      const pId = activeDataset.metric_ids[0];
      const pMetric = r.metrics[pId];
      const pct = pMetric?.pct_gain_vs_baseline;
      const deltaStr = r.is_baseline ? "Baseline" : (pct !== undefined && pct !== null ? `${pct >= 0 ? '+' : ''}${pct}%` : "N/A");

      const metricVals = activeDataset.metric_ids.map(m_id => {
        const val = r.metrics[m_id]?.value;
        return val !== null && val !== undefined ? val.toLocaleString() : "N/A";
      }).join(" | ");

      md += `| ${r.display_name} | ${metricVals} | ${deltaStr} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Comparison Table Designer</h2>
          <p className="text-xs text-slate-400 mt-1">
            Format review tables, compute baseline deltas, and copy publication markdown tables.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyMarkdown}
            disabled={!activeDataset}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-border hover:bg-slate-700 text-white text-xs font-semibold shadow transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            <span>{copied ? "Copied Markdown!" : "Copy Markdown Table"}</span>
          </button>

          <a
            href={api.getExportCsvUrl(currentProject?.id || "")}
            download
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {activeDataset ? (
        <div className="bg-brand-card rounded-3xl border border-brand-border overflow-hidden shadow-2xl space-y-4">
          <div className="p-6 border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TableIcon className="w-5 h-5 text-brand-red" />
              <h3 className="text-base font-bold text-white">{activeDataset.benchmark_name}</h3>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-semibold">Baseline Config:</span>
              <select
                value={baselineConfigId}
                onChange={(e) => setBaselineConfigId(e.target.value)}
                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1 text-xs text-white"
              >
                <option value="">Default (First Config)</option>
                {activeDataset.rows.map((r) => (
                  <option key={r.configuration_id} value={r.configuration_id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto px-6 pb-6">
            <table className="w-full text-left text-xs border border-brand-border/60 rounded-xl overflow-hidden">
              <thead className="bg-brand-surface text-slate-300 font-bold uppercase tracking-wider border-b border-brand-border">
                <tr>
                  <th className="py-3.5 px-5">Configuration</th>
                  {activeDataset.metric_ids.map((m_id) => (
                    <th key={m_id} className="py-3.5 px-5 text-right">
                      {m_id.replace('_', ' ').toUpperCase()}
                    </th>
                  ))}
                  <th className="py-3.5 px-5 text-right">Delta vs Baseline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {activeDataset.rows.map((r, i) => {
                  const pId = activeDataset.metric_ids[0];
                  const pMetric = r.metrics[pId];
                  const pct = pMetric?.pct_gain_vs_baseline;

                  return (
                    <tr
                      key={r.configuration_id}
                      className={i % 2 === 0 ? "bg-brand-card/40" : "bg-brand-surface/20"}
                    >
                      <td className="py-3.5 px-5 font-bold text-white flex items-center space-x-2">
                        <span>{r.display_name}</span>
                        {r.is_baseline && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-950 text-sky-400 border border-sky-800">
                            REF
                          </span>
                        )}
                      </td>
                      {activeDataset.metric_ids.map((m_id) => (
                        <td key={m_id} className="py-3.5 px-5 text-right font-mono font-bold text-slate-100">
                          {r.metrics[m_id]?.value !== null
                            ? r.metrics[m_id]?.value?.toLocaleString()
                            : "N/A"}
                        </td>
                      ))}
                      <td className="py-3.5 px-5 text-right font-mono font-bold">
                        {r.is_baseline ? (
                          <span className="text-slate-400 font-normal text-[11px]">Reference (0.0%)</span>
                        ) : pct !== undefined && pct !== null ? (
                          <span className={pct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {pct >= 0 ? `+${pct}%` : `${pct}%`}
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
      ) : (
        <div className="text-center py-20 bg-brand-card/40 rounded-3xl border border-dashed border-brand-border text-slate-400 text-xs">
          No table data available.
        </div>
      )}
    </div>
  );
};
