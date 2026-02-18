import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { pushPending } from '../lib/sync'
import { getTemplateHTML, TEMPLATE_DEFS } from '../lib/templates'
import { getMasterKey } from '../lib/keys'
import { decryptJSON } from '../lib/crypto'
import { importSecureDocFromText } from '../lib/secureImport'

type DocSummary = { id: string; title: string; updatedAt: number; type?: 'blog' | 'article' | 'vlog'; template?: string }
type ProtectedSummary = { id: string; title: string; updatedAt: number; payload: string }

type ContentChoice = {
  id: string
  label: string
  description: string
  for?: 'article' | 'blog' | 'vlog' | 'code' | 'table' | 'text' | 'hybrid'
  kind?: string
}

const CONTENT_CHOICES: ContentChoice[] = [
  { id: 'article', label: 'Article', description: 'Long-form articles and docs.', for: 'article' },
  { id: 'blog', label: 'Blog', description: 'Updates, posts, and changelogs.', for: 'blog' },
  { id: 'vlog', label: 'Vlog', description: 'Video-first stories and notes.', for: 'vlog' },
  { id: 'code', label: 'Code', description: 'Code snippets and playgrounds.', for: 'code' },
  { id: 'table', label: 'Table', description: 'Datasets and KPI tables.', for: 'table' },
  { id: 'media', label: 'Media', description: 'Vlog and media-heavy docs.', for: 'vlog' },
  { id: 'text', label: 'Text', description: 'Plain notes and journals.', for: 'text' },
  { id: 'poster', label: 'Poster', description: 'Event and announcement posters.', kind: 'poster' },
  { id: 'presentation', label: 'Presentation', description: 'Slide-style outlines.', kind: 'presentation' },
  { id: 'letter', label: 'Letter', description: 'Letters and thank-you notes.', kind: 'thankyou' },
  { id: 'document', label: 'Document', description: 'Docs overview and FAQ pages.', kind: 'docs-overview' },
  { id: 'report', label: 'Report', description: 'Reports, newsletters, and timelines.', kind: 'newsletter' },
  { id: 'socialmedia', label: 'Social media', description: 'Social cards and posts.', kind: 'social' },
  { id: 'hybrid', label: 'Hybrid', description: 'Mix text, code, and tables.', for: 'hybrid' },
]

