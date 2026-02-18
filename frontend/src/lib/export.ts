import { db } from './db'
import { getMasterKey } from './keys'
import { encryptJSON } from './crypto'

export async function exportEncryptedDoc(docId: string): Promise<Blob> {
  const doc = await db.docs.get(docId)
  const snap = await db.snapshots.get(docId)
  const payload = {
    version: 1,
    doc_id: docId,
    meta: {
      title: doc?.title || 'Untitled',
      type: doc?.type,
      template: doc?.template,
      updatedAt: doc?.updatedAt,
      slug: doc?.slug,
      tags: doc?.tags,
      status: doc?.status,
      language: doc?.language,
    },
    content: snap?.data || '',
    createdAt: Date.now(),
  }
  const master = await getMasterKey()
  const encrypted = await encryptJSON(master, payload)
  const wrapped = { v: 1, e: encrypted }

  // Also persist a protected copy in IndexedDB so it can be opened later from the UI.
  try {
    await db.protected_docs.put({
      id: docId,
      title: doc?.title || 'Untitled',
      updatedAt: Date.now(),
      payload: JSON.stringify(wrapped),
    })
  } catch {
    // non-fatal; still allow download
  }

  return new Blob([JSON.stringify(wrapped)], { type: 'application/json' })
}
