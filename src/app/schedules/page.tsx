"use client";

import { useSchedules } from "@/hooks/usePoolStatus";
import ScheduleList from "@/components/ScheduleList";

export default function SchedulesPage() {
  const { schedules, loading, error } = useSchedules();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-pool-200 border-t-pool-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Schedules</h1>

      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recurring
            </h2>
            <ScheduleList
              schedules={schedules.filter((s) => !s.isRunOnce)}
            />
          </div>

          {schedules.some((s) => s.isRunOnce) && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Run Once
              </h2>
              <ScheduleList
                schedules={schedules.filter((s) => s.isRunOnce)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
