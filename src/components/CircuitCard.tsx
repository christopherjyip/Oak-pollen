"use client";

import { PoolCircuit } from "@/lib/types";

interface CircuitCardProps {
  circuit: PoolCircuit;
  onToggle: (circuitId: string, state: boolean) => void;
}

const CIRCUIT_ICONS: Record<string, string> = {
  Pool: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  Spa: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  "Pool Light": "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  "Spa Light": "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  Cleaner: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  Jets: "M13 10V3L4 14h7v7l9-11h-7z",
};

const DEFAULT_ICON =
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z";

export default function CircuitCard({ circuit, onToggle }: CircuitCardProps) {
  const icon = CIRCUIT_ICONS[circuit.name] || DEFAULT_ICON;

  return (
    <button
      onClick={() => onToggle(circuit.id, !circuit.state)}
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 active:scale-95 ${
        circuit.state
          ? "bg-pool-500 text-white shadow-lg shadow-pool-500/30"
          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
      }`}
    >
      {circuit.freeze && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400" title="Freeze protect" />
      )}
      <svg
        className="w-8 h-8 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      <span className="text-xs font-medium">{circuit.name}</span>
      <span
        className={`text-[10px] mt-0.5 ${
          circuit.state ? "text-white/70" : "text-gray-400"
        }`}
      >
        {circuit.state ? "ON" : "OFF"}
      </span>
    </button>
  );
}
