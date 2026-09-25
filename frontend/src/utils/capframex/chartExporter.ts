import * as echarts from "echarts";
import JSZip from "jszip";
import {
  GroupedBenchmarkDataset,
  ChartDesignOptions,
  ExportConfig,
  ExportAspectRatio,
  ExportResolution,
  ExportFormat
} from "../../types/capframex";
import { GRADIENT_PRESETS, samplePresetColors } from "./colorPalettes";
import { findGpuTier, DEFAULT_GPU_HIERARCHY } from "./gpuHierarchy";

export function formatTwoLineLabel(text: string, maxCharsPerLine: number = 28): string {
  if (!text) return "";
  if (text.includes("\n")) return text;
  if (text.includes(" - ")) {
    const parts = text.split(" - ");
    return `${parts[0].trim()}\n${parts.slice(1).join(" - ").trim()}`;
  }
  if (text.length <= maxCharsPerLine) return text;

  const words = text.split(" ");
  const mid = text.length / 2;
  let bestIdx = 0;
  let bestDiff = 999;
  let currLen = 0;
  for (let i = 0; i < words.length - 1; i++) {
    currLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(currLen - mid);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  const line1 = words.slice(0, bestIdx + 1).join(" ");
  const line2 = words.slice(bestIdx + 1).join(" ");
  return `${line1}\n${line2}`;
}

export function getExportDimensions(
  aspectRatio: ExportAspectRatio,
  resolution: ExportResolution
): { width: number; height: number } {
  if (aspectRatio === "16:9") {
    switch (resolution) {
      case "720p":
        return { width: 1280, height: 720 };
      case "4k":
        return { width: 3840, height: 2160 };
      case "1080p":
      default:
        return { width: 1920, height: 1080 };
    }
  } else {
    // 9:16 Vertical
    switch (resolution) {
      case "720p":
        return { width: 720, height: 1280 };
      case "4k":
        return { width: 2160, height: 3840 };
      case "1080p":
      default:
        return { width: 1080, height: 1920 };
    }
  }
}

export function buildExportEchartsOption(
  dataset: GroupedBenchmarkDataset,
  options: ChartDesignOptions,
  width: number,
  height: number,
  isVertical: boolean
): any {
  const baseDim = isVertical ? 1080 : 1920;
  const scale = width / baseDim;
  // Font scale: keep full scale for exports (scale >= 1.0) and prevent preview fonts from shrinking below legibility
  const fontScale = isVertical ? Math.max(scale, 0.72) : Math.max(scale, 0.65);

  const datasetConfigIds = new Set(dataset.rows.map((r) => r.configuration_id));
  const excludedConfigIds = new Set(options.manuallyExcludedConfigIds || []);
  const matchingConfigIds = options.selectedConfigIds.filter(
    (id) => datasetConfigIds.has(id) && !excludedConfigIds.has(id)
  );
  let rows = matchingConfigIds.length > 0
    ? dataset.rows.filter((r) => matchingConfigIds.includes(r.configuration_id))
    : dataset.rows.filter((r) => !excludedConfigIds.has(r.configuration_id));
  if (rows.length === 0 && dataset.rows.length > 0) {
    rows = [dataset.rows[0]];
  }

  const validSelected = options.selectedMetrics.filter((m) => dataset.metric_ids.includes(m));
  const activeMetrics = validSelected.length > 0 ? validSelected : dataset.metric_ids;
  const primaryMetric = activeMetrics[0] || dataset.metric_ids[0];

  const isGpuMode = options.groupBy === "gpu" || options.groupBy === undefined;

  // Resolve active chart sort mode: whole chart vs GPU hierarchy
  let sortMode: "gpu_hierarchy" | "score_desc" | "score_asc" | "alpha_asc" | "alpha_desc" | "original" = "gpu_hierarchy";
  if (options.chartSortMode) {
    sortMode = options.chartSortMode;
  } else if (options.useGpuHierarchySort !== false && isGpuMode) {
    sortMode = "gpu_hierarchy";
  } else if (options.sortOrder === "desc") {
    sortMode = "score_desc";
  } else if (options.sortOrder === "asc") {
    sortMode = "score_asc";
  } else if (options.sortOrder === "alpha") {
    sortMode = "alpha_asc";
  } else {
    sortMode = "original";
  }

  // If sortMode is gpu_hierarchy but not grouping by GPU, fallback to score_desc
  if (sortMode === "gpu_hierarchy" && !isGpuMode) {
    sortMode = "score_desc";
  }

  const useHierarchy = sortMode === "gpu_hierarchy";
  const withinTierSort = options.withinTierSortOrder || options.sortOrder || "desc";

  const activeHierarchy =
    options.gpuHierarchy && options.gpuHierarchy.length > 0
      ? options.gpuHierarchy
      : DEFAULT_GPU_HIERARCHY;

  rows = [...rows].sort((a, b) => {
    if (useHierarchy) {
      const rankA =
        a.tier_rank !== undefined && a.tier_rank !== 999999
          ? a.tier_rank
          : findGpuTier(options.customConfigLabels?.[a.configuration_id] || a.display_name, activeHierarchy).rank;
      const rankB =
        b.tier_rank !== undefined && b.tier_rank !== 999999
          ? b.tier_rank
          : findGpuTier(options.customConfigLabels?.[b.configuration_id] || b.display_name, activeHierarchy).rank;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Secondary sort within tier
      if (withinTierSort === "desc" || withinTierSort === "asc") {
        const valA = a.metrics[primaryMetric]?.value ?? 0;
        const valB = b.metrics[primaryMetric]?.value ?? 0;
        return withinTierSort === "desc" ? valB - valA : valA - valB;
      } else if (withinTierSort === "alpha") {
        const nameA = (options.customConfigLabels?.[a.configuration_id] || a.display_name || "").toLowerCase();
        const nameB = (options.customConfigLabels?.[b.configuration_id] || b.display_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return a.sort_order - b.sort_order;
    }

    // Whole Chart Sorting across all cards/bars!
    if (sortMode === "score_desc") {
      const valA = a.metrics[primaryMetric]?.value ?? 0;
      const valB = b.metrics[primaryMetric]?.value ?? 0;
      return valB - valA;
    } else if (sortMode === "score_asc") {
      const valA = a.metrics[primaryMetric]?.value ?? 0;
      const valB = b.metrics[primaryMetric]?.value ?? 0;
      return valA - valB;
    } else if (sortMode === "alpha_asc") {
      const nameA = (options.customConfigLabels?.[a.configuration_id] || a.display_name || "").toLowerCase();
      const nameB = (options.customConfigLabels?.[b.configuration_id] || b.display_name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortMode === "alpha_desc") {
      const nameA = (options.customConfigLabels?.[a.configuration_id] || a.display_name || "").toLowerCase();
      const nameB = (options.customConfigLabels?.[b.configuration_id] || b.display_name || "").toLowerCase();
      return nameB.localeCompare(nameA);
    }
    return a.sort_order - b.sort_order;
  });


  const isLight = options.theme === "light";
  const bgCol = isLight ? "#ffffff" : "#0d1b2a";
  const textCol = isLight ? "#1a202c" : "#f7fafc";
  const subTextCol = isLight ? "#4a5568" : "#a0aec0";
  const gridLineCol = isLight ? "#edf2f7" : "#1e293b";
  const defaultColors =
    options.barColors && options.barColors.length > 0
      ? options.barColors
      : ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"];

  const displayRows = [...rows].reverse();
  const categoryNames = displayRows.map((r) => {
    const baseName = options.customConfigLabels?.[r.configuration_id] || r.display_name;
    if (options.includeProductNameInLabels && options.productName) {
      const pName = options.productName.trim();
      if (pName && !baseName.toLowerCase().startsWith(pName.toLowerCase())) {
        return `${pName} - ${baseName}`;
      }
    }
    return baseName;
  });

  const isInside =
    options.barValuePosition === "inside"
      ? true
      : options.barValuePosition === "outside"
      ? false
      : rows.length > 5;

  // Determine if Merged Bars layout applies:
  // Auto-activates if barLayout !== "grouped" and there are >= 6 rows, OR if explicitly "merged"
  const isMergedBars =
    (options.barLayout === "merged" || (options.barLayout !== "grouped" && rows.length >= 6)) &&
    activeMetrics.includes("average_fps") &&
    (activeMetrics.includes("p1_fps") || activeMetrics.includes("p0_1_fps"));

  // --- Dynamic Left & Right Margins ---
  // When there are few products (<= 6), allocate ~28% left margin so product names have room without wrapping words.
  // For medium datasets (<= 16), allocate ~24%.
  // For large GPU hierarchy benchmark lists (> 16), allocate ~20.5% to maximize the horizontal bar area to ~74%.
  const defaultLeft = isVertical
    ? (displayRows.length <= 6
        ? Math.round(width * 0.28)
        : displayRows.length <= 16
        ? Math.round(width * 0.24)
        : Math.round(width * 0.205))
    : (displayRows.length <= 6
        ? Math.round(width * 0.24)
        : Math.round(width * 0.22));

  const gridLeft = options.gridLeftMargin
    ? Math.round(options.gridLeftMargin * scale)
    : defaultLeft;

  const gridRight = Math.round(
    isVertical
      ? width * 0.05
      : (isMergedBars ? 110 : isInside ? 70 : 130) * scale
  );

  // --- Dynamic Header Typography & Vertical Clearance ---
  // Calculated dynamically so Title, Subtitle, Legend, and Grid Bars NEVER overlap in any mode or resolution
  const titleFontSize = Math.round((isVertical ? 40 : 36) * fontScale);
  const titleItemGap = Math.max(4, Math.round((isVertical ? 8 : 6) * fontScale));
  const subtitleFontSize = Math.round((isVertical ? 20 : 18) * fontScale);
  const legendFontSize = Math.round((isVertical ? 18 : 16) * fontScale);

  const titleTop = Math.round((isVertical ? 26 : 22) * scale);
  const titleHeight = Math.round(titleFontSize * 1.15);
  const subtitleHeight = Math.round(subtitleFontSize * 1.2);
  const titleBlockHeight = titleHeight + titleItemGap + subtitleHeight;

  const subToLegendGap = Math.max(10, Math.round((isVertical ? 16 : 14) * fontScale));
  const legendTop = titleTop + titleBlockHeight + subToLegendGap;
  const legendHeight = Math.round(legendFontSize * 1.25);

  const legendToGridGap = Math.max(14, Math.round((isVertical ? 22 : 18) * fontScale));
  const gridTop = legendTop + legendHeight + legendToGridGap;
  const gridBottom = Math.round((isVertical ? 70 : 65) * scale);
  const totalGridWidth = Math.max(100, width - gridLeft - gridRight);

  let maxChartVal = 1;
  displayRows.forEach((r) => {
    activeMetrics.forEach((m_id) => {
      const v = r.metrics[m_id]?.value ?? 0;
      if (v > maxChartVal) maxChartVal = v;
    });
  });

  // Calculate dynamic bar height & category gaps
  let barMaxWidth: number;
  let barCategoryGap: string;
  if (isMergedBars) {
    if (displayRows.length >= 35) {
      barMaxWidth = Math.round((isVertical ? 22 : 14) * scale);
      barCategoryGap = "20%";
    } else if (displayRows.length >= 24) {
      barMaxWidth = Math.round((isVertical ? 26 : 16) * scale);
      barCategoryGap = "25%";
    } else if (displayRows.length >= 18) {
      barMaxWidth = Math.round((isVertical ? 34 : 20) * scale);
      barCategoryGap = "30%";
    } else if (displayRows.length >= 12) {
      barMaxWidth = Math.round((isVertical ? 44 : 25) * scale);
      barCategoryGap = "35%";
    } else if (displayRows.length >= 6) {
      barMaxWidth = Math.round((isVertical ? 48 : 30) * scale);
      barCategoryGap = "35%";
    } else {
      barMaxWidth = Math.round((isVertical ? 50 : 36) * scale);
      barCategoryGap = "40%";
    }
  } else {
    if (displayRows.length >= 35) {
      barMaxWidth = Math.round((isVertical ? 16 : 14) * scale);
      barCategoryGap = "20%";
    } else if (displayRows.length >= 20) {
      barMaxWidth = Math.round((isVertical ? 24 : 18) * scale);
      barCategoryGap = "25%";
    } else if (displayRows.length >= 12) {
      barMaxWidth = Math.round((isVertical ? 34 : 26) * scale);
      barCategoryGap = "25%";
    } else if (displayRows.length <= 4) {
      barMaxWidth = Math.round((isVertical ? 36 : 28) * scale);
      barCategoryGap = "35%";
    } else {
      barMaxWidth = Math.round((isVertical ? 42 : 34) * scale);
      barCategoryGap = "30%";
    }
  }

  // Dynamic bar label font sizes based on row count and vertical orientation
  let baseBarLabelSize: number;
  if (isVertical) {
    if (displayRows.length >= 36) {
      baseBarLabelSize = 13.5;
    } else if (displayRows.length >= 26) {
      baseBarLabelSize = 15.5;
    } else if (displayRows.length >= 18) {
      baseBarLabelSize = 17.5;
    } else if (displayRows.length >= 12) {
      baseBarLabelSize = 19;
    } else if (displayRows.length <= 6) {
      baseBarLabelSize = 17.5;
    } else {
      baseBarLabelSize = 19;
    }
  } else {
    if (displayRows.length >= 35) {
      baseBarLabelSize = 12;
    } else if (displayRows.length >= 24) {
      baseBarLabelSize = 14;
    } else if (displayRows.length >= 18) {
      baseBarLabelSize = 15.5;
    } else if (displayRows.length >= 12) {
      baseBarLabelSize = 17;
    } else if (displayRows.length <= 6) {
      baseBarLabelSize = 16.5;
    } else {
      baseBarLabelSize = 17.5;
    }
  }
  const barLabelFontSize = Math.round(baseBarLabelSize * fontScale);

  const p1MetricId = activeMetrics.includes("p1_fps") ? "p1_fps" : "p0_1_fps";
  const avgMetricName =
    options.customMetricLabels?.["average_fps"] ||
    rows.find((r) => r.metrics["average_fps"])?.metrics["average_fps"]?.metric_display_name ||
    "Average FPS";
  const p1MetricName =
    options.customMetricLabels?.[p1MetricId] ||
    rows.find((r) => r.metrics[p1MetricId])?.metrics[p1MetricId]?.metric_display_name ||
    (p1MetricId === "p0_1_fps" ? "0.1% Low FPS" : "1% FPS");

  // Standard Gadget Pilipinas / CX Blue palette for merged bars:
  // 1% Low is dark navy/cobalt blue, Average is bright royal/sky blue
  const avgColor = options.customMetricColors?.["average_fps"] || options.barColors?.[0] || "#3b82f6";
  const p1Color = options.customMetricColors?.[p1MetricId] || options.barColors?.[1] || "#1d4ed8";

  let seriesList: any[];

  if (isMergedBars) {
    // ------------------------------------------------------------------------
    // MERGED BARS MODE: Single composite bar per model with hybrid FPS numbers
    // ------------------------------------------------------------------------
    const avgData = displayRows.map((r) => {
      const avgVal = r.metrics["average_fps"]?.value ?? 0;
      const p1Val = r.metrics[p1MetricId]?.value ?? 0;

      const avgPixelWidth = maxChartVal > 0 ? (avgVal / maxChartVal) * totalGridWidth : 0;
      const p1PixelWidth = maxChartVal > 0 ? (p1Val / maxChartVal) * totalGridWidth : 0;
      const diffPixelWidth = avgPixelWidth - p1PixelWidth;

      const avgStr = avgVal > 0 ? Number(avgVal).toFixed(1) : "";
      const isHighlighted =
        options.highlightOptions?.enabled &&
        options.highlightOptions.highlightedConfigIds?.includes(r.configuration_id);

      const labelFontSize = barLabelFontSize;
      const approxCharW = labelFontSize * 0.65;
      const avgTextWidth = avgStr.length * approxCharW + (12 * scale);

      // Hybrid Label Placement:
      // If the visible light blue portion (diffPixelWidth) is wide enough, put label inside.
      // If too narrow, flip outside to the right of the bar so it never collides with 1% Low!
      const canFitInside = diffPixelWidth >= avgTextWidth + (14 * scale);

      const itemLabel = {
        show: options.showValues && avgVal > 0,
        position: canFitInside ? ("insideRight" as const) : ("right" as const),
        distance: Math.round(8 * scale),
        color: canFitInside ? "#ffffff" : textCol,
        fontWeight: "bold",
        fontSize: labelFontSize,
        formatter: () => avgStr
      };

      if (isHighlighted && options.highlightOptions?.useHighlightBarColor) {
        const startColor =
          options.highlightOptions.highlightBarGradient?.[0] ||
          options.highlightOptions.highlightBarColor ||
          "#f59e0b";
        const endColor =
          options.highlightOptions.highlightBarGradient?.[1] || startColor;

        return {
          value: avgVal,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: startColor },
                { offset: 1, color: endColor }
              ]
            },
            borderRadius: 0
          },
          label: itemLabel
        };
      }

      return {
        value: avgVal,
        label: itemLabel
      };
    });

    const p1Data = displayRows.map((r) => {
      const p1Val = r.metrics[p1MetricId]?.value ?? 0;
      const p1PixelWidth = maxChartVal > 0 ? (p1Val / maxChartVal) * totalGridWidth : 0;
      const p1Str = p1Val > 0 ? Number(p1Val).toFixed(1) : "";

      const isHighlighted =
        options.highlightOptions?.enabled &&
        options.highlightOptions.highlightedConfigIds?.includes(r.configuration_id);

      const labelFontSize = barLabelFontSize;
      const approxCharW = labelFontSize * 0.65;
      const p1TextWidth = p1Str.length * approxCharW + (10 * scale);

      // Hybrid Label Placement:
      // If dark blue bar is wide enough, put label inside near right edge of 1% segment.
      // If too narrow, put inside left.
      const canFitInside = p1PixelWidth >= p1TextWidth + (12 * scale);

      const itemLabel = {
        show: options.showValues && p1Val > 0,
        position: canFitInside ? ("insideRight" as const) : ("insideLeft" as const),
        distance: Math.round(canFitInside ? 8 * scale : 4 * scale),
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: canFitInside ? labelFontSize : Math.max(10, labelFontSize - 2),
        formatter: () => p1Str
      };

      if (isHighlighted && options.highlightOptions?.useHighlightBarColor) {
        const deepHighlight = "#b45309";
        return {
          value: p1Val,
          itemStyle: {
            color: deepHighlight,
            borderRadius: 0
          },
          label: itemLabel
        };
      }

      return {
        value: p1Val,
        label: itemLabel
      };
    });

    seriesList = [
      {
        name: avgMetricName,
        type: "bar",
        z: 1,
        barMaxWidth: barMaxWidth,
        barCategoryGap: barCategoryGap,
        barGap: "-100%",
        animation: false,
        animationDuration: 0,
        itemStyle: {
          color: avgColor,
          borderRadius: 0
        },
        data: avgData
      },
      {
        name: p1MetricName,
        type: "bar",
        z: 2,
        barMaxWidth: barMaxWidth,
        barCategoryGap: barCategoryGap,
        barGap: "-100%",
        animation: false,
        animationDuration: 0,
        itemStyle: {
          color: p1Color,
          borderRadius: 0
        },
        data: p1Data
      }
    ];
  } else {
    // ------------------------------------------------------------------------
    // STANDARD GROUPED BARS MODE
    // ------------------------------------------------------------------------
    seriesList = activeMetrics.map((m_id, idx) => {
      const firstRowWithMetric = rows.find((r) => r.metrics[m_id]);
      const metricName =
        options.customMetricLabels?.[m_id] ||
        firstRowWithMetric?.metrics[m_id]?.metric_display_name ||
        m_id.replace(/_/g, " ").toUpperCase();

      const canonicalIndex = dataset.metric_ids.indexOf(m_id);
      const fallbackColor = defaultColors[(canonicalIndex >= 0 ? canonicalIndex : idx) % defaultColors.length];
      const color = options.customMetricColors?.[m_id] || fallbackColor;

      const data = displayRows.map((r) => {
        const m = r.metrics[m_id];
        const val = m?.value ?? 0;
        const isHighlighted =
          options.highlightOptions?.enabled &&
          options.highlightOptions.highlightedConfigIds?.includes(r.configuration_id);

        const labelStr = val > 0 ? Number(val).toFixed(1) : "";
        const barPixelWidth = maxChartVal > 0 ? (val / maxChartVal) * totalGridWidth : 0;
        const approxCharWidth = (isVertical ? 18 : 20) * scale * 0.72;
        const minRequiredWidth = (labelStr.length * approxCharWidth) + (36 * scale);
        const shouldFlipOutside = isInside && val > 0 && barPixelWidth < minRequiredWidth;

        const itemLabel = shouldFlipOutside
          ? {
              show: options.showValues,
              position: "right" as const,
              color: textCol,
              distance: Math.round(8 * scale)
            }
          : undefined;

        if (isHighlighted && options.highlightOptions?.useHighlightBarColor) {
          const startColor =
            options.highlightOptions.highlightBarGradient?.[0] ||
            options.highlightOptions.highlightBarColor ||
            "#2563eb";
          const endColor =
            options.highlightOptions.highlightBarGradient?.[1] ||
            startColor;

          return {
            value: val,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: startColor },
                  { offset: 1, color: endColor }
                ]
              },
              borderRadius: 0
            },
            ...(itemLabel ? { label: itemLabel } : {})
          };
        }

        if (itemLabel) {
          return {
            value: val,
            label: itemLabel
          };
        }

        return val;
      });

      return {
        name: metricName,
        type: "bar",
        barMaxWidth: barMaxWidth,
        barCategoryGap: barCategoryGap,
        barGap: "0%",
        animation: false,
        animationDuration: 0,
        itemStyle: {
          color: color,
          borderRadius: 0
        },
        markLine:
          idx === 0 &&
          options.highlightOptions?.enabled &&
          options.highlightOptions?.useReferenceLine &&
          typeof options.highlightOptions?.referenceLineValue === "number"
            ? {
                symbol: ["none", "none"],
                silent: true,
                data: [
                  {
                    xAxis: options.highlightOptions.referenceLineValue,
                    lineStyle: {
                      color: options.highlightOptions.referenceLineColor || "#eab308",
                      width: Math.max(2, Math.round(2.5 * scale)),
                      type: "solid"
                    },
                    label: {
                      show: true,
                      formatter:
                        options.highlightOptions.referenceLineLabel ||
                        `${options.highlightOptions.referenceLineValue}`,
                      position: "insideEndTop",
                      color: options.highlightOptions.referenceLineColor || "#eab308",
                      fontWeight: "bold",
                      fontSize: Math.round((isVertical ? 16 : 17) * fontScale)
                    }
                  }
                ]
              }
            : undefined,
        label: {
          show: options.showValues,
          position: isInside ? "insideRight" : "right",
          formatter: (params: any) => {
            const val =
              params.data && typeof params.data === "object" && "value" in params.data
                ? params.data.value
                : params.value;
            if (val === undefined || val === null) return "";
            return val > 0 ? Number(val).toFixed(1) : "";
          },
          fontSize: barLabelFontSize,
          fontWeight: "bold",
          color: isInside ? "#ffffff" : textCol,
          distance: Math.round((isInside ? 14 : 12) * scale)
        },
        data: data
      };
    });
  }

  const defaultLogoWidth = isVertical ? 140 : 170;
  const defaultOffsetX = isVertical ? 10 : 12;
  const defaultOffsetY = isVertical ? 12 : 10;

  const rawWidth = isVertical
    ? (options.logoWidth_9_16 ?? options.logoWidth ?? defaultLogoWidth)
    : (options.logoWidth_16_9 ?? options.logoWidth ?? defaultLogoWidth);

  const rawOffsetX = isVertical
    ? (options.logoOffsetX_9_16 ?? defaultOffsetX)
    : (options.logoOffsetX_16_9 ?? options.logoOffsetX ?? defaultOffsetX);

  const rawOffsetY = isVertical
    ? (options.logoOffsetY_9_16 ?? defaultOffsetY)
    : (options.logoOffsetY_16_9 ?? options.logoOffsetY ?? defaultOffsetY);

  const logoWidth = Math.round(rawWidth * (isVertical ? 1.5 : 1.65) * scale);
  const logoAspect = options.logoAspectRatio || 2.7778;
  const logoHeight = Math.round(logoWidth / logoAspect);
  const isLogoLeft = options.logoPosition === "top-left";
  const offsetX = Math.round(rawOffsetX * 1.8 * scale);
  const offsetY = Math.round(rawOffsetY * 1.8 * scale);
  const cornerSize = Math.round((isVertical ? 85 : 100) * scale);

  const subtitle = options.subtitle || "AVERAGE & 1% LOW FPS (HIGHER IS BETTER)";
  const titleText = options.title || dataset.benchmark_name.toUpperCase();
  const subColor = options.subtitleColor || "#e63946";

  const highlightGraphics: any[] = [];
  if (options.highlightOptions?.enabled && rows.length > 0) {
    const rowsCount = displayRows.length;
    const gridHeight = height - gridTop - gridBottom;
    const rowHeight = gridHeight / rowsCount;

    displayRows.forEach((r, idx) => {
      if (options.highlightOptions?.highlightedConfigIds?.includes(r.configuration_id)) {
        const yTop = gridTop + (rowsCount - 1 - idx) * rowHeight;
        const rowH = rowHeight;

        if (options.highlightOptions.useRowBackgroundShade) {
          highlightGraphics.push({
            type: "rect",
            z: 0,
            silent: true,
            shape: {
              x: 0,
              y: yTop,
              width: width,
              height: rowH
            },
            style: {
              fill:
                options.highlightOptions.rowShadeColor ||
                (isLight ? "rgba(37, 99, 235, 0.10)" : "rgba(37, 99, 235, 0.15)")
            }
          });
        }

        if (options.highlightOptions.useRowDividingLine) {
          const lineColor =
            options.highlightOptions.dividingLineColor ||
            (isLight ? "rgba(37, 99, 235, 0.45)" : "rgba(37, 99, 235, 0.55)");
          const lineWidth = Math.max(1, Math.round(1.5 * scale));

          highlightGraphics.push(
            {
              type: "line",
              z: 10,
              silent: true,
              shape: { x1: 0, y1: yTop, x2: width, y2: yTop },
              style: { stroke: lineColor, lineWidth: lineWidth }
            },
            {
              type: "line",
              z: 10,
              silent: true,
              shape: { x1: 0, y1: yTop + rowH, x2: width, y2: yTop + rowH },
              style: { stroke: lineColor, lineWidth: lineWidth }
            }
          );
        }
      }
    });
  }

  let baseModelFontSize: number;
  let baseModelLineHeight: number;
  if (isVertical) {
    if (displayRows.length >= 36) {
      baseModelFontSize = 13;
      baseModelLineHeight = 16;
    } else if (displayRows.length >= 26) {
      baseModelFontSize = 14.5;
      baseModelLineHeight = 18;
    } else if (displayRows.length >= 18) {
      baseModelFontSize = 16.5;
      baseModelLineHeight = 20;
    } else if (displayRows.length >= 12) {
      baseModelFontSize = 18.5;
      baseModelLineHeight = 22.5;
    } else if (displayRows.length <= 6) {
      baseModelFontSize = 17;
      baseModelLineHeight = 21;
    } else {
      baseModelFontSize = 18;
      baseModelLineHeight = 22;
    }
    if (options.labelFontSize && options.labelFontSize !== 11) {
      baseModelFontSize = Math.round(options.labelFontSize * 1.35);
      baseModelLineHeight = Math.round(baseModelFontSize * 1.25);
    }
  } else {
    if (displayRows.length >= 35) {
      baseModelFontSize = 13;
      baseModelLineHeight = 16;
    } else if (displayRows.length >= 24) {
      baseModelFontSize = 14.5;
      baseModelLineHeight = 18;
    } else if (displayRows.length >= 16) {
      baseModelFontSize = 15.5;
      baseModelLineHeight = 19;
    } else if (displayRows.length <= 6) {
      baseModelFontSize = 17;
      baseModelLineHeight = 21;
    } else {
      baseModelFontSize = 16.5;
      baseModelLineHeight = 20;
    }
    if (options.labelFontSize && options.labelFontSize !== 11) {
      baseModelFontSize = Math.round(options.labelFontSize * 1.3);
      baseModelLineHeight = Math.round(baseModelFontSize * 1.25);
    }
  }
  const modelFontSize = Math.round(baseModelFontSize * fontScale);
  const modelLineHeight = Math.round(baseModelLineHeight * fontScale);

  return {
    animation: false,
    animationDuration: 0,
    backgroundColor: bgCol,
    textStyle: {
      fontFamily: options.fontFamily || "'Open Sans', Inter, system-ui, sans-serif"
    },
    title: {
      text: titleText,
      subtext: subtitle,
      left: "center",
      top: titleTop,
      itemGap: titleItemGap,
      textStyle: {
        fontFamily: options.headerFontFamily || "'Open Sans Condensed', 'Open Sans', 'Inter', sans-serif",
        color: textCol,
        fontSize: titleFontSize,
        fontWeight: "bold",
        letterSpacing: Math.round(2 * fontScale),
        lineHeight: titleHeight
      },
      subtextStyle: {
        fontFamily: options.headerFontFamily || "'Open Sans Condensed', 'Open Sans', 'Inter', sans-serif",
        color: subColor,
        fontSize: subtitleFontSize,
        fontWeight: "bold",
        letterSpacing: Math.round(1.5 * fontScale),
        lineHeight: subtitleHeight
      }
    },
    legend: {
      top: legendTop,
      left: "center",
      orient: "horizontal",
      type: "scroll",
      textStyle: {
        color: textCol,
        fontSize: legendFontSize,
        fontWeight: "600"
      },
      itemGap: Math.round((isVertical ? 20 : 24) * scale),
      itemWidth: Math.round((isVertical ? 20 : 24) * scale),
      itemHeight: Math.round((isVertical ? 11 : 13) * scale),
      icon: "rect",
      data: isMergedBars
        ? [
            { name: p1MetricName, itemStyle: { color: p1Color } },
            { name: avgMetricName, itemStyle: { color: avgColor } }
          ]
        : undefined
    },
    grid: {
      left: gridLeft,
      right: gridRight,
      top: gridTop,
      bottom: gridBottom,
      containLabel: false
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: isMergedBars
        ? (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return "";
            const rowName = params[0].name || "";
            let html = `<div style="font-weight:bold;margin-bottom:4px;font-size:13px;">${rowName}</div>`;
            const p1Item = params.find((p: any) => p.seriesName === p1MetricName);
            const avgItem = params.find((p: any) => p.seriesName === avgMetricName);
            if (avgItem) {
              html += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:2px;">
                <span style="display:inline-block;width:10px;height:10px;background:${avgColor};"></span>
                <span>${avgMetricName}: <b>${Number(avgItem.value).toFixed(1)} FPS</b></span>
              </div>`;
            }
            if (p1Item) {
              html += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;">
                <span style="display:inline-block;width:10px;height:10px;background:${p1Color};"></span>
                <span>${p1MetricName}: <b>${Number(p1Item.value).toFixed(1)} FPS</b></span>
              </div>`;
            }
            return html;
          }
        : undefined
    },
    xAxis: {
      type: "value",
      splitNumber: 5,
      splitLine: {
        lineStyle: {
          color: gridLineCol,
          type: "dashed"
        }
      },
      axisLabel: {
        color: subTextCol,
        fontWeight: "600",
        fontSize: Math.round((isVertical ? 18 : 17) * fontScale),
        formatter: (val: number) => Math.round(val).toLocaleString()
      }
    },
    yAxis: {
      type: "category",
      data: categoryNames.map((n) => formatTwoLineLabel(n, isVertical ? (displayRows.length <= 6 ? 22 : 16) : 26)),
      axisLine: {
        show: true,
        lineStyle: { color: isLight ? "#cbd5e1" : "#334155" }
      },
      axisTick: { show: false },
      axisLabel: {
        color: (val: string, index: number) => {
          const row = displayRows[index];
          const isHighlighted =
            options.highlightOptions?.enabled &&
            row &&
            options.highlightOptions.highlightedConfigIds?.includes(row.configuration_id);
          if (isHighlighted && options.highlightOptions?.useHighlightBarColor) {
            return (
              options.highlightOptions.highlightBarGradient?.[0] ||
              options.highlightOptions.highlightBarColor ||
              "#2563eb"
            );
          }
          return textCol;
        },
        fontSize: modelFontSize,
        fontWeight: "bold",
        lineHeight: modelLineHeight,
        align: "right",
        margin: Math.round((isVertical ? 8 : 12) * fontScale),
        width: Math.max(120, gridLeft - Math.round((isVertical ? 14 : 24) * fontScale)),
        overflow: "truncate"
      }
    },
    graphic: [
      ...highlightGraphics,
      ...(options.showDecorations && !isLogoLeft
        ? [
            {
              type: "polygon",
              shape: {
                points: [
                  [0, 0],
                  [cornerSize, 0],
                  [0, cornerSize]
                ]
              },
              style: { fill: "#0052cc" },
              silent: true,
              z: 1
            }
          ]
        : []),
      ...(options.showDecorations
        ? [
            {
              type: "polygon",
              right: 0,
              bottom: 0,
              shape: {
                points: [
                  [cornerSize, cornerSize],
                  [0, cornerSize],
                  [cornerSize, 0]
                ]
              },
              style: { fill: "#e60000" },
              silent: true,
              z: 1
            }
          ]
        : []),
      ...(options.logoUrl
        ? [
            {
              type: "image",
              id: "brand-logo",
              left: isLogoLeft ? offsetX : undefined,
              right: !isLogoLeft ? offsetX : undefined,
              top: offsetY,
              z: 100,
              style: {
                image: options.logoUrl,
                width: logoWidth,
                height: logoHeight
              }
            }
          ]
        : [
            {
              type: "group",
              left: isLogoLeft ? offsetX : undefined,
              right: !isLogoLeft ? offsetX : undefined,
              top: offsetY,
              z: 100,
              children: [
                {
                  type: "text",
                  style: {
                    text: options.publicationLogoText || "GADGET PILIPINAS",
                    font: `900 ${Math.round((isVertical ? 16 : 18) * scale)}px Inter, sans-serif`,
                    fill: isLight ? "#1e293b" : "#f8fafc"
                  }
                },
                {
                  type: "text",
                  top: Math.round(20 * scale),
                  style: {
                    text: "TESTED & VERIFIED",
                    font: `700 ${Math.round((isVertical ? 10 : 11) * scale)}px Inter, sans-serif`,
                    fill: isLight ? "#94a3b8" : "#64748b"
                  }
                }
              ]
            }
          ])
    ],
    series: seriesList
  };
}

