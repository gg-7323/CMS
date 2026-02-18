import { pushPending, pullLatestSnapshot } from './sync'
import { db } from './db'

let started = false

export function startBackgroundSync() {
  if (started) return
  started = true

  // Push pending every 5s
  setInterval(() => {
    if (navigator.onLine) pushPending().catch(()=>{})
  }, 5000)

  // Pull per open docs every 7s (for MVP, pull all known docs)
  setInterval(async () => {
    if (!navigator.onLine) return
    const docs = await db.docs.toArray()
    for (const d of docs) {
      await pullLatestSnapshot(d.id).catch(()=>{})
    }
  }, 7000)

  window.addEventListener('online', () => {
    pushPending().catch(()=>{})
  })
}
