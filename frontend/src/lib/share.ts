import api from '../api/client'

export type ShareRole = 'viewer' | 'editor'

export type ShareInfoRole = 'owner' | 'editor' | 'viewer' | 'none'

export interface ShareInfo {
  doc_id: string
  owner: string
  editors: string[]
  viewers: string[]
  me_role: ShareInfoRole
}

export async function shareDoc(docId: string, targetEmail: string, role: ShareRole = 'editor') {
  const { data } = await api.post('/docs/share', {
    doc_id: docId,
    target: targetEmail,
    role,
  })
  return data as ShareInfo
}

export async function getShareInfo(docId: string): Promise<ShareInfo> {
  const { data } = await api.get(`/docs/share/${docId}`)
  return data as ShareInfo
}
