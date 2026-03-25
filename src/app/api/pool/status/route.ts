import { NextResponse } from "next/server";
import { getPoolStatus } from "@/lib/intellicenter";

export async function GET() {
  try {
    const status = await getPoolStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get pool status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
