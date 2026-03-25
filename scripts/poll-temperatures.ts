#!/usr/bin/env node
/**
 * Temperature Polling Script for CloudKey
 *
 * Runs as a cron job every 15 minutes to:
 * 1. Query IntelliCenter for current temperatures (pool, spa, air, solar)
 * 2. Fetch Weather Underground historical data (if configured)
 * 3. Store everything in local SQLite database
 * 4. Prune readings older than 90 days
 *
 * Usage:
 *   npx tsx scripts/poll-temperatures.ts
 *
 * Cron (every 15 min):
 *   */15 * * * * cd /opt/pool-controller && npx tsx scripts/poll-temperatures.ts >> /var/log/pool-poller.log 2>&1
 */

import { Unit, FindUnits } from "node-intellicenter";
import {
  GetBodyStatus,
} from "node-intellicenter/messages";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Configuration ──
// Reads from data/settings.json (same file the app UI writes to), with env var fallbacks

function loadSettingsFile(): Record<string, any> {
  const settingsPath = process.env.SETTINGS_PATH ||
    path.join(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, "..", "data"), "settings.json");
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    }
  } catch {}
  return {};
}

const savedSettings = loadSettingsFile();

const INTELLICENTER_HOST = savedSettings.intellicenter?.host || process.env.INTELLICENTER_HOST || "";
const INTELLICENTER_PORT = savedSettings.intellicenter?.port || parseInt(process.env.INTELLICENTER_PORT || "6680");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "pool-history.db");
const RETENTION_DAYS = savedSettings.retentionDays || parseInt(process.env.RETENTION_DAYS || "90");

const WU_API_KEY = savedSettings.weather?.apiKey || process.env.WUNDERGROUND_API_KEY || "";
const WU_STATION_ID = savedSettings.weather?.stationId || process.env.WUNDERGROUND_STATION_ID || "";
const WU_LAT = savedSettings.weather?.lat || process.env.WUNDERGROUND_LAT || "";
const WU_LON = savedSettings.weather?.lon || process.env.WUNDERGROUND_LON || "";

// ── Database ──

function openDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

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

// ── IntelliCenter Query ──

function parseObjects(response: { objectList?: Array<{ objnam: string; params?: unknown }> }) {
  return (response.objectList || []).map((obj) => ({
    objnam: obj.objnam,
    params: (obj.params || {}) as Record<string, string>,
  }));
}

async function queryTemperatures(): Promise<{ source: string; value: number }[]> {
  let host = INTELLICENTER_HOST;
  let port = INTELLICENTER_PORT;

  if (!host) {
    console.log("No INTELLICENTER_HOST set, searching local network...");
    const finder = new FindUnits();
    const units = await finder.searchAsync();
    finder.close();
    if (!units || units.length === 0) {
      throw new Error("No IntelliCenter controllers found on network");
    }
    host = units[0].addressStr;
    port = units[0].port;
    console.log(`Found IntelliCenter at ${host}:${port}`);
  }

  const unit = new Unit(host, port);
  await unit.connect();

  const readings: { source: string; value: number }[] = [];

  try {
    // Get body temperatures (pool, spa)
    const bodyResponse = await unit.send(GetBodyStatus());
    for (const obj of parseObjects(bodyResponse)) {
      const subtype = (obj.params.SUBTYP || "").toLowerCase(); // "pool" or "spa"
      const temp = parseInt(obj.params.TEMP || "0");
      const lastTemp = parseInt(obj.params.LSTTMP || "0");
      const effectiveTemp = temp || lastTemp;
      if (effectiveTemp > 0 && subtype) {
        readings.push({ source: subtype, value: effectiveTemp });
      }
    }

    // Get air temperature sensor
    const airResponse = await unit.send({
      command: "GetParamList",
      messageID: `poll-air-${Date.now()}`,
      condition: "OBJTYP = SENSE AND SUBTYP = AIR",
      objectList: [{ objnam: "ALL", keys: ["PROBE"] }],
    });
    for (const obj of parseObjects(airResponse)) {
      const temp = parseInt(obj.params.PROBE || "0");
      if (temp > 0) {
        readings.push({ source: "air", value: temp });
      }
    }

    // Get solar temperature sensor
    const solarResponse = await unit.send({
      command: "GetParamList",
      messageID: `poll-solar-${Date.now()}`,
      condition: "OBJTYP = SENSE AND SUBTYP = SOLAR",
      objectList: [{ objnam: "ALL", keys: ["PROBE"] }],
    });
    for (const obj of parseObjects(solarResponse)) {
      const temp = parseInt(obj.params.PROBE || "0");
      if (temp > 0) {
        readings.push({ source: "solar", value: temp });
      }
    }
  } finally {
    unit.close();
  }

  return readings;
}

