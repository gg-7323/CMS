import { useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import CodeEditor from './pages/CodeEditor'
import ContentList from './pages/ContentList'
import { startBackgroundSync } from './lib/background'
import { getMode, setTheme } from './lib/theme'
import Passphrase from './pages/Passphrase'
import TabBar from './components/TabBar'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Account from './pages/Account'

export default function App() {
  const [status, setStatus] = useState<string>('')
  const [mode, setMode] = useState<'light'|'dark'>(()=> getMode())
  const location = useLocation()
  const token = useMemo(() => localStorage.getItem('jwt'), [location])
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    // Force default to light mode on first load
    setTheme('light')
    const root = document.documentElement
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    setMode('light')

    // Reflect real browser connectivity
    setStatus(navigator.onLine ? 'Online' : 'Offline')
    const handleOnline = () => {
      setStatus('Online')
    }
    const handleOffline = () => {
      setStatus('Offline')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // start background sync once and check backend health when online
    startBackgroundSync()
    if (navigator.onLine) {
      fetch('/api/health')
        .then(r => r.json())
        .then(d => setStatus(d.ok ? 'Online' : 'Degraded'))
        .catch(() => setStatus('Offline'))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    function onUpdate(e: any){ setUpdateReady(e.detail?.sw || null) }
    window.addEventListener('sw:update-available', onUpdate)
    return () => window.removeEventListener('sw:update-available', onUpdate)
  }, [])

  // S2: Tabs visible for authenticated users on app pages; passphrase is enforced per-doc, not globally.
  const showTabs = !!token && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/passphrase')

  // S2: Require passphrase for EVERY document open. We redirect to /passphrase with next=<path> and
  // allow exactly one navigation to that path by setting sessionStorage.unlock_next to the same value.
  function RequireDocUnlock({ children }: { children: React.ReactNode }){
    const loc = useLocation()
    const next = `${loc.pathname}${loc.search || ''}`
    const allowedRef = useRef<string | null>(null)
    const tokenPath = sessionStorage.getItem('unlock_next')
    const allowOnce = sessionStorage.getItem('unlock_allow')
    // Normalize both sides for comparison; treat /doc/:id and /doc/:id/code as the same doc
    const normalize = (p: string | null) => {
      const canonical = (raw: string) => {
        let out = raw
        // Collapse /doc/:id/code -> /doc/:id so switching modes does not re‑prompt
        if (out.startsWith('/doc/')) {
          const parts = out.split('?')[0].split('/')
          if (parts.length >= 4 && parts[3] === 'code') {
            out = `/${parts[1]}/${parts[2]}`
          }
        }
        if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1)
        return out
      }
      if (!p) return ''
      try {
        const url = new URL(p, window.location.origin)
        const raw = `${url.pathname}${url.search}`
        return canonical(raw)
      } catch {
        let out = p.startsWith('/') ? p : `/${p}`
        const hashIdx = out.indexOf('#')
        if (hashIdx >= 0) out = out.slice(0, hashIdx)
        return canonical(out)
      }
    }
    const A = normalize(tokenPath)
    const B = normalize(next)
    const C = normalize(allowOnce)
    console.debug('[S2] RequireDocUnlock check', { tokenPath, normalizedToken: A, next: B, allowOnce: C })
    // If we've already allowed this exact next within this component lifecycle, allow again
    if (allowedRef.current === B) return <>{children}</>
    // If a persisted one-shot allow matches, consume and allow
    if (C && C === B) {
      allowedRef.current = B
      sessionStorage.removeItem('unlock_allow')
      return <>{children}</>
    }
    if (A && A === B) {
      // Mark as allowed before removing from sessionStorage to survive a second render
      allowedRef.current = B
      sessionStorage.setItem('unlock_allow', B)
      sessionStorage.removeItem('unlock_next')
      return <>{children}</>
    }
    return <Navigate to={`/passphrase?next=${encodeURIComponent(next)}`} replace />
  }

  return (
    <div className="min-h-dvh app-surface text-gray-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-6">
        <header className="flex items-center justify-between py-6">
          <Link to="/" className="group inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black">🔒</span>
            <span className="group-hover:opacity-90">Encrypted CMS</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className={{
              Online: 'inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-300',
              Degraded: 'inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
              Offline: 'inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900/40 dark:text-red-300'
            }[status] || 'inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {status || '—'}
            </span>
            <button
              className="rounded-md border px-3 py-1.5 text-sm shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={()=>{
                const next = mode === 'dark' ? 'light' : 'dark'
                // persist theme for future loads
                setTheme(next)
                // ensure root classes are correct even if something went out of sync
                const root = document.documentElement
                if (next === 'dark') {
                  root.classList.add('dark')
                  root.setAttribute('data-theme', 'dark')
                } else {
                  root.classList.remove('dark')
                  root.setAttribute('data-theme', 'light')
                }
                setMode(next)
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span>Mode</span>
                {mode === 'light' ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
                    {/* moon icon */}
                    <span className="text-[11px]">☾</span>
                  </span>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-yellow-950">
                    {/* sun icon */}
                    <span className="text-[11px]">☼</span>
                  </span>
                )}
              </span>
            </button>
          </div>
        </header>
        {updateReady && (
          <div className="mb-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            A new version is available.
            <button
              className="ml-3 rounded border px-2 py-0.5 text-xs dark:border-neutral-700 hover:bg-white/60 dark:hover:bg-neutral-800"
              onClick={()=>{ updateReady?.postMessage?.({ type: 'SKIP_WAITING' }); setTimeout(()=>window.location.reload(), 300) }}
            >Reload</button>
          </div>
        )}
        {showTabs && <TabBar />}
        <main
          key={location.pathname}
          className="rounded-xl border bg-white p-6 shadow-md ring-1 ring-black/5 dark:bg-neutral-900 dark:border-neutral-800 anim-fade-in-slow"
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/passphrase" element={token ? <Passphrase /> : <Navigate to="/login" replace />} />
            <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/content" element={token ? <ContentList /> : <Navigate to="/login" replace />} />
            <Route path="/content/:type" element={token ? <ContentList /> : <Navigate to="/login" replace />} />
            <Route path="/doc/:id" element={token ? <RequireDocUnlock><Editor /></RequireDocUnlock> : <Navigate to="/login" replace />} />
            <Route path="/doc/:id/code" element={token ? <RequireDocUnlock><CodeEditor /></RequireDocUnlock> : <Navigate to="/login" replace />} />
            <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" replace />} />
            <Route path="/help" element={<Help />} />
            <Route path="/account" element={token ? <Account /> : <Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
