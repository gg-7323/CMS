import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { pushSnapshot, pullLatestSnapshot, pushChanges, pullChanges } from '../lib/sync'
import { shareDoc, getShareInfo } from '../lib/share'
import type { ShareInfoRole } from '../lib/share'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { createLowlight } from 'lowlight'
import { debounce } from '../lib/util'
import { connectDocWS } from '../lib/ws'
import { amNew, amGetContent, amSetContent, amApplyChanges, encodeChanges, decodeChanges } from '../lib/am'

export default function Editor(){
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)
  const [title, setTitle] = useState('Untitled')
  const [docType, setDocType] = useState<'blog'|'article'|'vlog'|'unknown'>('unknown')
  const [template, setTemplate] = useState<'minimal'|'hero'>('minimal')
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined)
  const [dragOver, setDragOver] = useState(false)
  const [uploadPct, setUploadPct] = useState<number>(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [pageBg, setPageBg] = useState<'white'|'soft'|'accent'|'dim'>('white')
  const [shareRole, setShareRole] = useState<ShareInfoRole>('owner')
  const lowlight = useMemo(() => createLowlight(), [])

  const editor = useEditor({
    extensions: [
      Color.configure({ types: ['textStyle'] }),
      TextStyle,
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none min-h-[60vh] focus:outline-none dark:prose-invert',
      },
    },
    onUpdate: debounce(async ({ editor }) => {
      if (!id) return
      const html = editor.getHTML()
      // cache snapshot locally
      await db.snapshots.put({ doc_id: id, data: html, updatedAt: Date.now() })
      // derive title from first line
      const t = editor.getText().trim().split('\n')[0]?.slice(0, 80) || 'Untitled'
      setTitle(t)
      await db.docs.put({ id, title: t, updatedAt: Date.now() })
      // Update Automerge doc and produce changes
      if (docRef.current) {
        const { doc: nextDoc, changes } = amSetContent(docRef.current, html)
        docRef.current = nextDoc
        const changesB64 = encodeChanges(changes)
        if (changesB64.length) {
          // push changes HTTP + broadcast via WS
          await pushChanges(id, changesB64).catch(()=>{})
          wsRef.current?.sendChanges(changesB64).catch?.(()=>{})
        }
      }
      // push snapshot via HTTP (periodic consistency)
      setSyncing(true)
      window.dispatchEvent(new CustomEvent('doc:saving', { detail: { id } }))
      await pushSnapshot(id, html).catch(()=>{})
      setSyncing(false)
      window.dispatchEvent(new CustomEvent('doc:saved', { detail: { id } }))
      // also broadcast latest snapshot for viewers without CRDT session
      wsRef.current?.sendSnapshot(html).catch?.(()=>{})
    }, 400),
  })

  const wsRef = useMemo(() => ({ current: null as null | ReturnType<typeof connectDocWS> }), [])
  const docRef = useMemo(() => ({ current: amNew() }), [])

  useEffect(() => {
    (async () => {
      if (!id || !editor) return
      // load doc metadata
      const doc = await db.docs.get(id)
      if (doc) {
        setDocType((doc.type as any) || 'unknown')
        if (doc.template === 'minimal' || doc.template === 'hero') setTemplate(doc.template)
        if (doc.coverUrl) setCoverUrl(doc.coverUrl)
        if (doc.title) setTitle(doc.title)
      }
      // connect websocket room
      try {
        wsRef.current?.close()
      } catch {}
      wsRef.current = connectDocWS(id)
      wsRef.current.onSnapshot(async (html: string) => {
        // apply remote snapshot if it differs
        const localHtml = editor.getHTML()
        if (html && html !== localHtml) {
          editor.commands.setContent(html)
          const nt = (editor.getText().trim().split('\n')[0] || 'Untitled').slice(0,80)
          setTitle(nt)
          await db.snapshots.put({ doc_id: id, data: html, updatedAt: Date.now() })
          await db.docs.put({ id, title: nt, updatedAt: Date.now() })
        }
      })
      wsRef.current.onChanges(async (list: string[]) => {
        if (!list?.length) return
        // decode and apply to Automerge, then render to editor
        const changes = decodeChanges(list)
        docRef.current = amApplyChanges(docRef.current, changes)
        const html = amGetContent(docRef.current)
        const localHtml = editor.getHTML()
        if (html && html !== localHtml) {
          editor.commands.setContent(html)
          const nt = (editor.getText().trim().split('\n')[0] || 'Untitled').slice(0,80)
          setTitle(nt)
          await db.snapshots.put({ doc_id: id, data: html, updatedAt: Date.now() })
          await db.docs.put({ id, title: nt, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl })
        }
      })
      // Load local cached snapshot first for instant display
      const local = await db.snapshots.get(id)
      if (local?.data) editor.commands.setContent(local.data)
      const t = (editor.getText().trim().split('\n')[0] || 'Untitled').slice(0,80)
      setTitle(t)
      // Pull latest remote snapshot
      setSyncing(true)
      const remote = await pullLatestSnapshot(id)
      if (remote && remote !== local?.data) {
        editor.commands.setContent(remote)
        const nt = (editor.getText().trim().split('\n')[0] || 'Untitled').slice(0,80)
        setTitle(nt)
        await db.snapshots.put({ doc_id: id, data: remote, updatedAt: Date.now() })
        await db.docs.put({ id, title: nt, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl })
      }
      // Pull pending CRDT changes and apply
      const pending = await pullChanges(id)
      if (pending.length) {
        const changes = decodeChanges(pending)
        docRef.current = amApplyChanges(docRef.current, changes)
        const html2 = amGetContent(docRef.current)
        if (html2 && html2 !== editor.getHTML()) editor.commands.setContent(html2)
      }
      setSyncing(false)
      try {
        const info = await getShareInfo(id)
        setShareRole(info.me_role)
      } catch (err) {
        // ignore share info errors
      }
    })()
  }, [id, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(shareRole !== 'viewer')
  }, [editor, shareRole])

  const pageBgClass = pageBg === 'soft'
    ? 'bg-slate-50 dark:bg-neutral-900'
    : pageBg === 'accent'
      ? 'bg-gradient-to-br from-sky-50 via-violet-50 to-pink-50 dark:bg-neutral-900'
      : pageBg === 'dim'
        ? 'bg-neutral-900/90 text-neutral-50'
        : 'bg-white dark:bg-neutral-900'

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <input
          className="w-full max-w-[70%] rounded border px-3 py-2 text-lg font-medium dark:bg-neutral-800 dark:border-neutral-700"
          value={title}
          onChange={async (e)=>{
            const v = e.target.value
            setTitle(v)
            if (id) await db.docs.put({ id, title: v, updatedAt: Date.now() })
          }}
        />
        <span className={`ml-3 inline-flex items-center rounded-full px-3 py-1 text-xs ${navigator.onLine ? (syncing ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300') : 'bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300'}`}>
          {navigator.onLine ? (syncing ? 'Syncing…' : 'Online') : 'Offline'}
        </span>
      </div>

      {/* Meta controls: type/template, cover image for hero, and mode toggle */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {shareRole === 'viewer' && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 border border-amber-200">
            View only
          </span>
        )}
        <select className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" value={docType} onChange={async (e)=>{
          const v = e.target.value as any
          setDocType(v)
          if (id) await db.docs.put({ id, title, updatedAt: Date.now(), type: (v === 'unknown' ? undefined : v), template, coverUrl })
        }}>
          <option value="unknown">No type</option>
          <option value="blog">Blog</option>
          <option value="article">Article</option>
          <option value="vlog">Vlog</option>
        </select>
        <select className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" value={template} onChange={async (e)=>{
          const v = e.target.value as 'minimal'|'hero'
          setTemplate(v)
          if (id) await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template: v, coverUrl })
        }}>
          <option value="minimal">Minimal</option>
          <option value="hero">Cover/Hero</option>
        </select>
        {template === 'hero' && (
          <label className="ml-2 inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1 dark:border-neutral-700">
            <span>Set Cover</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
              const f = e.target.files?.[0]
              if (!f || !id || !editor) return
              const { uploadMedia } = await import('../api/media')
              const url = await uploadMedia(f)
              setCoverUrl(url)
              await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl: url })
              // insert/ensure image at top
              editor.chain().focus().setTextSelection(0).setImage({ src: url }).run()
            }} />
          </label>
        )}
        <button className="ml-auto rounded border px-2 py-1 dark:border-neutral-700" onClick={async ()=>{
          if (!id) return
          await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl, mode: 'code' })
          navigate(`/doc/${id}/code`)
        }}>Switch to Code</button>
        <button
          className="rounded border px-2 py-1 dark:border-neutral-700"
          onClick={async () => {
            if (!id) return
            const target = prompt('Share with user email:')?.trim().toLowerCase()
            if (!target) return
            const roleRaw = prompt('Role for this user? Type "viewer" for read-only, anything else for editor (default: editor):')?.trim().toLowerCase()
            const role = (roleRaw === 'viewer' ? 'viewer' : 'editor') as 'viewer' | 'editor'
            try {
              await shareDoc(id, target, role)
              alert(`Shared with ${target} as ${role}`)
            } catch (err) {
              console.error('Failed to share doc', err)
              alert('Could not update sharing for this document.')
            }
          }}
        >
          Share
        </button>
      </div>

      {/* Metadata: slug, tags, status */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          placeholder="Slug (my-post)"
          className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
          defaultValue={''}
          onBlur={async (e)=>{
            if (!id) return
            const slug = e.target.value.trim()
            await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl, slug })
          }}
        />
        <input
          placeholder="Tags (comma separated)"
          className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
          defaultValue={''}
          onBlur={async (e)=>{
            if (!id) return
            const tags = e.target.value.split(',').map(s=>s.trim()).filter(Boolean)
            await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl, tags })
          }}
        />
        <select
          className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
          onChange={async (e)=>{
            if (!id) return
            const status = e.target.value as 'draft'|'published'|'archived'
            await db.docs.put({ id, title, updatedAt: Date.now(), type: (docType === 'unknown' ? undefined : docType), template, coverUrl, status })
          }}
          defaultValue={'draft'}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded border p-2 text-sm dark:border-neutral-700">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Text</span>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleBold().run()}>Bold</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleItalic().run()}>Italic</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Lists</span>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleBulletList().run()}>Bullets</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleOrderedList().run()}>Numbered</button>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Blocks</span>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleCodeBlock().run()}>Code</button>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Table</span>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>New</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().addRowBefore().run()}>Row +Before</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().addRowAfter().run()}>Row +After</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().deleteRow().run()}>Row -</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().addColumnBefore().run()}>Col +Before</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().addColumnAfter().run()}>Col +After</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().deleteColumn().run()}>Col -</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().toggleHeaderRow().run()}>Header</button>
          <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={()=>editor?.chain().focus().deleteTable().run()}>Delete</button>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Media</span>
          <label className="rounded border px-2 py-1 dark:border-neutral-700 cursor-pointer">
            Image
            <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{
              const f = e.target.files?.[0]
              if (!f || !id || !editor) return
              const { uploadMedia } = await import('../api/media')
              const url = await uploadMedia(f)
              editor.chain().focus().setImage({ src: url }).run()
            }} />
          </label>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              const url = prompt('Audio URL (mp3/ogg):')?.trim()
              if (!url) return
              editor.chain().focus().insertContent(`<p><audio controls src="${url}">Your browser does not support the audio element.</audio></p>`).run()
            }}
          >
            Audio
          </button>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              const url = prompt('Video URL (mp4/webm or embed URL):')?.trim()
              if (!url) return
              editor.chain().focus().insertContent(`<p><video controls class="w-full max-w-xl" src="${url}">Your browser does not support the video tag.</video></p>`).run()
            }}
          >
            Video
          </button>
          <label className="rounded border px-2 py-1 dark:border-neutral-700 cursor-pointer">
            Attach
            <input
              type="file"
              className="hidden"
              onChange={async (e)=>{
                const f = e.target.files?.[0]
                if (!f || !id || !editor) return
                const { uploadMedia } = await import('../api/media')
                const url = await uploadMedia(f)
                const name = f.name || 'download'
                editor
                  .chain()
                  .focus()
                  .insertContent(`<p><a href="${url}" target="_blank" rel="noopener noreferrer" class="underline">${name}</a></p>`)
                  .run()
              }}
            />
          </label>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Shapes</span>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              editor
                .chain()
                .focus()
                .insertContent(`
<section class="my-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
  <p class="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Note</p>
  <p>Add a short highlighted note or callout here.</p>
</section>
`)
                .run()
            }}
          >
            Note box
          </button>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              editor
                .chain()
                .focus()
                .insertContent(`
<section class="my-4 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
  <div class="flex flex-col justify-center">
    <p class="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">Key metric</p>
    <p class="text-3xl font-extrabold">72%</p>
    <p class="text-xs text-indigo-800/80">Describe what this number represents.</p>
  </div>
  <div class="rounded-xl bg-white/80 p-3 text-xs text-gray-700">
    <p>Use this area to explain the context or story behind the metric.</p>
  </div>
</section>
`)
                .run()
            }}
          >
            Stat card
          </button>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              editor
                .chain()
                .focus()
                .insertContent(`
<section class="my-4 overflow-hidden rounded-3xl border bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 p-4 text-white">
  <div class="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] opacity-80 mb-1">Feature highlight</p>
      <p class="text-xl font-semibold mb-1">Add a bold headline here.</p>
      <p class="text-xs opacity-90">Write a single sentence explaining what you&apos;re highlighting.</p>
    </div>
    <div class="rounded-2xl bg-white/15 p-3 text-[11px]">
      <p class="font-medium mb-1">Drop an image or logo here.</p>
      <p class="opacity-90">Replace this placeholder with your visual.</p>
    </div>
  </div>
</section>
`)
                .run()
            }}
          >
            Banner
          </button>
          <button
            className="rounded border px-2 py-1 dark:border-neutral-700"
            onClick={()=>{
              if (!editor) return
              editor
                .chain()
                .focus()
                .insertContent(`
<p class="my-3 flex flex-wrap gap-2 text-xs">
  <span class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700">Label</span>
  <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">Success</span>
  <span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Warning</span>
</p>
`)
                .run()
            }}
          >
            Badges
          </button>
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700" />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Page</span>
          <button
            type="button"
            title="White page"
            className={`h-6 w-6 rounded-full border border-gray-300 dark:border-neutral-600 bg-white ${pageBg === 'white' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={()=>setPageBg('white')}
          />
          <button
            type="button"
            title="Soft background"
            className={`h-6 w-6 rounded-full border border-gray-300 dark:border-neutral-600 bg-slate-50 ${pageBg === 'soft' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={()=>setPageBg('soft')}
          />
          <button
            type="button"
            title="Accent background"
            className={`h-6 w-6 rounded-full border border-gray-300 dark:border-neutral-600 bg-gradient-to-br from-sky-300 via-purple-300 to-pink-300 ${pageBg === 'accent' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={()=>setPageBg('accent')}
          />
          <button
            type="button"
            title="Dark canvas"
            className={`h-6 w-6 rounded-full border border-gray-300 dark:border-neutral-600 bg-neutral-900 ${pageBg === 'dim' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={()=>setPageBg('dim')}
          />
          <span className="ml-3 text-[11px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">Text color</span>
          {[{name:'Default', value:'#111827'}, {name:'Blue', value:'#2563eb'}, {name:'Indigo', value:'#4f46e5'}, {name:'Purple', value:'#7c3aed'}, {name:'Pink', value:'#db2777'}, {name:'Green', value:'#16a34a'}, {name:'Teal', value:'#0d9488'}, {name:'Red', value:'#dc2626'}, {name:'Orange', value:'#ea580c'}].map(c => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              className="h-6 w-6 rounded-full border border-gray-300 dark:border-neutral-600"
              style={{ backgroundColor: c.value }}
              onClick={()=>((editor?.chain().focus() as any).setColor(c.value).run())}
            />
          ))}
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs dark:border-neutral-700"
            onClick={()=>((editor?.chain().focus() as any).unsetColor().run())}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className={`rounded border p-3 dark:border-neutral-700 ${pageBgClass} ${dragOver ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
        onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
        onDragLeave={()=> setDragOver(false)}
        onDrop={async (e)=>{
          if (!editor) return
          setDragOver(false)
          if (e.dataTransfer?.files?.length) {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            setPreview(URL.createObjectURL(file))
            setUploadPct(0)
            const { uploadMedia } = await import('../api/media')
            const url = await uploadMedia(file, (p)=>setUploadPct(p))
            setPreview(null)
            setUploadPct(0)
            editor.chain().focus().setImage({ src: url }).run()
          }
        }}
        onPaste={async (e)=>{
          if (!editor) return
          const items = e.clipboardData?.items
          if (!items) return
          for (const item of items) {
            if (item.kind === 'file') {
              const file = item.getAsFile()
              if (!file) continue
              e.preventDefault()
              setPreview(URL.createObjectURL(file))
              setUploadPct(0)
              const { uploadMedia } = await import('../api/media')
              const url = await uploadMedia(file, (p)=>setUploadPct(p))
              setPreview(null)
              setUploadPct(0)
              editor.chain().focus().setImage({ src: url }).run()
              break
            }
          }
        }}
      >
        {(preview || uploadPct>0) && (
          <div className="mb-3 rounded-md border p-3 text-sm dark:border-neutral-700">
            {preview && <img src={preview} alt="preview" className="mb-2 max-h-40 w-auto rounded" />}
            {uploadPct>0 && <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-neutral-700"><div className="h-full bg-blue-500" style={{width: `${uploadPct}%`}}/></div>}
          </div>
        )}
        {editor && <EditorContent editor={editor} />}
      </div>
    </div>
  )
}
