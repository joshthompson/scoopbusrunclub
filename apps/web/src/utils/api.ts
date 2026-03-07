const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string || "";

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
