"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  image?: string;
};

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

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

  const isAdmin = user?.role === "admin";
  const isUser = user?.role === "user";

  useEffect(() => {
    void checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  async function checkSession() {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.session);
      }
    } catch (err) {
      console.error("Session check error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      await checkSession();
      setLoginForm({ email: "", password: "" });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  const handleGoogleCallback = async (response: any) => {
    try {
      setAuthLoading(true);
      setLoginError(null);
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google authentication failed");
      }
      await checkSession();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Google authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!user && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      // Check if script already exists
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        return;
      }

      // Load Google Identity Services
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            callback: handleGoogleCallback,
          });

          // Render button after a short delay
          setTimeout(() => {
            const buttonDiv = document.getElementById("google-login-button");
            const fallback = document.getElementById("google-login-fallback");
            if (buttonDiv && window.google) {
              // Remove fallback button
              if (fallback) {
                fallback.remove();
              }
              // Render Google's official button
              window.google.accounts.id.renderButton(buttonDiv, {
                theme: "outline",
                size: "large",
                width: "100%",
              });
            }
          }, 300);
        }
      };
      document.head.appendChild(script);
    }
  }, [user]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setSummary(null);
      setSlots([]);
      setSessions([]);
      setRecentSessions([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  async function loadData() {
    if (!user) return;
    try {
      setDataLoading(true);
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
      setDataLoading(false);
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

  // Show loading state while checking session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-2xl font-semibold text-slate-800">
            Parking Management
          </h1>
          
          {loginError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <div className="space-y-6">
            {/* Admin Login */}
            <div>
              <h2 className="mb-4 text-lg font-medium text-slate-700">
                Admin Login
              </h2>
              <form className="flex flex-col gap-3" onSubmit={handleAdminLogin}>
                <input
                  required
                  type="email"
                  placeholder="Email"
                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  disabled={authLoading}
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  disabled={authLoading}
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {authLoading ? "Logging in..." : "Login as Admin"}
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or</span>
              </div>
            </div>

            {/* Google Login */}
            <div>
              <h2 className="mb-4 text-lg font-medium text-slate-700">
                User Login (View Only)
              </h2>
              {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <div className="flex justify-center min-h-[40px] items-center">
                  <p className="text-xs text-slate-500">
                    Google login requires NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable
                  </p>
                </div>
              ) : (
                <>
                  <div id="google-login-button" className="flex justify-center min-h-[40px]">
                    {/* Fallback button - will be replaced by Google's button */}
                    <div 
                      id="google-login-fallback"
                      className="flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer w-full"
                      onClick={() => {
                        if (window.google) {
                          window.google.accounts.id.prompt();
                        }
                      }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application UI (for authenticated users)
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">
            Parking Management
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
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

        {dataLoading ? (
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

            {/* Admin-only forms */}
            {isAdmin && (
              <section className="grid gap-6 lg:grid-cols-2">
                <Card title="Add Parking Slot">
                  <form className="flex flex-col gap-3" onSubmit={handleCreateSlot}>
                    <input
                      required
                      placeholder="Label e.g. A-01"
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                      value={slotForm.label}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, label: e.target.value })
                      }
                    />
                    <input
                      required
                      placeholder="Level e.g. Basement 1"
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                      value={slotForm.level}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, level: e.target.value })
                      }
                    />
                    <select
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
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
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
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
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
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
            )}

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
                        {isAdmin && (
                          <button
                            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            onClick={() => handleCheckout(session.id)}
                          >
                            Checkout
                          </button>
                        )}
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
                    {isAdmin
                      ? "Manage slot status directly in the database if needed."
                      : "View-only mode"}
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
  return <p className="px-4 py-6 text-sm text-slate-600">{text}</p>;
}

// Extend Window interface for Google
declare global {
  interface Window {
    google: any;
  }
}