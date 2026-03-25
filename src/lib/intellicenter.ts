import {
  PoolStatus,
  PoolCircuit,
  PoolTemperature,
  PoolBody,
  ChemistryData,
  PumpStatus,
  HeaterStatus,
  ScheduleEvent,
} from "./types";

import { Unit, FindUnits } from "node-intellicenter";
import {
  GetBodyStatus,
  GetChemicalStatus,
  GetCircuitStatus,
  GetHeaters,
  GetSchedule,
  SetObjectStatus,
  SetHeatMode,
  SetSetpoint,
} from "node-intellicenter/messages";

let unitInstance: Unit | null = null;

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

function getConfig() {
  return {
    host: process.env.INTELLICENTER_HOST || "",
    port: parseInt(process.env.INTELLICENTER_PORT || "6680"),
  };
}

async function getUnit(): Promise<Unit> {
  if (unitInstance) return unitInstance;

  const config = getConfig();

  let host = config.host;
  let port = config.port;

  if (!host) {
    const finder = new FindUnits();
    const units = await finder.searchAsync();
    finder.close();
    if (!units || units.length === 0) {
      throw new Error(
        "No IntelliCenter controllers found on the local network. " +
          "Set INTELLICENTER_HOST in your .env file."
      );
    }
    host = units[0].addressStr;
    port = units[0].port;
  }

  const unit = new Unit(host, port);
  await unit.connect();
  unitInstance = unit;

  unit.on("close", () => {
    unitInstance = null;
  });

  return unit;
}

// Helper to get a param value from an ICParam object
function getParam(params: Record<string, unknown> | undefined, key: string): string {
  if (!params) return "";
  const val = (params as Record<string, unknown>)[key];
  return val != null ? String(val) : "";
}

// Parse response objectList into a convenient array
function parseObjects(response: { objectList?: Array<{ objnam: string; params?: unknown }> }) {
  return (response.objectList || []).map((obj) => ({
    objnam: obj.objnam,
    params: (obj.params || {}) as Record<string, string>,
  }));
}

// ── Live controller functions using pre-built messages ──

async function getLiveBodies(): Promise<PoolBody[]> {
  const unit = await getUnit();
  const response = await unit.send(GetBodyStatus());

  return parseObjects(response).map((obj) => ({
    id: obj.objnam,
    name: obj.params.SNAME || obj.objnam,
    state: obj.params.STATUS === "ON",
    subtype: (obj.params.SUBTYP as "POOL" | "SPA") || "POOL",
    currentTemp: parseInt(obj.params.TEMP || "0"),
    lastTemp: parseInt(obj.params.LSTTMP || "0"),
    lowSetPoint: parseInt(obj.params.LOTMP || "0"),
    highSetPoint: parseInt(obj.params.HITMP || "0"),
    heatMode: obj.params.HTMODE || "0",
  }));
}

async function getLiveCircuits(): Promise<PoolCircuit[]> {
  const unit = await getUnit();
  const response = await unit.send(GetCircuitStatus());

  return parseObjects(response)
    .filter((obj) => obj.params.SNAME)
    .map((obj) => ({
      id: obj.objnam,
      name: obj.params.SNAME || obj.objnam,
      state: obj.params.STATUS === "ON",
      type: obj.params.OBJTYP || "CIRCUIT",
      subtype: obj.params.SUBTYP || "",
      freeze: obj.params.FREEZE === "ON",
    }));
}

async function getLiveChemistry(): Promise<ChemistryData | null> {
  const unit = await getUnit();

  try {
    const response = await unit.send(GetChemicalStatus());
    const objects = parseObjects(response);
    if (objects.length === 0) return null;

    // Merge data from all chem objects (IntelliChem + IntelliChlor may be separate)
    const merged: Record<string, string> = {};
    for (const obj of objects) {
      Object.assign(merged, obj.params);
    }

    return {
      pH: parseFloat(merged.PHVAL || "0"),
      orp: parseInt(merged.ORPVAL || "0"),
      pHSetPoint: parseFloat(merged.PHSET || "0"),
      orpSetPoint: parseInt(merged.ORPSET || "0"),
      pHTankLevel: parseInt(merged.PHTNK || "0"),
      orpTankLevel: parseInt(merged.ORPTNK || "0"),
      saturation: parseFloat(merged.SINDEX || "0"),
      calcium: parseInt(merged.CALC || "0"),
      cyanuricAcid: parseInt(merged.CYACID || "0"),
      alkalinity: parseInt(merged.ALK || "0"),
      saltPPM: parseInt(merged.SALT || "0"),
      waterTemp: parseInt(merged.TEMP || "0"),
    };
  } catch {
    return null;
  }
}

