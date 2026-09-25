import React, { useRef, useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { GroupedBenchmarkDataset } from "../../api/client";
import { buildExportEchartsOption } from "../../utils/chartExporter";

export interface ChartHighlightOptions {
  enabled: boolean;
  highlightedConfigIds: string[];
  useHighlightBarColor: boolean;
  highlightBarColor: string;
  highlightBarGradient: string[];
  useRowBackgroundShade: boolean;
  rowShadeColor: string;
  useRowDividingLine: boolean;
  dividingLineColor: string;
  activePresetId?: string;
  useReferenceLine?: boolean;
  referenceLineValue?: number;
  referenceLineLabel?: string;
  referenceLineColor?: string;
}

export interface ChartDesignOptions {
  theme: "light" | "dark";
  title: string;
  subtitle: string;
  showValues: boolean;
  barColors: string[];
  fontFamily: string;
  headerFontFamily?: string;
  aspectRatio: "16:9" | "9:16" | "4:3" | "custom";
  publicationLogoText: string;
  showDecorations: boolean;
  sortOrder: "desc" | "asc" | "alpha" | "original";
  selectedMetrics: string[];
  selectedConfigIds: string[];
  manuallyExcludedConfigIds?: string[];
  customMetricLabels?: Record<string, string>;
  customConfigLabels?: Record<string, string>;
  customMetricColors?: Record<string, string>;
  customBenchmarkTitles?: Record<string, string>;
  labelFontSize?: number;
  gridLeftMargin?: number;
  barValuePosition?: "auto" | "inside" | "outside";
  logoUrl?: string;
  logoPosition?: "top-left" | "top-right";
  logoWidth?: number;
  logoWidth_16_9?: number;
  logoWidth_9_16?: number;
  logoAspectRatio?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  logoOffsetX_16_9?: number;
  logoOffsetY_16_9?: number;
  logoOffsetX_9_16?: number;
  logoOffsetY_9_16?: number;
  subtitleColor?: string;
  activeGradientPreset?: string;
  productName?: string;
  includeProductNameInLabels?: boolean;
  highlightOptions?: ChartHighlightOptions;
}

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

interface BenchmarkChartProps {
  dataset: GroupedBenchmarkDataset;
  options: ChartDesignOptions;
  onOptionsChange?: (opts: Partial<ChartDesignOptions>) => void;
}

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({
  dataset,
  options
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVertical = options.aspectRatio === "9:16";

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: isVertical ? 440 : 960,
    height: isVertical ? 782 : 540
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVertical]);

  const echartsOption = useMemo(() => {
    return buildExportEchartsOption(
      dataset,
      options,
      dimensions.width,
      dimensions.height,
      isVertical
    );
  }, [dataset, options, dimensions.width, dimensions.height, isVertical]);

  const isLight = options.theme === "light";

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Chart Canvas Card: flat rectangle matching exact export canvas with sharp 90-deg corners, no outer glow/shadow */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden transition-all duration-300 ${
          isVertical ? "max-w-[440px] w-full aspect-[9/16]" : "w-full aspect-[16/9]"
        } ${
          isLight
            ? "bg-white border border-slate-300 text-slate-900"
            : "bg-[#0d1b2a] border border-slate-800 text-white"
        }`}
      >
        {/* Apache ECharts Core (Renders canvas elements including corner decorations and publication logo) */}
        <ReactECharts
          ref={chartRef}
          option={echartsOption}
          notMerge={true}
          lazyUpdate={true}
          style={{ width: "100%", height: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
};
