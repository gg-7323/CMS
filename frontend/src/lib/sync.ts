import { db } from './db'
import api from '../api/client'
import { decryptJSON, encryptJSON } from './crypto'
import { getDocKey } from './keys'
import { pushDocMeta } from './docMeta'

export async function pushPending() {
  const pending = await db.updates.where({ pushed: 0 as 0 }).toArray()
  if (!pending.length) return
  await api.post('/sync/push', {
    updates: pending.map(u => ({ doc_id: u.doc_id, cursor: u.cursor, payload: u.payload })),
  })
  await db.transaction('rw', db.updates, async () => {
    for (const u of pending) {
      if (u.id) await db.updates.update(u.id, { pushed: 1 })
    }
  })
}

export type DocEvent = { type: 'setText'; value: string }

export async function pullDoc(doc_id: string): Promise<DocEvent[]> {
  const cur = (await db.cursors.get(doc_id))?.cursor ?? 0
  const { data } = await api.post('/sync/pull', { doc_id, since_cursor: cur })
  const key = await getDocKey(doc_id)
  const events: DocEvent[] = []
  for (const u of data.updates || []) {
    try {
      const payload = JSON.parse(u.payload)
      const evt = await decryptJSON<DocEvent>(key, payload)
      events.push(evt)
      await db.cursors.put({ id: doc_id, cursor: Math.max(cur, u.cursor ?? cur) })
    } catch {}
  }
  return events
}

export async function pushSnapshot(doc_id: string, html: string) {
  const key = await getDocKey(doc_id)
  const payload = await encryptJSON(key, { type: 'snapshot', value: html })
  const cursor = Date.now()
  await db.updates.add({ doc_id, cursor, payload: JSON.stringify(payload), ts: cursor, pushed: 0 })
  try {
    const doc = await db.docs.get(doc_id)
    if (doc) {
      const { id, title, updatedAt, type, template, mode, slug, status, tags, language, coverUrl } = doc as any
      await pushDocMeta({
        doc_id: id || doc_id,
        title,
        updatedAt: updatedAt ?? cursor,
        type,
        template,
        mode,
        slug,
        status,
        tags,
        language,
        coverUrl,
      })
    }
  } catch (err) {
    console.error('Failed to sync doc metadata', err)
  }
  await pushPending()
}

export async function pullLatestSnapshot(doc_id: string): Promise<string | null> {
  const cur = (await db.cursors.get(doc_id))?.cursor ?? 0
  const { data } = await api.post('/sync/pull', { doc_id, since_cursor: cur })
  if (!data.updates?.length) return null
  const key = await getDocKey(doc_id)
  let latestVal: string | null = null
  let maxCursor = cur
  for (const u of data.updates) {
    try {
      const payload = JSON.parse(u.payload)
      const evt = await decryptJSON<{type:string; value:string}>(key, payload)
      if (evt.type === 'snapshot') {
        latestVal = evt.value
        maxCursor = Math.max(maxCursor, u.cursor ?? maxCursor)
      }
    } catch {}
  }
  if (maxCursor !== cur) await db.cursors.put({ id: doc_id, cursor: maxCursor })
  return latestVal
}

// Change-based CRDT helpers
export async function pushChanges(doc_id: string, changesB64: string[], cursor?: number) {
  if (!changesB64.length) return
  const key = await getDocKey(doc_id)
  const payload = await encryptJSON(key, { type: 'changes', list: changesB64 })
  const cur = cursor ?? Date.now()
  await db.updates.add({ doc_id, cursor: cur, payload: JSON.stringify(payload), ts: cur, pushed: 0 })
  await pushPending()
}

export async function pullChanges(doc_id: string): Promise<string[]> {
  const cur = (await db.cursors.get(doc_id))?.cursor ?? 0
  const { data } = await api.post('/sync/pull', { doc_id, since_cursor: cur })
  if (!data.updates?.length) return []
  const key = await getDocKey(doc_id)
  let maxCursor = cur
  const out: string[] = []
  for (const u of data.updates) {
    try {
      const payload = JSON.parse(u.payload)
      const body = await decryptJSON<any>(key, payload)
      if (body?.type === 'changes' && Array.isArray(body.list)) {
        out.push(...body.list)
        if (u.cursor) maxCursor = Math.max(maxCursor, u.cursor)
      }
    } catch {}
  }
  if (maxCursor !== cur) await db.cursors.put({ id: doc_id, cursor: maxCursor })
  return out
}
