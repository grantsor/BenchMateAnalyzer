import React, { useRef, useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { GroupedBenchmarkDataset, ChartDesignOptions } from "../../types/capframex";
import { buildExportEchartsOption } from "../../utils/capframex/chartExporter";

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
    width: isVertical ? 560 : 960,
    height: isVertical ? 995 : 540
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
  }, [isVertical, dataset.benchmark_id, options.aspectRatio]);

  useEffect(() => {
    if (chartRef.current) {
      const instance = chartRef.current.getEchartsInstance?.();
      if (instance) {
        instance.resize();
      }
    }
  }, [dimensions, isVertical]);

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
    <div className="relative flex flex-col items-center w-full min-h-0 min-w-0">
      <div
        ref={containerRef}
        style={{ fontFamily: "'Open Sans', Inter, sans-serif" }}
        className={`relative overflow-hidden w-full ${
          isVertical ? "max-w-[560px] aspect-[9/16]" : "aspect-[16/9]"
        } ${
          isLight
            ? "bg-white border border-slate-300 text-slate-900"
            : "bg-[#0d1b2a] border border-slate-800 text-white"
        }`}
      >
        <ReactECharts
          key={`${dataset.benchmark_id}_${options.aspectRatio}_${options.theme}`}
          ref={chartRef}
          option={echartsOption}
          notMerge={true}
          lazyUpdate={false}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
};
