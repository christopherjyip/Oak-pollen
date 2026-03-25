"use client";

import { usePoolStatus } from "@/hooks/usePoolStatus";
import ChemistryPanel from "@/components/ChemistryPanel";

export default function ChemistryPage() {
  const { status, loading, error } = usePoolStatus();

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
        <p className="text-red-500">{error || "Unable to load chemistry data"}</p>
      </div>
    );
  }

  if (!status.chemistry) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Chemistry</h1>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No Chemistry Data
          </h2>
          <p className="text-sm text-gray-500">
            IntelliChem or compatible chemistry controller not detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chemistry</h1>
        <span className="text-sm text-gray-500">
          Water: {status.chemistry.waterTemp}&deg;{status.temperatures.units}
        </span>
      </div>
      <ChemistryPanel chemistry={status.chemistry} />
    </div>
  );
}
