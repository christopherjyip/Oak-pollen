import { NextRequest, NextResponse } from "next/server";
import { setHeatMode, setSetPoint } from "@/lib/screenlogic";
import { HeatMode } from "@/lib/types";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bodyId, heatMode, setPoint } = body;

    if (typeof bodyId !== "number" || (bodyId !== 0 && bodyId !== 1)) {
      return NextResponse.json(
        { error: "bodyId must be 0 (pool) or 1 (spa)" },
        { status: 400 }
      );
    }

    if (heatMode !== undefined) {
      if (![0, 1, 2, 3].includes(heatMode)) {
        return NextResponse.json(
          { error: "heatMode must be 0 (off), 1 (solar), 2 (solar preferred), or 3 (heater)" },
          { status: 400 }
        );
      }
      await setHeatMode(bodyId, heatMode as HeatMode);
    }

    if (setPoint !== undefined) {
      if (typeof setPoint !== "number" || setPoint < 40 || setPoint > 104) {
        return NextResponse.json(
          { error: "setPoint must be a number between 40 and 104" },
          { status: 400 }
        );
      }
      await setSetPoint(bodyId, setPoint);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update temperature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
