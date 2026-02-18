import { getDocKey } from './keys'
import { encryptJSON, decryptJSON } from './crypto'

export type WsHandle = {
  onSnapshot(fn: (html: string) => void): void
  onChanges(fn: (changesB64: string[]) => void): void
  sendSnapshot(html: string): Promise<void>
  sendChanges(changesB64: string[]): Promise<void>
  close(): void
}

export function connectDocWS(doc_id: string): WsHandle {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?doc_id=${encodeURIComponent(doc_id)}`)
  const snapshotListeners: Array<(html: string) => void> = []
  const changesListeners: Array<(changesB64: string[]) => void> = []

  ws.onmessage = async (e) => {
    try {
      const msg = JSON.parse(e.data)
      const key = await getDocKey(doc_id)
      if (msg?.type === 'snapshot' && msg?.payload) {
        const html = await decryptJSON<string>(key, msg.payload)
        snapshotListeners.forEach(fn => fn(html))
      } else if (msg?.type === 'changes' && msg?.payload) {
        const list = await decryptJSON<string[]>(key, msg.payload)
        changesListeners.forEach(fn => fn(list))
      }
    } catch {}
  }

  return {
    onSnapshot(fn) { snapshotListeners.push(fn) },
    onChanges(fn) { changesListeners.push(fn) },
    async sendSnapshot(html: string) {
      if (ws.readyState !== WebSocket.OPEN) return
      const key = await getDocKey(doc_id)
      const payload = await encryptJSON(key, html)
      ws.send(JSON.stringify({ type: 'snapshot', payload }))
    },
    async sendChanges(changesB64: string[]) {
      if (ws.readyState !== WebSocket.OPEN) return
      const key = await getDocKey(doc_id)
      const payload = await encryptJSON(key, changesB64)
      ws.send(JSON.stringify({ type: 'changes', payload }))
    },
    close() { ws.close() },
  }
}