export default function Dashboard() {
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [protectedDocs, setProtectedDocs] = useState<ProtectedSummary[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('article-hero')
  const [selectedType, setSelectedType] = useState<'article'|'blog'|'vlog'|'code'|'table'|'text'|'hybrid'>('article')
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showTypeChooser, setShowTypeChooser] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hasExplicitTemplateChoice, setHasExplicitTemplateChoice] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const [allDocs, prot] = await Promise.all([
        db.docs.toArray(),
        db.protected_docs?.toArray?.() ?? [],
      ])
      setDocs(allDocs)
      setProtectedDocs(prot as any)
    })()
  }, [])

  useEffect(() => {
    // When the selected content type changes, default the template to the first matching one
    const first = TEMPLATE_DEFS.find(t => t.for === selectedType)
    if (first) setSelectedTemplateId(first.id)
  }, [selectedType])

  const filteredDocs = useMemo(() => {
    const sorted = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(d => {
      const title = (d.title || '').toLowerCase()
      const tags = (d as any).tags as string[] | undefined
      const status = (d as any).status as string | undefined
      if (title.includes(q)) return true
      if (Array.isArray(tags) && tags.some(t => t.toLowerCase().includes(q))) return true
      if (typeof status === 'string' && status.toLowerCase().includes(q)) return true
      return false
    })
  }, [docs, searchTerm])

  const draftDocs = useMemo(
    () => filteredDocs.filter(d => {
      const status = (d as any).status as string | undefined
      return status !== 'published' && status !== 'archived'
    }),
    [filteredDocs],
  )
  const completedDocs = useMemo(
    () => filteredDocs.filter(d => (d as any).status === 'published'),
    [filteredDocs],
  )
  const archivedDocs = useMemo(
    () => filteredDocs.filter(d => (d as any).status === 'archived'),
    [filteredDocs],
  )

  const protectedList = useMemo(() => {
    const sorted = [...protectedDocs].sort((a, b) => b.updatedAt - a.updatedAt)
    const q = searchTerm.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(p => (p.title || '').toLowerCase().includes(q))
  }, [protectedDocs, searchTerm])

  async function openProtectedDoc(pid: string) {
    try {
      const row = await db.protected_docs.get(pid)
      if (!row) return
      const parsed = JSON.parse((row as any).payload || '{}')
      if (!parsed || parsed.v !== 1 || !parsed.e) throw new Error('Invalid protected payload')
      const master = await getMasterKey()
      const payload = await decryptJSON<any>(master, parsed.e)
      const now = Date.now()
      const id = crypto.randomUUID()
      const meta = payload?.meta || {}
      const content = payload?.content || ''
      await db.docs.put({
        id,
        title: meta.title || (row as any).title || 'Protected doc',
        updatedAt: now,
        type: meta.type || 'article',
        template: meta.template,
        mode: 'rich',
        slug: meta.slug,
        tags: meta.tags,
        status: meta.status || 'draft',
        language: meta.language,
      })
      await db.snapshots.put({ doc_id: id, data: content, updatedAt: now })
      navigate(`/doc/${id}`)
    } catch (err) {
      alert('Could not open protected doc. Make sure your passphrase is entered.')
    }
  }

  async function deleteDocForever(docId: string) {
    const ok = confirm('Delete this document permanently? This cannot be undone.')
    if (!ok) return
    await db.docs.delete(docId)
    await db.snapshots.delete(docId)
    await db.keys.delete(docId)
    await db.cursors.delete(docId)
    await db.updates.where('doc_id').equals(docId).delete()
    try { await db.protected_docs.delete(docId as any) } catch {}
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  const basicTemplates = useMemo(() => {
    let list = TEMPLATE_DEFS.filter(t => t.for === selectedType)
    if (selectedCategory) {
      switch (selectedCategory) {
        case 'poster':
          list = list.filter(t => t.kind === 'poster')
          break
        case 'presentation':
          list = list.filter(t => t.kind === 'presentation')
          break
        case 'letter':
          list = list.filter(t => t.kind === 'thankyou')
          break
        case 'socialmedia':
          list = list.filter(t => t.kind === 'social')
          break
        case 'document':
          list = list.filter(t => t.kind === 'docs-overview' || t.kind === 'faq' || t.kind === 'changelog')
          break
        case 'report':
          list = list.filter(t => t.kind === 'newsletter' || t.kind === 'timeline' || t.kind === 'data-table')
          break
        default:
          break
      }
    }
    return list
  }, [selectedType, selectedCategory])

  function startCreateFlow() {
    if (!hasExplicitTemplateChoice) {
      setShowTypeChooser(true)
      return
    }
    newDocFromTemplate()
  }

  function applyChoice(choice: ContentChoice) {
    let targetType: 'article'|'blog'|'vlog'|'code'|'table'|'text'|'hybrid' = choice.for || 'article'
    let def = choice.kind
      ? TEMPLATE_DEFS.find(t => t.kind === choice.kind)
      : TEMPLATE_DEFS.find(t => t.for === targetType)

    if (!def && choice.for) {
      def = TEMPLATE_DEFS.find(t => t.for === choice.for)
    }

    if (def) {
      setSelectedType(def.for as any)
      setSelectedTemplateId(def.id)
      setHasExplicitTemplateChoice(true)
    } else {
      setSelectedType(targetType)
      setHasExplicitTemplateChoice(false)
    }

    setSelectedCategory(choice.id)
    setShowTypeChooser(false)
  }

  async function newDocFromTemplate(templateId?: string) {
    const def = TEMPLATE_DEFS.find(t => t.id === (templateId || selectedTemplateId))
    if (!def) return
    const narrativeType = (def.for === 'article' || def.for === 'blog' || def.for === 'vlog') ? def.for : 'article'

    setCreating(true)
    try {
      const id = crypto.randomUUID()
      const now = Date.now()
      const title = 'Untitled'

      if (def.for === 'code') {
        // Code docs use the dedicated CodeEditor and raw text snapshots
        const initialCode = `# ${title}\n\n// Start coding here...\n`
        await db.docs.put({ id, title, updatedAt: now, mode: 'code', language: 'typescript' })
        await db.snapshots.put({ doc_id: id, data: initialCode, updatedAt: now })
        navigate(`/doc/${id}/code`)
        return
      }

      // Rich / hybrid docs use the TipTap-based Editor with HTML content
      let html: string
      if (def.for === 'article' || def.for === 'blog' || def.for === 'vlog') {
        html = getTemplateHTML(narrativeType, def.kind)
      } else if (def.for === 'text') {
        html = `
<h1 class="text-3xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-4">Start writing your thoughts here...</p>
<p>...</p>
`
      } else if (def.for === 'table') {
        html = `
<h1 class="text-2xl font-semibold mb-2">${title}</h1>
<p class="text-gray-600 mb-4">Quick dataset overview.</p>
<table>
  <thead>
    <tr>
      <th>Column A</th>
      <th>Column B</th>
      <th>Column C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Value 1</td>
      <td>Value 2</td>
      <td>Value 3</td>
    </tr>
  </tbody>
</table>
`
      } else {
        // hybrid
        html = `
<h1 class="text-3xl font-bold mb-2">${title}</h1>
<p class="text-gray-600 mb-4">Mix text, code, and tables in one place.</p>
<h2>Notes</h2>
<p>...</p>
<pre><code>// Code snippet\nconsole.log('Hello, hybrid');
</code></pre>
<h2>Data</h2>
<table>
  <thead>
    <tr>
      <th>Key</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Example</td>
      <td>42</td>
    </tr>
  </tbody>
</table>
`
      }

      await db.docs.put({ id, title, updatedAt: now, type: narrativeType, template: def.kind, mode: 'rich' })
      await db.snapshots.put({ doc_id: id, data: html, updatedAt: now })
      navigate(`/doc/${id}`)
    } finally {
      setCreating(false)
    }
  }

  async function syncNow(){
    await pushPending()
    alert('Synced pending updates')
  }

  async function handleGlobalDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    try {
      const dt = e.dataTransfer
      if (!dt) return

      // Handle template drag first (D)
      const tplId = dt.getData('application/x-template-id')
      if (tplId) {
        await newDocFromTemplate(tplId)
        return
      }

      if (dt.files && dt.files.length > 0) {
        const file = dt.files[0]
        const name = file.name.toLowerCase()
        if (name.endsWith('.secure.json')) {
          const text = await file.text()
          const id = await importSecureDocFromText(text, 'Imported secure doc')
          navigate(`/doc/${id}`)
          return
        }
        if (name.endsWith('.txt') || name.endsWith('.md')) {
          const text = await file.text()
          const now = Date.now()
          const id = crypto.randomUUID()
          const title = file.name.replace(/\.[^.]+$/, '') || 'Imported note'
          const html = `<h1 class="text-2xl font-semibold mb-2">${title}</h1>\n<pre class="whitespace-pre-wrap">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>`
          await db.docs.put({ id, title, updatedAt: now, type: 'article', mode: 'rich' })
          await db.snapshots.put({ doc_id: id, data: html, updatedAt: now })
          navigate(`/doc/${id}`)
          return
        }
        if (file.type.startsWith('image/')) {
          const now = Date.now()
          const id = crypto.randomUUID()
          const title = file.name || 'Image doc'
          const { uploadMedia } = await import('../api/media')
          const url = await uploadMedia(file)
          const html = `<figure class="my-4"><img src="${url}" alt="${title}" class="max-w-full rounded"/></figure>`
          await db.docs.put({ id, title, updatedAt: now, type: 'article', mode: 'rich' })
          await db.snapshots.put({ doc_id: id, data: html, updatedAt: now })
          navigate(`/doc/${id}`)
          return
        }
      }
    } catch (err) {
      console.error('Drop failed', err)
      alert('Could not handle dropped item.')
    }
  }

  return (
    <div
      className={`mx-auto max-w-5xl p-6 space-y-6 ${dragOver ? 'ring-2 ring-blue-400 bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
      onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleGlobalDrop}
    >
      {/* Top actions */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Home</h2>
          <p className="text-sm text-gray-600 dark:text-neutral-400">Access your works, start from a template, or create something new.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded border px-3 py-1.5 dark:border-neutral-700" onClick={syncNow}>Sync now</button>
          <Link className="rounded border px-3 py-1.5 dark:border-neutral-700" to="/content">Open</Link>
          <button
            className={`rounded bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 dark:bg-white dark:text-black ${creating ? 'opacity-70 cursor-wait animate-pulse' : ''}`}
            onClick={startCreateFlow}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create new'}
          </button>
        </div>
      </section>

      {/* My works */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">My works</h3>
          <div className="flex items-center gap-2 text-xs">
            <input
              placeholder="Search title, tag, or status..."
              className="hidden rounded border px-2 py-1 sm:block dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
            />
            <Link className="rounded border px-3 py-1.5 dark:border-neutral-700" to="/content">View all</Link>
          </div>
        </div>
        {draftDocs.length === 0 && completedDocs.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-sm text-gray-600 dark:border-neutral-700 dark:text-neutral-400">
            You don&apos;t have any documents yet. Pick a template below to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {draftDocs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Drafts</h4>
                  <span className="text-xs text-gray-500 dark:text-neutral-400">{draftDocs.length}</span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {draftDocs.map(d => (
                    <li key={d.id} className="rounded border bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/doc/${d.id}`} className="block flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium line-clamp-1">{d.title || 'Untitled'}</span>
                            <span className="text-xs text-gray-500 dark:text-neutral-400">{new Date(d.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[11px] text-gray-600 dark:text-neutral-400">
                            {d.type && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{d.type}</span>
                            )}
                            {(d as any).status && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{(d as any).status}</span>
                            )}
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs dark:border-neutral-700"
                          onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); void deleteDocForever(d.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {completedDocs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Completed</h4>
                  <span className="text-xs text-gray-500 dark:text-neutral-400">{completedDocs.length}</span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {completedDocs.map(d => (
                    <li key={d.id} className="rounded border bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/doc/${d.id}`} className="block flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium line-clamp-1">{d.title || 'Untitled'}</span>
                            <span className="text-xs text-gray-500 dark:text-neutral-400">{new Date(d.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[11px] text-gray-600 dark:text-neutral-400">
                            {d.type && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{d.type}</span>
                            )}
                            {(d as any).status && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{(d as any).status}</span>
                            )}
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs dark:border-neutral-700"
                          onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); void deleteDocForever(d.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {archivedDocs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Archived</h4>
                  <span className="text-xs text-gray-500 dark:text-neutral-400">{archivedDocs.length}</span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {archivedDocs.map(d => (
                    <li key={d.id} className="rounded border bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/doc/${d.id}`} className="block flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium line-clamp-1">{d.title || 'Untitled'}</span>
                            <span className="text-xs text-gray-500 dark:text-neutral-400">{new Date(d.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[11px] text-gray-600 dark:text-neutral-400">
                            {d.type && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{d.type}</span>
                            )}
                            {(d as any).status && (
                              <span className="rounded bg-gray-100 px-2 py-[2px] dark:bg-neutral-700">{(d as any).status}</span>
                            )}
                          </div>
                        </Link>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs dark:border-neutral-700"
                          onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); void deleteDocForever(d.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {protectedList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Protected</h4>
                  <span className="text-xs text-gray-500 dark:text-neutral-400">{protectedList.length}</span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {protectedList.map(p => (
                    <li key={p.id} className="rounded border bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
                      <button type="button" onClick={()=>openProtectedDoc(p.id)} className="block w-full text-left">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium line-clamp-1">{p.title || 'Protected doc'}</span>
                          <span className="text-xs text-gray-500 dark:text-neutral-400">{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] text-gray-600 dark:text-neutral-400">Encrypted • Passphrase required to open</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {showTypeChooser && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">Select type of content</h3>
                <p className="text-xs text-gray-600 dark:text-neutral-400">Pick what you&apos;re creating first, then choose a template.</p>
              </div>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs dark:border-neutral-700"
                onClick={()=>setShowTypeChooser(false)}
              >
                Cancel
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {CONTENT_CHOICES.map(choice => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={()=>applyChoice(choice)}
                  className="flex h-full flex-col rounded-lg border p-3 text-left text-sm shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400">{choice.id}</span>
                  <span className="font-semibold">{choice.label}</span>
                  <span className="mt-1 text-xs text-gray-600 dark:text-neutral-400 line-clamp-2">{choice.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Basic templates & content type selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Basic templates</h3>
            <select
              className="rounded border px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
              value={selectedType}
              onChange={(e)=>setSelectedType(e.target.value as any)}
            >
              <option value="article">Article</option>
              <option value="blog">Blog</option>
              <option value="vlog">Vlog</option>
              <option value="text">Text</option>
              <option value="code">Code</option>
              <option value="table">Table</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <span className="text-xs text-gray-500 dark:text-neutral-400">Choose a type & template, then click "Create new"</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {basicTemplates.map(def => (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                setSelectedTemplateId(def.id)
                setHasExplicitTemplateChoice(true)
              }}
              draggable
              onDragStart={(e)=>{
                e.dataTransfer.setData('application/x-template-id', def.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className={`flex h-full flex-col rounded-lg border p-3 text-left text-sm shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 ${
                selectedTemplateId === def.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
            >
              <span className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400">{def.for}</span>
              <span className="font-semibold">{def.label}</span>
              <span className="mt-1 text-xs text-gray-600 dark:text-neutral-400 line-clamp-2">{def.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
