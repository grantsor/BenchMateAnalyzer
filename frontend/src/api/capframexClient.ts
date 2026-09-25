import { CapFrameChartItem, GroupedBenchmarkDataset, GameProfile, GameProfilesMap, CustomChart } from "../types/capframex";

const API_BASE = window.location.port === "5173" ? "http://127.0.0.1:8742/api/capframex" : "/api/capframex";

export const api = {
  async setMode(mode: "pc" | "laptop"): Promise<any> {
    const res = await fetch(`${API_BASE}/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    });
    return res.json();
  },

  async browseFolder(initial_dir?: string, mode?: "pc" | "laptop"): Promise<{
    status: string;
    folder: string;
    runs_count: number;
    games: string[];
    detected_mode?: string;
    laptop_names?: string[];
    power_profiles?: string[];
  }> {
    const res = await fetch(`${API_BASE}/browse-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: initial_dir || "", mode })
    });
    return res.json();
  },

  async uploadCaptures(
    files: FileList | File[],
    mode?: "pc" | "laptop",
    onProgress?: (text: string) => void
  ): Promise<{
    status: string;
    folder: string;
    runs_count: number;
    games: string[];
    detected_mode?: string;
    laptop_names?: string[];
    power_profiles?: string[];
  }> {
    // Defensively snapshot files into a true static array of valid JSON File objects
    const fileList: File[] = (
      Array.isArray(files) ? files : Array.from(files || [])
    ).filter((f): f is File => Boolean(f && typeof f === "object" && "name" in f && f.name.toLowerCase().endsWith(".json")));

    const totalFiles = fileList.length;
    if (totalFiles === 0) {
      throw new Error("No valid CapFrameX .json capture files found in selection.");
    }

    const CHUNK_SIZE = 600;

    if (totalFiles <= CHUNK_SIZE) {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        if (!f) continue;
        const relPath = (f as any)?.webkitRelativePath || f?.name || "capture.json";
        formData.append("files", f, relPath);
      }
      const q = new URLSearchParams();
      if (mode) q.append("mode", mode);
      q.append("append", "false");

      const res = await fetch(`${API_BASE}/upload-captures?${q.toString()}`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json();
    }

    // Large datasets (up to 3,000 to 50,000 files): upload in streaming batches of 600
    let lastResult: any = null;
    const totalBatches = Math.ceil(totalFiles / CHUNK_SIZE);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const start = batchIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalFiles);
      const isAppend = batchIdx > 0;

      onProgress?.(`Uploading files (${end} / ${totalFiles})...`);

      const formData = new FormData();
      for (let i = start; i < end; i++) {
        const f = fileList[i];
        if (!f) continue;
        const relPath = (f as any)?.webkitRelativePath || f?.name || "capture.json";
        formData.append("files", f, relPath);
      }

      const q = new URLSearchParams();
      if (mode) q.append("mode", mode);
      q.append("append", isAppend ? "true" : "false");

      const res = await fetch(`${API_BASE}/upload-captures?${q.toString()}`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Batch upload failed" }));
        throw new Error(err.detail || `Upload failed at file ${start} - ${end}`);
      }

      lastResult = await res.json();
    }

    return lastResult;
  },

  async scan(folder?: string, mode?: "pc" | "laptop"): Promise<{
    status: string;
    folder: string;
    runs_count: number;
    games: string[];
    detected_mode?: string;
    laptop_names?: string[];
    power_profiles?: string[];
  }> {
    const res = await fetch(`${API_BASE}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: folder || null, mode })
    });
    return res.json();
  },

  async getDatasetInfo(mode?: "pc" | "laptop"): Promise<{
    total_runs: number;
    folder: string;
    detected_mode: string;
    laptop_names: string[];
    power_profiles: string[];
    games_count: number;
  }> {
    const q = mode ? `?mode=${mode}` : "";
    const res = await fetch(`${API_BASE}/dataset-info${q}`);
    return res.json();
  },

  async getGames(mode?: "pc" | "laptop"): Promise<string[]> {
    const q = mode ? `?mode=${mode}` : "";
    const res = await fetch(`${API_BASE}/games${q}`);
    const data = await res.json();
    return data.games || [];
  },

  async getResolutions(game?: string, mode?: "pc" | "laptop"): Promise<string[]> {
    const sp = new URLSearchParams();
    if (game) sp.append("game", game);
    if (mode) sp.append("mode", mode);
    const q = sp.toString() ? `?${sp.toString()}` : "";
    const res = await fetch(`${API_BASE}/resolutions${q}`);
    const data = await res.json();
    return data.resolutions || [];
  },

  async getHardware(game?: string, mode?: "pc" | "laptop"): Promise<{
    gpus: string[];
    cpus: string[];
    motherboards: string[];
    laptops?: string[];
    power_profiles?: string[];
  }> {
    const sp = new URLSearchParams();
    if (game) sp.append("game", game);
    if (mode) sp.append("mode", mode);
    const q = sp.toString() ? `?${sp.toString()}` : "";
    const res = await fetch(`${API_BASE}/hardware${q}`);
    return res.json();
  },

  async getChartData(params: {
    game: string;
    resolution: string;
    groupBy?: string;
    filterGpu?: string;
    filterCpu?: string;
    filterMotherboard?: string;
    filterLaptop?: string;
    filterPowerProfile?: string;
    aggregation?: string;
    customProductName?: string;
    mode?: "pc" | "laptop";
  }): Promise<{ items: CapFrameChartItem[] }> {
    const sp = new URLSearchParams();
    sp.append("game", params.game);
    sp.append("resolution", params.resolution);
    if (params.groupBy) sp.append("group_by", params.groupBy);
    if (params.filterGpu) sp.append("filter_gpu", params.filterGpu);
    if (params.filterCpu) sp.append("filter_cpu", params.filterCpu);
    if (params.filterMotherboard) sp.append("filter_motherboard", params.filterMotherboard);
    if (params.filterLaptop) sp.append("filter_laptop", params.filterLaptop);
    if (params.filterPowerProfile) sp.append("filter_power_profile", params.filterPowerProfile);
    if (params.aggregation) sp.append("aggregation", params.aggregation);
    if (params.customProductName) sp.append("custom_product_name", params.customProductName);
    if (params.mode) sp.append("mode", params.mode);

    const res = await fetch(`${API_BASE}/chart-data?${sp.toString()}`);
    return res.json();
  },

  async getTriResolution(params: {
    game: string;
    groupBy?: string;
    filterGpu?: string;
    filterCpu?: string;
    filterMotherboard?: string;
    filterLaptop?: string;
    filterPowerProfile?: string;
    aggregation?: string;
    customProductName?: string;
    mode?: "pc" | "laptop";
  }): Promise<{ game: string; data: Record<string, CapFrameChartItem[]> }> {
    const sp = new URLSearchParams();
    sp.append("game", params.game);
    if (params.groupBy) sp.append("group_by", params.groupBy);
    if (params.filterGpu) sp.append("filter_gpu", params.filterGpu);
    if (params.filterCpu) sp.append("filter_cpu", params.filterCpu);
    if (params.filterMotherboard) sp.append("filter_motherboard", params.filterMotherboard);
    if (params.filterLaptop) sp.append("filter_laptop", params.filterLaptop);
    if (params.filterPowerProfile) sp.append("filter_power_profile", params.filterPowerProfile);
    if (params.aggregation) sp.append("aggregation", params.aggregation);
    if (params.customProductName) sp.append("custom_product_name", params.customProductName);
    if (params.mode) sp.append("mode", params.mode);

    const res = await fetch(`${API_BASE}/tri-resolution?${sp.toString()}`);
    return res.json();
  },

  async getAliases(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/aliases`);
    return res.json();
  },

  async saveAliases(aliases: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/aliases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliases })
    });
    return res.json();
  },

  async getDefaultLogoData(): Promise<{
    data_url: string;
    width: number;
    height: number;
    aspect_ratio: number;
  }> {
    try {
      const res = await fetch(`${API_BASE}/branding/default-logo-data`);
      if (res.ok) return await res.json();
    } catch {}
    const res = await fetch("/api/branding/default-logo-data");
    return res.json();
  },

  async getRuns(
    game?: string,
    modeOrResolution?: "pc" | "laptop" | string,
    resolutionOrMode?: string
  ): Promise<{ total: number; runs: any[] }> {
    const sp = new URLSearchParams();
    if (game) sp.append("game", game);

    let mode: string | undefined;
    let resolution: string | undefined;

    if (modeOrResolution === "pc" || modeOrResolution === "laptop") {
      mode = modeOrResolution;
      resolution = resolutionOrMode;
    } else {
      resolution = modeOrResolution;
      mode = resolutionOrMode;
    }

    if (mode) sp.append("mode", mode);
    if (resolution) sp.append("resolution", resolution);

    const res = await fetch(`${API_BASE}/runs?${sp.toString()}`);
    return res.json();
  },

  async updateRun(payload: {
    file_path: string;
    comment?: string;
    cpu?: string;
    gpu?: string;
    motherboard?: string;
    ram?: string;
    game_name?: string;
  }): Promise<{
    status: string;
    run: any;
    games: string[];
    hardware: { gpus: string[]; cpus: string[]; motherboards: string[] };
  }> {
    const res = await fetch(`${API_BASE}/runs/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async batchUpdateRuns(payload: {
    file_paths: string[];
    comment?: string;
    cpu?: string;
    gpu?: string;
    motherboard?: string;
    ram?: string;
    game_name?: string;
  }): Promise<{
    status: string;
    updated_count: number;
    runs: any[];
    games: string[];
    hardware: { gpus: string[]; cpus: string[]; motherboards: string[] };
  }> {
    const res = await fetch(`${API_BASE}/runs/batch-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  },


  async getGpuHierarchy(): Promise<{ hierarchy: string[]; total: number }> {
    const res = await fetch(`${API_BASE}/gpu-hierarchy`);
    return res.json();
  },

  async saveGpuHierarchy(hierarchy: string[]): Promise<{ status: string; hierarchy: string[]; total: number }> {
    const res = await fetch(`${API_BASE}/gpu-hierarchy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hierarchy })
    });
    return res.json();
  },

  async resetGpuHierarchy(): Promise<{ status: string; hierarchy: string[]; total: number }> {
    const res = await fetch(`${API_BASE}/gpu-hierarchy/reset`, {
      method: "POST"
    });
    return res.json();
  },

  async getGameProfiles(): Promise<{
    status: string;
    profiles: GameProfilesMap;
    total: number;
    config_file?: string;
  }> {
    const res = await fetch(`${API_BASE}/game-profiles`);
    return res.json();
  },

  async saveGameProfile(payload: {
    game_name: string;
    title?: string;
    sub_header?: string;
    notes?: string;
  }): Promise<{
    status: string;
    profiles: GameProfilesMap;
    total: number;
    config_file?: string;
  }> {
    const res = await fetch(`${API_BASE}/game-profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async saveAllGameProfiles(profiles: GameProfilesMap): Promise<{
    status: string;
    profiles: GameProfilesMap;
    total: number;
    config_file?: string;
  }> {
    const res = await fetch(`${API_BASE}/game-profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles })
    });
    return res.json();
  },

  async deleteGameProfile(game_name: string): Promise<{
    status: string;
    profiles: GameProfilesMap;
    total: number;
  }> {
    const res = await fetch(`${API_BASE}/game-profiles/${encodeURIComponent(game_name)}`, {
      method: "DELETE"
    });
    return res.json();
  },

  async getCustomCharts(mode?: "pc" | "laptop"): Promise<{
    status: string;
    charts: CustomChart[];
    total: number;
  }> {
    const q = new URLSearchParams();
    if (mode) q.append("mode", mode);
    const res = await fetch(`${API_BASE}/custom-charts?${q.toString()}`);
    return res.json();
  },

  async getCustomChart(chartId: string): Promise<{
    status: string;
    chart: CustomChart;
  }> {
    const res = await fetch(`${API_BASE}/custom-charts/${encodeURIComponent(chartId)}`);
    return res.json();
  },

  async saveCustomChart(chart: Partial<CustomChart>): Promise<{
    status: string;
    chart: CustomChart;
    charts: CustomChart[];
  }> {
    const res = await fetch(`${API_BASE}/custom-charts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chart)
    });
    return res.json();
  },

  async deleteCustomChart(chartId: string): Promise<{
    status: string;
    charts: CustomChart[];
  }> {
    const res = await fetch(`${API_BASE}/custom-charts/${encodeURIComponent(chartId)}`, {
      method: "DELETE"
    });
    return res.json();
  }
};

