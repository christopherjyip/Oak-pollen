import fs from "fs";
import path from "path";

export interface AppSettings {
  intellicenter: {
    host: string;
    port: number;
  };
  weather: {
    apiKey: string;
    stationId: string;
    // Auto-resolved from station metadata
    lat: number | null;
    lon: number | null;
  };
  retentionDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  intellicenter: {
    host: "",
    port: 6680,
  },
  weather: {
    apiKey: "",
    stationId: "",
    lat: null,
    lon: null,
  },
  retentionDays: 90,
};

function getSettingsPath(): string {
  return (
    process.env.SETTINGS_PATH ||
    path.join(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(process.cwd(), "data"), "settings.json")
  );
}

export function loadSettings(): AppSettings {
  const filePath = getSettingsPath();

  // Start with defaults
  const settings = { ...DEFAULT_SETTINGS };

  // Override with env vars if set (env vars take precedence)
  if (process.env.INTELLICENTER_HOST) {
    settings.intellicenter.host = process.env.INTELLICENTER_HOST;
  }
  if (process.env.INTELLICENTER_PORT) {
    settings.intellicenter.port = parseInt(process.env.INTELLICENTER_PORT);
  }
  if (process.env.WUNDERGROUND_API_KEY) {
    settings.weather.apiKey = process.env.WUNDERGROUND_API_KEY;
  }
  if (process.env.WUNDERGROUND_STATION_ID) {
    settings.weather.stationId = process.env.WUNDERGROUND_STATION_ID;
  }
  if (process.env.RETENTION_DAYS) {
    settings.retentionDays = parseInt(process.env.RETENTION_DAYS);
  }

  // Override with saved file settings
  try {
    if (fs.existsSync(filePath)) {
      const saved = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (saved.intellicenter?.host) settings.intellicenter.host = saved.intellicenter.host;
      if (saved.intellicenter?.port) settings.intellicenter.port = saved.intellicenter.port;
      if (saved.weather?.apiKey) settings.weather.apiKey = saved.weather.apiKey;
      if (saved.weather?.stationId) settings.weather.stationId = saved.weather.stationId;
      if (saved.weather?.lat != null) settings.weather.lat = saved.weather.lat;
      if (saved.weather?.lon != null) settings.weather.lon = saved.weather.lon;
      if (saved.retentionDays) settings.retentionDays = saved.retentionDays;
    }
  } catch {
    // File doesn't exist or is invalid, use defaults + env
  }

  return settings;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const filePath = getSettingsPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Merge with current settings
  const current = loadSettings();
  const merged: AppSettings = {
    intellicenter: {
      ...current.intellicenter,
      ...settings.intellicenter,
    },
    weather: {
      ...current.weather,
      ...settings.weather,
    },
    retentionDays: settings.retentionDays ?? current.retentionDays,
  };

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  return merged;
}
