"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type Slot = {
  id: number;
  label: string;
  level: string;
  type: string;
  status: "available" | "occupied" | "maintenance";
};

type Session = {
  id: number;
  slot_id: number;
  slot_label: string;
  vehicle_plate: string;
  vehicle_type: string;
  driver_name: string;
  check_in: string;
};

type Summary = {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  maintenanceSlots: number;
  activeSessions: number;
  todaysCheckIns: number;
  todaysCheckOuts: number;
  hourlyRate: number;
};

const slotTypes = [
  { label: "Standard", value: "standard" },
  { label: "Compact", value: "compact" },
  { label: "Electric", value: "electric" },
  { label: "Accessible", value: "accessible" },
];

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [slotForm, setSlotForm] = useState({
    label: "",
    level: "",
    type: "standard",
  });
  const [sessionForm, setSessionForm] = useState({
    slotId: "",
    vehiclePlate: "",
    vehicleType: "",
    driverName: "",
  });

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.status === "available"),
    [slots]
  );

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, slotRes, sessionRes] = await Promise.all([
        fetch("/api/summary"),
        fetch("/api/slots"),
        fetch("/api/sessions"),
      ]);
      if (!summaryRes.ok || !slotRes.ok || !sessionRes.ok) {
        throw new Error("Failed to load data");
      }
      setSummary(await summaryRes.json());
      const { slots } = await slotRes.json();
      setSlots(slots);
      const sessionsData = await sessionRes.json();
      setSessions(sessionsData.active);
      setRecentSessions(sessionsData.recent);
    } catch (err) {
      console.error(err);
      setError("Could not load data from the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotForm),
      });
      if (!res.ok) {
        throw new Error((await res.json()).message);
      }
      setSlotForm({ label: "", level: "", type: "standard" });
      setMessage("Slot added.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create slot");
    }
  }

  async function handleRegisterSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const payload = {
        slotId: Number(sessionForm.slotId),
        vehiclePlate: sessionForm.vehiclePlate,
        vehicleType: sessionForm.vehicleType,
        driverName: sessionForm.driverName,
      };
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error((await res.json()).message);
      }
      setSessionForm({
        slotId: "",
        vehiclePlate: "",
        vehicleType: "",
        driverName: "",
      });
      setMessage("Vehicle checked in.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create parking session"
      );
    }
  }

  async function handleCheckout(sessionId: number) {
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/checkout`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error((await res.json()).message);
      }
      const summary = await res.json();
      setMessage(
        `Session closed. Hours: ${summary.hours}, total: ₱${summary.amountDue.toFixed(
          2
        )}`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to checkout");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">
          Parking Management
        </h1>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        {(message || error) && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error ?? message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading data...</p>
        ) : summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                label="Total Slots"
                value={summary.totalSlots}
                helper={`${summary.availableSlots} available`}
              />
              <SummaryCard
                label="Active Sessions"
                value={summary.activeSessions}
                helper={`${summary.todaysCheckIns} check-ins today`}
              />
              <SummaryCard
                label="Check-outs Today"
                value={summary.todaysCheckOuts}
                helper="Closed sessions"
              />
              <SummaryCard
                label="Rate / hour"
                value={`₱${summary.hourlyRate}`}
                helper="Default billing"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card title="Add Parking Slot">
                <form className="flex flex-col gap-3" onSubmit={handleCreateSlot}>
                  <input
                    required
                    placeholder="Label e.g. A-01"
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={slotForm.label}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, label: e.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="Level e.g. Basement 1"
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={slotForm.level}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, level: e.target.value })
                    }
                  />
                  <select
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={slotForm.type}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, type: e.target.value })
                    }
                  >
                    {slotTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className=" rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Save Slot
                  </button>
                </form>
              </Card>

              <Card title="Check-in Vehicle">
                <form
                  className="flex flex-col gap-3"
                  onSubmit={handleRegisterSession}
                >
                  <select
                    required
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sessionForm.slotId}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, slotId: e.target.value })
                    }
                  >
                    <option value="">Select an available slot</option>
                    {availableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label} · {slot.level}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Vehicle Plate"
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sessionForm.vehiclePlate}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        vehiclePlate: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    placeholder="Vehicle Type"
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sessionForm.vehicleType}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        vehicleType: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    placeholder="Driver Name"
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                    value={sessionForm.driverName}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        driverName: e.target.value,
                      })
                    }
                  />
                  <button
                    type="submit"
                    className=" rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    disabled={!availableSlots.length}
                  >
                    Start Session
                  </button>
                  {!availableSlots.length && (
                    <p className="text-xs text-slate-500">
                      No available slots right now.
                    </p>
                  )}
                </form>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card title={`Active Sessions (${sessions.length})`}>
                {sessions.length === 0 ? (
                  <EmptyState text="No vehicles are currently parked." />
                ) : (
                  <ul className="flex flex-col divide-y text-sm">
                    {sessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {session.vehicle_plate} · {session.slot_label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {session.vehicle_type} ·{" "}
                            {new Date(session.check_in).toLocaleString()}
                          </p>
                        </div>
                        <button
                          className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={() => handleCheckout(session.id)}
                        >
                          Checkout
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Recently Closed">
                {recentSessions.length === 0 ? (
                  <EmptyState text="No sessions closed yet." />
                ) : (
                  <ul className="flex flex-col divide-y text-sm">
                    {recentSessions.map((session) => (
                      <li key={session.id} className="py-3">
                        <p className="font-medium text-slate-800">
                          {session.vehicle_plate} · {session.slot_label}
                        </p>
                        <p className="text-xs text-slate-500">
                          Checked in {new Date(session.check_in).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section className="rounded-lg border bg-white">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    Parking Slots
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage slot status directly in the database if needed.
                  </p>
                </div>
                <button
                  className="text-xs font-medium text-slate-600 underline"
                  onClick={() => loadData()}
                >
                  Refresh
                </button>
              </header>
              {slots.length === 0 ? (
                <EmptyState text="No slots yet. Add one using the form above." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Label</th>
                        <th className="px-4 py-2">Level</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white text-slate-700">
                      {slots.map((slot) => (
                        <tr key={slot.id}>
                          <td className="px-4 py-2 font-medium">{slot.label}</td>
                          <td className="px-4 py-2 text-sm">{slot.level}</td>
                          <td className="px-4 py-2 text-sm capitalize">
                            {slot.type}
                          </td>
                          <td className="px-4 py-2 text-sm capitalize">
                            {slot.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <EmptyState text="No summary available. Check your database connection." />
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4 text-slate-700">
      <h2 className="mb-4 text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="px-4 py-6 text-sm text-slate-600">
      {text}
    </p>
  );
}
