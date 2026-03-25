const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || "";

const TOKEN_KEY = "sbrc:admin_token";

// ── Token management ────────────────────────────────────────────────

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Auth API ────────────────────────────────────────────────────────

export interface LoginResult {
  token?: string;
  username?: string;
  error?: string;
}

export async function adminLogin(
  username: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch(`${CONVEX_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function adminLogout(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    await fetch(`${CONVEX_URL}/api/admin/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }
  clearAuthToken();
}

export async function validateToken(): Promise<{ username: string; isSuperAdmin: boolean } | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${CONVEX_URL}/api/admin/validate?token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.error ? null : data;
  } catch {
    return null;
  }
}

// ── Races API ───────────────────────────────────────────────────────

export interface RaceAttendee {
  runnerId: string;
  position?: number;
  time?: string; // hh:mm:ss format
  distance?: number;
  laps?: number;
  scanned?: boolean;
}

export interface Race {
  _id: string;
  date: string;
  name: string;
  website?: string;
  type?: string;
  attendees: RaceAttendee[];
  majorEvent?: boolean;
  public: boolean;
  createdAt: number;
  modifiedAt: number;
  modifiedBy: string;
}

export async function fetchRaces(includeOld = false): Promise<Race[]> {
  const token = getAuthToken();
  if (!token) return [];
  const res = await fetch(
    `${CONVEX_URL}/api/admin/races?token=${encodeURIComponent(token)}&includeOld=${includeOld}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function createRace(
  data: Omit<Race, "_id" | "createdAt" | "modifiedAt" | "modifiedBy">
): Promise<{ id?: string; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(`${CONVEX_URL}/api/admin/races`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...data }),
  });
  return res.json();
}

export async function updateRace(
  raceId: string,
  data: Partial<Omit<Race, "_id" | "createdAt" | "modifiedAt" | "modifiedBy">>
): Promise<{ ok?: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(`${CONVEX_URL}/api/admin/races`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, raceId, ...data }),
  });
  return res.json();
}

export async function deleteRace(
  raceId: string
): Promise<{ ok?: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(
    `${CONVEX_URL}/api/admin/races?token=${encodeURIComponent(token)}&id=${encodeURIComponent(raceId)}`,
    { method: "DELETE" }
  );
  return res.json();
}

export async function fetchTodayRaces(): Promise<Race[]> {
  const token = getAuthToken();
  if (!token) return [];
  const res = await fetch(
    `${CONVEX_URL}/api/admin/races/today?token=${encodeURIComponent(token)}`
  );
  if (!res.ok) return [];
  return res.json();
}

// ── Users API ───────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  username: string;
  isSuperAdmin: boolean;
  createdAt: number;
  createdBy?: string;
  lastLogin?: number;
  lastActivity?: number;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const token = getAuthToken();
  if (!token) return [];
  const res = await fetch(
    `${CONVEX_URL}/api/admin/users?token=${encodeURIComponent(token)}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function createAdminUser(
  username: string,
  password: string,
  isSuperAdmin = false
): Promise<{ ok?: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(`${CONVEX_URL}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, username, password, isSuperAdmin }),
  });
  return res.json();
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok?: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(`${CONVEX_URL}/api/admin/account/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, currentPassword, newPassword }),
  });
  return res.json();
}

export async function updateAdminUser(
  userId: string,
  data: { username?: string; password?: string; isSuperAdmin?: boolean }
): Promise<{ ok?: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) return { error: "Not authenticated" };
  const res = await fetch(`${CONVEX_URL}/api/admin/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, userId, ...data }),
  });
  return res.json();
}

// ── Admin Event Logs API ────────────────────────────────────────────

export interface AdminEventLog {
  _id: string;
  username: string;
  action: string;
  detail?: string;
  targetType?: string;
  targetId?: string;
  timestamp: number;
}

export interface AdminEventLogsResult {
  logs: AdminEventLog[];
  hasMore: boolean;
}

export async function fetchAdminLogs(opts?: {
  limit?: number;
  cursor?: number;
  username?: string;
  action?: string;
}): Promise<AdminEventLogsResult> {
  const token = getAuthToken();
  if (!token) return { logs: [], hasMore: false };
  const params = new URLSearchParams({ token });
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", String(opts.cursor));
  if (opts?.username) params.set("username", opts.username);
  if (opts?.action) params.set("action", opts.action);
  const res = await fetch(
    `${CONVEX_URL}/api/admin/logs?${params.toString()}`
  );
  if (!res.ok) return { logs: [], hasMore: false };
  return res.json();
}