// ── Weather Underground ──

async function fetchAndCacheWeather(db: Database.Database): Promise<number> {
  if (!WU_API_KEY || !WU_STATION_ID) return 0;

  let cached = 0;

  // Fetch today's historical observations
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const histUrl = `https://api.weather.com/v2/pws/history/daily?stationId=${WU_STATION_ID}&format=json&units=e&date=${dateStr}&apiKey=${WU_API_KEY}`;

  try {
    const res = await fetch(histUrl);
    if (res.ok) {
      const data = await res.json();
      const observations = data.observations || [];

      // Check what we already have cached to avoid duplicates
      const latestRow = db
        .prepare(
          "SELECT MAX(timestamp) as latest FROM weather_cache WHERE station_id = ? AND is_forecast = 0"
        )
        .get(WU_STATION_ID) as { latest: number | null } | undefined;
      const latestCached = latestRow?.latest ?? 0;

      const insert = db.prepare(
        `INSERT INTO weather_cache (station_id, timestamp, temp_f, humidity, wind_mph, conditions, is_forecast)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      );

      const insertMany = db.transaction(() => {
        for (const obs of observations) {
          const ts = Math.floor(new Date(obs.obsTimeUtc).getTime() / 1000);
          if (ts > latestCached) {
            insert.run(
              WU_STATION_ID,
              ts,
              obs.imperial?.temp ?? null,
              obs.imperial?.humidity ?? null,
              obs.imperial?.windSpeed ?? null,
              ""
            );
            cached++;
          }
        }
      });
      insertMany();
    }
  } catch (err) {
    console.error("Failed to fetch historical weather:", err);
  }

  // Fetch 48h forecast
  if (WU_LAT && WU_LON) {
    const forecastUrl = `https://api.weather.com/v3/wx/forecast/hourly/2day?apiKey=${WU_API_KEY}&geocode=${WU_LAT},${WU_LON}&format=json&units=e`;

    try {
      const res = await fetch(forecastUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.validTimeUtc) {
          // Clear old forecast data
          db.prepare(
            "DELETE FROM weather_cache WHERE station_id = ? AND is_forecast = 1"
          ).run(WU_STATION_ID);

          const insert = db.prepare(
            `INSERT INTO weather_cache (station_id, timestamp, temp_f, humidity, wind_mph, conditions, is_forecast)
             VALUES (?, ?, ?, ?, ?, ?, 1)`
          );

          const count = Math.min(
            data.validTimeUtc.length,
            data.temperature?.length || 0
          );

          const insertMany = db.transaction(() => {
            for (let i = 0; i < count; i++) {
              insert.run(
                WU_STATION_ID,
                data.validTimeUtc[i],
                data.temperature[i],
                data.relativeHumidity?.[i] ?? null,
                data.windSpeed?.[i] ?? null,
                data.wxPhraseLong?.[i] ?? ""
              );
              cached++;
            }
          });
          insertMany();
        }
      }
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    }
  }

  return cached;
}

// ── Retention Pruning ──

function pruneOldData(db: Database.Database): number {
  const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60;

  const tempResult = db
    .prepare("DELETE FROM temperature_readings WHERE timestamp < ?")
    .run(cutoff);
  const weatherResult = db
    .prepare("DELETE FROM weather_cache WHERE timestamp < ? AND is_forecast = 0")
    .run(cutoff);

  return tempResult.changes + weatherResult.changes;
}

// ── Main ──

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting temperature poll...`);

  const db = openDb();

  try {
    // 1. Query IntelliCenter
    const readings = await queryTemperatures();
    if (readings.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      const insert = db.prepare(
        "INSERT INTO temperature_readings (timestamp, source, value) VALUES (?, ?, ?)"
      );
      const insertMany = db.transaction(() => {
        for (const r of readings) {
          insert.run(now, r.source, r.value);
        }
      });
      insertMany();
      console.log(
        `  Recorded ${readings.length} readings: ${readings.map((r) => `${r.source}=${r.value}°F`).join(", ")}`
      );
    } else {
      console.log("  No temperature readings available");
    }

    // 2. Fetch weather data
    const weatherCached = await fetchAndCacheWeather(db);
    if (weatherCached > 0) {
      console.log(`  Cached ${weatherCached} weather readings`);
    }

    // 3. Prune old data
    const pruned = pruneOldData(db);
    if (pruned > 0) {
      console.log(`  Pruned ${pruned} records older than ${RETENTION_DAYS} days`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`  Done in ${elapsed}ms`);
  } catch (err) {
    console.error("  Poll failed:", err);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
