import { NextResponse } from "next/server";
import { getDatabaseStats, pruneOldReadings } from "@/lib/db";

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        temperatureCount: 0,
        weatherCount: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
        dbSizeBytes: 0,
        retentionDays: 90,
        demo: true,
      });
    }

    const stats = getDatabaseStats();
    const retentionDays = parseInt(process.env.RETENTION_DAYS || "90");

    return NextResponse.json({
      ...stats,
      retentionDays,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get database stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST to trigger manual pruning
export async function POST() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ pruned: 0, demo: true });
    }

    const retentionDays = parseInt(process.env.RETENTION_DAYS || "90");
    const pruned = pruneOldReadings(retentionDays);

    return NextResponse.json({ pruned, retentionDays });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prune data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
