// Shared content type models for the Encrypted CMS UI

// Primitive content types supported by the editor/runtime
export type BaseContentType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'table'
  | 'code'
  | 'file'
  | 'hybrid'

// High-level narrative types used by templates / routing
export type NarrativeType = 'article' | 'blog' | 'vlog'

// Unified content type used in UI flows (create new, templates, etc.)
export type ContentType = BaseContentType | NarrativeType

export interface ContentBlockBase {
  id: string
  type: BaseContentType
  createdAt: string
  updatedAt: string
}

export interface TextBlock extends ContentBlockBase {
  type: 'text'
  text: string
}

export interface ImageBlock extends ContentBlockBase {
  type: 'image'
  url: string
  alt?: string
  caption?: string
}

export interface AudioBlock extends ContentBlockBase {
  type: 'audio'
  url: string
  title?: string
}

export interface VideoBlock extends ContentBlockBase {
  type: 'video'
  url: string
  title?: string
}

export interface TableCell {
  id: string
  value: string
}

export interface TableRow {
  id: string
  cells: TableCell[]
}

export interface TableBlock extends ContentBlockBase {
  type: 'table'
  rows: TableRow[]
}

export interface CodeBlock extends ContentBlockBase {
  type: 'code'
  language: string
  code: string
}

export interface FileBlock extends ContentBlockBase {
  type: 'file'
  name: string
  url: string
  mimeType: string
}

// Hybrid content is a container that can mix multiple block types
export interface HybridBlock extends ContentBlockBase {
  type: 'hybrid'
  blocks: ContentBlock[]
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | TableBlock
  | CodeBlock
  | FileBlock
  | HybridBlock

export interface DocumentMeta {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  // e.g. 'article', 'blog', 'vlog', or primitive types like 'text', 'code', etc.
  contentType: ContentType
}

export interface DocumentData extends DocumentMeta {
  blocks: ContentBlock[]
}
