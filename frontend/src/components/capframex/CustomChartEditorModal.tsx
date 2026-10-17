import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Thermometer,
  Zap,
  BatteryCharging,
  BarChart3,
  Check,
  Cpu,
  Layers,
  HelpCircle
} from "lucide-react";
import { CustomChart, CustomChartRow, CustomChartColumn, BenchmarkMode } from "../../types/capframex";

interface CustomChartEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: CustomChart | null;
  benchmarkMode: BenchmarkMode;
  availableGpus: string[];
  availableCpus: string[];
  availablePowerProfiles?: string[];
  availableLaptops?: string[];
  onSave: (chart: CustomChart) => Promise<void>;
  onDelete?: (chartId: string) => Promise<void>;
}

export const CustomChartEditorModal: React.FC<CustomChartEditorModalProps> = ({
  isOpen,
  onClose,
  chart,
  benchmarkMode,
  availableGpus = [],
  availableCpus = [],
  availablePowerProfiles = [],
  availableLaptops = [],
  onSave,
  onDelete
}) => {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subHeader, setSubHeader] = useState("");
  const [unit, setUnit] = useState("°C");
  const [higherIsBetter, setHigherIsBetter] = useState(false);
  const [metricName, setMetricName] = useState("Temperature");
  const [columns, setColumns] = useState<CustomChartColumn[]>([]);
  const [category, setCategory] = useState<"temperatures" | "power" | "battery" | "custom">("temperatures");
  const [rows, setRows] = useState<CustomChartRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (chart) {
      setName(chart.name || "");
      setTitle(chart.title || chart.name || "");
      setSubHeader(chart.sub_header || "");
      setUnit(chart.unit || "");
      setHigherIsBetter(chart.higher_is_better ?? false);
      setMetricName(chart.metric_name || "Value");
      setCategory(chart.category || "custom");

      // Resolve columns (multi-bar support)
      let initialCols: CustomChartColumn[] = [];
      if (chart.columns && chart.columns.length > 0) {
        initialCols = JSON.parse(JSON.stringify(chart.columns));
      } else if (chart.metric2_name && chart.metric2_name.trim()) {
        initialCols = [
          { id: "col_0", name: chart.metric_name || "Primary Metric", unit: chart.unit || "" },
          { id: "col_1", name: chart.metric2_name, unit: chart.metric2_unit || chart.unit || "" }
        ];
      } else {
        const defaultColName =
          chart.category === "temperatures"
            ? "Peak Temp"
            : chart.category === "power"
            ? "Peak Power"
            : chart.metric_name || "Value";
        initialCols = [{ id: "col_0", name: defaultColName, unit: chart.unit || "" }];
      }
      setColumns(initialCols);

      if (!chart.rows || chart.rows.length === 0) {
        if (benchmarkMode === "laptop" && availablePowerProfiles.length > 0) {
          setRows(
            availablePowerProfiles.map((p, idx) => ({
              id: `row_profile_${idx}`,
              label: p,
              value: null,
              value2: undefined,
              values: initialCols.map(() => null)
            }))
          );
        } else if (benchmarkMode === "pc" && availableGpus.length > 0) {
          setRows(
            availableGpus.map((g, idx) => ({
              id: `row_gpu_${idx}`,
              label: g,
              value: null,
              value2: undefined,
              values: initialCols.map(() => null)
            }))
          );
        } else {
          setRows([]);
        }
      } else {
        const parsedRows = JSON.parse(JSON.stringify(chart.rows)).map((r: CustomChartRow) => {
          const vals = Array.isArray(r.values)
            ? [...r.values]
            : [r.value ?? null, r.value2 ?? null];
          return {
            ...r,
            values: vals,
            value: vals[0] ?? null,
            value2: vals[1] ?? undefined
          };
        });
        setRows(parsedRows);
      }
    } else {
      // New chart defaults based on mode
      let initialCols: CustomChartColumn[] = [];
      let initialRows: CustomChartRow[] = [];
      if (benchmarkMode === "laptop") {
        setName("CPU Temperatures");
        setTitle("CPU TEMPERATURES");
        setSubHeader("MAX CPU & IDLE TEMPERATURES (°C) | LOWER IS BETTER");
        setUnit("°C");
        setHigherIsBetter(false);
        setMetricName("CPU Temp");
        setCategory("temperatures");
        initialCols = [
          { id: "peak_temp", name: "Peak Temp", unit: "°C" },
          { id: "idle_temp", name: "Idle Temp", unit: "°C" }
        ];
        if (availablePowerProfiles.length > 0) {
          initialRows = availablePowerProfiles.map((p, idx) => ({
            id: `row_profile_${idx}`,
            label: p,
            value: null,
            value2: null,
            values: [null, null]
          }));
        } else if (availableLaptops.length > 0) {
          initialRows = availableLaptops.map((l, idx) => ({
            id: `row_laptop_${idx}`,
            label: l,
            value: null,
            value2: null,
            values: [null, null]
          }));
        }
      } else {
        setName("GPU Temperatures");
        setTitle("GPU TEMPERATURES");
        setSubHeader("PEAK LOAD & IDLE TEMPERATURES (°C) | LOWER IS BETTER");
        setUnit("°C");
        setHigherIsBetter(false);
        setMetricName("Temperature");
        setCategory("temperatures");
        initialCols = [
          { id: "peak_temp", name: "Peak Temp", unit: "°C" },
          { id: "idle_temp", name: "Idle Temp", unit: "°C" }
        ];
        if (availableGpus.length > 0) {
          initialRows = availableGpus.map((g, idx) => ({
            id: `row_gpu_${idx}`,
            label: g,
            value: null,
            value2: null,
            values: [null, null]
          }));
        }
      }
      setColumns(initialCols);
      setRows(initialRows);
    }
  }, [chart, benchmarkMode, isOpen, availablePowerProfiles, availableGpus, availableLaptops]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetType: "temps" | "power" | "battery" | "custom") => {
    const isRowsEmptyOrUnfilled = rows.length === 0 || rows.every((r) => r.value === null || r.value === undefined);

    if (presetType === "temps") {
      setCategory("temperatures");
      setUnit("°C");
      setHigherIsBetter(false);
      setMetricName("Temperature");
      setColumns([
        { id: "peak_temp", name: "Peak Temp", unit: "°C" },
        { id: "idle_temp", name: "Idle Temp", unit: "°C" }
      ]);
      if (benchmarkMode === "laptop") {
        setName("CPU Temperatures");
        setTitle("CPU TEMPERATURES");
        setSubHeader("MAX CPU & IDLE TEMPERATURES (°C) | LOWER IS BETTER");
        if (isRowsEmptyOrUnfilled && availablePowerProfiles.length > 0) {
          setRows(availablePowerProfiles.map((p, idx) => ({ id: `row_p_${idx}`, label: p, value: null, values: [null, null] })));
        }
      } else {
        setName("GPU Temperatures");
        setTitle("GPU TEMPERATURES");
        setSubHeader("PEAK LOAD & IDLE TEMPERATURES (°C) | LOWER IS BETTER");
        if (isRowsEmptyOrUnfilled && availableGpus.length > 0) {
          setRows(availableGpus.map((g, idx) => ({ id: `row_g_${idx}`, label: g, value: null, values: [null, null] })));
        }
      }
    } else if (presetType === "power") {
      setCategory("power");
      setUnit("W");
      setHigherIsBetter(false);
      setMetricName("Power");
      setName("Power Consumption");
      setTitle("TOTAL BOARD POWER CONSUMPTION");
      setSubHeader("PEAK GAMING & IDLE POWER (WATTS) | LOWER IS BETTER");
      setColumns([
        { id: "peak_power", name: "Peak Power", unit: "W" },
        { id: "idle_power", name: "Idle Wattage", unit: "W" }
      ]);
      if (isRowsEmptyOrUnfilled) {
        if (benchmarkMode === "laptop" && availablePowerProfiles.length > 0) {
          setRows(availablePowerProfiles.map((p, idx) => ({ id: `row_p_${idx}`, label: p, value: null, values: [null, null] })));
        } else if (availableGpus.length > 0) {
          setRows(availableGpus.map((g, idx) => ({ id: `row_g_${idx}`, label: g, value: null, values: [null, null] })));
        }
      }
    } else if (presetType === "battery") {
      setCategory("battery");
      setUnit("mins");
      setHigherIsBetter(true);
      setMetricName("Battery Runtime");
      setName("Battery Life");
      setTitle("BATTERY LIFE RUNTIME");
      setSubHeader("PCMARK 10 MODERN OFFICE (MINUTES) | HIGHER IS BETTER");
      setColumns([
        { id: "runtime", name: "Runtime", unit: "mins" }
      ]);
      if (isRowsEmptyOrUnfilled) {
        if (availablePowerProfiles.length > 0) {
          setRows(availablePowerProfiles.map((p, idx) => ({ id: `row_p_${idx}`, label: p, value: null, values: [null] })));
        } else if (availableLaptops.length > 0) {
          setRows(availableLaptops.map((l, idx) => ({ id: `row_l_${idx}`, label: l, value: null, values: [null] })));
        }
      }
    } else if (presetType === "custom") {
      setCategory("custom");
      const isDefaultName =
        !name ||
        [
          "CPU Temperatures",
          "GPU Temperatures",
          "Power Consumption",
          "Battery Life",
          "Custom Metric",
          "Custom Benchmark"
        ].includes(name);

      if (isDefaultName) {
        setName("Custom Benchmark");
        setTitle("CUSTOM BENCHMARK");
        setMetricName("Score");
        setUnit("pts");
        setHigherIsBetter(true);
        setSubHeader("BENCHMARK SCORE (PTS) | HIGHER IS BETTER");
      }
      setColumns([
        { id: "col_0", name: "Score", unit: "pts" }
      ]);

      if (isRowsEmptyOrUnfilled) {
        if (benchmarkMode === "laptop" && availablePowerProfiles.length > 0) {
          setRows(availablePowerProfiles.map((p, idx) => ({ id: `row_p_${idx}`, label: p, value: null, values: [null] })));
        } else if (benchmarkMode === "laptop" && availableLaptops.length > 0) {
          setRows(availableLaptops.map((l, idx) => ({ id: `row_l_${idx}`, label: l, value: null, values: [null] })));
        } else if (availableGpus.length > 0) {
          setRows(availableGpus.map((g, idx) => ({ id: `row_g_${idx}`, label: g, value: null, values: [null] })));
        } else if (availableCpus.length > 0) {
          setRows(availableCpus.map((c, idx) => ({ id: `row_c_${idx}`, label: c, value: null, values: [null] })));
        }
      }
    }
  };

  const handleAddColumn = () => {
    const nextIdx = columns.length;
    const colId = `col_${Date.now()}_${nextIdx}`;
    let defaultColTitle = `Bar ${nextIdx + 1}`;
    if (category === "temperatures") {
      defaultColTitle = nextIdx === 1 ? "Idle Temp" : `Temp ${nextIdx + 1}`;
    } else if (category === "power") {
      defaultColTitle = nextIdx === 1 ? "Idle Wattage" : `Power ${nextIdx + 1}`;
    }
    const newCol: CustomChartColumn = {
      id: colId,
      name: defaultColTitle,
      unit: unit || ""
    };
    setColumns((prev) => [...prev, newCol]);

    setRows((prev) =>
      prev.map((r) => {
        const curVals = Array.isArray(r.values)
          ? [...r.values]
          : [r.value ?? null, r.value2 ?? null];
        while (curVals.length <= nextIdx) {
          curVals.push(null);
        }
        return {
          ...r,
          values: curVals
        };
      })
    );
  };

  const handleColumnNameChange = (colIndex: number, newName: string) => {
    setColumns((prev) =>
      prev.map((col, idx) => (idx === colIndex ? { ...col, name: newName } : col))
    );
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, idx) => idx !== colIndex));
    setRows((prev) =>
      prev.map((r) => {
        const curVals = Array.isArray(r.values)
          ? r.values.filter((_, idx) => idx !== colIndex)
          : [r.value ?? null];
        return {
          ...r,
          values: curVals,
          value: curVals[0] ?? null,
          value2: curVals[1] ?? undefined
        };
      })
    );
  };

  const handleAddRow = (labelName: string = "") => {
    const initVals = columns.map(() => null);
    const newRow: CustomChartRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: labelName || `Model ${rows.length + 1}`,
      value: null,
      value2: undefined,
      values: initVals
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handlePreFill = (source: "gpus" | "cpus" | "profiles" | "laptops") => {
    let itemsToAdd: string[] = [];
    if (source === "gpus") itemsToAdd = availableGpus;
    else if (source === "cpus") itemsToAdd = availableCpus;
    else if (source === "profiles") itemsToAdd = availablePowerProfiles;
    else if (source === "laptops") itemsToAdd = availableLaptops;

    if (!itemsToAdd || itemsToAdd.length === 0) return;

    // Filter out duplicates that already exist
    const existingLabels = new Set(rows.map((r) => r.label.trim().toLowerCase()));
    const newItems = itemsToAdd.filter((item) => item && !existingLabels.has(item.trim().toLowerCase()));

    const newRows: CustomChartRow[] = newItems.map((item, idx) => ({
      id: `row_${Date.now()}_${idx}`,
      label: item,
      value: null,
      value2: undefined,
      values: columns.map(() => null)
    }));

    setRows((prev) => [...prev, ...newRows]);
  };

  const handleRowChange = (index: number, field: keyof CustomChartRow, val: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRowValChange = (rowIndex: number, colIndex: number, rawVal: string) => {
    const parsed = rawVal === "" ? null : parseFloat(rawVal);
    const num = parsed !== null && !isNaN(parsed) ? parsed : null;

    setRows((prev) =>
      prev.map((r, rIdx) => {
        if (rIdx !== rowIndex) return r;
        const curVals = Array.isArray(r.values)
          ? [...r.values]
          : [r.value ?? null, r.value2 ?? null];
        while (curVals.length <= colIndex) {
          curVals.push(null);
        }
        curVals[colIndex] = num;
        return {
          ...r,
          values: curVals,
          value: curVals[0] ?? null,
          value2: curVals[1] ?? undefined
        };
      })
    );
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveRow = (index: number, direction: "up" | "down") => {
    setRows((prev) => {
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please provide a name for this custom chart.");
      return;
    }

    setIsSaving(true);
    try {
      const cleanColumns: CustomChartColumn[] = (columns.length > 0 ? columns : [{ id: "col_0", name: "Value", unit: unit.trim() }]).map((col, idx) => ({
        id: col.id || `col_${idx}`,
        name: (col.name || "").trim() || `Bar ${idx + 1}`,
        unit: (col.unit || unit || "").trim()
      }));

      const cleanRows = rows.map((r, idx) => {
        const rowValues = cleanColumns.map((col, cIdx) => {
          if (Array.isArray(r.values) && r.values.length > cIdx) {
            const v = r.values[cIdx];
            return typeof v === "number" && !isNaN(v) ? v : null;
          }
          if (cIdx === 0) return typeof r.value === "number" && !isNaN(r.value) ? r.value : null;
          if (cIdx === 1) return typeof r.value2 === "number" && !isNaN(r.value2) ? r.value2 : null;
          return null;
        });

        return {
          id: r.id || `row_${idx}_${Date.now()}`,
          label: (r.label || "").trim() || `Model ${idx + 1}`,
          value: rowValues[0] ?? null,
          value2: rowValues[1] ?? undefined,
          values: rowValues,
          gpu: r.gpu,
          cpu: r.cpu,
          motherboard: r.motherboard,
          tier_rank: r.tier_rank
        };
      });

      const chartId =
        chart?.id ||
        `${benchmarkMode}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

      const updatedChart: CustomChart = {
        id: chartId,
        name: name.trim(),
        mode: benchmarkMode,
        category: category,
        title: (title || name).trim().toUpperCase(),
        sub_header: subHeader.trim(),
        unit: unit.trim(),
        higher_is_better: higherIsBetter,
        metric_name: cleanColumns[0]?.name || "Value",
        metric2_name: cleanColumns.length > 1 ? cleanColumns[1]?.name : "",
        metric2_unit: cleanColumns.length > 1 ? (cleanColumns[1]?.unit || unit.trim()) : "",
        columns: cleanColumns,
        rows: cleanRows
      };

      await onSave(updatedChart);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save custom chart");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#141418] border border-[#23232a] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200 text-xs">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#23232a] flex items-center justify-between bg-[#18181f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {category === "temperatures" ? (
                <Thermometer className="w-5 h-5 text-red-400" />
              ) : category === "power" ? (
                <Zap className="w-5 h-5 text-amber-400" />
              ) : category === "battery" ? (
                <BatteryCharging className="w-5 h-5 text-emerald-400" />
              ) : (
                <BarChart3 className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>{chart ? "Edit Custom Chart & Values" : "Create New Custom Chart"}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">
                  {benchmarkMode === "laptop" ? "Laptop Mode" : "PC Mode"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Manually input values for temperatures, power consumption, battery life, or custom benchmarks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Preset Templates */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
              Quick Chart Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("temps")}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                  category === "temperatures"
                    ? "bg-red-500/15 border-red-500/50 text-red-200"
                    : "bg-[#18181f] border-[#23232a] text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <Thermometer className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Temperatures</div>
                  <div className="text-[9.5px] opacity-70">°C • Lower is better</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("power")}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                  category === "power"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
                    : "bg-[#18181f] border-[#23232a] text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Power Draw</div>
                  <div className="text-[9.5px] opacity-70">Watts • Lower is better</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("battery")}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                  category === "battery"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
                    : "bg-[#18181f] border-[#23232a] text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Battery Life</div>
                  <div className="text-[9.5px] opacity-70">Minutes • Higher is better</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("custom")}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                  category === "custom"
                    ? "bg-blue-500/15 border-blue-500/50 text-blue-200"
                    : "bg-[#18181f] border-[#23232a] text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Custom Metric</div>
                  <div className="text-[9.5px] opacity-70">Customizable unit & goal</div>
                </div>
              </button>
            </div>
          </div>

          {/* Chart Header Details (Title, Sub-header, Metric Name, Unit) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#18181f] p-4 rounded-xl border border-[#23232a]">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Chart Sidebar Label:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GPU Temperatures"
                required
                className="w-full bg-[#121215] border border-[#2a2a32] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Banner Title (Appears at top of graph):
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GPU TEMPERATURES"
                required
                className="w-full bg-[#121215] border border-[#2a2a32] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-bold tracking-wide"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Sub-header Text (Red line under title):
              </label>
              <input
                type="text"
                value={subHeader}
                onChange={(e) => setSubHeader(e.target.value)}
                placeholder="e.g. PEAK LOAD TEMPERATURES (°C) | LOWER IS BETTER"
                className="w-full bg-[#121215] border border-[#2a2a32] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Default Unit & Sorting Direction */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Default Unit ({unit || "none"}):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => {
                    const u = e.target.value;
                    setUnit(u);
                    setColumns((prev) => prev.map((c) => ({ ...c, unit: u })));
                  }}
                  placeholder="Unit (e.g. °C, W, fps)"
                  className="flex-1 bg-[#121215] border border-[#2a2a32] rounded-lg px-3 py-1.5 text-xs text-center text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {["°C", "W", "mins", "hrs", "pts", "fps", "ms", "dB", "%", "MB/s"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setUnit(u);
                      setColumns((prev) => prev.map((c) => ({ ...c, unit: u })));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      unit === u
                        ? "bg-blue-600/30 border-blue-500 text-blue-300"
                        : "bg-[#121215] border-[#23232a] text-slate-400 hover:text-white"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Metric Sorting Direction:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHigherIsBetter(false)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition ${
                    !higherIsBetter
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-[#121215] border-[#2a2a32] text-slate-400 hover:text-white"
                  }`}
                >
                  <span>❄️ Lower is Better</span>
                  {!higherIsBetter && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setHigherIsBetter(true)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition ${
                    higherIsBetter
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-[#121215] border-[#2a2a32] text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🚀 Higher is Better</span>
                  {higherIsBetter && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {!higherIsBetter
                  ? "Default for temperatures and power draw (cooler & lower power rank best)."
                  : "Default for battery runtime and frame rates (longer runtime ranks best)."}
              </p>
            </div>
          </div>

          {/* Rows & Values Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-[12px] font-bold text-white block">
                  Models & Values Table ({rows.length} rows, {columns.length} {columns.length === 1 ? "bar" : "bars"}):
                </label>
                <span className="text-[10.5px] text-slate-400">
                  Input benchmark numbers directly. Edit column titles directly in the table header to name each bar.
                </span>
              </div>

              {/* Actions & Pre-fill */}
              <div className="flex items-center gap-2 flex-wrap">
                {benchmarkMode === "pc" ? (
                  <>
                    {availableGpus.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePreFill("gpus")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e2029] hover:bg-[#282a36] text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition"
                        title="Add missing GPUs from currently loaded benchmark dataset"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pre-fill GPUs ({availableGpus.length})</span>
                      </button>
                    )}
                    {availableCpus.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePreFill("cpus")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e2029] hover:bg-[#282a36] text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Pre-fill CPUs</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {availablePowerProfiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePreFill("profiles")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e2029] hover:bg-[#282a36] text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold transition"
                        title="Add rows for each power profile in active dataset"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pre-fill Profiles ({availablePowerProfiles.length})</span>
                      </button>
                    )}
                    {availableLaptops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePreFill("laptops")}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e2029] hover:bg-[#282a36] text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold transition"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Pre-fill Laptops</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition shadow-sm"
                  title="Add a new column / bar to each row (e.g. Idle Temp, Load Temp, Peak Power, Idle Wattage)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Column / Bar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddRow()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* Multi-Column Data Table */}
            <div className="border border-[#23232a] rounded-xl overflow-hidden bg-[#121215]">
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  {/* Table Header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#18181f] border-b border-[#23232a] text-[10.5px] font-bold text-slate-400 uppercase tracking-wider min-w-max">
                    <div className="w-10 text-center shrink-0">#</div>
                    <div className="w-64 sm:w-80 shrink-0">Hardware Model / Power Profile</div>
                    {columns.map((col, cIdx) => (
                      <div key={col.id || cIdx} className="w-36 shrink-0 flex items-center gap-1">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => handleColumnNameChange(cIdx, e.target.value)}
                          placeholder={`Bar ${cIdx + 1}`}
                          className="w-full bg-[#121215] border border-[#2a2a32] focus:border-blue-500 rounded px-2 py-1 text-xs text-blue-300 font-bold text-center"
                          title="Click to rename this bar column (updates chart legend and tooltip)"
                        />
                        {columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(cIdx)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                            title={`Delete "${col.name}" column`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="w-12 text-center shrink-0">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#1e1e24]">
                    {rows.map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition min-w-max"
                      >
                        <div className="w-10 flex items-center justify-center gap-1 text-slate-500 font-mono text-[10px] shrink-0">
                          <span>{idx + 1}</span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveRow(idx, "up")}
                              className="hover:text-white disabled:opacity-20"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === rows.length - 1}
                              onClick={() => handleMoveRow(idx, "down")}
                              className="hover:text-white disabled:opacity-20"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="w-64 sm:w-80 shrink-0">
                          <input
                            type="text"
                            value={r.label}
                            onChange={(e) => handleRowChange(idx, "label", e.target.value)}
                            placeholder="e.g. RTX 5090 FE or Performance Mode"
                            className="w-full bg-[#18181f] border border-[#2a2a32] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {columns.map((col, cIdx) => {
                          const val =
                            Array.isArray(r.values) && r.values.length > cIdx
                              ? r.values[cIdx]
                              : cIdx === 0
                              ? r.value
                              : cIdx === 1
                              ? r.value2
                              : null;

                          return (
                            <div key={col.id || cIdx} className="w-36 shrink-0">
                              <input
                                type="number"
                                step="any"
                                value={val !== null && val !== undefined ? val : ""}
                                onChange={(e) => handleRowValChange(idx, cIdx, e.target.value)}
                                placeholder={`0.0 ${col.unit || unit}`}
                                className="w-full bg-[#18181f] border border-[#2a2a32] rounded px-2.5 py-1 text-xs text-right text-emerald-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          );
                        })}

                        <div className="w-12 flex items-center justify-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {rows.length === 0 && (
                      <div className="py-8 text-center text-slate-500 space-y-2">
                        <p className="text-xs">No component rows added yet.</p>
                        <p className="text-[11px] text-slate-600">
                          Click <b>"Add Row"</b> or <b>"Pre-fill"</b> above to populate models automatically!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#23232a] flex items-center justify-between bg-[#18181f]">
          <div>
            {chart?.id && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete the custom chart "${name}"?`)) {
                    await onDelete(chart.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Chart</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#23232a] hover:bg-[#2c2c35] text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save & Update Chart"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
