import { WeatherReading } from "./db";

const WU_BASE = "https://api.weather.com/v2/pws";

export interface WeatherUndergroundConfig {
  apiKey: string;
  stationId: string;
}

function getConfig(): WeatherUndergroundConfig | null {
  const apiKey = process.env.WUNDERGROUND_API_KEY;
  const stationId = process.env.WUNDERGROUND_STATION_ID;
  if (!apiKey || !stationId) return null;
  return { apiKey, stationId };
}

export function isWeatherConfigured(): boolean {
  return getConfig() !== null;
}

export function getStationId(): string {
  return process.env.WUNDERGROUND_STATION_ID || "";
}

interface WUObservation {
  obsTimeUtc: string;
  imperial: {
    temp: number;
    humidity: number;
    windSpeed: number;
  };
}

interface WUHistoryResponse {
  observations: WUObservation[];
}

export async function fetchHistoricalWeather(
  date: string // format: YYYYMMDD
): Promise<WeatherReading[]> {
  const config = getConfig();
  if (!config) return [];

  const url = `${WU_BASE}/history/daily?stationId=${config.stationId}&format=json&units=e&date=${date}&apiKey=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: WUHistoryResponse = await res.json();

    return (data.observations || []).map((obs) => ({
      timestamp: Math.floor(new Date(obs.obsTimeUtc).getTime() / 1000),
      tempF: obs.imperial.temp,
      humidity: obs.imperial.humidity,
      windMph: obs.imperial.windSpeed,
      conditions: "",
      isForecast: false,
    }));
  } catch {
    return [];
  }
}

interface WUForecastDay {
  fcst_valid: number;
  temp: number;
  rh: number;
  wspd: number;
  phrase_32char: string;
}

interface WUForecastResponse {
  forecasts?: WUForecastDay[];
}

export async function fetchForecast(): Promise<WeatherReading[]> {
  const config = getConfig();
  if (!config) return [];

  // Use the PWS forecast endpoint (5-day hourly)
  const url = `https://api.weather.com/v3/wx/forecast/hourly/2day?apiKey=${config.apiKey}&geocode=${process.env.WUNDERGROUND_LAT || "38.29"},${process.env.WUNDERGROUND_LON || "-122.46"}&format=json&units=e`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (!data.validTimeUtc) return [];

    const readings: WeatherReading[] = [];
    const count = Math.min(
      data.validTimeUtc.length,
      data.temperature?.length || 0
    );

    for (let i = 0; i < count; i++) {
      readings.push({
        timestamp: data.validTimeUtc[i],
        tempF: data.temperature[i],
        humidity: data.relativeHumidity?.[i] || 0,
        windMph: data.windSpeed?.[i] || 0,
        conditions: data.wxPhraseLong?.[i] || "",
        isForecast: true,
      });
    }

    return readings;
  } catch {
    return [];
  }
}
