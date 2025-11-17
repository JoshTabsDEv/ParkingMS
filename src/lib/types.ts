export type SlotStatus = "available" | "occupied" | "maintenance";
export type SlotType = "standard" | "compact" | "electric" | "accessible";

export interface ParkingSlot {
  id: number;
  label: string;
  level: string;
  type: SlotType;
  status: SlotStatus;
  created_at: string;
}

export interface ParkingSession {
  id: number;
  slot_id: number;
  slot_label: string;
  vehicle_plate: string;
  vehicle_type: string;
  driver_name: string;
  check_in: string;
  check_out: string | null;
  hourly_rate: number;
  amount_due: number;
  status: "active" | "closed";
}

export interface DashboardSummary {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  maintenanceSlots: number;
  activeSessions: number;
  todaysCheckIns: number;
  todaysCheckOuts: number;
  hourlyRate: number;
}

