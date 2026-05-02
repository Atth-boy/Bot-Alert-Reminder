const GAS_URL = import.meta.env.VITE_GAS_URL || ''

export async function fetchTasks() {
  if (!GAS_URL) throw new Error('VITE_GAS_URL is not configured')
  const r = await fetch(GAS_URL)
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
  const json = await r.json()
  return json.data || []
}

export async function addTask(payload) {
  if (!GAS_URL) throw new Error('VITE_GAS_URL is not configured')
  const r = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'add', ...payload })
  })
  if (!r.ok) throw new Error(`save failed: ${r.status}`)
  return r.json()
}