async function getLivePumps(): Promise<PumpStatus[]> {
  const unit = await getUnit();
  // No pre-built message for pumps; use raw GetParamList
  const response = await unit.send({
    command: "GetParamList",
    messageID: crypto.randomUUID(),
    condition: "OBJTYP = PUMP",
    objectList: [{
      objnam: "ALL",
      keys: ["SNAME", "SUBTYP", "STATUS", "RPM", "GPM", "PWR"],
    }],
  });

  return parseObjects(response).map((obj) => ({
    id: obj.objnam,
    name: obj.params.SNAME || obj.objnam,
    isRunning: obj.params.STATUS === "ON",
    watts: parseInt(obj.params.PWR || "0"),
    rpm: parseInt(obj.params.RPM || "0"),
    gpm: parseInt(obj.params.GPM || "0"),
    pumpType: obj.params.SUBTYP || "Unknown",
  }));
}

async function getLiveHeaters(): Promise<HeaterStatus[]> {
  const unit = await getUnit();
  const response = await unit.send(GetHeaters());

  return parseObjects(response).map((obj) => ({
    id: obj.objnam,
    name: obj.params.SNAME || obj.objnam,
    state: obj.params.STATUS || "OFF",
    body: obj.params.BODY || "",
  }));
}

async function getLiveSchedules(): Promise<ScheduleEvent[]> {
  const unit = await getUnit();
  const response = await unit.send(GetSchedule());

  return parseObjects(response).map((obj) => ({
    id: obj.objnam,
    circuitId: obj.params.CIRCUIT || "",
    circuitName: obj.params.SNAME || obj.objnam,
    startTime: obj.params.START || "",
    stopTime: obj.params.STOP || "",
    days: obj.params.DAY || "",
    heatSetPoint: parseInt(obj.params.HITMP || "0"),
    isRunOnce: obj.params.SINGLE === "ON",
    status: obj.params.STATUS || "OFF",
  }));
}

async function getLiveAirTemp(): Promise<number> {
  const unit = await getUnit();
  const response = await unit.send({
    command: "GetParamList",
    messageID: crypto.randomUUID(),
    condition: "OBJTYP = SENSE AND SUBTYP = AIR",
    objectList: [{ objnam: "ALL", keys: ["PROBE"] }],
  });

  const objects = parseObjects(response);
  return objects.length > 0 ? parseInt(objects[0].params.PROBE || "0") : 0;
}

async function getLiveStatus(): Promise<PoolStatus> {
  const [bodies, circuits, airTemp, chemistry, pumps, heaters] =
    await Promise.all([
      getLiveBodies(),
      getLiveCircuits(),
      getLiveAirTemp(),
      getLiveChemistry(),
      getLivePumps(),
      getLiveHeaters(),
    ]);

  return {
    temperatures: { airTemp, bodies, units: "F" },
    circuits,
    chemistry,
    pumps,
    heaters,
    freezeMode: false,
  };
}

// ── Control commands using pre-built messages ──

async function setLiveCircuitState(circuitId: string, state: boolean): Promise<void> {
  const unit = await getUnit();
  await unit.send(SetObjectStatus(circuitId, state));
}

async function setLiveHeatMode(bodyId: string, mode: number): Promise<void> {
  const unit = await getUnit();
  // HeaterType enum values: 0=NoChange, 1=Off, 2=Heater, 3=SolarOnly, etc.
  await unit.send(SetHeatMode(bodyId, mode as Parameters<typeof SetHeatMode>[1]));
}

async function setLiveSetPoint(bodyId: string, temperature: number): Promise<void> {
  const unit = await getUnit();
  await unit.send(SetSetpoint(bodyId, temperature));
}

// ── Demo/mock data ──

