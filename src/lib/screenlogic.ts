import {
  PoolStatus,
  PoolCircuit,
  PoolTemperature,
  ChemistryData,
  PumpStatus,
  ScheduleEvent,
  HeatMode,
} from "./types";

let ScreenLogic: typeof import("node-screenlogic") | null = null;

async function getScreenLogic() {
  if (!ScreenLogic) {
    ScreenLogic = await import("node-screenlogic");
  }
  return ScreenLogic;
}

interface ConnectionConfig {
  host?: string;
  port?: number;
  systemName?: string;
  password?: string;
}

function getConfig(): ConnectionConfig {
  return {
    host: process.env.SCREENLOGIC_HOST || undefined,
    port: process.env.SCREENLOGIC_PORT
      ? parseInt(process.env.SCREENLOGIC_PORT)
      : undefined,
    systemName: process.env.SCREENLOGIC_SYSTEM_NAME || undefined,
    password: process.env.SCREENLOGIC_PASSWORD || undefined,
  };
}

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

async function withConnection<T>(
  fn: (client: InstanceType<(typeof import("node-screenlogic"))["UnitConnection"]>) => Promise<T>
): Promise<T> {
  const SL = await getScreenLogic();
  const config = getConfig();

  let address: string;
  let port: number;
  let systemName = config.systemName || "";

  if (config.host) {
    address = config.host;
    port = config.port || 80;
  } else if (config.systemName) {
    const gateway = new SL.RemoteLogin(config.systemName);
    const unit = await gateway.connectAsync();
    address = unit.ipAddr;
    port = unit.port;
    await gateway.closeAsync();
  } else {
    const finder = new SL.FindUnits();
    const units = await finder.searchAsync();
    if (!units || units.length === 0) {
      throw new Error(
        "No ScreenLogic controllers found on the local network. " +
          "Set SCREENLOGIC_HOST or SCREENLOGIC_SYSTEM_NAME in your .env file."
      );
    }
    address = units[0].address;
    port = units[0].port;
    systemName = units[0].gatewayName;
  }

  const client = new SL.UnitConnection();
  client.init(systemName, address, port, config.password);
  await client.connectAsync();

  try {
    const result = await fn(client);
    return result;
  } finally {
    await client.closeAsync();
  }
}

// ── Live controller functions ──

async function getLiveStatus(): Promise<PoolStatus> {
  return withConnection(async (client) => {
    const state = await client.equipment.getEquipmentStateAsync();
    const controllerConfig = await client.equipment.getControllerConfigAsync();

    const circuitMap = new Map<number, string>();
    for (const c of controllerConfig.bodyArray || []) {
      circuitMap.set(c.circuitId, c.name);
    }

    const circuits: PoolCircuit[] = (state.circuitArray || []).map(
      (c: { id: number; state: number; colorSet: number; colorPos: number; delay: number }) => ({
        id: c.id,
        name: circuitMap.get(c.id) || `Circuit ${c.id}`,
        state: c.state === 1,
        colorSet: c.colorSet,
        colorPos: c.colorPos,
        delay: c.delay === 1,
      })
    );

    const temperatures: PoolTemperature = {
      airTemp: state.airTemp,
      poolTemp: state.currentTemp?.[0] ?? 0,
      spaTemp: state.currentTemp?.[1] ?? 0,
      poolSetPoint: state.setPoint?.[0] ?? 0,
      spaSetPoint: state.setPoint?.[1] ?? 0,
      poolHeatMode: (state.heatMode?.[0] ?? 0) as HeatMode,
      spaHeatMode: (state.heatMode?.[1] ?? 0) as HeatMode,
      poolHeatStatus: state.heatStatus?.[0] === 1,
      spaHeatStatus: state.heatStatus?.[1] === 1,
      units: controllerConfig.degC ? "C" : "F",
    };

    let chemistry: ChemistryData | null = null;
    try {
      const chem = await client.chem.getChemicalDataAsync();
      chemistry = {
        pH: chem.pH,
        orp: chem.orp,
        pHSetPoint: chem.pHSetPoint,
        orpSetPoint: chem.orpSetPoint,
        pHTankLevel: chem.pHTankLevel,
        orpTankLevel: chem.orpTankLevel,
        saturation: chem.saturation,
        calcium: chem.calcium,
        cyanuricAcid: chem.cyanuricAcid,
        alkalinity: chem.alkalinity,
        saltPPM: chem.saltPPM,
        waterTemp: chem.temperature,
      };
    } catch {
      // No chemistry equipment installed
    }

    const pumps: PumpStatus[] = [];
    for (let i = 0; i < 8; i++) {
      try {
        const p = await client.pump.getPumpStatusAsync(i);
        if (p.isRunning || p.pumpWatts > 0) {
          pumps.push({
            id: i,
            name: `Pump ${i + 1}`,
            isRunning: p.isRunning,
            watts: p.pumpWatts,
            rpm: p.pumpRPMs,
            gpm: p.pumpGPMs,
            pumpType: String(p.pumpType ?? "Unknown"),
          });
        }
      } catch {
        break;
      }
    }

    return {
      temperatures,
      circuits,
      chemistry,
      pumps,
      freezeMode: state.freezeMode === 1,
      isPoolActive: state.isPoolActive?.() ?? false,
      isSpaActive: state.isSpaActive?.() ?? false,
    };
  });
}

