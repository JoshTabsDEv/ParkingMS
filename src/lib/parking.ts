import { differenceInMinutes } from "date-fns";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "./db";
import type {
  DashboardSummary,
  ParkingSession,
  ParkingSlot,
  SlotStatus,
} from "./types";
import type { CheckoutPayload, SessionPayload, SlotPayload } from "./validators";

function getHourlyRate(input?: number | null) {
  if (input && input > 0) {
    return input;
  }
  const fallback = Number(process.env.PARKING_HOURLY_RATE ?? 40);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 40;
}

export async function listSlots(): Promise<ParkingSlot[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, label, level, type, status, created_at
    FROM parking_slots
    ORDER BY label ASC
  `
  );
  return rows as ParkingSlot[];
}

export async function createSlot(payload: SlotPayload) {
  const pool = getPool();
  const [duplicate] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM parking_slots WHERE label = ? LIMIT 1",
    [payload.label]
  );
  if (duplicate.length) {
    throw new Error("Slot label already exists");
  }
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO parking_slots (label, level, type)
    VALUES (?, ?, ?)
  `,
    [payload.label, payload.level, payload.type]
  );

  return {
    id: (result as { insertId: number }).insertId,
    ...payload,
    status: "available" as SlotStatus,
    created_at: new Date().toISOString(),
  };
}

export async function markSlotStatus(slotId: number, status: SlotStatus) {
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE parking_slots SET status = ? WHERE id = ?",
    [status, slotId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    throw new Error("Slot not found");
  }
}

export async function listSessions() {
  const pool = getPool();
  const [activeRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT s.id,
           s.slot_id,
           slots.label AS slot_label,
           s.vehicle_plate,
           s.vehicle_type,
           s.driver_name,
           s.check_in,
           s.check_out,
           s.hourly_rate,
           s.amount_due,
           s.status
    FROM parking_sessions s
    JOIN parking_slots slots ON slots.id = s.slot_id
    WHERE s.status = 'active'
    ORDER BY s.check_in DESC
  `
  );

  const [recentRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT s.id,
           s.slot_id,
           slots.label AS slot_label,
           s.vehicle_plate,
           s.vehicle_type,
           s.driver_name,
           s.check_in,
           s.check_out,
           s.hourly_rate,
           s.amount_due,
           s.status
    FROM parking_sessions s
    JOIN parking_slots slots ON slots.id = s.slot_id
    WHERE s.status = 'closed'
    ORDER BY s.check_out DESC
    LIMIT 10
  `
  );

  return {
    active: activeRows as ParkingSession[],
    recent: recentRows as ParkingSession[],
  };
}

export async function createSession(payload: SessionPayload) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [slots] = await conn.query<RowDataPacket[]>(
      "SELECT status FROM parking_slots WHERE id = ? FOR UPDATE",
      [payload.slotId]
    );
    if (!slots.length) {
      throw new Error("Slot not found");
    }
    if (slots[0].status !== "available") {
      throw new Error("Slot is not available");
    }

    const hourlyRate = getHourlyRate(null);

    const [result] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO parking_sessions
        (slot_id, vehicle_plate, vehicle_type, driver_name, hourly_rate)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        payload.slotId,
        payload.vehiclePlate,
        payload.vehicleType,
        payload.driverName,
        hourlyRate,
      ]
    );

    await conn.query("UPDATE parking_slots SET status = 'occupied' WHERE id = ?", [
      payload.slotId,
    ]);

    await conn.commit();
    return { id: (result as { insertId: number }).insertId, hourlyRate };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function checkoutSession(sessionId: number, data: CheckoutPayload) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sessions] = await conn.query<RowDataPacket[]>(
      `
      SELECT id, slot_id, check_in, hourly_rate
      FROM parking_sessions
      WHERE id = ? AND status = 'active'
      FOR UPDATE
    `,
      [sessionId]
    );
    if (!sessions.length) {
      throw new Error("Active session not found");
    }
    const session = sessions[0];
    const rate = getHourlyRate(data.hourlyRate ?? session.hourly_rate);

    const minutes = differenceInMinutes(new Date(), new Date(session.check_in));
    const hours = Math.max(1, Math.ceil(minutes / 60));
    const amountDue = Number((hours * rate).toFixed(2));

    await conn.query(
      `
      UPDATE parking_sessions
      SET status = 'closed',
          check_out = NOW(),
          amount_due = ?,
          hourly_rate = ?
      WHERE id = ?
    `,
      [amountDue, rate, sessionId]
    );

    await conn.query("UPDATE parking_slots SET status = 'available' WHERE id = ?", [
      session.slot_id,
    ]);

    await conn.commit();
    return { amountDue, hours, rate };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const pool = getPool();
  const [[slotCounts]] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      COUNT(*) AS totalSlots,
      SUM(status = 'available') AS availableSlots,
      SUM(status = 'occupied') AS occupiedSlots,
      SUM(status = 'maintenance') AS maintenanceSlots
    FROM parking_slots
  `
  );

  const [[sessionCounts]] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      SUM(status = 'active') AS activeSessions,
      SUM(DATE(check_in) = CURRENT_DATE) AS todaysCheckIns,
      SUM(DATE(check_out) = CURRENT_DATE) AS todaysCheckOuts
    FROM parking_sessions
  `
  );

  return {
    totalSlots: Number(slotCounts.totalSlots ?? 0),
    availableSlots: Number(slotCounts.availableSlots ?? 0),
    occupiedSlots: Number(slotCounts.occupiedSlots ?? 0),
    maintenanceSlots: Number(slotCounts.maintenanceSlots ?? 0),
    activeSessions: Number(sessionCounts.activeSessions ?? 0),
    todaysCheckIns: Number(sessionCounts.todaysCheckIns ?? 0),
    todaysCheckOuts: Number(sessionCounts.todaysCheckOuts ?? 0),
    hourlyRate: getHourlyRate(null),
  };
}

