"use client";

import { usePoolStatus } from "@/hooks/usePoolStatus";

export default function CircuitsPage() {
  const { status, loading, error, toggleCircuit } = usePoolStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-pool-200 border-t-pool-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="px-4 pt-6">
        <p className="text-red-500">{error || "Unable to load circuits"}</p>
      </div>
    );
  }

  const bodyCircuits = status.circuits.filter(
    (c) => c.subtype === "POOL" || c.subtype === "SPA"
  );
  const featureCircuits = status.circuits.filter(
    (c) => c.subtype !== "POOL" && c.subtype !== "SPA"
  );

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Circuits</h1>

      {/* Body circuits (Pool/Spa) */}
      {bodyCircuits.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Bodies
          </h2>
          <div className="space-y-2">
            {bodyCircuits.map((circuit) => (
              <div
                key={circuit.id}
                className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{circuit.name}</h3>
                  <p className="text-xs text-gray-500">{circuit.id}</p>
                </div>
                <button
                  onClick={() => toggleCircuit(circuit.id, !circuit.state)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    circuit.state ? "bg-pool-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      circuit.state ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature circuits */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Features
        </h2>
        <div className="space-y-2">
          {featureCircuits.map((circuit) => (
            <div
              key={circuit.id}
              className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200"
            >
              <div>
                <h3 className="font-medium text-gray-900">{circuit.name}</h3>
                <p className="text-xs text-gray-500">
                  {circuit.id}
                  {circuit.freeze && " (Freeze protect)"}
                </p>
              </div>
              <button
                onClick={() => toggleCircuit(circuit.id, !circuit.state)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  circuit.state ? "bg-pool-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    circuit.state ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
