import Dexie, { type Table } from 'dexie'

export interface DocRow {
  id: string
  title: string
  updatedAt: number
  type?: 'blog' | 'article' | 'vlog'
  template?: string
  coverUrl?: string
  mode?: 'rich' | 'code'
  slug?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
  language?: string
}

export interface UpdateRow {
  id?: number
  doc_id: string
  cursor: number
  payload: string // encrypted base64 blob
  ts: number
  pushed?: 0 | 1
}

export interface CursorRow {
  id: string // doc_id or 'global'
  cursor: number
}

export interface KeyRow {
  doc_id: string
  wrapped: string // encrypted JSON string containing exported raw key (base64), iv
}

export interface SnapshotRow {
  doc_id: string
  data: string // base64 of Automerge save() bytes
  updatedAt: number
}

export interface ProtectedDocRow {
  id: string
  title: string
  updatedAt: number
  payload: string // JSON string of encrypted secure doc { v:1, e: {...} }
}

export class AppDB extends Dexie {
  docs!: Table<DocRow, string>
  updates!: Table<UpdateRow, number>
  cursors!: Table<CursorRow, string>
  keys!: Table<KeyRow, string>
  snapshots!: Table<SnapshotRow, string>
  protected_docs!: Table<ProtectedDocRow, string>

  constructor() {
    super('encrypted_cms')
    this.version(1).stores({
      docs: 'id, updatedAt',
      updates: '++id, doc_id, cursor, pushed',
      cursors: 'id',
    })
    this.version(2).stores({
      docs: 'id, updatedAt',
      updates: '++id, doc_id, cursor, pushed',
      cursors: 'id',
      keys: 'doc_id',
    })
    this.version(3).stores({
      docs: 'id, updatedAt',
      updates: '++id, doc_id, cursor, pushed',
      cursors: 'id',
      keys: 'doc_id',
      snapshots: 'doc_id, updatedAt',
    })
    this.version(4).stores({
      docs: 'id, updatedAt',
      updates: '++id, doc_id, cursor, pushed',
      cursors: 'id',
      keys: 'doc_id',
      snapshots: 'doc_id, updatedAt',
      protected_docs: 'id, updatedAt',
    })
  }
}

export const db = new AppDB()
