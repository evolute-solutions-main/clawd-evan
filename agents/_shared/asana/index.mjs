// Simple Asana client using Personal Access Token from process.env
// Expects env-loader.mjs to have populated ASANA_PAT
// Usage:
//   import { asanaGet, asanaListProjectTasks, asanaListStories } from '../asana/index.mjs'
//   const tasks = await asanaListProjectTasks({ projectGid, opt_fields: 'name,completed,completed_at,modified_at' })

const API = 'https://app.asana.com/api/1.0'

function requireToken() {
  const token = process.env.ASANA_PAT
  if (!token) throw new Error('Missing ASANA_PAT - ensure env-loader.mjs was imported first')
  return token
}

async function asanaGet(path, params={}) {
  const token = requireToken()
  const url = new URL(API + path)
  for (const [k,v] of Object.entries(params||{})) if (v!==undefined && v!==null) url.searchParams.set(k, String(v))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(`Asana GET ${url} failed ${res.status}: ${text}`)
  }
  const json = await res.json()
  return json?.data ?? json
}

async function asanaListProjectTasks({ projectGid, opt_fields, modified_since }) {
  return asanaGet(`/projects/${projectGid}/tasks`, { opt_fields, modified_since })
}

async function asanaListStories({ taskGid, limit=50 }) {
  return asanaGet(`/tasks/${taskGid}/stories`, { limit })
}

export { asanaGet, asanaListProjectTasks, asanaListStories }
