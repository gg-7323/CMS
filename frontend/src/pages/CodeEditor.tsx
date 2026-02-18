import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Monaco from '@monaco-editor/react'
import { db } from '../lib/db'
import { pushSnapshot, pullLatestSnapshot, pushChanges, pullChanges } from '../lib/sync'
import { debounce } from '../lib/util'
import { connectDocWS } from '../lib/ws'
import { amNew, amGetContent, amSetContent, amApplyChanges, encodeChanges, decodeChanges } from '../lib/am'

export default function CodeEditor(){
  const { id } = useParams<{id:string}>()
  const [syncing, setSyncing] = useState(false)
  const [title, setTitle] = useState('Untitled')
  const [value, setValue] = useState<string>('')
  const [language, setLanguage] = useState<string>('markdown')

  const wsRef = useMemo(() => ({ current: null as null | ReturnType<typeof connectDocWS> }), [])
  const docRef = useMemo(() => ({ current: amNew() }), [])
  const mounted = useRef(false)

  useEffect(() => {
    (async () => {
      if (!id) return
      // load doc meta and cached snapshot
      const doc = await db.docs.get(id)
      if (doc?.title) setTitle(doc.title)
      if (doc?.language) setLanguage(doc.language)
      const local = await db.snapshots.get(id)
      if (local?.data) setValue(local.data)

      try { wsRef.current?.close() } catch {}
      wsRef.current = connectDocWS(id)
      wsRef.current.onSnapshot(async (txt: string) => {
        if (typeof txt !== 'string') return
        if (txt !== value) {
          setValue(txt)
          const nt = (txt.split('\n')[0] || 'Untitled').slice(0,80)
          setTitle(nt)
          await db.snapshots.put({ doc_id: id, data: txt, updatedAt: Date.now() })
          await db.docs.put({ id, title: nt, updatedAt: Date.now(), mode: 'code', language })
        }
      })
      wsRef.current.onChanges(async (list: string[]) => {
        if (!list?.length) return
        const changes = decodeChanges(list)
        docRef.current = amApplyChanges(docRef.current, changes)
        const txt = amGetContent(docRef.current)
        if (txt && txt !== value) setValue(txt)
      })

      setSyncing(true)
      const remote = await pullLatestSnapshot(id)
      if (remote && remote !== local?.data) {
        setValue(remote)
        const nt = (remote.split('\n')[0] || 'Untitled').slice(0,80)
        setTitle(nt)
        await db.snapshots.put({ doc_id: id, data: remote, updatedAt: Date.now() })
        await db.docs.put({ id, title: nt, updatedAt: Date.now(), mode: 'code', language })
      }
      const pending = await pullChanges(id)
      if (pending.length) {
        const changes = decodeChanges(pending)
        docRef.current = amApplyChanges(docRef.current, changes)
        const txt2 = amGetContent(docRef.current)
        if (txt2) setValue(txt2)
      }
      setSyncing(false)
      mounted.current = true
    })()
  }, [id])

  const onChange = useMemo(() => debounce(async (val?: string) => {
    if (!id) return
    const text = val ?? ''
    setValue(text)
    const t = (text.split('\n')[0] || 'Untitled').slice(0,80)
    setTitle(t)
    await db.docs.put({ id, title: t, updatedAt: Date.now(), mode: 'code', language })
    await db.snapshots.put({ doc_id: id, data: text, updatedAt: Date.now() })
    if (docRef.current) {
      const { doc: nextDoc, changes } = amSetContent(docRef.current, text)
      docRef.current = nextDoc
      const changesB64 = encodeChanges(changes)
      if (changesB64.length) {
        await pushChanges(id, changesB64).catch(()=>{})
        wsRef.current?.sendChanges(changesB64).catch?.(()=>{})
      }
    }
    setSyncing(true)
    await pushSnapshot(id, text).catch(()=>{})
    setSyncing(false)
    wsRef.current?.sendSnapshot(text).catch?.(()=>{})
  }, 300), [id])

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <input
          className="w-full max-w-[70%] rounded border px-3 py-2 text-lg font-medium dark:bg-neutral-800 dark:border-neutral-700"
          value={title}
          onChange={async (e)=>{
            const v = e.target.value
            setTitle(v)
            if (id) await db.docs.put({ id, title: v, updatedAt: Date.now(), mode: 'code', language })
          }}
        />
        <span className={`ml-3 inline-flex items-center rounded-full px-3 py-1 text-xs ${navigator.onLine ? (syncing ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300') : 'bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300'}`}>
          {navigator.onLine ? (syncing ? 'Syncing…' : 'Online') : 'Offline'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" value={language} onChange={async (e)=>{
          const lang = e.target.value
          setLanguage(lang)
          if (id) await db.docs.put({ id, title, updatedAt: Date.now(), mode: 'code', language: lang })
        }}>
          <option value="markdown">Markdown</option>
          <option value="typescript">TypeScript</option>
          <option value="javascript">JavaScript</option>
          <option value="json">JSON</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
          <option value="yaml">YAML</option>
          <option value="shell">Shell</option>
        </select>
        <button className="rounded border px-2 py-1 dark:border-neutral-700" onClick={async ()=>{
          if (!id) return
          await db.docs.put({ id, title, updatedAt: Date.now(), mode: 'rich' })
          location.href = `/doc/${id}`
        }}>Switch to Rich</button>
      </div>

      <div className="h-[70vh] overflow-hidden rounded border dark:border-neutral-700">
        <Monaco
          height="70vh"
          theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
          language={language}
          value={value}
          onChange={(v)=>{
            // suppress first setValue from mount
            if (!mounted.current) return
            onChange(v ?? '')
          }}
          options={{
            wordWrap: 'on',
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
      </div>
    </div>
  )
}
