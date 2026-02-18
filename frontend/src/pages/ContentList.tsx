import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db, type DocRow } from '../lib/db'

export default function ContentList(){
  const params = useParams()
  const ctype = params.type as ('blog'|'article'|'vlog'|undefined)
  const [docs, setDocs] = useState<DocRow[]>([])
  const [tag, setTag] = useState<string>('')

  useEffect(() => {
    (async () => {
      const all = await db.docs.toArray()
      const list = all.filter((d: DocRow) => (ctype ? d.type === ctype : true))
      setDocs(list)
    })()
  }, [ctype])

  const filtered = useMemo(() => {
    if (!tag.trim()) return docs
    return docs.filter(d => (d.tags || []).some((t:string)=> t.toLowerCase().includes(tag.toLowerCase())))
  }, [docs, tag])

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">{ctype ? `${ctype}s` : 'Content'}</h2>
        <div className="flex items-center gap-2 text-sm">
          <input
            placeholder="Filter by tag..."
            className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
            value={tag}
            onChange={(e)=>setTag(e.target.value)}
          />
          <Link className="rounded border px-2 py-1 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700/40 transition" to="/">Back</Link>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((d: DocRow) => (
          <li key={d.id} className="rounded border p-4 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm transition hover:shadow-md hover:-translate-y-[1px]">
            <Link to={`/doc/${d.id}`} className="block">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium line-clamp-1">{d.title || 'Untitled'}</span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">{new Date(d.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-gray-600 dark:text-neutral-400 flex flex-wrap gap-1">
                {d.type && <span className="rounded bg-gray-100 dark:bg-neutral-700 px-2 py-[2px]">{d.type}</span>}
                {Array.isArray(d.tags) && d.tags.slice(0,3).map((t: string) => (
                  <span key={t} className="rounded bg-gray-100 dark:bg-neutral-700 px-2 py-[2px]">#{t}</span>
                ))}
                {d.status && <span className="rounded bg-gray-100 dark:bg-neutral-700 px-2 py-[2px]">{d.status}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
