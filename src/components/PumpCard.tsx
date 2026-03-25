"use client";

import { PumpStatus } from "@/lib/types";

interface PumpCardProps {
  pump: PumpStatus;
}

export default function PumpCard({ pump }: PumpCardProps) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        pump.isRunning
          ? "bg-green-50 border border-green-200"
          : "bg-white border border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{pump.name}</h4>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            pump.isRunning
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {pump.isRunning ? "Running" : "Off"}
        </span>
      </div>
      {pump.isRunning && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {pump.rpm}
            </div>
            <div className="text-[10px] text-gray-500 uppercase">RPM</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {pump.watts}
            </div>
            <div className="text-[10px] text-gray-500 uppercase">Watts</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {pump.gpm}
            </div>
            <div className="text-[10px] text-gray-500 uppercase">GPM</div>
          </div>
        </div>
      )}
      <div className="text-[10px] text-gray-400 mt-2">{pump.pumpType}</div>
    </div>
  );
}
