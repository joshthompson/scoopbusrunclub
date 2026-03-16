import { runners as runnerSignals } from '@/data/runners'

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function normalizeRouteKey(key: string) {
  return key.toLowerCase()
}

const parkrunIdToRunnerKey = new Map<string, string>()
const nameToRunnerKey = new Map<string, string>()
const routeKeyToRunnerKey = new Map<string, string>()

for (const [runnerKey, [runner]] of Object.entries(runnerSignals)) {
  const data = runner()
  if (data.id) parkrunIdToRunnerKey.set(data.id, runnerKey)
  nameToRunnerKey.set(normalizeName(data.name), runnerKey)
  routeKeyToRunnerKey.set(normalizeRouteKey(runnerKey), runnerKey)
}

export function getMemberRoute(parkrunId?: string, runnerName?: string): string | null {
  const byId = parkrunId ? parkrunIdToRunnerKey.get(parkrunId) : undefined
  if (byId) return `/member/${normalizeRouteKey(byId)}`

  const byName = runnerName ? nameToRunnerKey.get(normalizeName(runnerName)) : undefined
  if (byName) return `/member/${normalizeRouteKey(byName)}`

  return null
}

export function getRunnerKeyFromRouteName(routeName?: string): string | null {
  if (!routeName) return null
  return routeKeyToRunnerKey.get(normalizeRouteKey(routeName)) ?? null
}
