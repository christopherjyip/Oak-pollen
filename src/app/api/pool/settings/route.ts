import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";
import { validateWeatherConfig } from "@/lib/weather";

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function GET() {
  try {
    const settings = loadSettings();

    // Mask the API key for security (show last 4 chars)
    const maskedSettings = {
      ...settings,
      weather: {
        ...settings.weather,
        apiKey: settings.weather.apiKey
          ? `${"•".repeat(Math.max(0, settings.weather.apiKey.length - 4))}${settings.weather.apiKey.slice(-4)}`
          : "",
        hasApiKey: !!settings.weather.apiKey,
      },
      demo: isDemoMode(),
    };

    return NextResponse.json(maskedSettings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json(
        { error: "Settings cannot be changed in demo mode" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // IntelliCenter settings
    if (body.intellicenter) {
      updates.intellicenter = {};
      if (body.intellicenter.host !== undefined) {
        (updates.intellicenter as Record<string, unknown>).host = body.intellicenter.host;
      }
      if (body.intellicenter.port !== undefined) {
        (updates.intellicenter as Record<string, unknown>).port = parseInt(body.intellicenter.port);
      }
    }

    // Weather settings
    if (body.weather) {
      updates.weather = {};
      if (body.weather.apiKey !== undefined) {
        (updates.weather as Record<string, unknown>).apiKey = body.weather.apiKey;
      }
      if (body.weather.stationId !== undefined) {
        (updates.weather as Record<string, unknown>).stationId = body.weather.stationId;
        // Clear cached lat/lon when station changes — will auto-resolve on next forecast fetch
        (updates.weather as Record<string, unknown>).lat = null;
        (updates.weather as Record<string, unknown>).lon = null;
      }
    }

    // Retention
    if (body.retentionDays !== undefined) {
      updates.retentionDays = Math.max(1, Math.min(365, parseInt(body.retentionDays)));
    }

    const saved = saveSettings(updates as Parameters<typeof saveSettings>[0]);

    return NextResponse.json({ success: true, settings: saved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST to validate weather config
export async function POST(request: NextRequest) {
  try {
    const { apiKey, stationId } = await request.json();

    if (!apiKey || !stationId) {
      return NextResponse.json(
        { valid: false, error: "API key and station ID are required" },
        { status: 400 }
      );
    }

    const result = await validateWeatherConfig(apiKey, stationId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