async function getLiveSchedules(): Promise<ScheduleEvent[]> {
  return withConnection(async (client) => {
    const recurring = await client.schedule.getScheduleDataAsync(0);
    const runOnce = await client.schedule.getScheduleDataAsync(1);

    const mapEvent = (e: { id: number; circuitId: number; startTime: number; stopTime: number; dayMask: number; flags: number; heatCmd: number; heatSetPoint: number }, isRunOnce: boolean): ScheduleEvent => ({
      id: e.id,
      circuitId: e.circuitId,
      circuitName: `Circuit ${e.circuitId}`,
      startTime: formatTime(e.startTime),
      stopTime: formatTime(e.stopTime),
      dayMask: e.dayMask,
      flags: e.flags,
      heatCmd: e.heatCmd,
      heatSetPoint: e.heatSetPoint,
      isRunOnce,
    });

    return [
      ...(recurring?.events || []).map((e: { id: number; circuitId: number; startTime: number; stopTime: number; dayMask: number; flags: number; heatCmd: number; heatSetPoint: number }) => mapEvent(e, false)),
      ...(runOnce?.events || []).map((e: { id: number; circuitId: number; startTime: number; stopTime: number; dayMask: number; flags: number; heatCmd: number; heatSetPoint: number }) => mapEvent(e, true)),
    ];
  });
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

async function setLiveCircuitState(
  circuitId: number,
  state: boolean
): Promise<void> {
  await withConnection(async (client) => {
    await client.circuits.setCircuitStateAsync(circuitId, state ? 1 : 0);
  });
}

async function setLiveHeatMode(
  bodyId: number,
  mode: HeatMode
): Promise<void> {
  await withConnection(async (client) => {
    await client.bodies.setHeatModeAsync(bodyId, mode);
  });
}

async function setLiveSetPoint(
  bodyId: number,
  temperature: number
): Promise<void> {
  await withConnection(async (client) => {
    await client.bodies.setSetPointAsync(bodyId, temperature);
  });
}

// ── Demo/mock data ──

function getDemoStatus(): PoolStatus {
  return {
    temperatures: {
      airTemp: 78,
      poolTemp: 82,
      spaTemp: 101,
      poolSetPoint: 82,
      spaSetPoint: 100,
      poolHeatMode: HeatMode.HEAT_PUMP,
      spaHeatMode: HeatMode.HEAT_PUMP,
      poolHeatStatus: false,
      spaHeatStatus: true,
      units: "F",
    },
    circuits: [
      { id: 505, name: "Pool", state: true, colorSet: 0, colorPos: 0, delay: false },
      { id: 500, name: "Spa", state: false, colorSet: 0, colorPos: 0, delay: false },
      { id: 501, name: "Pool Light", state: false, colorSet: 2, colorPos: 4, delay: false },
      { id: 502, name: "Spa Light", state: false, colorSet: 2, colorPos: 4, delay: false },
      { id: 503, name: "Cleaner", state: false, colorSet: 0, colorPos: 0, delay: false },
      { id: 504, name: "Spillover", state: false, colorSet: 0, colorPos: 0, delay: false },
      { id: 506, name: "Jets", state: false, colorSet: 0, colorPos: 0, delay: false },
      { id: 507, name: "Water Feature", state: false, colorSet: 0, colorPos: 0, delay: false },
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
      { id: 0, name: "Main Pump", isRunning: true, watts: 1200, rpm: 2800, gpm: 65, pumpType: "IntelliFlo VS" },
      { id: 1, name: "Booster Pump", isRunning: false, watts: 0, rpm: 0, gpm: 0, pumpType: "IntelliFlo VS" },
    ],
    freezeMode: false,
    isPoolActive: true,
    isSpaActive: false,
  };
}

function getDemoSchedules(): ScheduleEvent[] {
  return [
    { id: 1, circuitId: 505, circuitName: "Pool", startTime: "8:00 AM", stopTime: "6:00 PM", dayMask: 127, flags: 0, heatCmd: 0, heatSetPoint: 82, isRunOnce: false },
    { id: 2, circuitId: 503, circuitName: "Cleaner", startTime: "9:00 AM", stopTime: "12:00 PM", dayMask: 42, flags: 0, heatCmd: 0, heatSetPoint: 0, isRunOnce: false },
    { id: 3, circuitId: 501, circuitName: "Pool Light", startTime: "7:00 PM", stopTime: "10:00 PM", dayMask: 127, flags: 0, heatCmd: 0, heatSetPoint: 0, isRunOnce: false },
    { id: 4, circuitId: 500, circuitName: "Spa", startTime: "5:00 PM", stopTime: "7:00 PM", dayMask: 96, flags: 0, heatCmd: 3, heatSetPoint: 101, isRunOnce: false },
  ];
}

// ── Public API (routes into demo or live) ──

export async function getPoolStatus(): Promise<PoolStatus> {
  if (isDemoMode()) return getDemoStatus();
  return getLiveStatus();
}

export async function getSchedules(): Promise<ScheduleEvent[]> {
  if (isDemoMode()) return getDemoSchedules();
  return getLiveSchedules();
}

export async function setCircuitState(
  circuitId: number,
  state: boolean
): Promise<void> {
  if (isDemoMode()) return;
  await setLiveCircuitState(circuitId, state);
}

export async function setHeatMode(
  bodyId: number,
  mode: HeatMode
): Promise<void> {
  if (isDemoMode()) return;
  await setLiveHeatMode(bodyId, mode);
}

export async function setSetPoint(
  bodyId: number,
  temperature: number
): Promise<void> {
  if (isDemoMode()) return;
  await setLiveSetPoint(bodyId, temperature);
}
