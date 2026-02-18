import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { pushSnapshot } from '../lib/sync'
import { exportEncryptedDoc } from '../lib/export'
import { importSecureDocFromText } from '../lib/secureImport'
import { Home, Search, FolderOpen, Save as SaveIcon, Copy, Shield, FileText, HelpCircle, Settings as SettingsIcon, User, LogOut, Trash2, RotateCcw } from 'lucide-react'

export default function TabBar(){
  const loc = useLocation()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [statusTone, setStatusTone] = useState<'default'|'success'|'warn'|'danger'>('default')
  const [docStatus, setDocStatus] = useState<'draft' | 'published' | 'archived' | null>(null)
  const secureFileRef = useRef<HTMLInputElement | null>(null)
  const openFileRef = useRef<HTMLInputElement | null>(null)
  const docId = useMemo(()=>{
    const m = loc.pathname.match(/^\/doc\/([^\/]+)/)
    return m ? m[1] : null
  },[loc.pathname])
  const isDoc = !!docId

  const isActive = (path: string) => loc.pathname === path || (path !== '/' && loc.pathname.startsWith(path))

  const tabCls = (active?: boolean) => `tabbar-item relative inline-flex items-center gap-1 rounded px-3 py-1 transition
    hover:bg-transparent dark:hover:bg-neutral-800 ${active ? 'text-blue-600 dark:text-blue-300' : ''}`

  // Load doc status for delete/restore actions
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!docId) {
        if (!cancelled) setDocStatus(null)
        return
      }
      const row = await db.docs.get(docId)
      if (!cancelled) setDocStatus((row?.status as any) || 'draft')
    })()
    return () => {
      cancelled = true
    }
  }, [docId])

  // Listen for save events from Editor and keyboard shortcuts
  useEffect(() => {
    function onSaving(e: any){ if (e?.detail?.id === docId) { setSaving(true); setStatusTone('default'); setStatusMsg('Saving…') } }
    function onSaved(e: any){ if (e?.detail?.id === docId) { setSaving(false); setSavedAt(Date.now()); setStatusTone('success'); setStatusMsg('Saved') } }
    window.addEventListener('doc:saving', onSaving as any)
    window.addEventListener('doc:saved', onSaved as any)
    function onKey(e: KeyboardEvent){
      const meta = e.ctrlKey || e.metaKey
      if (meta && e.key.toLowerCase() === 's'){
        if (isDoc){ e.preventDefault(); void saveNow() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('doc:saving', onSaving as any)
      window.removeEventListener('doc:saved', onSaved as any)
      window.removeEventListener('keydown', onKey)
    }
  }, [docId, isDoc])

  const statusColorCls = {
    default: 'text-gray-600 dark:text-neutral-400',
    success: 'text-green-600 dark:text-green-400',
    warn: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }[statusTone] || 'text-gray-600 dark:text-neutral-400'

  async function saveNow(){
    if (!docId) return
    const snap = await db.snapshots.get(docId)
    if (!snap?.data) return alert('Nothing to save yet')
    setSaving(true)
    await pushSnapshot(docId, snap.data).catch(()=>{})
    setSaving(false)
    setSavedAt(Date.now())
    setStatusMsg('Saved')
  }

  async function handleOpenFileChange(e: React.ChangeEvent<HTMLInputElement>){
    try {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      const name = file.name.toLowerCase()
      if (name.endsWith('.secure.json')) {
        setStatusTone('default')
        setStatusMsg('Opening secure doc…')
        const text = await file.text()
        const id = await importSecureDocFromText(text, 'Imported secure doc')
        setStatusTone('success')
        setStatusMsg('Secure doc opened')
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
      alert('Unsupported file type. Please select a .secure.json, .txt/.md, or image file.')
    } catch (err) {
      console.error('Failed to open file', err)
      setStatusTone('danger')
      setStatusMsg('Could not open file')
    }
  }

  async function handleSecureFileChange(e: React.ChangeEvent<HTMLInputElement>){
    try {
      const file = e.target.files?.[0]
      // allow re-selecting the same file later
      e.target.value = ''
      if (!file) return
      setStatusTone('default')
      setStatusMsg('Opening secure doc…')
      const text = await file.text()
      const id = await importSecureDocFromText(text, 'Imported secure doc')
      setStatusTone('success')
      setStatusMsg('Secure doc opened')
      navigate(`/doc/${id}`)
    } catch (err) {
      console.error('Failed to open secure doc', err)
      setStatusTone('danger')
      setStatusMsg('Could not open secure doc')
    }
  }

  return (
    <div className="tabbar-root relative mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-white px-2 py-1 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      <input
        ref={secureFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleSecureFileChange}
      />
      <input
        ref={openFileRef}
        type="file"
        className="hidden"
        onChange={handleOpenFileChange}
      />
      {saving && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
          <div className="tabbar-progress-inner anim-saving-stripe h-full w-1/3" />
        </div>
      )}
      <Link className={tabCls(isActive('/'))} to="/">
        <Home className="h-4 w-4" /> Home
        {isActive('/') && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-current" />}
      </Link>
      <Link className={tabCls(isActive('/content'))} to="/content">
        <Search className="h-4 w-4" /> Search
        {isActive('/content') && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-current" />}
      </Link>
      <button className={tabCls(false)} type="button" onClick={()=>openFileRef.current?.click()}>
        <FolderOpen className="h-4 w-4" /> Open
      </button>
      <button
        title="Save (Ctrl+S)"
        className={`${tabCls(false)} ${isDoc? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc}
        onClick={()=>{ void saveNow() }}
      >
        <SaveIcon className="h-4 w-4" /> {saving && isDoc ? 'Saving…' : 'Save'}
      </button>
      <button
        title="Archive"
        className={`${tabCls(false)} ${isDoc ? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc || docStatus === 'archived'}
        onClick={async ()=>{
          if (!docId) return
          const row = await db.docs.get(docId)
          if (!row) return
          const now = Date.now()
          await db.docs.put({ ...row, status: 'archived', updatedAt: now })
          setDocStatus('archived')
          setStatusTone('warn')
          setStatusMsg('Archived')
        }}
      >
        <Trash2 className="h-4 w-4" /> Archive
      </button>
      <button
        title="Restore"
        className={`${tabCls(false)} ${isDoc ? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc || docStatus !== 'archived'}
        onClick={async ()=>{
          if (!docId) return
          const row = await db.docs.get(docId)
          if (!row) return
          const now = Date.now()
          await db.docs.put({ ...row, status: 'draft', updatedAt: now })
          setDocStatus('draft')
          setStatusTone('success')
          setStatusMsg('Restored')
        }}
      >
        <RotateCcw className="h-4 w-4" /> Restore
      </button>
      <button
        title="Delete forever"
        className={`${tabCls(false)} ${isDoc ? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc}
        onClick={async ()=>{
          if (!docId) return
          const ok = confirm('Delete this document permanently? This cannot be undone.')
          if (!ok) return
          await db.docs.delete(docId)
          await db.snapshots.delete(docId)
          await db.keys.delete(docId)
          await db.cursors.delete(docId)
          await db.updates.where('doc_id').equals(docId).delete()
          try { await db.protected_docs.delete(docId) } catch {}
          setStatusTone('danger')
          setStatusMsg('Deleted forever')
          navigate('/')
        }}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
      <button
        title="Save As"
        className={`${tabCls(false)} ${isDoc? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc}
        onClick={async ()=>{
          if (!docId) return
          const oldDoc = await db.docs.get(docId)
          const snap = await db.snapshots.get(docId)
          const id = crypto.randomUUID()
          const now = Date.now()
          await db.docs.put({
            id,
            title: (oldDoc?.title || 'Untitled') + ' (Copy)',
            updatedAt: now,
            type: oldDoc?.type,
            template: oldDoc?.template,
            mode: oldDoc?.mode,
            slug: oldDoc?.slug,
            tags: oldDoc?.tags,
            status: oldDoc?.status,
            language: oldDoc?.language,
          })
          if (snap?.data) await db.snapshots.put({ doc_id: id, data: snap.data, updatedAt: now })
          navigate(`/doc/${id}`)
          setStatusTone('success')
          setStatusMsg('Saved as copy')
        }}
      >
        <Copy className="h-4 w-4" /> Save As
      </button>
      <button
        title="Save Secured"
        className={`${tabCls(false)} ${isDoc? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!isDoc}
        onClick={async ()=>{
          if (!docId) return
          const blob = await exportEncryptedDoc(docId)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `doc-${docId}.secure.json`
          a.click()
          URL.revokeObjectURL(url)
          setStatusTone('success')
          setStatusMsg('Exported secure copy')
        }}
      >
        <Shield className="h-4 w-4" /> Save Secured
      </button>
      <button
        title="Open Secure doc"
        className={tabCls(false)}
        onClick={()=>{ secureFileRef.current?.click() }}
      >
        <Shield className="h-4 w-4" /> Open Secure
      </button>
      <button
        title="Review"
        className={tabCls(false)}
        onClick={()=>alert('Review: compare changes since last save coming soon.')}
      >
        <FileText className="h-4 w-4" /> Review
      </button>
      <Link className={tabCls(isActive('/help'))} to="/help">
        <HelpCircle className="h-4 w-4" /> Help
        {isActive('/help') && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-current" />}
      </Link>
      <Link className={tabCls(isActive('/settings'))} to="/settings">
        <SettingsIcon className="h-4 w-4" /> Settings
        {isActive('/settings') && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-current" />}
      </Link>
      <Link className={`ml-auto ${tabCls(isActive('/account'))}`} to="/account">
        <User className="h-4 w-4" /> Account
        {isActive('/account') && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded bg-current" />}
      </Link>
      <button
        title="Logout"
        className={tabCls(false)}
        onClick={()=>{localStorage.removeItem('jwt'); location.href='/login'}}
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
      <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-neutral-400">
        {saving ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" /> Saving…
          </>
        ) : statusMsg ? (
          <span className={`anim-fade-in ${statusColorCls}`}>
            {statusMsg}{savedAt ? ` • ${new Date(savedAt).toLocaleTimeString()}` : ''}
          </span>
        ) : savedAt ? (
          <span className={statusColorCls}>Saved {new Date(savedAt).toLocaleTimeString()}</span>
        ) : (
          <span className={statusColorCls}>—</span>
        )}
      </span>
    </div>
  )
}