function getDemoStatus(): PoolStatus {
  return {
    temperatures: {
      airTemp: 78,
      bodies: [
        {
          id: "B1101",
          name: "Pool",
          state: true,
          subtype: "POOL",
          currentTemp: 82,
          lastTemp: 82,
          lowSetPoint: 78,
          highSetPoint: 88,
          heatMode: "1",
        },
        {
          id: "B1102",
          name: "Spa",
          state: false,
          subtype: "SPA",
          currentTemp: 0,
          lastTemp: 101,
          lowSetPoint: 96,
          highSetPoint: 104,
          heatMode: "1",
        },
      ],
      units: "F",
    },
    circuits: [
      { id: "C0001", name: "Pool", state: true, type: "CIRCUIT", subtype: "POOL", freeze: false },
      { id: "C0002", name: "Spa", state: false, type: "CIRCUIT", subtype: "SPA", freeze: false },
      { id: "C0003", name: "Pool Light", state: false, type: "CIRCUIT", subtype: "INTELLI", freeze: false },
      { id: "C0004", name: "Spa Light", state: false, type: "CIRCUIT", subtype: "INTELLI", freeze: false },
      { id: "C0005", name: "Cleaner", state: false, type: "CIRCUIT", subtype: "GENERIC", freeze: false },
      { id: "C0006", name: "Spillover", state: false, type: "CIRCUIT", subtype: "GENERIC", freeze: false },
      { id: "C0007", name: "Jets", state: false, type: "CIRCUIT", subtype: "GENERIC", freeze: false },
      { id: "C0008", name: "Water Feature", state: false, type: "CIRCUIT", subtype: "GENERIC", freeze: false },
    ],
    chemistry: {
      pH: 7.5,
      orp: 720,
      pHSetPoint: 7.4,
      orpSetPoint: 700,
      pHTankLevel: 4,
      orpTankLevel: 5,
      saturation: 0.1,
      calcium: 300,
      cyanuricAcid: 40,
      alkalinity: 100,
      saltPPM: 3200,
      waterTemp: 82,
    },
    pumps: [
      { id: "P0001", name: "Main Pump", isRunning: true, watts: 1200, rpm: 2800, gpm: 65, pumpType: "VSF" },
      { id: "P0002", name: "Booster Pump", isRunning: false, watts: 0, rpm: 0, gpm: 0, pumpType: "SPEED" },
    ],
    heaters: [
      { id: "H0001", name: "Heater", state: "IDLE", body: "B1101" },
    ],
    freezeMode: false,
  };
}

function getDemoSchedules(): ScheduleEvent[] {
  return [
    { id: "S0001", circuitId: "C0001", circuitName: "Pool Filter", startTime: "480", stopTime: "1080", days: "MTWThFSaSu", heatSetPoint: 82, isRunOnce: false, status: "ON" },
    { id: "S0002", circuitId: "C0005", circuitName: "Cleaner", startTime: "540", stopTime: "720", days: "MWF", heatSetPoint: 0, isRunOnce: false, status: "ON" },
    { id: "S0003", circuitId: "C0003", circuitName: "Pool Light", startTime: "1140", stopTime: "1320", days: "MTWThFSaSu", heatSetPoint: 0, isRunOnce: false, status: "ON" },
    { id: "S0004", circuitId: "C0002", circuitName: "Spa", startTime: "1020", stopTime: "1140", days: "SaSu", heatSetPoint: 101, isRunOnce: false, status: "ON" },
  ];
}

// ── Public API ──

export async function getPoolStatus(): Promise<PoolStatus> {
  if (isDemoMode()) return getDemoStatus();
  return getLiveStatus();
}

export async function getSchedules(): Promise<ScheduleEvent[]> {
  if (isDemoMode()) return getDemoSchedules();
  return getLiveSchedules();
}

export async function setCircuitState(circuitId: string, state: boolean): Promise<void> {
  if (isDemoMode()) return;
  await setLiveCircuitState(circuitId, state);
}

export async function setHeatMode(bodyId: string, mode: string): Promise<void> {
  if (isDemoMode()) return;
  await setLiveHeatMode(bodyId, parseInt(mode));
}

export async function setSetPoint(bodyId: string, temperature: number): Promise<void> {
  if (isDemoMode()) return;
  await setLiveSetPoint(bodyId, temperature);
}
