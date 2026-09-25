import React from "react";
import {
  BarChart3,
  CheckSquare,
  FolderSync,
  FolderTree,
  HardDrive,
  History,
  LayoutDashboard,
  Layers,
  Settings,
  Sliders,
  Table
} from "lucide-react";

import { APP_VERSION_LABEL } from "../../constants/version";

export type NavTab =
  | "dashboard"
  | "import"
  | "ssd_database"
  | "results"
  | "ocr_review"
  | "compare"
  | "tables"
  | "benchmarks"
  | "projects"
  | "settings"
  | "changelog";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "import", label: "Import & Scan", icon: <FolderSync className="w-4 h-4" /> },
    { id: "ocr_review", label: "OCR Review", icon: <CheckSquare className="w-4 h-4" /> },
    { id: "compare", label: "Comparison Charts", icon: <BarChart3 className="w-4 h-4" />, badge: "ECharts" },
    { id: "results", label: "All Results", icon: <Layers className="w-4 h-4" /> },
    { id: "ssd_database", label: "SSD Database", icon: <HardDrive className="w-4 h-4" />, badge: "Table" },
    { id: "tables", label: "Table Designer", icon: <Table className="w-4 h-4" /> },
    { id: "benchmarks", label: "Benchmark Profiles", icon: <Sliders className="w-4 h-4" /> },
    { id: "projects", label: "Projects", icon: <FolderTree className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
    { id: "changelog", label: "Changelogs", icon: <History className="w-4 h-4" />, badge: APP_VERSION_LABEL },
  ];

  return (
    <aside className="w-64 bg-brand-surface border-r border-brand-border flex flex-col justify-between select-none">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-brand-card to-brand-card/90 text-white border border-brand-border/80 shadow-md shadow-black/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-brand-card/50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? "text-brand-red" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-brand-border/60 bg-brand-card/20">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>OCR Engine:</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            RapidOCR PP-v4
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-1.5">
          <span>Mode:</span>
          <span className="font-medium text-slate-300">100% Offline</span>
        </div>
      </div>
    </aside>
  );
};