async function preloadImage(url: string): Promise<void> {
  if (!url) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export async function renderChartToDataUrl(
  dataset: GroupedBenchmarkDataset,
  options: ChartDesignOptions,
  config: ExportConfig
): Promise<string> {
  const { width, height } = getExportDimensions(config.aspectRatio, config.resolution);
  const isVertical = config.aspectRatio === "9:16";

  if (options.logoUrl) {
    try {
      await preloadImage(options.logoUrl);
    } catch {}
  }

  if (typeof document !== "undefined" && (document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {}
  }

  const container = document.createElement("div");
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0px";
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-9999";
  document.body.appendChild(container);

  const chart = echarts.init(container, null, {
    renderer: "canvas",
    width,
    height,
    devicePixelRatio: 1
  });

  const chartOption = buildExportEchartsOption(dataset, options, width, height, isVertical);
  chartOption.animation = false;
  chartOption.animationDuration = 0;
  chartOption.animationDurationUpdate = 0;

  chart.setOption(chartOption, { notMerge: true, lazyUpdate: false });

  await new Promise<void>((resolve) => {
    let finished = false;
    const finishHandler = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };
    chart.on("finished", finishHandler);
    setTimeout(finishHandler, 150);
  });

  const mimeType =
    config.format === "jpg"
      ? "image/jpeg"
      : config.format === "webp"
      ? "image/webp"
      : "image/png";

  const bgCol = options.theme === "light" ? "#ffffff" : "#0d1b2a";
  let dataUrl = "";

  try {
    const renderedCanvas = (chart as any).renderToCanvas({
      backgroundColor: bgCol,
      pixelRatio: 1
    }) as HTMLCanvasElement;
    if (renderedCanvas && typeof renderedCanvas.toDataURL === "function") {
      dataUrl = renderedCanvas.toDataURL(mimeType, 0.95);
    }
  } catch (err) {
    console.warn("renderToCanvas fallback:", err);
  }

  if (!dataUrl) {
    dataUrl = chart.getDataURL({
      type: config.format === "jpg" ? "jpeg" : "png",
      pixelRatio: 1,
      backgroundColor: bgCol
    });
  }

  chart.dispose();
  document.body.removeChild(container);

  return dataUrl;
}

export function buildChartFileName(
  productName?: string,
  gameOrTitle?: string,
  resolutionOrFormat: string = "",
  formatOrExportPhrase?: ExportFormat | string,
  exportPhrase?: string
): string {
  const isRes = /^(1080p|1440p|4k|2160p|720p)/i.test(resolutionOrFormat.trim());
  let res = "";
  let fmt: ExportFormat = "webp";
  let phrase = "";

  if (isRes) {
    res = resolutionOrFormat.trim();
    if (formatOrExportPhrase === "jpg" || formatOrExportPhrase === "png" || formatOrExportPhrase === "webp") {
      fmt = formatOrExportPhrase as ExportFormat;
      phrase = exportPhrase || "";
    } else {
      phrase = (formatOrExportPhrase as string) || "";
    }
  } else {
    // Legacy 4-arg signature: (productName, benchmarkTitle, format, exportPhrase)
    if (resolutionOrFormat === "jpg" || resolutionOrFormat === "png" || resolutionOrFormat === "webp") {
      fmt = resolutionOrFormat as ExportFormat;
    }
    phrase = (formatOrExportPhrase as string) || exportPhrase || "";
  }

  const cleanProduct = (productName || "").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  const cleanTag = phrase.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  let cleanGame = (gameOrTitle || "Benchmark").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  cleanGame = cleanGame.replace(/\s+4K$/i, " 4k");

  let cleanRes = res.trim();
  if (cleanRes.toLowerCase() === "4k") {
    cleanRes = "4k";
  }

  // Avoid duplicating resolution if cleanGame already ends with it
  if (cleanRes && cleanGame.toLowerCase().endsWith(cleanRes.toLowerCase())) {
    cleanRes = "";
  }

  // Pattern: 'product' + 'tag' - 'game' + ' resolution (e.g. TEST123 REVIEW - F1 25 1080p.webp)
  const prefix = [cleanProduct, cleanTag].filter(Boolean).join(" ");
  const suffix = [cleanGame, cleanRes].filter(Boolean).join(" ");
  const ext = fmt === "jpg" ? "jpg" : fmt === "png" ? "png" : "webp";

  if (prefix && suffix) {
    return `${prefix} - ${suffix}.${ext}`.replace(/\s+/g, " ").trim();
  } else if (suffix) {
    return `${suffix}.${ext}`.replace(/\s+/g, " ").trim();
  } else if (prefix) {
    return `${prefix}.${ext}`.replace(/\s+/g, " ").trim();
  }
  return `Benchmark.${ext}`;
}

export async function exportSingleChart(
  dataset: GroupedBenchmarkDataset,
  options: ChartDesignOptions,
  config: ExportConfig,
  productName?: string,
  customFileName?: string,
  exportPhrase?: string,
  gameName?: string,
  resolution?: string
): Promise<void> {
  const dataUrl = await renderChartToDataUrl(dataset, options, config);
  const title = gameName || options.title || dataset.benchmark_name;
  const res = resolution || dataset.version || "";
  const name =
    customFileName ||
    buildChartFileName(productName, title, res, config.format, exportPhrase);

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportTriResolutionZip(
  datasets: { "1080p"?: GroupedBenchmarkDataset; "1440p"?: GroupedBenchmarkDataset; "4K"?: GroupedBenchmarkDataset },
  options: ChartDesignOptions,
  config: ExportConfig,
  gameName: string,
  productName?: string,
  exportPhrase?: string
): Promise<void> {
  const zip = new JSZip();
  const resolutions: ("1080p" | "1440p" | "4K")[] = ["1080p", "1440p", "4K"];

  for (const res of resolutions) {
    const ds = datasets[res];
    if (!ds || ds.rows.length === 0) continue;

    const resOptions: ChartDesignOptions = {
      ...options,
      title: options.title || gameName.toUpperCase(),
      subtitle: options.subtitle || `AVERAGE & 1% LOW FPS - ${res.toUpperCase()}`
    };

    const dataUrl = await renderChartToDataUrl(ds, resOptions, config);
    const base64Data = dataUrl.split(",")[1];
    const fileName = buildChartFileName(productName, gameName, res, config.format, exportPhrase);
    zip.file(fileName, base64Data, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanGame = gameName.replace(/[\\/:*?"<>|]/g, "-");
  link.download = `${cleanGame} - Tri-Resolution Charts (${config.aspectRatio.replace(":", "x")}_${config.resolution}).zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
