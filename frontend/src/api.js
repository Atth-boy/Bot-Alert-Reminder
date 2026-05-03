const GAS_URL = import.meta.env.VITE_GAS_URL || ''
const KEY = 'api_secret'

export function getSecret() {
  return localStorage.getItem(KEY) || ''
}

export function setSecret(value) {
  if (value) localStorage.setItem(KEY, value)
  else localStorage.removeItem(KEY)
}

function urlWithSecret() {
  const sep = GAS_URL.includes('?') ? '&' : '?'
  return `${GAS_URL}${sep}secret=${encodeURIComponent(getSecret())}`
}

export async function fetchTasks() {
  if (!GAS_URL) throw new Error('VITE_GAS_URL is not configured')
  const r = await fetch(urlWithSecret())
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
  const json = await r.json()
  if (json.error === 'unauthorized') {
    setSecret('')
    throw new Error('unauthorized')
  }
  return json.data || []
}

export async function fetchRecipients() {
  if (!GAS_URL) return []
  const sep = GAS_URL.includes('?') ? '&' : '?'
  const url = `${GAS_URL}${sep}action=recipients&secret=${encodeURIComponent(getSecret())}`
  try {
    const r = await fetch(url)
    if (!r.ok) return []
    const json = await r.json()
    if (json.error) return []
    return json.recipients || []
  } catch {
    return []
  }
}

async function post(action, payload) {
  if (!GAS_URL) throw new Error('VITE_GAS_URL is not configured')
  const r = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action, secret: getSecret(), ...payload })
  })
  if (!r.ok) throw new Error(`request failed: ${r.status}`)
  const json = await r.json()
  if (json.error === 'unauthorized') {
    setSecret('')
    throw new Error('unauthorized')
  }
  return json
}

export const addTask = (payload) => post('add', payload)
export const deleteTask = (row) => post('delete', { row })
export const markDone = (row) => post('update', { row, status: 'Done' })
