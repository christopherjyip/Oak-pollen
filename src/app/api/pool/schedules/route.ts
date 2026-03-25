import { NextResponse } from "next/server";
import { getSchedules } from "@/lib/screenlogic";

export async function GET() {
  try {
    const schedules = await getSchedules();
    return NextResponse.json(schedules);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
