"use client";

import { useEffect, useRef } from "react";

type ChartInstance = {
  destroy: () => void;
};

type ChartConstructor = new (ctx: CanvasRenderingContext2D, config: Record<string, unknown>) => ChartInstance;

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

const chartJsCdnUrl = "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js";
let chartJsLoadingPromise: Promise<void> | null = null;

function loadChartJs() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Chart) {
    return Promise.resolve();
  }
  if (!chartJsLoadingPromise) {
    chartJsLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chartJsCdnUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Chart.js"));
      document.head.appendChild(script);
    });
  }
  return chartJsLoadingPromise;
}

type HalfDonutChartProps = {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  totalLabel: string;
  totalValue: string;
};

export function HalfDonutChart({ data, totalLabel, totalValue }: HalfDonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadChartJs()
      .then(() => {
        if (!isMounted || !canvasRef.current || typeof window === "undefined" || !window.Chart) {
          return;
        }
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }

        const context = canvasRef.current.getContext("2d");
        if (!context) return;

        const ChartConstructor = window.Chart;
        if (!ChartConstructor) return;

        const chart = new ChartConstructor(context, {
          type: "doughnut",
          data: {
            labels: data.map((item) => item.label),
            datasets: [
              {
                data: data.map((item) => item.value),
                backgroundColor: data.map((item) => item.color),
                borderWidth: 0,
                hoverOffset: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            rotation: 270,
            circumference: 180,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context: { label?: string; raw?: number }) => {
                    const label = context.label ?? "";
                    const value = context.raw ?? 0;
                    return `${label}: ${value} min`;
                  }
                },
                displayColors: false,
                backgroundColor: "#1f2b4d",
                titleColor: "#fff",
                bodyColor: "#cfd5e6"
              }
            }
          }
        });
        chartInstanceRef.current = chart;
      })
      .catch((error) => {
        console.error("Chart.js failed to load", error);
      });

    return () => {
      isMounted = false;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} />
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center text-center text-xs text-[#4a5f83]">
        <span className="font-semibold text-[#1f2b4d]">{totalLabel}</span>
        <span className="text-sm text-[#0c1d3c]">{totalValue}</span>
      </div>
    </div>
  );
}
