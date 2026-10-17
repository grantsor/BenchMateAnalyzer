import React from "react";
import { useProjectStore } from "../stores/projectStore";
import {
  Activity,
  BarChart2,
  CheckCircle2,
  Cpu,
  FolderOpen,
  FolderSync,
  Layers,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";

interface DashboardProps {
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentProject } = useProjectStore();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7 font-['Geist',sans-serif]">
      {/* Header / Intro Section (BrewedOps Clean Header) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[#3d8bff] text-[11px] font-medium tracking-wide mb-2.5">
            <Sparkles className="w-3 h-3" />
            <span>Automated Reviewer Suite</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
            Benchmark Analyzer & Chart Generator
          </h1>
          <p className="mt-1 text-slate-400 text-xs leading-relaxed max-w-2xl">
            Autonomous vision ingestion, spatial token OCR extraction, and publication-ready comparative chart generation for hardware benchmarks.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate("import")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Scan Benchmark Folder</span>
          </button>
          <button
            onClick={() => onNavigate("compare")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-medium text-xs transition active:scale-95 cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#3d8bff]" />
            <span>Open Chart Generator</span>
          </button>
        </div>
      </div>

      {/* Active Project Overview Card (BrewedOps KPI Architecture) */}
      {currentProject ? (
        <div className="bg-[#111827] rounded-2xl border border-white/[0.08] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-[#3d8bff]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">{currentProject.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentProject.product_name ? `Evaluating ${currentProject.product_name}` : "General Hardware Benchmark Run"}
                  {currentProject.product_category ? ` · ${currentProject.product_category}` : ""}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Active Target
            </span>
          </div>

          {/* KPI Stat Grid with Tabular Numerals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
            <div className="bg-[#0a0e17]/60 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-[0.06em]">
                Configurations
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
                {currentProject.configurations?.length ?? currentProject.config_count ?? 0}
              </div>
            </div>

            <div className="bg-[#0a0e17]/60 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-[0.06em]">
                Extracted Benchmarks
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-[#3d8bff] mt-1">
                {currentProject.result_count ?? 0}
              </div>
            </div>

            <div className="bg-[#0a0e17]/60 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-[0.06em]">
                CPU Spec
              </span>
              <div className="text-xs font-medium text-slate-200 mt-2 truncate">
                {currentProject.cpu || "Default System"}
              </div>
            </div>

            <div className="bg-[#0a0e17]/60 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-[0.06em]">
                GPU Spec
              </span>
              <div className="text-xs font-medium text-slate-200 mt-2 truncate">
                {currentProject.gpu || "Default System"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#111827]/50 rounded-2xl border border-dashed border-white/[0.1] p-8 text-center space-y-3">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Review Project Active</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Select an existing hardware review project or create a new one to organize benchmark results.
          </p>
          <button
            onClick={() => onNavigate("projects")}
            className="mt-1 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white border border-white/[0.08] transition active:scale-95 cursor-pointer"
          >
            Create or Select Project
          </button>
        </div>
      )}

      {/* Guided Workflow Cards (BrewedOps Interactive Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate("import")}
          className="group cursor-pointer bg-[#111827] hover:bg-[#131d31] rounded-2xl p-5 border border-white/[0.08] hover:border-blue-500/30 transition-all duration-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-[#3d8bff] group-hover:scale-105 transition-transform">
              <FolderSync className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">1. Automated Ingestion</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Recursively scan power mode folders and extract scores from Cinebench, Geekbench, 3DMark, and PCMark screenshots.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate("ocr_review")}
          className="group cursor-pointer bg-[#111827] hover:bg-[#131d31] rounded-2xl p-5 border border-white/[0.08] hover:border-blue-500/30 transition-all duration-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-[#3d8bff] group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">2. OCR Review & Audit</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Inspect visual bounding boxes, confidence ratings, and override any misrecognized scores with immediate persistence.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate("compare")}
          className="group cursor-pointer bg-[#111827] hover:bg-[#131d31] rounded-2xl p-5 border border-white/[0.08] hover:border-blue-500/30 transition-all duration-200 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-[#3d8bff] group-hover:scale-105 transition-transform">
              <BarChart2 className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">3. Comparison Charts</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
              Generate publication-grade 16:9 and 9:16 comparison charts in Monochromatic Blue with instant batch image/ZIP exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
