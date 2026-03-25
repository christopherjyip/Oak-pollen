"use client";

import { PoolTemperature, HeatMode, HEAT_MODE_LABELS } from "@/lib/types";

interface TemperatureCardProps {
  label: string;
  currentTemp: number;
  setPoint: number;
  heatMode: HeatMode;
  heatStatus: boolean;
  units: string;
  isActive: boolean;
  bodyId: number;
  onSetPointChange: (bodyId: number, setPoint: number) => void;
  onHeatModeChange: (bodyId: number, heatMode: number) => void;
}

export default function TemperatureCard({
  label,
  currentTemp,
  setPoint,
  heatMode,
  heatStatus,
  units,
  isActive,
  bodyId,
  onSetPointChange,
  onHeatModeChange,
}: TemperatureCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        isActive
          ? "bg-gradient-to-br from-pool-500 to-pool-700 text-white"
          : "bg-white border border-gray-200 text-gray-900"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium uppercase tracking-wide opacity-80">
          {label}
        </h3>
        {heatStatus && (
          <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Heating
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-5xl font-light tabular-nums">
            {currentTemp}
          </span>
          <span className="text-2xl ml-1">&deg;{units}</span>
        </div>
        {isActive && (
          <div className="text-right text-sm opacity-80">
            <span>Set: {setPoint}&deg;{units}</span>
          </div>
        )}
      </div>

      {isActive && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">Set Point</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetPointChange(bodyId, setPoint - 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                  isActive
                    ? "bg-white/20 hover:bg-white/30"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                &minus;
              </button>
              <span className="text-lg font-medium w-12 text-center tabular-nums">
                {setPoint}&deg;
              </span>
              <button
                onClick={() => onSetPointChange(bodyId, setPoint + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                  isActive
                    ? "bg-white/20 hover:bg-white/30"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">Heat Mode</span>
            <select
              value={heatMode}
              onChange={(e) => onHeatModeChange(bodyId, Number(e.target.value))}
              className={`text-sm rounded-lg px-3 py-1.5 ${
                isActive
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-gray-100 text-gray-900 border-gray-200"
              } border appearance-none cursor-pointer`}
            >
              {Object.entries(HEAT_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="text-gray-900">
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

interface AirTempProps {
  temperature: PoolTemperature;
}

export function AirTempBadge({ temperature }: AirTempProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-600">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
      Air: {temperature.airTemp}&deg;{temperature.units}
    </div>
  );
}
