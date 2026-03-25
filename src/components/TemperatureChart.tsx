"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

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

interface TemperatureChartProps {
  temperatures: TemperatureReading[];
  weather: WeatherReading[];
  range: string;
  visibleSeries: Record<string, boolean>;
}

const SERIES_CONFIG: Record<
  string,
  { color: string; label: string; strokeWidth: number }
> = {
  pool: { color: "#3893f5", label: "Pool", strokeWidth: 2.5 },
  spa: { color: "#f59e0b", label: "Spa", strokeWidth: 2.5 },
  solar: { color: "#f97316", label: "Solar", strokeWidth: 1.5 },
  air: { color: "#6b7280", label: "Air", strokeWidth: 1.5 },
  weather: { color: "#a855f7", label: "Weather Station", strokeWidth: 1.5 },
  forecast: { color: "#a855f7", label: "Forecast", strokeWidth: 1.5 },
};

function formatTime(timestamp: number, range: string): string {
  const date = new Date(timestamp * 1000);
  if (range === "24h" || range === "72h") {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (range === "90d") {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTooltipTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ChartDataPoint = Record<string, number | undefined>;

// Downsample data points for performance
function downsample(
  data: ChartDataPoint[],
  maxPoints: number
): ChartDataPoint[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

export default function TemperatureChart({
  temperatures,
  weather,
  range,
  visibleSeries,
}: TemperatureChartProps) {
  const chartData = useMemo(() => {
    // Bucket all data by timestamp (rounded to nearest interval)
    const bucketMap: Record<string, number> = {
      "24h": 15,
      "72h": 30,
      "week": 60,
      "2week": 60,
      "30d": 180,
      "90d": 360,
    };
    const bucketMinutes = bucketMap[range] || 60;
    const bucketSize = bucketMinutes * 60;
    const buckets = new Map<
      number,
      Record<string, number | undefined>
    >();

    // Add temperature readings
    for (const r of temperatures) {
      const key = Math.round(r.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(key)) buckets.set(key, { timestamp: key });
      const bucket = buckets.get(key)!;
      bucket[r.source] = r.value;
    }

    // Add weather readings
    for (const w of weather) {
      const key = Math.round(w.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(key)) buckets.set(key, { timestamp: key });
      const bucket = buckets.get(key)!;
      if (w.isForecast) {
        bucket.forecast = w.tempF;
      } else {
        bucket.weather = w.tempF;
      }
    }

    const sorted = Array.from(buckets.values()).sort(
      (a, b) => (a.timestamp as number) - (b.timestamp as number)
    );

    const maxPointsMap: Record<string, number> = {
      "24h": 96,
      "72h": 144,
      "week": 336,
      "2week": 336,
      "30d": 240,
      "90d": 360,
    };
    const maxPoints = maxPointsMap[range] || 336;
    return downsample(sorted, maxPoints);
  }, [temperatures, weather, range]);

  const now = Math.floor(Date.now() / 1000);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
        <p className="text-gray-400 text-sm">No historical data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(t) => formatTime(t, range)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}°`}
            width={45}
          />
          <Tooltip
            labelFormatter={(t) => formatTooltipTime(t as number)}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}°F`,
              SERIES_CONFIG[name]?.label || name,
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => SERIES_CONFIG[value]?.label || value}
          />

          {/* Now line */}
          <ReferenceLine
            x={now}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
            label=""
          />

          {/* Forecast area (shaded) */}
          {visibleSeries.forecast && (
            <Area
              type="monotone"
              dataKey="forecast"
              stroke={SERIES_CONFIG.forecast.color}
              fill={SERIES_CONFIG.forecast.color}
              fillOpacity={0.1}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
            />
          )}

          {/* Temperature lines */}
          {visibleSeries.pool && (
            <Line
              type="monotone"
              dataKey="pool"
              stroke={SERIES_CONFIG.pool.color}
              strokeWidth={SERIES_CONFIG.pool.strokeWidth}
              dot={false}
              connectNulls
            />
          )}
          {visibleSeries.spa && (
            <Line
              type="monotone"
              dataKey="spa"
              stroke={SERIES_CONFIG.spa.color}
              strokeWidth={SERIES_CONFIG.spa.strokeWidth}
              dot={false}
              connectNulls
            />
          )}
          {visibleSeries.solar && (
            <Line
              type="monotone"
              dataKey="solar"
              stroke={SERIES_CONFIG.solar.color}
              strokeWidth={SERIES_CONFIG.solar.strokeWidth}
              dot={false}
              connectNulls
            />
          )}
          {visibleSeries.air && (
            <Line
              type="monotone"
              dataKey="air"
              stroke={SERIES_CONFIG.air.color}
              strokeWidth={SERIES_CONFIG.air.strokeWidth}
              dot={false}
              connectNulls
            />
          )}
          {visibleSeries.weather && (
            <Line
              type="monotone"
              dataKey="weather"
              stroke={SERIES_CONFIG.weather.color}
              strokeWidth={SERIES_CONFIG.weather.strokeWidth}
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
