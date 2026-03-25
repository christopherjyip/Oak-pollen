"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with recharts
const TemperatureChart = dynamic(
  () => import("@/components/TemperatureChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface TemperatureReading {
  timestamp: number;
  source: string;
  value: number;
}

interface WeatherReading {
  timestamp: number;
  tempF: number;
  humidity: number;
  windMph: number;
  conditions: string;
  isForecast: boolean;
}

interface HistoryData {
  temperatures: TemperatureReading[];
  weather: WeatherReading[];
  weatherConfigured: boolean;
  range: string;
}

const RANGES = [
  { key: "24h", label: "24H" },
  { key: "72h", label: "3D" },
  { key: "week", label: "1W" },
  { key: "2week", label: "2W" },
  { key: "30d", label: "1M" },
  { key: "90d", label: "3M" },
];

const SERIES = [
  { key: "pool", label: "Pool", color: "#3893f5" },
  { key: "spa", label: "Spa", color: "#f59e0b" },
  { key: "solar", label: "Solar", color: "#f97316" },
  { key: "air", label: "Air", color: "#6b7280" },
  { key: "weather", label: "Weather", color: "#a855f7" },
  { key: "forecast", label: "Forecast", color: "#a855f7" },
];

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 h-[352px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-pool-200 border-t-pool-600 rounded-full animate-spin" />
    </div>
  );
}

function StatCard({
  label,
  current,
  high,
  low,
  color,
}: {
  label: string;
  current: string;
  high: string;
  low: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{current}</div>
      <div className="flex gap-3 mt-1 text-xs text-gray-400">
        <span>H: {high}</span>
        <span>L: {low}</span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    pool: true,
    spa: true,
    solar: false,
    air: true,
    weather: true,
    forecast: true,
  });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pool/history?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Compute stats from data
  function getStats(source: string) {
    if (!data) return { current: "--", high: "--", low: "--" };
    const readings = data.temperatures.filter((r) => r.source === source);
    if (readings.length === 0) return { current: "--", high: "--", low: "--" };

    const values = readings.map((r) => r.value);
    const current = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);

    return {
      current: `${current.toFixed(1)}°`,
      high: `${high.toFixed(1)}°`,
      low: `${low.toFixed(1)}°`,
    };
  }

  const toggleSeries = (key: string) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              range === r.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Series Toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggleSeries(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              visibleSeries[s.key]
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: visibleSeries[s.key] ? s.color : "#d1d5db",
              }}
            />
            {s.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {error ? (
        <div className="bg-red-50 rounded-2xl p-4 text-red-600 text-sm mb-4">
          {error}
        </div>
      ) : loading ? (
        <ChartSkeleton />
      ) : data ? (
        <TemperatureChart
          temperatures={data.temperatures}
          weather={data.weather}
          range={range}
          visibleSeries={visibleSeries}
        />
      ) : null}

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {visibleSeries.pool && (
            <StatCard label="Pool" color="#3893f5" {...getStats("pool")} />
          )}
          {visibleSeries.spa && (
            <StatCard label="Spa" color="#f59e0b" {...getStats("spa")} />
          )}
          {visibleSeries.solar && (
            <StatCard label="Solar" color="#f97316" {...getStats("solar")} />
          )}
          {visibleSeries.air && (
            <StatCard label="Air" color="#6b7280" {...getStats("air")} />
          )}
        </div>
      )}

      {/* Weather Station Info */}
      {data?.weatherConfigured && data.weather.length > 0 && (
        <div className="mt-4 bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            <span className="text-sm font-medium text-purple-700">
              Weather Station
            </span>
          </div>
          {(() => {
            const latestWeather = data.weather
              .filter((w) => !w.isForecast)
              .slice(-1)[0];
            const forecastCount = data.weather.filter(
              (w) => w.isForecast
            ).length;
            return (
              <div className="text-xs text-purple-600 space-y-0.5">
                {latestWeather && (
                  <p>
                    Current: {latestWeather.tempF.toFixed(1)}°F |{" "}
                    {latestWeather.humidity}% humidity |{" "}
                    {latestWeather.windMph.toFixed(0)} mph wind
                  </p>
                )}
                {forecastCount > 0 && (
                  <p className="opacity-70">
                    {forecastCount}h forecast shown (dashed purple line)
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
