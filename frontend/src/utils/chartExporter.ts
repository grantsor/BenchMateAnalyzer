import * as echarts from "echarts";
import JSZip from "jszip";
import { GroupedBenchmarkDataset } from "../api/client";
import type { ChartDesignOptions } from "../components/charts/BenchmarkChart";
import { GRADIENT_PRESETS, samplePresetColors } from "./colorPalettes";
import { getSplitExportTargets, AvailableExportTarget } from "./benchmarkSubGroups";

export function formatTwoLineLabel(text: string, maxCharsPerLine: number = 28): string {
  if (!text) return "";
  if (text.includes("\n")) return text;
  if (text.includes(" - ")) {
    const parts = text.split(" - ");
    return `${parts[0].trim()}\n${parts.slice(1).join(" - ").trim()}`;
  }
  if (text.length <= maxCharsPerLine) return text;

  // Find nearest space to midpoint
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

export type ExportAspectRatio = "16:9" | "9:16";
export type ExportResolution = "720p" | "1080p" | "4k";
export type ExportFormat = "png" | "jpg" | "webp";

export interface ExportConfig {
  aspectRatio: ExportAspectRatio;
  resolution: ExportResolution;
  format: ExportFormat;
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

/**
 * Builds an Apache ECharts option object mathematically scaled for any target width and height.
 */
export function buildExportEchartsOption(
  dataset: GroupedBenchmarkDataset,
  options: ChartDesignOptions,
  width: number,
  height: number,
  isVertical: boolean
): any {
  // Base scale calculation
  const baseDim = isVertical ? 1080 : 1920;
  const scale = width / baseDim;

  // Filter and sort rows
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

  // Active metrics for this dataset
  const validSelected = options.selectedMetrics.filter((m) => dataset.metric_ids.includes(m));
  const activeMetrics = validSelected.length > 0 ? validSelected : dataset.metric_ids;

  if (options.sortOrder === "desc" || options.sortOrder === "asc") {
    const primaryMetric = activeMetrics[0] || dataset.metric_ids[0];
    rows = [...rows].sort((a, b) => {
      const valA = a.metrics[primaryMetric]?.value ?? 0;
      const valB = b.metrics[primaryMetric]?.value ?? 0;
      return options.sortOrder === "desc" ? valB - valA : valA - valB;
    });
  } else if (options.sortOrder === "alpha") {
    rows = [...rows].sort((a, b) => {
      const nameA = (options.customConfigLabels?.[a.configuration_id] || a.display_name || "").toLowerCase();
      const nameB = (options.customConfigLabels?.[b.configuration_id] || b.display_name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  const isLight = options.theme === "light";
  const bgCol = isLight ? "#ffffff" : "#0d1b2a";
  const textCol = isLight ? "#1a202c" : "#f7fafc";
  const subTextCol = isLight ? "#4a5568" : "#a0aec0";
  const gridLineCol = isLight ? "#edf2f7" : "#1e293b";
  const defaultColors =
    options.barColors && options.barColors.length > 0
      ? options.barColors
      : ["#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#8338ec", "#3a86ff"];

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

  // Series List
  // Determine if score values should be inside bars:
  // "inside" -> always inside
  // "outside" -> always outside
  // "auto" (default) -> inside if entries/configurations > 5, outside if <= 5
  const isInside =
    options.barValuePosition === "inside"
      ? true
      : options.barValuePosition === "outside"
      ? false
      : rows.length > 5;
  // Grid margins
  const userGridLeft = options.gridLeftMargin ?? (isVertical ? 135 : 240);
  const gridLeft = Math.round((isVertical ? userGridLeft * 2.2 : userGridLeft * 1.85) * scale);
  const gridRight = Math.round((isInside ? 70 : (isVertical ? 110 : 150)) * scale);
  const gridTop = Math.round((isVertical ? 150 : 150) * scale);
  const gridBottom = Math.round((isVertical ? 75 : 65) * scale);
  const totalGridWidth = Math.max(100, width - gridLeft - gridRight);

  // Maximum metric value across all rows to accurately compute bar pixel length
  let maxChartVal = 1;
  displayRows.forEach((r) => {
    activeMetrics.forEach((m_id) => {
      const v = r.metrics[m_id]?.value ?? 0;
      if (v > maxChartVal) maxChartVal = v;
    });
  });

  const barMaxWidth = Math.round((isVertical ? 58 : 52) * scale);
  const seriesList = activeMetrics.map((m_id, idx) => {
    const firstRowWithMetric = rows.find((r) => r.metrics[m_id]);
    const metricName =
      options.customMetricLabels?.[m_id] ||
      firstRowWithMetric?.metrics[m_id]?.metric_display_name ||
      m_id.replace(/_/g, " ");

    const canonicalIndex = dataset.metric_ids.indexOf(m_id);
    const fallbackColor = defaultColors[(canonicalIndex >= 0 ? canonicalIndex : idx) % defaultColors.length];
    const color = options.customMetricColors?.[m_id] || fallbackColor;

    const data = displayRows.map((r) => {
      const m = r.metrics[m_id];
      const val = m?.value ?? 0;
      const isHighlighted =
        options.highlightOptions?.enabled &&
        options.highlightOptions.highlightedConfigIds?.includes(r.configuration_id);

      // Adaptive label placement: If inside position is active, but this specific bar
      // is too short to display the whole number amount without clipping, flip it outside!
      const isPercent =
        firstRowWithMetric?.metrics[m_id]?.unit === "%" ||
        dataset.benchmark_id.includes("summary");
      const labelStr = isPercent
        ? `${Number(val).toFixed(1)}%`
        : val > 0
        ? val.toLocaleString()
        : "";

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
          "#f97316";
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
      barCategoryGap: "25%",
      barGap: "0%", // No white spacing or gaps between adjacent bars
      animation: false,
      animationDuration: 0,
      itemStyle: {
        color: color,
        borderRadius: 0 // Crisp square ends on bars, no rounded caps
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
                    fontSize: Math.round((isVertical ? 15 : 17) * scale)
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
          const isPercent =
            firstRowWithMetric?.metrics[m_id]?.unit === "%" ||
            dataset.benchmark_id.includes("summary");
          if (isPercent) {
            return `${Number(val).toFixed(1)}%`;
          }
          return val > 0 ? val.toLocaleString() : "";
        },
        fontSize: Math.round((isVertical ? 18 : 20) * scale),
        fontWeight: "bold",
        color: isInside ? "#ffffff" : textCol,
        distance: Math.round((isInside ? 14 : 12) * scale)
      },
      data: data
    };
  });

  // Logo parameters
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

  // Symmetrical solid corner decorations sizing (compact, solid pure colors, no white cutouts)
  const cornerSize = Math.round((isVertical ? 85 : 100) * scale);

  // Direction subtitle
  const firstRow = dataset.rows[0];
  const firstMetricKey = dataset.metric_ids[0];
  const hib = firstRow?.metrics[firstMetricKey]?.higher_is_better ?? true;
  const autoSub = hib ? "HIGHER IS BETTER" : "LOWER IS BETTER";
  const subtitle = options.subtitle || autoSub;
  const titleText = options.title || dataset.benchmark_name.toUpperCase();
  const subColor = options.subtitleColor || (subtitle.includes("LOWER") ? "#f59e0b" : "#e63946");

  // Highlight Graphics (row background shade and dividing lines)
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
                (isLight ? "rgba(249, 115, 22, 0.12)" : "rgba(249, 115, 22, 0.18)")
            }
          });
        }

        if (options.highlightOptions.useRowDividingLine) {
          const lineColor =
            options.highlightOptions.dividingLineColor ||
            (isLight ? "rgba(249, 115, 22, 0.5)" : "rgba(249, 115, 22, 0.6)");
          const lineWidth = Math.max(1, Math.round(1.5 * scale));

          highlightGraphics.push(
            {
              type: "line",
              z: 10,
              silent: true,
              shape: {
                x1: 0,
                y1: yTop,
                x2: width,
                y2: yTop
              },
              style: {
                stroke: lineColor,
                lineWidth: lineWidth
              }
            },
            {
              type: "line",
              z: 10,
              silent: true,
              shape: {
                x1: 0,
                y1: yTop + rowH,
                x2: width,
                y2: yTop + rowH
              },
              style: {
                stroke: lineColor,
                lineWidth: lineWidth
              }
            }
          );
        }
      }
    });
  }

  return {
    animation: false,
    animationDuration: 0,
    backgroundColor: bgCol,
    textStyle: {
      fontFamily: options.fontFamily || "Inter, system-ui, sans-serif"
    },
    title: {
      text: titleText,
      subtext: subtitle,
      left: "center",
      top: Math.round((isVertical ? 30 : 26) * scale),
      itemGap: Math.max(4, Math.round(6 * scale)), // Close spacing between title and subtitle
      textStyle: {
        fontFamily: options.headerFontFamily || "'Open Sans Condensed', 'Open Sans', 'Inter', sans-serif",
        color: textCol,
        fontSize: Math.round((isVertical ? 36 : 40) * scale),
        fontWeight: "bold",
        letterSpacing: Math.round(2 * scale)
      },
      subtextStyle: {
        fontFamily: options.headerFontFamily || "'Open Sans Condensed', 'Open Sans', 'Inter', sans-serif",
        color: subColor,
        fontSize: Math.round((isVertical ? 18 : 20) * scale),
        fontWeight: "bold",
        letterSpacing: Math.round(1.5 * scale)
      }
    },
    legend: {
      top: Math.round((isVertical ? 96 : 94) * scale),
      left: "center",
      orient: "horizontal",
      type: "scroll", // Strictly keep legend items on a single row in export
      textStyle: {
        color: textCol,
        fontSize: Math.round((isVertical ? 17 : 19) * scale),
        fontWeight: "600"
      },
      itemGap: Math.round((isVertical ? 20 : 28) * scale),
      itemWidth: Math.round((isVertical ? 22 : 26) * scale),
      itemHeight: Math.round((isVertical ? 12 : 14) * scale),
      icon: "rect"
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
      axisPointer: { type: "shadow" }
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
        fontSize: Math.round((isVertical ? 15 : 17) * scale),
        formatter: (val: number) => {
          const isPercent =
            dataset.benchmark_id.includes("summary") ||
            dataset.rows[0]?.metrics[dataset.metric_ids[0]]?.unit === "%";
          if (isPercent) {
            return `${val}%`;
          }
          return val.toLocaleString();
        }
      }
    },
    yAxis: {
      type: "category",
      data: categoryNames.map((n) => formatTwoLineLabel(n, isVertical ? 20 : 28)),
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
              "#f97316"
            );
          }
          return textCol;
        },
        fontSize: Math.round((options.labelFontSize ?? 11) * (isVertical ? 1.75 : 1.95) * scale),
        fontWeight: "bold",
        lineHeight: Math.round((isVertical ? 24 : 27) * scale),
        align: "right",
        margin: Math.round((isVertical ? 16 : 20) * scale),
        width: gridLeft - Math.round(32 * scale),
        overflow: "break"
      }
    },
    graphic: [
      ...highlightGraphics,
      // Solid Blue Top-Left Corner Graphic (Pure solid blue, sharp right triangle)
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
              style: {
                fill: "#0052cc"
              },
              silent: true,
              z: 1
            }
          ]
        : []),
      // Solid Red Bottom-Right Corner Graphic (Exact symmetrical reflection, sharp right triangle)
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
              style: {
                fill: "#e60000"
              },
              silent: true,
              z: 1
            }
          ]
        : []),
      // Publication Logo Image or Text Fallback
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

