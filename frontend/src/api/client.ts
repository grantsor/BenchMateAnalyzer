const API_BASE = "http://127.0.0.1:8742/api";


export interface SSDDatabaseScore {
  id: string;
  benchmark_id: string;
  metric_id: string;
  value: number;
  unit: string;
  source_file?: string;
  is_manual: boolean;
  updated_at?: string;
}

export interface SSDDatabaseModel {
  id: string;
  model_name: string;
  brand?: string;
  capacity?: string;
  interface?: string;
  form_factor?: string;
  notes?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  scores: Record<string, SSDDatabaseScore>;
}

export interface SSDMetricColumn {
  benchmark_id: string;
  metric_id: string;
  title: string;
  unit: string;
  higher_is_better: boolean;
}

export interface Project {
  id: string;
  name: string;
  product_name?: string;
  product_category?: string;
  cpu?: string;
  gpu?: string;
  motherboard?: string;
  ram?: string;
  storage?: string;
  os?: string;
  bios_version?: string;
  driver_version?: string;
  reviewer?: string;
  notes?: string;
  root_folder_path?: string;
  config_count?: number;
  result_count?: number;
  created_at: string;
  configurations?: Configuration[];
}

export interface Configuration {
  id: string;
  folder_name: string;
  display_name: string;
  sort_order: number;
  image_count: number;
  images: {
    id: string;
    file_path: string;
    file_name: string;
    width: number;
    height: number;
  }[];
}

export interface ScanPreviewResult {
  root_folder: string;
  total_files: number;
  total_images: number;
  recognized_benchmarks_count: number;
  unknown_images_count: number;
  duplicate_count: number;
  configurations: {
    folder_name: string;
    display_name: string;
    image_count: number;
    images: {
      file_name: string;
      file_path: string;
      identified_benchmark_id?: string;
      confidence: number;
      is_duplicate: boolean;
      duplicate_of?: string;
    }[];
  }[];
  duplicates: {
    original: string;
    duplicate: string;
    config: string;
  }[];
}

export interface MetricValue {
  metric_id: string;
  metric_display_name: string;
  unit: string;
  higher_is_better: boolean;
  value: number | null;
  raw_values: number[];
  confidence: number;
  status: string;
  source_file?: string;
  delta_vs_baseline?: number | null;
  pct_gain_vs_baseline?: number | null;
}

export interface GroupedRow {
  configuration_id: string;
  configuration_name: string;
  display_name: string;
  sort_order: number;
  is_baseline: boolean;
  project_id?: string;
  project_name?: string;
  metrics: Record<string, MetricValue>;
}

export interface GroupedBenchmarkDataset {
  benchmark_id: string;
  benchmark_name: string;
  version?: string;
  category?: string;
  metric_ids: string[];
  rows: GroupedRow[];
}

export interface BenchmarkMetricProfile {
  id: string;
  name: string;
  display_name: string;
  unit: string;
  higher_is_better: boolean;
  decimal_places: number;
  sort_order: number;
}

export interface BenchmarkProfile {
  id: string;
  name: string;
  version?: string | null;
  category?: string | null;
  metrics: BenchmarkMetricProfile[];
}

export interface BenchmarkUpdatePayload {
  name?: string;
  version?: string;
  category?: string;
  metrics?: {
    id: string;
    name?: string;
    display_name?: string;
    unit?: string;
    higher_is_better?: boolean;
    decimal_places?: number;
    sort_order?: number;
  }[];
}

