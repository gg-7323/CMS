import { db } from './db'
import { getMasterKey } from './keys'
import { decryptJSON } from './crypto'

// Import an encrypted .secure.json payload into a normal rich document.
// Returns the new doc id.
export async function importSecureDocFromText(text: string, fallbackTitle = 'Imported secure doc'): Promise<string> {
  const parsed = JSON.parse(text)
  if (!parsed || parsed.v !== 1 || !parsed.e) {
    throw new Error('Invalid secure file')
  }
  const master = await getMasterKey()
  const payload = await decryptJSON<any>(master, parsed.e)
  const now = Date.now()
  const id = crypto.randomUUID()
  const meta = payload?.meta || {}
  const content = payload?.content || ''
  await db.docs.put({
    id,
    title: meta.title || fallbackTitle,
    updatedAt: now,
    type: meta.type || 'article',
    template: meta.template,
    mode: 'rich',
    slug: meta.slug,
    tags: meta.tags,
    status: meta.status || 'draft',
    language: meta.language,
  })
  await db.snapshots.put({ doc_id: id, data: content, updatedAt: now })
  return id
}