export function convertToGroupedDataset(
  game: string,
  resolution: string,
  items: CapFrameChartItem[],
  baselineLabel?: string
): GroupedBenchmarkDataset {
  const rows = items.map((item, idx) => {
    const isBaseline = baselineLabel ? item.label === baselineLabel : idx === items.length - 1;
    return {
      configuration_id: item.label,
      configuration_name: item.label,
      display_name: item.label,
      sort_order: idx,
      is_baseline: isBaseline,
      gpu: item.gpu,
      cpu: item.cpu,
      motherboard: item.motherboard,
      tier_rank: item.tier_rank,
      matched_model: item.matched_model,
      metrics: {
        average_fps: {
          metric_id: "average_fps",
          metric_display_name: "Average FPS",
          unit: "FPS",
          higher_is_better: true,
          value: item.average_fps,
          confidence: 1.0,
          status: "verified"
        },
        p1_fps: {
          metric_id: "p1_fps",
          metric_display_name: "1% Low FPS",
          unit: "FPS",
          higher_is_better: true,
          value: item.p1_fps,
          confidence: 1.0,
          status: "verified"
        }
      }
    };
  });

  return {
    benchmark_id: `capframe_${game.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${resolution.toLowerCase()}`,
    benchmark_name: game.toUpperCase(),
    version: resolution,
    category: "Gaming",
    metric_ids: ["average_fps", "p1_fps"],
    rows: rows
  };
}

