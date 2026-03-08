const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string || "";

export interface Runner {
  parkrunId: string;
  name: string;
  totalRuns: number;
  lastUpdated: number;
}

export interface RunResultItem {
  parkrunId: string;
  runnerName: string;
  eventName: string;
  eventNumber: number;
  position: number;
  time: string;
  ageGrade: string;
  date: string; // YYYY-MM-DD
}

export async function fetchRecentResults(sinceDate: string): Promise<RunResultItem[]> {
  const url = `${CONVEX_URL}/api/results?since=${encodeURIComponent(sinceDate)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchAllResults(): Promise<RunResultItem[]> {
  const url = `${CONVEX_URL}/api/results`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchRunners(): Promise<Runner[]> {
  const url = `${CONVEX_URL}/api/runners`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
