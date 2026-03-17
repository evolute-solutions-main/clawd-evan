#!/usr/bin/env node
// Generic Notion publisher for Daily Ops reports
// - Ensures a single database exists under a parent page
// - Upserts a page by (type,date)
// - Renders content blocks from one or more markdown files

import fs from 'node:fs'
import path from 'node:path'

const NOTION_VERSION = '2022-06-28'
const API = 'https://api.notion.com/v1'

function readNotionKey(){
  if (process.env.NOTION_KEY) return process.env.NOTION_KEY
  try {
    const p = path.join(process.env.HOME||'', '.config/notion/api_key')
    return fs.readFileSync(p,'utf8').trim()
  } catch { throw new Error('Missing Notion key (set NOTION_KEY or ~/.config/notion/api_key)') }
}

async function notionFetch(url, opts={}, retries=3){
  const key = readNotionKey()
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: {
          'Authorization': `Bearer ${key}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
          ...(opts.headers||{})
        }
      })
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 2)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }
      if (!res.ok) {
        const t = await res.text().catch(()=> '')
        throw new Error(`Notion ${opts.method||'GET'} ${url} failed ${res.status}: ${t}`)
      }
      return res.json()
    } catch (e) {
      const transient = e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.message?.includes('fetch failed')
      if (transient && attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 1000))
        continue
      }
      throw e
    }
  }
}

function parseArgs(){
  const args = Object.fromEntries(process.argv.slice(2).map(a=>{
    const m = /^--([^=]+)=(.*)$/.exec(a)
    return m ? [m[1], m[2]] : [a, true]
  }))
  // modes: 'database' (default) or 'page'
  args.mode = args.mode || 'database'
  // required common args
  const common = ['parentPageId','type','date','status','sources']
  for (const k of common) if (!args[k]) throw new Error(`Missing --${k}`)
  // database mode requires dbTitle
  if (args.mode === 'database' && !args.dbTitle) throw new Error('Missing --dbTitle for database mode')
  args.sources = String(args.sources).split(',').map(s=> s.trim()).filter(Boolean)
  return args
}

async function ensureDatabase({ parentPageId, dbTitle }){
  // search for an inline data source with this title under parent is hard; so try a simple create-once then reuse id file
  const cacheFile = path.join(process.cwd(), 'agents/_shared/notion-publisher/.dbcache.json')
  let cache = {}
  try { cache = JSON.parse(fs.readFileSync(cacheFile,'utf8')) } catch {}
  if (cache[dbTitle]) return cache[dbTitle]
  const body = {
    parent: { page_id: parentPageId },
    is_inline: true,
    title: [{ type: 'text', text: { content: dbTitle } }],
    properties: {
      'Name': { title: {} },
      'Type': { select: { options: [ {name:'client_sweep'}, {name:'cold_sms'}, {name:'employee_daily'} ] } },
      'Date': { date: {} },
      'Status': { select: { options: [ {name:'success'}, {name:'blocker'} ] } },
      'People': { multi_select: {} },
      'Report URL': { url: {} }
    }
  }
  const created = await notionFetch(`${API}/databases`, { method:'POST', body: JSON.stringify(body) })
  const database_id = created?.id || created?.database_id
  if (!database_id) throw new Error('Failed to create Notion database (no id)')
  cache[dbTitle] = database_id
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
  return database_id
}

async function findExistingByDateType({ database_id, date, type }){
  const body = {
    filter: {
      and: [
        { property: 'Type', select: { equals: type } },
        { property: 'Date', date: { on_or_after: date, on_or_before: date } }
      ]
    },
    page_size: 1
  }
  const res = await notionFetch(`${API}/databases/${database_id}/query`, { method:'POST', body: JSON.stringify(body) })
  return res?.results?.[0]?.id || null
}

function cleanHeading(text){
  // Convert slug-style headings like "👌🏻-the-perfectionist-construction" → "👌🏻 The Perfectionist Construction"
  return text
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

function parseInlineText(text) {
  // Parse **bold** into Notion rich_text segments with bold annotation
  const parts = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: { content: text.slice(last, m.index) } })
    parts.push({ type: 'text', text: { content: m[1] }, annotations: { bold: true } })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: { content: text.slice(last) } })
  return parts.length ? parts : [{ type: 'text', text: { content: text } }]
}

function mdToBlocks(md){
  // MD → Notion blocks: headings (##/###), dividers (---), tables (|...|), lists (- / indented), paragraphs
  // Inline **bold** is parsed into rich_text annotations.
  const lines = md.split(/\r?\n/)
  const blocks = []
  let table = null
  function flushTable(){
    if (!table) return
    for (const row of table.rows) {
      blocks.push({ object:'block', type:'bulleted_list_item', bulleted_list_item:{ rich_text: parseInlineText(row.join(' | ')) } })
    }
    table = null
  }
  for (let raw of lines) {
    const line = raw.replace(/\s+$/,'')
    if (!line) { flushTable(); blocks.push({object:'block', type:'paragraph', paragraph:{ rich_text:[] }}); continue }
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split('|').slice(1,-1).map(c=> c.trim())
      if (!table) table = { rows: [] }
      if (!cells.every(c=> /^-+$/.test(c))) table.rows.push(cells)
      continue
    } else {
      flushTable()
    }
    if (/^---+$/.test(line)) {
      blocks.push({ object:'block', type:'divider', divider:{} })
    } else if (/^###\s+/.test(line)) {
      blocks.push({object:'block', type:'heading_3', heading_3:{ rich_text:[{type:'text', text:{content: cleanHeading(line.replace(/^###\s+/, ''))}}] }})
    } else if (/^##\s+/.test(line)) {
      blocks.push({object:'block', type:'heading_2', heading_2:{ rich_text:[{type:'text', text:{content: cleanHeading(line.replace(/^##\s+/, ''))}}] }})
    } else if (/^#\s+/.test(line)) {
      blocks.push({object:'block', type:'heading_1', heading_1:{ rich_text:[{type:'text', text:{content: cleanHeading(line.replace(/^#\s+/, ''))}}] }})
    } else if (/^\s*[-*]\s+/.test(line)) {
      // Top-level and indented bullets both render as bulleted_list_item
      const content = line.replace(/^\s*[-*]\s+/, '')
      blocks.push({object:'block', type:'bulleted_list_item', bulleted_list_item:{ rich_text: parseInlineText(content) }})
    } else {
      blocks.push({object:'block', type:'paragraph', paragraph:{ rich_text: parseInlineText(line) }})
    }
  }
  flushTable()
  return blocks
}

async function upsertPage({ database_id, type, date, status, peopleCsv, title, sources }){
  const existingId = await findExistingByDateType({ database_id, date, type })
  const name = title || `${date} — ${type.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}`
  const properties = {
    'Name': { title: [{ type:'text', text:{ content: name } }] },
    'Type': { select: { name: type } },
    'Date': { date: { start: date } },
    'Status': { select: { name: status } },
  }
  if (peopleCsv) {
    properties['People'] = { multi_select: peopleCsv.split(',').map(p=>({name:p.trim()})).filter(x=>x.name) }
  }
  if (existingId) {
    await notionFetch(`${API}/pages/${existingId}`, { method:'PATCH', body: JSON.stringify({ properties }) })
    await clearPageChildren(existingId)
    for (const src of sources) {
      const md = fs.readFileSync(src,'utf8')
      const blocks = mdToBlocks(md)
      for (let i=0;i<blocks.length;i+=50) {
        await notionFetch(`${API}/blocks/${existingId}/children`, { method:'PATCH', body: JSON.stringify({ children: blocks.slice(i,i+50) }) })
      }
    }
    const page = await notionFetch(`${API}/pages/${existingId}`)
    return { id: existingId, url: page?.url }
  } else {
    const page = await notionFetch(`${API}/pages`, { method:'POST', body: JSON.stringify({ parent:{ database_id }, properties }) })
    const pageId = page?.id
    for (const src of sources) {
      const md = fs.readFileSync(src,'utf8')
      const blocks = mdToBlocks(md)
      for (let i=0;i<blocks.length;i+=50) {
        await notionFetch(`${API}/blocks/${pageId}/children`, { method:'PATCH', body: JSON.stringify({ children: blocks.slice(i,i+50) }) })
      }
    }
    return { id: pageId, url: page?.url }
  }
}

async function clearPageChildren(pageId){
  let cursor
  do {
    const url = `${API}/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`
    const res = await notionFetch(url)
    for (const block of (res?.results || [])) {
      await notionFetch(`${API}/blocks/${block.id}`, { method:'DELETE' })
    }
    cursor = res?.has_more ? res.next_cursor : null
  } while (cursor)
}

async function searchPageByTitle({ title }){
  const body = { query: title, filter: { value: 'page', property: 'object' } }
  const res = await notionFetch(`${API}/search`, { method:'POST', body: JSON.stringify(body) })
  const hit = (res?.results||[]).find(r => (r?.object==='page') && (r?.properties?.title?.title?.[0]?.plain_text === title || r?.properties?.title?.title?.[0]?.text?.content === title))
  return hit?.id || null
}

async function upsertStandalonePage({ parentPageId, type, date, status, peopleCsv, title, sources }){
  const pageTitle = title || `${date} — ${type.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}`
  const existingId = await searchPageByTitle({ title: pageTitle })
  if (existingId) {
    await notionFetch(`${API}/pages/${existingId}`, { method:'PATCH', body: JSON.stringify({ properties: { title: { title: [{ type:'text', text:{ content: pageTitle } }] } } }) })
    await clearPageChildren(existingId)
    for (const src of sources) {
      const md = fs.readFileSync(src,'utf8')
      const blocks = mdToBlocks(md)
      for (let i=0;i<blocks.length;i+=50) {
        await notionFetch(`${API}/blocks/${existingId}/children`, { method:'PATCH', body: JSON.stringify({ children: blocks.slice(i,i+50) }) })
      }
    }
    const page = await notionFetch(`${API}/pages/${existingId}`)
    return { id: existingId, url: page?.url }
  } else {
    const created = await notionFetch(`${API}/pages`, { method:'POST', body: JSON.stringify({ parent: { page_id: parentPageId }, properties: { title: { title: [{ type:'text', text:{ content: pageTitle } }] } } }) })
    const pageId = created?.id
    for (const src of sources) {
      const md = fs.readFileSync(src,'utf8')
      const blocks = mdToBlocks(md)
      for (let i=0;i<blocks.length;i+=50) {
        await notionFetch(`${API}/blocks/${pageId}/children`, { method:'PATCH', body: JSON.stringify({ children: blocks.slice(i,i+50) }) })
      }
    }
    return { id: pageId, url: created?.url }
  }
}

;(async () => {
  try {
    const args = parseArgs()
    let page
    if (args.mode === 'page') {
      page = await upsertStandalonePage({ parentPageId: args.parentPageId, type: args.type, date: args.date, status: args.status, peopleCsv: args.people||'', title: args.title, sources: args.sources })
    } else {
      const database_id = await ensureDatabase({ parentPageId: args.parentPageId, dbTitle: args.dbTitle })
      page = await upsertPage({ database_id, type: args.type, date: args.date, status: args.status, peopleCsv: args.people||'', title: args.title, sources: args.sources })
    }
    console.log('NOTION_PAGE_ID', page.id)
    if (page.url) console.log('NOTION_PAGE_URL', page.url)
  } catch (e) {
    console.error('NOTION_PUBLISH_ERROR:', e)
    process.exit(1)
  }
})()
