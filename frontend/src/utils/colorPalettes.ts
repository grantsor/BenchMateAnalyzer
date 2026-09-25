export interface GradientPreset {
  id: string;
  name: string;
  category: "excel-gradient" | "classic";
  colors: string[];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "excel-blue",
    name: "Monochromatic Blue",
    category: "excel-gradient",
    colors: ["#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"]
  },
  {
    id: "gp-classic",
    name: "Gadget Pilipinas",
    category: "classic",
    colors: ["#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#8338ec", "#3a86ff"]
  },
  {
    id: "excel-red",
    name: "Monochromatic Red / Crimson",
    category: "excel-gradient",
    colors: ["#881337", "#9f1239", "#be123c", "#e11d48", "#f43f5e", "#fda4af"]
  },
  {
    id: "excel-green",
    name: "Monochromatic Green / Emerald",
    category: "excel-gradient",
    colors: ["#064e3b", "#065f46", "#059669", "#10b981", "#34d399", "#a7f3d0"]
  },
  {
    id: "excel-purple",
    name: "Monochromatic Purple / Violet",
    category: "excel-gradient",
    colors: ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#c4b5fd"]
  },
  {
    id: "excel-amber",
    name: "Monochromatic Amber / Orange",
    category: "excel-gradient",
    colors: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fdba74"]
  },
  {
    id: "excel-teal",
    name: "Monochromatic Teal / Marine",
    category: "excel-gradient",
    colors: ["#134e4a", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#99f6e4"]
  },
  {
    id: "excel-gray",
    name: "Monochromatic Slate / Charcoal",
    category: "excel-gradient",
    colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"]
  }
];

/**
 * Dynamically sample and scale N distinct gradient color steps across a palette
 */
export function samplePresetColors(presetColors: string[], metricCount: number): string[] {
  if (metricCount <= 0) return [];
  if (metricCount === 1) return [presetColors[1] || presetColors[0]];
  if (metricCount === 2) {
    return [presetColors[0], presetColors[Math.min(2, presetColors.length - 1)]];
  }
  if (metricCount >= presetColors.length) {
    return [...presetColors];
  }

  const result: string[] = [];
  for (let i = 0; i < metricCount; i++) {
    const idx = Math.round((i / (metricCount - 1)) * (presetColors.length - 1));
    result.push(presetColors[idx]);
  }
  return result;
}
