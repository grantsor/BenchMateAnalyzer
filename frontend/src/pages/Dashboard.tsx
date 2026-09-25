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
  Zap
} from "lucide-react";

interface DashboardProps {
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentProject, projects } = useProjectStore();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-card via-brand-dark to-brand-card p-8 border border-brand-border/80 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hardware Reviewer Automated Suite</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            Benchmark Analyzer & Chart Generator
          </h2>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">
            Scan test configuration folders, automatically detect Geekbench and Cinebench screenshots,
            extract scores using region-based RapidOCR, and generate publication-ready comparison charts.
          </p>
          <div className="mt-6 flex items-center space-x-3">
            <button
              onClick={() => onNavigate("import")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-900/40 transition active:scale-95"
            >
              <FolderSync className="w-4 h-4" />
              <span>Scan Benchmark Folder</span>
            </button>
            <button
              onClick={() => onNavigate("compare")}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-border/80 hover:bg-brand-border text-slate-200 font-medium text-sm transition"
            >
              <BarChart2 className="w-4 h-4 text-brand-red" />
              <span>Open Chart Generator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Project Status Card */}
      {currentProject ? (
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/30 border border-brand-blue/50 flex items-center justify-center text-brand-blue">
                <Cpu className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{currentProject.name}</h3>
                <p className="text-xs text-slate-400">
                  {currentProject.product_name ? `Testing ${currentProject.product_name}` : "General Hardware Review"}
                  {currentProject.product_category ? ` · Category: ${currentProject.product_category}` : ""}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Project
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-brand-surface/60 rounded-xl p-4 border border-brand-border/40">
              <span className="text-xs text-slate-400 font-medium">Configurations</span>
              <div className="text-2xl font-bold text-white mt-1">
                {currentProject.configurations?.length ?? currentProject.config_count ?? 0}
              </div>
            </div>
            <div className="bg-brand-surface/60 rounded-xl p-4 border border-brand-border/40">
              <span className="text-xs text-slate-400 font-medium">Extracted Results</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {currentProject.result_count ?? 0}
              </div>
            </div>
            <div className="bg-brand-surface/60 rounded-xl p-4 border border-brand-border/40">
              <span className="text-xs text-slate-400 font-medium">Processor (CPU)</span>
              <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
                {currentProject.cpu || "Not specified"}
              </div>
            </div>
            <div className="bg-brand-surface/60 rounded-xl p-4 border border-brand-border/40">
              <span className="text-xs text-slate-400 font-medium">Graphics (GPU)</span>
              <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
                {currentProject.gpu || "Not specified"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-brand-card/50 rounded-2xl border border-dashed border-brand-border p-8 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No Project Active</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a review project or scan a folder of benchmark screenshots to get started.
          </p>
          <button
            onClick={() => onNavigate("projects")}
            className="mt-2 px-4 py-2 rounded-xl bg-brand-border hover:bg-brand-border/80 text-xs font-semibold text-white transition"
          >
            Create or Select Project
          </button>
        </div>
      )}

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => onNavigate("import")}
          className="group cursor-pointer bg-brand-card hover:bg-brand-card/90 rounded-2xl p-6 border border-brand-border hover:border-brand-red/50 transition shadow-lg space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red group-hover:scale-105 transition">
            <FolderSync className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">1. Automatic Folder Ingestion</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Index power mode folders (Performance, Balanced, Silent) and automatically identify Geekbench 6 and Cinebench screenshots.
          </p>
        </div>

        <div
          onClick={() => onNavigate("ocr_review")}
          className="group cursor-pointer bg-brand-card hover:bg-brand-card/90 rounded-2xl p-6 border border-brand-border hover:border-sky-500/50 transition shadow-lg space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">2. OCR Verification & Overrides</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Verify every extracted number with confidence scores, highlight score bounding boxes, and keep complete audit logs of manual corrections.
          </p>
        </div>

        <div
          onClick={() => onNavigate("compare")}
          className="group cursor-pointer bg-brand-card hover:bg-brand-card/90 rounded-2xl p-6 border border-brand-border hover:border-emerald-500/50 transition shadow-lg space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">3. Review Chart Generator</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Produce publication comparison bar charts formatted in the Gadget Pilipinas style with instant high-resolution PNG export.
          </p>
        </div>
      </div>
    </div>
  );
};
