export interface PoolCircuit {
  id: number;
  name: string;
  state: boolean;
  colorSet: number;
  colorPos: number;
  delay: boolean;
}

export interface PoolTemperature {
  airTemp: number;
  poolTemp: number;
  spaTemp: number;
  poolSetPoint: number;
  spaSetPoint: number;
  poolHeatMode: HeatMode;
  spaHeatMode: HeatMode;
  poolHeatStatus: boolean;
  spaHeatStatus: boolean;
  units: "F" | "C";
}

export enum HeatMode {
  OFF = 0,
  SOLAR = 1,
  SOLAR_PREFERRED = 2,
  HEAT_PUMP = 3,
}

export const HEAT_MODE_LABELS: Record<HeatMode, string> = {
  [HeatMode.OFF]: "Off",
  [HeatMode.SOLAR]: "Solar Only",
  [HeatMode.SOLAR_PREFERRED]: "Solar Preferred",
  [HeatMode.HEAT_PUMP]: "Heater",
};

export interface ChemistryData {
  pH: number;
  orp: number;
  pHSetPoint: number;
  orpSetPoint: number;
  pHTankLevel: number;
  orpTankLevel: number;
  saturation: number;
  calcium: number;
  cyanuricAcid: number;
  alkalinity: number;
  saltPPM: number;
  waterTemp: number;
}

export interface ScheduleEvent {
  id: number;
  circuitId: number;
  circuitName: string;
  startTime: string;
  stopTime: string;
  dayMask: number;
  flags: number;
  heatCmd: number;
  heatSetPoint: number;
  isRunOnce: boolean;
}

export interface PumpStatus {
  id: number;
  name: string;
  isRunning: boolean;
  watts: number;
  rpm: number;
  gpm: number;
  pumpType: string;
}

export interface PoolStatus {
  temperatures: PoolTemperature;
  circuits: PoolCircuit[];
  chemistry: ChemistryData | null;
  pumps: PumpStatus[];
  freezeMode: boolean;
  isPoolActive: boolean;
  isSpaActive: boolean;
}

// Well-known circuit IDs
export const CIRCUIT_IDS = {
  SPA: 500,
  POOL: 505,
} as const;

export const DAYS_OF_WEEK = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
