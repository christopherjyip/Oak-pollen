"use client";

import { ScheduleEvent } from "@/lib/types";

interface ScheduleListProps {
  schedules: ScheduleEvent[];
}

function formatMinutes(minuteStr: string): string {
  const minutes = parseInt(minuteStr);
  if (isNaN(minutes)) return minuteStr; // Already formatted or text like "8:00 AM"
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

// IntelliCenter uses day codes like "MTWThFSaSu"
const DAY_CODES = [
  { code: "Su", label: "S" },
  { code: "M", label: "M" },
  { code: "T", label: "T" },
  { code: "W", label: "W" },
  { code: "Th", label: "T" },
  { code: "F", label: "F" },
  { code: "Sa", label: "S" },
];

function parseDays(dayStr: string): boolean[] {
  const result = [false, false, false, false, false, false, false];
  if (!dayStr) return result;

  // Check for each day code in the string
  // Must check "Th" before "T" and "Sa" before "S" to avoid partial matches
  let remaining = dayStr;
  if (remaining.includes("Th")) { result[4] = true; remaining = remaining.replace("Th", ""); }
  if (remaining.includes("Sa")) { result[5] = true; remaining = remaining.replace("Sa", ""); }
  if (remaining.includes("Su")) { result[0] = true; remaining = remaining.replace("Su", ""); }
  if (remaining.includes("M")) { result[1] = true; }
  if (remaining.includes("T")) { result[2] = true; }
  if (remaining.includes("W")) { result[3] = true; }
  if (remaining.includes("F")) { result[6] = true; }

  return result;
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
      {schedules.map((schedule) => {
        const days = parseDays(schedule.days);
        const allDays = days.every(Boolean);

        return (
          <div
            key={schedule.id}
            className="bg-white rounded-2xl p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{schedule.circuitName}</h4>
              <div className="flex gap-1">
                {schedule.isRunOnce && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Run Once
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  schedule.status === "ON"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {schedule.status}
                </span>
              </div>
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
                {formatMinutes(schedule.startTime)} - {formatMinutes(schedule.stopTime)}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {allDays ? (
                <span className="text-xs text-gray-500">Every day</span>
              ) : (
                DAY_CODES.map((day, i) => (
                  <span
                    key={i}
                    className={`text-[10px] w-7 h-7 rounded-full flex items-center justify-center ${
                      days[i]
                        ? "bg-pool-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {day.label}
                  </span>
                ))
              )}
            </div>
            {schedule.heatSetPoint > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Heat to {schedule.heatSetPoint}&deg;F
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