/**
 * Preload an image URL into browser cache before ECharts canvas drawing.
 */
async function preloadImage(url: string): Promise<void> {
  if (!url) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Renders an ECharts chart to a high-resolution Data URL on a headless canvas.
 */
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
    } catch (e) {
      console.warn("Logo preload skipped:", e);
    }
  }

  if (typeof document !== "undefined" && (document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {}
  }

  // Create temporary container attached to DOM with opacity: 0 (not visibility: hidden, so browsers layout & paint)
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

  // Set option synchronously with notMerge: true and lazyUpdate: false
  chart.setOption(chartOption, { notMerge: true, lazyUpdate: false });

  // Await chart render completion
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

/**
 * Generates a clean, uniform chart file name: "[CATEGORY] Product Name [Phrase] - Benchmark.ext"
 */
export function buildChartFileName(
  productName?: string,
  benchmarkTitle?: string,
  format: ExportFormat = "webp",
  componentCategory?: string,
  includeCategoryTag: boolean = false,
  exportPhrase?: string
): string {
  const cleanProduct = (productName || "Product").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  const cleanPhrase = exportPhrase
    ? exportPhrase.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").replace(/-+$/, "").trim()
    : "";
  const productWithPhrase = cleanPhrase ? `${cleanProduct} ${cleanPhrase}` : cleanProduct;
  const cleanTitle = (benchmarkTitle || "Benchmark").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  const ext = format === "jpg" ? "jpg" : format === "webp" ? "webp" : "png";
  const prefix = includeCategoryTag && componentCategory ? `[${componentCategory.toUpperCase()}] ` : "";
  const raw = `${prefix}${productWithPhrase} - ${cleanTitle}.${ext}`;
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Downloads a single benchmark chart file in the user's chosen aspect ratio, resolution, and format.
 */
export async function exportSingleChart(
  dataset: GroupedBenchmarkDataset,
  options: ChartDesignOptions,
  config: ExportConfig,
  productName?: string,
  customFileName?: string,
  componentCategory?: string,
  includeCategoryTag?: boolean,
  exportPhrase?: string
): Promise<void> {
  const dataUrl = await renderChartToDataUrl(dataset, options, config);
  const title = options.title || dataset.benchmark_name;
  const name =
    customFileName ||
    buildChartFileName(productName, title, config.format, componentCategory, includeCategoryTag, exportPhrase);

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Batch exports ALL benchmarks in the project as individual image files directly downloaded sequentially (NO ZIP).
 */
export async function batchExportIndividualCharts(
  datasetsOrTargets: GroupedBenchmarkDataset[] | AvailableExportTarget[],
  options: ChartDesignOptions,
  config: ExportConfig,
  productName?: string,
  onProgress?: (current: number, total: number, benchmarkName: string) => void,
  componentCategory?: string,
  includeCategoryTag?: boolean,
  splitSubCharts: boolean = true,
  exportPhrase?: string
): Promise<void> {
  const isCustomTargets = datasetsOrTargets.length > 0 && "exportKey" in datasetsOrTargets[0];
  const targets = isCustomTargets
    ? (datasetsOrTargets as AvailableExportTarget[])
    : splitSubCharts
    ? getSplitExportTargets(datasetsOrTargets as GroupedBenchmarkDataset[])
    : (datasetsOrTargets as GroupedBenchmarkDataset[]).map((ds) => {
        const firstMetricKey = ds.metric_ids[0];
        const hib = ds.rows[0]?.metrics[firstMetricKey]?.higher_is_better ?? true;
        return {
          dataset: ds,
          subGroup: undefined,
          exportKey: ds.benchmark_id,
          effectiveTitle: ds.benchmark_name,
          effectiveSubtitle: hib ? "HIGHER IS BETTER" : "LOWER IS BETTER",
          selectedMetrics: ds.metric_ids
        };
      });

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const ds = target.dataset;
    if (onProgress) {
      onProgress(i + 1, targets.length, target.effectiveTitle);
    }

    // Recalculate colors if a gradient preset is active
    let batchBarColors = options.barColors;
    let batchMetricColors: Record<string, string> = { ...(options.customMetricColors || {}) };
    if (options.activeGradientPreset && options.activeGradientPreset !== "custom") {
      const preset = GRADIENT_PRESETS.find((p) => p.id === options.activeGradientPreset);
      if (preset) {
        batchBarColors = samplePresetColors(preset.colors, target.selectedMetrics.length);
        batchMetricColors = {};
        target.selectedMetrics.forEach((mId, idx) => {
          batchMetricColors[mId] = batchBarColors[idx % batchBarColors.length];
        });
      }
    }

    const title = target.effectiveTitle;

    const batchExcludedSet = new Set(options.manuallyExcludedConfigIds || []);
    const validConfigIds = ds.rows
      .map((r) => r.configuration_id)
      .filter((id) => !batchExcludedSet.has(id));

    const dsOptions: ChartDesignOptions = {
      ...options,
      title: title,
      subtitle: target.effectiveSubtitle,
      selectedMetrics: target.selectedMetrics,
      selectedConfigIds: validConfigIds.length > 0 ? validConfigIds : ds.rows.map((r) => r.configuration_id),
      barColors: batchBarColors,
      customMetricColors: batchMetricColors
    };

    const dataUrl = await renderChartToDataUrl(ds, dsOptions, config);
    const fileName = buildChartFileName(productName, title, config.format, componentCategory, includeCategoryTag, exportPhrase);

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Stagger downloads by 300ms so browser download manager handles each cleanly
    if (i < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/**
 * Batch exports ALL benchmarks in the project into a single packaged ZIP archive.
 */
export async function batchExportAllCharts(
  datasetsOrTargets: GroupedBenchmarkDataset[] | AvailableExportTarget[],
  options: ChartDesignOptions,
  config: ExportConfig,
  productName?: string,
  onProgress?: (current: number, total: number, benchmarkName: string) => void,
  componentCategory?: string,
  includeCategoryTag?: boolean,
  splitSubCharts: boolean = true,
  exportPhrase?: string
): Promise<void> {
  const zip = new JSZip();

  const isCustomTargets = datasetsOrTargets.length > 0 && "exportKey" in datasetsOrTargets[0];
  const targets = isCustomTargets
    ? (datasetsOrTargets as AvailableExportTarget[])
    : splitSubCharts
    ? getSplitExportTargets(datasetsOrTargets as GroupedBenchmarkDataset[])
    : (datasetsOrTargets as GroupedBenchmarkDataset[]).map((ds) => {
        const firstMetricKey = ds.metric_ids[0];
        const hib = ds.rows[0]?.metrics[firstMetricKey]?.higher_is_better ?? true;
        return {
          dataset: ds,
          subGroup: undefined,
          exportKey: ds.benchmark_id,
          effectiveTitle: ds.benchmark_name,
          effectiveSubtitle: hib ? "HIGHER IS BETTER" : "LOWER IS BETTER",
          selectedMetrics: ds.metric_ids
        };
      });

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const ds = target.dataset;
    if (onProgress) {
      onProgress(i + 1, targets.length, target.effectiveTitle);
    }

    // Recalculate colors if a gradient preset is active
    let batchBarColors = options.barColors;
    let batchMetricColors: Record<string, string> = { ...(options.customMetricColors || {}) };
    if (options.activeGradientPreset && options.activeGradientPreset !== "custom") {
      const preset = GRADIENT_PRESETS.find((p) => p.id === options.activeGradientPreset);
      if (preset) {
        batchBarColors = samplePresetColors(preset.colors, target.selectedMetrics.length);
        batchMetricColors = {};
        target.selectedMetrics.forEach((mId, idx) => {
          batchMetricColors[mId] = batchBarColors[idx % batchBarColors.length];
        });
      }
    }

    const title = target.effectiveTitle;

    const batchExcludedSet = new Set(options.manuallyExcludedConfigIds || []);
    const validConfigIds = ds.rows
      .map((r) => r.configuration_id)
      .filter((id) => !batchExcludedSet.has(id));

    const dsOptions: ChartDesignOptions = {
      ...options,
      title: title,
      subtitle: target.effectiveSubtitle,
      selectedMetrics: target.selectedMetrics,
      selectedConfigIds: validConfigIds.length > 0 ? validConfigIds : ds.rows.map((r) => r.configuration_id),
      barColors: batchBarColors,
      customMetricColors: batchMetricColors
    };

    const dataUrl = await renderChartToDataUrl(ds, dsOptions, config);
    const base64Data = dataUrl.split(",")[1];

    const fileName = buildChartFileName(productName, title, config.format, componentCategory, includeCategoryTag, exportPhrase);
    zip.file(fileName, base64Data, { base64: true });
  }

  const cleanProduct = (productName || "Product").trim().replace(/[\\/:*?"<>|]/g, "-");
  const cleanPhrase = exportPhrase
    ? exportPhrase.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").replace(/-+$/, "").trim()
    : "";
  const fullProduct = cleanPhrase ? `${cleanProduct} ${cleanPhrase}` : cleanProduct;
  const prefix = includeCategoryTag && componentCategory ? `[${componentCategory.toUpperCase()}] ` : "";
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}${fullProduct} - All Benchmarks (${config.aspectRatio.replace(":", "x")}_${config.resolution}).zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
