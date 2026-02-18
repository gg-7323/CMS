export type DocSnapshot = { content: string }

export function newSnapshot(): DocSnapshot { return { content: '' } }
export function setContentSnap(s: DocSnapshot, html: string): DocSnapshot { return { ...s, content: html } }
export function getContentSnap(s: DocSnapshot): string { return s.content }
