export interface PoolCircuit {
  id: string;
  name: string;
  state: boolean;
  type: string;
  subtype: string;
  freeze: boolean;
}

export interface PoolBody {
  id: string;
  name: string;
  state: boolean;
  subtype: "POOL" | "SPA";
  currentTemp: number;
  lastTemp: number;
  lowSetPoint: number;
  highSetPoint: number;
  heatMode: string;
}

export interface PoolTemperature {
  airTemp: number;
  bodies: PoolBody[];
  units: "F" | "C";
}

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
  id: string;
  circuitId: string;
  circuitName: string;
  startTime: string;
  stopTime: string;
  days: string;
  heatSetPoint: number;
  isRunOnce: boolean;
  status: string;
}

export interface PumpStatus {
  id: string;
  name: string;
  isRunning: boolean;
  watts: number;
  rpm: number;
  gpm: number;
  pumpType: string;
}

export interface HeaterStatus {
  id: string;
  name: string;
  state: string;
  body: string;
}

export interface PoolStatus {
  temperatures: PoolTemperature;
  circuits: PoolCircuit[];
  chemistry: ChemistryData | null;
  pumps: PumpStatus[];
  heaters: HeaterStatus[];
  freezeMode: boolean;
}

export const DAYS_OF_WEEK = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const HEAT_MODE_LABELS: Record<string, string> = {
  "0": "Off",
  "1": "Heater",
  "2": "Solar Preferred",
  "3": "Solar Only",
  "4": "Ultra Temp",
};
