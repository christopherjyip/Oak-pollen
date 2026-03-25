import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath =
    process.env.DB_PATH || path.join(process.cwd(), "data", "pool-history.db");

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  const fs = require("fs");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS temperature_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      source TEXT NOT NULL,
      value REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_temp_source_time
      ON temperature_readings(source, timestamp);

    CREATE TABLE IF NOT EXISTS weather_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      temp_f REAL,
      humidity REAL,
      wind_mph REAL,
      conditions TEXT,
      is_forecast INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_weather_station_time
      ON weather_cache(station_id, timestamp);
  `);

  return db;
}

export interface TemperatureReading {
  timestamp: number;
  source: string;
  value: number;
}

export interface WeatherReading {
  timestamp: number;
  tempF: number;
  humidity: number;
  windMph: number;
  conditions: string;
  isForecast: boolean;
}

// ── Temperature Recording ──

export function recordTemperature(source: string, value: number): void {
  if (value === 0) return; // Skip zero readings
  const db = getDb();
  db.prepare(
    "INSERT INTO temperature_readings (timestamp, source, value) VALUES (?, ?, ?)"
  ).run(Math.floor(Date.now() / 1000), source, value);
}

export function recordTemperatures(
  readings: { source: string; value: number }[]
): void {
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO temperature_readings (timestamp, source, value) VALUES (?, ?, ?)"
  );
  const now = Math.floor(Date.now() / 1000);

  const insertMany = db.transaction(() => {
    for (const r of readings) {
      if (r.value !== 0) {
        insert.run(now, r.source, r.value);
      }
    }
  });
  insertMany();
}

export function getTemperatureHistory(
  source: string,
  fromTimestamp: number,
  toTimestamp: number
): TemperatureReading[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT timestamp, source, value FROM temperature_readings
       WHERE source = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`
    )
    .all(fromTimestamp, source, toTimestamp) as TemperatureReading[];
}

export function getAllTemperatureHistory(
  fromTimestamp: number,
  toTimestamp: number
): TemperatureReading[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT timestamp, source, value FROM temperature_readings
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`
    )
    .all(fromTimestamp, toTimestamp) as TemperatureReading[];
}

// ── Weather Cache ──

export function cacheWeatherReadings(
  stationId: string,
  readings: WeatherReading[]
): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO weather_cache (station_id, timestamp, temp_f, humidity, wind_mph, conditions, is_forecast)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction(() => {
    for (const r of readings) {
      insert.run(
        stationId,
        r.timestamp,
        r.tempF,
        r.humidity,
        r.windMph,
        r.conditions,
        r.isForecast ? 1 : 0
      );
    }
  });
  insertMany();
}

export function getCachedWeather(
  stationId: string,
  fromTimestamp: number,
  toTimestamp: number
): WeatherReading[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT timestamp, temp_f, humidity, wind_mph, conditions, is_forecast
       FROM weather_cache
       WHERE station_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`
    )
    .all(stationId, fromTimestamp, toTimestamp) as Array<{
    timestamp: number;
    temp_f: number;
    humidity: number;
    wind_mph: number;
    conditions: string;
    is_forecast: number;
  }>;

  return rows.map((r) => ({
    timestamp: r.timestamp,
    tempF: r.temp_f,
    humidity: r.humidity,
    windMph: r.wind_mph,
    conditions: r.conditions,
    isForecast: r.is_forecast === 1,
  }));
}

export function getLatestWeatherTimestamp(stationId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT MAX(timestamp) as latest FROM weather_cache
       WHERE station_id = ? AND is_forecast = 0`
    )
    .get(stationId) as { latest: number | null } | undefined;
  return row?.latest ?? 0;
}

// ── Demo Data Generation ──

export function generateDemoHistory(): {
  temperatures: TemperatureReading[];
  weather: WeatherReading[];
} {
  const now = Math.floor(Date.now() / 1000);
  const twoWeeksAgo = now - 14 * 24 * 60 * 60;
  const interval = 15 * 60; // 15-minute intervals

  const temperatures: TemperatureReading[] = [];
  const weather: WeatherReading[] = [];

  for (let t = twoWeeksAgo; t <= now; t += interval) {
    const date = new Date(t * 1000);
    const hour = date.getHours();
    const dayOfYear = Math.floor(
      (t - twoWeeksAgo) / (24 * 60 * 60)
    );

    // Simulate diurnal temperature cycle
    const timeOfDayFactor = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 0.5;
    const dayTrend = Math.sin((dayOfYear / 14) * Math.PI) * 3;

    // Air temperature: ~65-85°F with daily cycle
    const airBase = 75 + dayTrend;
    const airTemp =
      airBase + timeOfDayFactor * 15 + (Math.random() - 0.5) * 3;

    // Pool temperature: ~78-85°F, slower to change
    const poolBase = 82 + dayTrend * 0.3;
    const poolTemp =
      poolBase + timeOfDayFactor * 3 + (Math.random() - 0.5) * 0.5;

    // Spa temperature: spikes to ~100-104°F during evening use
    const spaInUse = hour >= 17 && hour <= 20 && (date.getDay() === 0 || date.getDay() === 6);
    const spaTemp = spaInUse
      ? 101 + (Math.random() - 0.5) * 2
      : poolBase - 2 + timeOfDayFactor * 2;

    // Solar temperature: high during day, drops at night
    const solarTemp =
      hour >= 8 && hour <= 17
        ? airTemp + 30 + timeOfDayFactor * 20 + (Math.random() - 0.5) * 5
        : airTemp - 5 + (Math.random() - 0.5) * 2;

    temperatures.push(
      { timestamp: t, source: "air", value: Math.round(airTemp * 10) / 10 },
      { timestamp: t, source: "pool", value: Math.round(poolTemp * 10) / 10 },
      { timestamp: t, source: "spa", value: Math.round(spaTemp * 10) / 10 },
      { timestamp: t, source: "solar", value: Math.round(solarTemp * 10) / 10 }
    );

    // Weather data
    const weatherTemp = airTemp + (Math.random() - 0.5) * 2;
    const humidity = 55 + timeOfDayFactor * -15 + (Math.random() - 0.5) * 10;
    const windMph = 5 + Math.random() * 10 + (hour > 12 ? 5 : 0);

    weather.push({
      timestamp: t,
      tempF: Math.round(weatherTemp * 10) / 10,
      humidity: Math.round(Math.max(20, Math.min(95, humidity))),
      windMph: Math.round(windMph * 10) / 10,
      conditions: hour >= 6 && hour <= 18 ? "Clear" : "Clear Night",
      isForecast: false,
    });
  }

  // Add forecast data (next 48 hours)
  for (let t = now; t <= now + 48 * 60 * 60; t += 60 * 60) {
    const date = new Date(t * 1000);
    const hour = date.getHours();
    const timeOfDayFactor = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 0.5;
    const weatherTemp = 76 + timeOfDayFactor * 15 + (Math.random() - 0.5) * 3;

    weather.push({
      timestamp: t,
      tempF: Math.round(weatherTemp * 10) / 10,
      humidity: Math.round(50 + Math.random() * 20),
      windMph: Math.round((5 + Math.random() * 8) * 10) / 10,
      conditions: hour >= 6 && hour <= 18 ? "Partly Cloudy" : "Clear Night",
      isForecast: true,
    });
  }

  return { temperatures, weather };
}