export interface CandidateScore {
  id: string;
  raw_text: string;
  value: number;
  unit: string;
  suggested_name: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface ScoreDetectionResult {
  file_path: string;
  width: number;
  height: number;
  candidates: CandidateScore[];
}

export interface AIDetectResult {
  id: string;
  name: string;
  category: string;
  device_tested?: string | null;
  keywords: string[];
  metrics: {
    id: string;
    name: string;
    display_name: string;
    value: number;
    unit: string;
    higher_is_better: boolean;
    decimal_places: number;
    sort_order: number;
  }[];
}

export interface AISettings {
  provider: "directml" | "gemini";
  has_api_key: boolean;
  model_name: string;
}

export interface TestExtractResult {
  benchmark_id: string;
  detected_benchmark_name: string;
  overall_confidence: number;
  status: string;
  metrics: Record<string, {
    metric_id: string;
    raw_text: string;
    normalized_value: number;
    unit: string;
    confidence: number;
    ocr_region?: number[] | null;
  }>;
}

export interface BenchmarkCreatePayload {
  id?: string;
  name: string;
  version?: string;
  category?: string;
  file_patterns?: string[];
  aliases?: string[];
  keywords?: string[];
  metrics: {
    id?: string;
    name: string;
    display_name?: string;
    unit?: string;
    higher_is_better?: boolean;
    decimal_places?: number;
    sort_order?: number;
  }[];
}

export interface AssignResultPayload {
  project_id: string;
  configuration_id: string;
  benchmark_id: string;
  result_id?: string;
  source_image_id?: string;
  metric_values: Record<string, number>;
}

export interface OCRReviewItem {
  result_id: string;
  benchmark_id: string;
  benchmark_name: string;
  configuration_id: string;
  configuration_name: string;
  overall_confidence: number;
  status: string;
  image?: {
    id: string;
    file_path: string;
    file_name: string;
    width: number;
    height: number;
  };
  metrics: {
    result_metric_id: string;
    metric_id: string;
    metric_name: string;
    unit: string;
    higher_is_better: boolean;
    raw_ocr_value: string;
    normalized_value: number | null;
    confidence: number;
    ocr_region?: string;
    has_override: boolean;
    override_history: {
      original: number | null;
      corrected: number;
      reason: string;
      created_at: string;
    }[];
  }[];
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error("Failed to fetch projects");
    return res.json();
  },