export function convertCustomChartToGroupedDataset(chart: CustomChart): GroupedBenchmarkDataset {
  const metric1Id = "primary_metric";
  const metric2Id = "secondary_metric";
  const hasMetric2 = Boolean(chart.metric2_name && chart.metric2_name.trim());
  const metricIds = hasMetric2 ? [metric1Id, metric2Id] : [metric1Id];

  const rows = (chart.rows || []).map((row, idx) => {
    const metrics: Record<string, any> = {
      [metric1Id]: {
        metric_id: metric1Id,
        metric_display_name: chart.metric_name || "Value",
        unit: chart.unit || "",
        higher_is_better: chart.higher_is_better ?? false,
        value: typeof row.value === "number" ? row.value : null,
        confidence: 1.0,
        status: "verified"
      }
    };

    if (hasMetric2) {
      metrics[metric2Id] = {
        metric_id: metric2Id,
        metric_display_name: chart.metric2_name!,
        unit: chart.metric2_unit || chart.unit || "",
        higher_is_better: chart.higher_is_better ?? false,
        value: typeof row.value2 === "number" ? row.value2 : null,
        confidence: 1.0,
        status: "verified"
      };
    }

    return {
      configuration_id: row.id || `row_${idx}_${row.label}`,
      configuration_name: row.label,
      display_name: row.label,
      sort_order: idx,
      is_baseline: idx === 0,
      gpu: row.gpu || row.label,
      cpu: row.cpu,
      motherboard: row.motherboard,
      tier_rank: row.tier_rank,
      metrics: metrics
    };
  });

  return {
    benchmark_id: chart.id,
    benchmark_name: chart.title || chart.name.toUpperCase(),
    version: chart.unit || undefined,
    category: chart.category || "System Metrics",
    metric_ids: metricIds,
    rows: rows
  };
}
