"use client";

import { usePoolStatus } from "@/hooks/usePoolStatus";
import TemperatureCard, { AirTempBadge } from "@/components/TemperatureCard";
import CircuitCard from "@/components/CircuitCard";
import PumpCard from "@/components/PumpCard";

export default function Dashboard() {
  const { status, loading, error, toggleCircuit, updateTemperature } =
    usePoolStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pool-200 border-t-pool-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Connecting to pool...</p>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Connection Error</h2>
          <p className="text-sm text-gray-500">{error || "Unable to reach pool controller"}</p>
        </div>
      </div>
    );
  }

  const { temperatures, circuits, pumps } = status;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pool</h1>
          <div className="flex items-center gap-2 mt-1">
            <AirTempBadge airTemp={temperatures.airTemp} units={temperatures.units} />
            {status.freezeMode && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Freeze Protect
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {temperatures.bodies.map((body) =>
            body.state ? (
              <span
                key={body.id}
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  body.subtype === "SPA"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-pool-100 text-pool-700"
                }`}
              >
                {body.name} Active
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Temperature Cards */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {temperatures.bodies.map((body) => (
          <TemperatureCard
            key={body.id}
            body={body}
            units={temperatures.units}
            onSetPointChange={(bodyId, setPoint) =>
              updateTemperature(bodyId, { setPoint })
            }
            onHeatModeChange={(bodyId, heatMode) =>
              updateTemperature(bodyId, { heatMode })
            }
          />
        ))}
      </div>

      {/* Quick Circuit Controls */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Circuits
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {circuits.map((circuit) => (
            <CircuitCard
              key={circuit.id}
              circuit={circuit}
              onToggle={toggleCircuit}
            />
          ))}
        </div>
      </div>

      {/* Pumps */}
      {pumps.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pumps
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {pumps.map((pump) => (
              <PumpCard key={pump.id} pump={pump} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