  async checkDuplicateProject(
    path?: string,
    name?: string
  ): Promise<{
    is_duplicate: boolean;
    match_type: "path" | "name" | null;
    project: Project | null;
  }> {
    const params = new URLSearchParams();
    if (path) params.append("path", path);
    if (name) params.append("name", name);
    const res = await fetch(`${API_BASE}/projects/check-duplicate?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to check duplicate project");
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error("Failed to fetch project");
    return res.json();
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update project");
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete project");
  },

  async updateConfigName(id: string, display_name: string, sort_order?: number): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/configurations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name, sort_order }),
    });
    if (!res.ok) throw new Error("Failed to update configuration name");
  },

  // Scanner
  async browseFolder(initial_dir?: string): Promise<{ folder_path: string; cancelled: boolean }> {
    const res = await fetch(`${API_BASE}/scanner/browse-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initial_dir }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to browse folder" }));
      throw new Error(err.detail || "Failed to browse folder");
    }
    return res.json();
  },

  async previewFolder(folder_path: string): Promise<ScanPreviewResult> {
    const res = await fetch(`${API_BASE}/scanner/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Scan preview failed" }));
      throw new Error(err.detail || "Scan preview failed");
    }
    return res.json();
  },

  async startImport(
    project_id: string,
    folder_path: string,
    product_name?: string,
    product_category?: string,
    force_reparse?: boolean
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/scanner/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id,
        folder_path,
        product_name,
        product_category,
        force_reparse
      }),
    });
    if (!res.ok) throw new Error("Failed to start import");
  },

  async reprocessProject(project_id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/scanner/reprocess/${project_id}`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to start project reprocessing");
  },

  async getImportProgress(project_id: string): Promise<{
    status: string;
    current?: number;
    total?: number;
    current_file?: string;
    report?: any;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE}/scanner/progress/${project_id}`);
    if (!res.ok) throw new Error("Failed to get import progress");
    return res.json();
  },

  // Results
  async getGroupedResults(
    project_id: string,
    benchmark_id?: string,
    aggregation: string = "best",
    baseline_id?: string,
    scope: string = "project",
    category?: string
  ): Promise<GroupedBenchmarkDataset[]> {
    const params = new URLSearchParams({ aggregation, scope });
    if (benchmark_id) params.append("benchmark_id", benchmark_id);
    if (baseline_id) params.append("baseline_config_id", baseline_id);
    if (category) params.append("category", category);

    const res = await fetch(`${API_BASE}/results/project/${project_id}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch grouped results");
    return res.json();
  },

  async getOCRReview(project_id: string): Promise<OCRReviewItem[]> {
    const res = await fetch(`${API_BASE}/results/ocr-review/${project_id}`);
    if (!res.ok) throw new Error("Failed to fetch OCR review items");
    return res.json();
  },

  async overrideMetric(metric_id: string, new_value: number, reason?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/results/metrics/${metric_id}/override`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_value, reason }),
    });
    if (!res.ok) throw new Error("Failed to override metric");
  },

  async updateResultStatus(result_id: string, status: string): Promise<void> {
    const res = await fetch(`${API_BASE}/results/${result_id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
  },

  async reprocessResult(result_id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/results/${result_id}/reprocess`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reprocess result");
  },

  async reassignResultBenchmark(result_id: string, benchmark_id: string, reparse: boolean = true): Promise<any> {
    const res = await fetch(`${API_BASE}/results/${result_id}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benchmark_id, reparse }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reassign benchmark");
    }
    return res.json();
  },

  // Benchmarks
  async getBenchmarks(): Promise<BenchmarkProfile[]> {
    const res = await fetch(`${API_BASE}/benchmarks`);
    if (!res.ok) throw new Error("Failed to fetch benchmarks");
    return res.json();
  },

  async createBenchmark(data: BenchmarkCreatePayload): Promise<BenchmarkProfile> {
    const res = await fetch(`${API_BASE}/benchmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create benchmark");
    }
    return res.json();
  },

  async updateBenchmark(id: string, data: BenchmarkUpdatePayload): Promise<BenchmarkProfile> {
    const res = await fetch(`${API_BASE}/benchmarks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update benchmark profile");
    return res.json();
  },

  async deleteBenchmark(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/benchmarks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete benchmark");
  },

  async resetBenchmark(id: string): Promise<BenchmarkProfile> {
    const res = await fetch(`${API_BASE}/benchmarks/${id}/reset`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset benchmark profile");
    return res.json();
  },

  async detectScores(formData: FormData): Promise<ScoreDetectionResult> {
    const res = await fetch(`${API_BASE}/benchmarks/detect-scores`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to detect scores from image");
    }
    return res.json();
  },

  async aiDetectBenchmark(formData: FormData): Promise<AIDetectResult> {
    const res = await fetch(`${API_BASE}/benchmarks/ai-detect`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to analyze benchmark image with AI");
    }
    return res.json();
  },

  async testExtractDynamicBenchmark(formData: FormData): Promise<TestExtractResult> {
    const res = await fetch(`${API_BASE}/benchmarks/test-extract`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to test dynamic template extraction");
    }
    return res.json();
  },

  async getAISettings(): Promise<AISettings> {
    const res = await fetch(`${API_BASE}/benchmarks/ai-settings`);
    if (!res.ok) throw new Error("Failed to fetch AI settings");
    return res.json();
  },

  async updateAISettings(data: { provider: string; api_key?: string; model_name?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/benchmarks/ai-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update AI settings");
    return res.json();
  },

  async assignResult(data: AssignResultPayload): Promise<any> {
    const res = await fetch(`${API_BASE}/benchmarks/assign-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to assign result");
    return res.json();
  },

  // Charts
  async getCharts(project_id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/charts/project/${project_id}`);
    if (!res.ok) throw new Error("Failed to fetch saved charts");
    return res.json();
  },

  async saveChart(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/charts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save chart");
    return res.json();
  },

  // Image preview URL
  getImageUrl(file_path: string): string {
    return `${API_BASE}/images/view?path=${encodeURIComponent(file_path)}`;
  },

  // Export URLs
  getExportCsvUrl(project_id: string): string {
    return `${API_BASE}/export/csv/${project_id}`;
  },

  getExportJsonUrl(project_id: string): string {
    return `${API_BASE}/export/json/${project_id}`;
  },

  getExportJsonDownloadUrl(project_id: string): string {
    return `${API_BASE}/export/download-json/${project_id}`;
  },

  async importDataFile(
    file: File,
    projectName?: string
  ): Promise<{
    success: boolean;
    project_id: string;
    project_name: string;
    product_name?: string;
    product_category?: string;
    configuration_count: number;
    result_count: number;
    metric_count: number;
    format: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    if (projectName) {
      formData.append("project_name", projectName);
    }

    const res = await fetch(`${API_BASE}/scanner/import-file`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Failed to import data file");
    }
    return res.json();
  },

  // Branding
  async getDefaultLogoData(): Promise<{ data_url: string; width: number; height: number; aspect_ratio: number }> {
    const res = await fetch(`${API_BASE}/branding/default-logo-data`);
    if (!res.ok) throw new Error("Failed to fetch default logo data");
    return res.json();
  },

  // System Management
  async shutdownApp(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/system/shutdown`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to shutdown server");
    return res.json();
  },

  // ==========================================
  // SSD Database API
  // ==========================================
  async getSSDModels(): Promise<SSDDatabaseModel[]> {
    const res = await fetch(`${API_BASE}/ssd-database/models`);
    if (!res.ok) throw new Error("Failed to fetch SSD models");
    return res.json();
  },

  async createSSDModel(data: {
    model_name: string;
    brand?: string;
    capacity?: string;
    interface?: string;
    form_factor?: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/ssd-database/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to create model" }));
      throw new Error(err.detail || "Failed to create model");
    }
    return res.json();
  },

  async updateSSDModel(id: string, data: Partial<{
    model_name: string;
    brand: string;
    capacity: string;
    interface: string;
    form_factor: string;
    notes: string;
  }>): Promise<any> {
    const res = await fetch(`${API_BASE}/ssd-database/models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update model");
    return res.json();
  },

  async deleteSSDModel(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ssd-database/models/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete model");
    return res.json();
  },

  async updateSSDScore(data: {
    model_id: string;
    benchmark_id: string;
    metric_id: string;
    value: number;
    unit?: string;
    is_manual?: boolean;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/ssd-database/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update score");
    return res.json();
  },

  async deleteSSDScore(data: {
    model_id: string;
    benchmark_id: string;
    metric_id: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/ssd-database/scores`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to delete score");
    return res.json();
  },

  async scanSSDFolder(folder_path: string): Promise<{
    status: string;
    models_updated: string[];
    total_scores_saved: number;
  }> {
    const res = await fetch(`${API_BASE}/ssd-database/scan-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_path }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Scan failed" }));
      throw new Error(err.detail || "Failed to scan SSD folder");
    }
    return res.json();
  },

  getSSDExportCsvUrl(): string {
    return `${API_BASE}/ssd-database/export-csv`;
  },

  async importSSDCSV(file: File): Promise<{
    status: string;
    models_imported: number;
    scores_imported: number;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/ssd-database/import-csv`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(err.detail || "Failed to import CSV");
    }
    return res.json();
  },

  async getSSDGroupedDatasets(baseline_model_id?: string, form_factor?: string): Promise<GroupedBenchmarkDataset[]> {
    const params = new URLSearchParams();
    if (baseline_model_id) params.append("baseline_model_id", baseline_model_id);
    if (form_factor && form_factor !== "all") params.append("form_factor", form_factor);
    const qs = params.toString();
    const url = `${API_BASE}/ssd-database/grouped-datasets${qs ? `?${qs}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch SSD grouped datasets");
    return res.json();
  },

  async getSSDMetricColumns(): Promise<SSDMetricColumn[]> {
    const res = await fetch(`${API_BASE}/ssd-database/metric-columns`);
    if (!res.ok) throw new Error("Failed to fetch metric columns");
    return res.json();
  }

};