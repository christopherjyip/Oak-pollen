import { WeatherReading } from "./db";
import { loadSettings, saveSettings } from "./settings";

const WU_BASE = "https://api.weather.com/v2/pws";

export interface WeatherUndergroundConfig {
  apiKey: string;
  stationId: string;
  lat: number | null;
  lon: number | null;
}

function getConfig(): WeatherUndergroundConfig | null {
  const settings = loadSettings();
  const { apiKey, stationId, lat, lon } = settings.weather;
  if (!apiKey || !stationId) return null;
  return { apiKey, stationId, lat, lon };
}

export function isWeatherConfigured(): boolean {
  return getConfig() !== null;
}

export function getStationId(): string {
  return loadSettings().weather.stationId;
}

// Look up a station's lat/lon from its current observations
export async function resolveStationLocation(
  apiKey: string,
  stationId: string
): Promise<{ lat: number; lon: number } | null> {
  const url = `${WU_BASE}/observations/current?stationId=${stationId}&format=json&units=e&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const obs = data.observations?.[0];
    if (obs?.lat != null && obs?.lon != null) {
      return { lat: obs.lat, lon: obs.lon };
    }
    return null;
  } catch {
    return null;
  }
}

// Validate that an API key + station ID work
export async function validateWeatherConfig(
  apiKey: string,
  stationId: string
): Promise<{ valid: boolean; stationName?: string; lat?: number; lon?: number; error?: string }> {
  const url = `${WU_BASE}/observations/current?stationId=${stationId}&format=json&units=e&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) return { valid: false, error: "Invalid API key" };
      if (res.status === 404) return { valid: false, error: "Station not found" };
      return { valid: false, error: `API error (${res.status})` };
    }
    const data = await res.json();
    const obs = data.observations?.[0];
    if (!obs) return { valid: false, error: "No data from station" };

    return {
      valid: true,
      stationName: obs.neighborhood || stationId,
      lat: obs.lat,
      lon: obs.lon,
    };
  } catch (err) {
    return { valid: false, error: "Failed to connect to Weather Underground" };
  }
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

export async function fetchForecast(): Promise<WeatherReading[]> {
  const config = getConfig();
  if (!config) return [];

  // Need lat/lon for forecast — auto-resolve if missing
  let { lat, lon } = config;
  if (lat == null || lon == null) {
    const location = await resolveStationLocation(config.apiKey, config.stationId);
    if (!location) return [];
    lat = location.lat;
    lon = location.lon;
    // Cache the resolved coordinates so we don't look them up every time
    saveSettings({ weather: { ...config, lat, lon } });
  }

  const url = `https://api.weather.com/v3/wx/forecast/hourly/2day?apiKey=${config.apiKey}&geocode=${lat},${lon}&format=json&units=e`;

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
