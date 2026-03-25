"use client";

import { ScheduleEvent, DAYS_OF_WEEK } from "@/lib/types";

interface ScheduleListProps {
  schedules: ScheduleEvent[];
}

function decodeDayMask(mask: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) {
      days.push(DAYS_OF_WEEK[i]);
    }
  }
  return days;
}

function formatDays(mask: number): string {
  const days = decodeDayMask(mask);
  if (days.length === 7) return "Every day";
  if (days.length === 5 && !days.includes("Sat") && !days.includes("Sun"))
    return "Weekdays";
  if (days.length === 2 && days.includes("Sat") && days.includes("Sun"))
    return "Weekends";
  return days.join(", ");
}

export default function ScheduleList({ schedules }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>No schedules configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="bg-white rounded-2xl p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{schedule.circuitName}</h4>
            {schedule.isRunOnce && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Run Once
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {schedule.startTime} - {schedule.stopTime}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {DAYS_OF_WEEK.map((day, i) => {
              const isActive = schedule.dayMask & (1 << i);
              return (
                <span
                  key={day}
                  className={`text-[10px] w-7 h-7 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-pool-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {day.charAt(0)}
                </span>
              );
            })}
          </div>
          {schedule.heatSetPoint > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Heat to {schedule.heatSetPoint}&deg;F
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
