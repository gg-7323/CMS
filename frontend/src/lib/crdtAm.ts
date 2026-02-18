import * as AM from '@automerge/automerge'

export type AMDoc = AM.Doc<{ content: AM.Text }>

export function amNew(): AMDoc {
  return AM.from<{ content: AM.Text }>({ content: new AM.Text() })
}

export function amGetContent(doc: AMDoc): string {
  return doc.content.toString()
}

export function amSetContent(doc: AMDoc, html: string): { doc: AMDoc; changes: AM.Change[] } {
  const next = AM.change(doc, d => {
    // naive: replace entire content as characters
    ;(d.content as AM.Text).splice(0, d.content.length, ...html.split(''))
  })
  const changes = AM.getChanges(doc, next)
  return { doc: next, changes }
}

export function amApplyChanges(doc: AMDoc, changes: AM.Change[]): AMDoc {
  return AM.applyChanges(doc, changes)
}

export function changesToBase64(changes: AM.Change[]): string[] {
  return changes.map(ch => {
    const bytes = AM.encodeChange(ch)
    let s = ''
    bytes.forEach(b => (s += String.fromCharCode(b)))
    return btoa(s)
  })
}

export function base64ToChanges(list: string[]): AM.Change[] {
  return list.map((b64) => {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return AM.decodeChange(bytes)
  })
}
