import React, { useState, useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar, NavTab } from "../components/layout/Sidebar";
import { Dashboard } from "../pages/Dashboard";
import { ProjectsPage } from "../pages/Projects";
import { ImportPage } from "../pages/Import";
import { SSDDatabasePage } from "../pages/SSDDatabase";
import { ResultsPage } from "../pages/Results";
import { OCRReviewPage } from "../pages/OCRReview";
import { ComparisonBuilderPage } from "../pages/ComparisonBuilder";
import { TableDesignerPage } from "../pages/TableDesigner";
import { BenchmarkProfilesPage } from "../pages/BenchmarkProfiles";
import { SettingsPage } from "../pages/Settings";
import { ChangelogPage } from "../pages/Changelog";

const STORAGE_KEY_ACTIVE_TAB = "gp_active_nav_tab_v1";
const STORAGE_KEY_SELECTED_BENCHMARK = "gp_selected_benchmark_chart_v1";

const VALID_TABS: NavTab[] = [
  "dashboard",
  "projects",
  "import",
  "ssd_database",
  "results",
  "ocr_review",
  "compare",
  "tables",
  "benchmarks",
  "settings",
  "changelog"
];

export function OcrApp() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      if (saved && VALID_TABS.includes(saved as NavTab)) {
        return saved as NavTab;
      }
    } catch (e) {
      console.warn("Could not read stored active tab:", e);
    }
    return "dashboard";
  });

  const [selectedBenchmarkForChart, setSelectedBenchmarkForChart] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SELECTED_BENCHMARK) || "";
    } catch {
      return "";
    }
  });

  const { fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, []);

  // Persist active navigation tab
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab);
    } catch (e) {
      console.warn("Could not persist active tab:", e);
    }
  }, [activeTab]);

  // Persist selected benchmark chart ID
  useEffect(() => {
    try {
      if (selectedBenchmarkForChart) {
        localStorage.setItem(STORAGE_KEY_SELECTED_BENCHMARK, selectedBenchmarkForChart);
      }
    } catch (e) {
      console.warn("Could not persist selected benchmark:", e);
    }
  }, [selectedBenchmarkForChart]);

  const handleSelectBenchmarkForChart = (bId: string) => {
    setSelectedBenchmarkForChart(bId);
    setActiveTab("compare");
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-brand-surface text-slate-100">
      {/* Top Navigation */}
      <Navbar
        onOpenProjects={() => setActiveTab("projects")}
        onOpenImport={() => setActiveTab("import")}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Workspace Page Router */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-brand-surface to-brand-card/30">
          {/* Persistent core tabs to preserve background scan progress & active comparison builder state across tab navigation */}
          <div className={activeTab === "import" ? "h-full w-full" : "hidden"}>
            <ImportPage onNavigate={setActiveTab} />
          </div>
          <div className={activeTab === "compare" ? "h-full w-full" : "hidden"}>
            <ComparisonBuilderPage
              initialBenchmarkId={selectedBenchmarkForChart}
              onBenchmarkChange={setSelectedBenchmarkForChart}
              onNavigate={setActiveTab}
              isActive={activeTab === "compare"}
            />
          </div>
          <div className={activeTab === "ssd_database" ? "h-full w-full" : "hidden"}>
            <SSDDatabasePage
              onNavigate={setActiveTab}
              onSelectBenchmarkForChart={handleSelectBenchmarkForChart}
            />
          </div>

          {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === "projects" && <ProjectsPage onNavigate={setActiveTab} />}
          {activeTab === "results" && (
            <ResultsPage
              onNavigate={setActiveTab}
              onSelectBenchmarkForChart={handleSelectBenchmarkForChart}
            />
          )}
          {activeTab === "ocr_review" && <OCRReviewPage onNavigate={setActiveTab} />}
          {activeTab === "tables" && <TableDesignerPage />}
          {activeTab === "benchmarks" && (
            <BenchmarkProfilesPage onNavigateToChart={handleSelectBenchmarkForChart} />
          )}
          {activeTab === "settings" && <SettingsPage />}
          {activeTab === "changelog" && <ChangelogPage />}
        </main>
      </div>
    </div>
  );
}

export default OcrApp;
