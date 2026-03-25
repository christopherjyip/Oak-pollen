import { NextRequest, NextResponse } from "next/server";
import {
  getAllTemperatureHistory,
  generateDemoHistory,
  getCachedWeather,
  cacheWeatherReadings,
  getLatestWeatherTimestamp,
} from "@/lib/db";
import { getStationId, isWeatherConfigured } from "@/lib/weather";

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";

    const now = Math.floor(Date.now() / 1000);
    let fromTimestamp: number;

    const rangeMap: Record<string, number> = {
      "24h": 24 * 60 * 60,
      "72h": 72 * 60 * 60,
      "week": 7 * 24 * 60 * 60,
      "2week": 14 * 24 * 60 * 60,
      "30d": 30 * 24 * 60 * 60,
      "90d": 90 * 24 * 60 * 60,
    };
    fromTimestamp = now - (rangeMap[range] || rangeMap["24h"]);

    if (isDemoMode()) {
      const demo = generateDemoHistory();

      // Filter to requested range
      const temperatures = demo.temperatures.filter(
        (r) => r.timestamp >= fromTimestamp && r.timestamp <= now
      );
      const weather = demo.weather.filter(
        (r) => r.timestamp >= fromTimestamp && r.timestamp <= now + 48 * 60 * 60
      );

      return NextResponse.json({
        temperatures,
        weather,
        weatherConfigured: true, // Demo always shows weather
        range,
      });
    }

    // Live mode
    const temperatures = getAllTemperatureHistory(fromTimestamp, now);

    let weather: ReturnType<typeof getCachedWeather> = [];
    const weatherConfigured = isWeatherConfigured();
    if (weatherConfigured) {
      const stationId = getStationId();
      weather = getCachedWeather(
        stationId,
        fromTimestamp,
        now + 48 * 60 * 60 // Include forecast
      );
    }

    return NextResponse.json({
      temperatures,
      weather,
      weatherConfigured,
      range,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
