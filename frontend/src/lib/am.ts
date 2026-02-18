// Automerge v0.14 helpers with permissive typing for stability
import * as A from 'automerge'

export type AMDoc = A.Doc<{ content: any }>

export function amNew(): AMDoc {
  // content as Text holds the HTML string characters
  // @ts-ignore
  return A.from({ content: new (A as any).Text() }) as AMDoc
}

export function amSave(doc: AMDoc): string {
  const bytes: Uint8Array = (A as any).save(doc)
  let s = ''
  bytes.forEach((b: number) => (s += String.fromCharCode(b)))
  return btoa(s)
}

export function amLoad(b64: string): AMDoc {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return (A as any).load(bytes) as AMDoc
}

export function amGetContent(doc: AMDoc): string {
  try {
    // @ts-ignore
    return (doc as any).content?.toString?.() ?? ''
  } catch { return '' }
}

export function amSetContent(doc: AMDoc, html: string): { doc: AMDoc; changes: any[] } {
  const next = A.change(doc, (d: any) => {
    const t = d.content as any
    const chars = html.split('')
    // replace entire content
    if (typeof t.splice === 'function') {
      t.splice(0, t.length, ...chars)
    } else {
      // fallback if content corrupted
      d.content = (A as any).Text ? new (A as any).Text() : ''
      if (typeof (d.content as any).splice === 'function') (d.content as any).splice(0, 0, ...chars)
    }
  }) as AMDoc
  const changes = (A as any).getChanges(doc, next)
  return { doc: next, changes }
}

export function amApplyChanges(doc: AMDoc, changes: any[]): AMDoc {
  return (A as any).applyChanges(doc, changes) as AMDoc
}

export function encodeChanges(changes: any[]): string[] {
  return changes.map((ch: any) => {
    const bytes: Uint8Array = (A as any).encodeChange(ch)
    let s = ''
    bytes.forEach((b) => (s += String.fromCharCode(b)))
    return btoa(s)
  })
}

export function decodeChanges(list: string[]): any[] {
  return list.map((b64) => {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return (A as any).decodeChange(bytes)
  })
}
