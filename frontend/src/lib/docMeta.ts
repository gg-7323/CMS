import api from '../api/client'

export interface DocMetaPayload {
  doc_id: string
  title?: string
  updatedAt?: number
  type?: string
  template?: string
  mode?: string
  slug?: string
  status?: string
  tags?: string[]
  language?: string
  coverUrl?: string
}

export async function pushDocMeta(meta: DocMetaPayload): Promise<void> {
  try {
    await api.post('/docs/meta', meta)
  } catch (err) {
    // best-effort only; do not break editing if this fails
    console.error('Failed to push doc metadata', err)
  }
}
