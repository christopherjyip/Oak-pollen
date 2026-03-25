"use client";

import { ChemistryData } from "@/lib/types";

interface ChemistryPanelProps {
  chemistry: ChemistryData;
}

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
}

function Gauge({ label, value, unit, min, max, idealMin, idealMax }: GaugeProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const isInRange = value >= idealMin && value <= idealMax;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isInRange
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isInRange ? "Normal" : "Alert"}
        </span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {value}
        <span className="text-sm text-gray-400 ml-1">{unit}</span>
      </div>
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isInRange ? "bg-green-500" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>{min}</span>
        <span>
          Ideal: {idealMin}-{idealMax}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function TankLevel({ label, level }: { label: string; level: number }) {
  const maxBars = 6;
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <span className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: maxBars }).map((_, i) => (
          <div
            key={i}
            className={`h-6 flex-1 rounded ${
              i < level
                ? level <= 2
                  ? "bg-red-400"
                  : "bg-pool-500"
                : "bg-gray-100"
            }`}
          />
        ))}
      </div>
      <div className="text-[10px] text-gray-400 mt-1">
        {level}/{maxBars}
      </div>
    </div>
  );
}

export default function ChemistryPanel({ chemistry }: ChemistryPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Gauge
          label="pH"
          value={chemistry.pH}
          unit=""
          min={6.8}
          max={8.2}
          idealMin={7.2}
          idealMax={7.6}
        />
        <Gauge
          label="ORP"
          value={chemistry.orp}
          unit="mV"
          min={400}
          max={900}
          idealMin={650}
          idealMax={750}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Gauge
          label="Salt"
          value={chemistry.saltPPM}
          unit="PPM"
          min={0}
          max={6000}
          idealMin={2700}
          idealMax={3400}
        />
        <Gauge
          label="Alkalinity"
          value={chemistry.alkalinity}
          unit="ppm"
          min={0}
          max={200}
          idealMin={80}
          idealMax={120}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Gauge
          label="Calcium"
          value={chemistry.calcium}
          unit="ppm"
          min={0}
          max={600}
          idealMin={200}
          idealMax={400}
        />
        <Gauge
          label="CYA"
          value={chemistry.cyanuricAcid}
          unit="ppm"
          min={0}
          max={100}
          idealMin={30}
          idealMax={50}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TankLevel label="pH Tank" level={chemistry.pHTankLevel} />
        <TankLevel label="ORP Tank" level={chemistry.orpTankLevel} />
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          Saturation Index
        </span>
        <div className="text-2xl font-semibold tabular-nums mt-1">
          {chemistry.saturation > 0 ? "+" : ""}
          {chemistry.saturation.toFixed(1)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {chemistry.saturation >= -0.3 && chemistry.saturation <= 0.3
            ? "Balanced"
            : chemistry.saturation > 0.3
            ? "Scaling tendency"
            : "Corrosive tendency"}
        </div>
      </div>
    </div>
  );
}
