import { useEffect, useRef, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setPassphrase, getPassphraseHint, exportKeyBundle, importKeyBundle } from '../lib/keys'

export default function Passphrase(){
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')
  const [backupPw, setBackupPw] = useState('')
  const [backupStatus, setBackupStatus] = useState('')
  const [backupError, setBackupError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(()=>{
    const existing = getPassphraseHint()
    if (existing) setHint(existing)
  },[])

  const strength = useMemo(() => {
    const p = pass
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (p.length >= 12) score++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return Math.min(score, 4)
  }, [pass])

  const strengthLabel = useMemo(() => {
    if (!pass) return ''
    switch (strength) {
      case 0:
      case 1:
        return 'Weak'
      case 2:
        return 'Fair'
      case 3:
        return 'Strong'
      case 4:
        return 'Very strong'
      default:
        return ''
    }
  }, [strength, pass])

  async function submit(e: React.FormEvent){
    e.preventDefault()
    setError('')
    if (pass.length < 8) { setError('Passphrase should be at least 8 characters.'); return }
    if (strength < 2) { setError('Passphrase is too weak. Use a longer phrase with mixed characters.'); return }
    if (confirm && pass !== confirm) { setError('Passphrases do not match.'); return }
    try {
      await setPassphrase(pass, remember, hint || undefined)
      // S2: if we came here with a next path, allow exactly one navigation to that path
      const params = new URLSearchParams(location.search)
      const next = params.get('next')
      if (next) {
        // Normalize next to exactly `${pathname}${search}` to match the guard computation
        let normalized = ''
        try {
          const url = new URL(next, window.location.origin)
          normalized = `${url.pathname}${url.search}`
        } catch {
          // Fallback: ensure leading slash and no hash
          const n = next.startsWith('/') ? next : `/${next}`
          const hashIdx = n.indexOf('#')
          normalized = hashIdx >= 0 ? n.slice(0, hashIdx) : n
        }
        console.debug('[S2] Passphrase submit', { next, normalized })
        sessionStorage.setItem('unlock_next', normalized)
        navigate(normalized, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setError('Failed to initialize encryption. Try again.')
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6 space-y-4 animate-[fadein_200ms_ease-out]">
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <h2 className="mb-4 text-xl font-semibold">Set/Unlock Passphrase</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-neutral-400">This passphrase is used only to derive your encryption key locally. It is never sent to the server.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          placeholder="Enter passphrase"
          className="w-full rounded border p-2 bg-white dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
          value={pass}
          onChange={e=>setPass(e.target.value)}
        />
        {pass && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-neutral-400">Strength</span>
              <span
                className={
                  strength <= 1
                    ? 'text-red-600 dark:text-red-400'
                    : strength === 2
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
                }
              >
                {strengthLabel}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={{
                  0: 'bg-red-500',
                  1: 'bg-red-500',
                  2: 'bg-yellow-500',
                  3: 'bg-green-500',
                  4: 'bg-emerald-500',
                }[strength] + ' h-full transition-all'}
                style={{ width: `${(strength / 4) * 100}%` }}
              />
            </div>
          </div>
        )}
        <input
          type="password"
          placeholder="Confirm passphrase (optional)"
          className="w-full rounded border p-2 bg-white dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
          value={confirm}
          onChange={e=>setConfirm(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
            Remember for this session
          </label>
          <input
            placeholder="Passphrase hint (optional)"
            className="flex-1 rounded border px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
            value={hint}
            onChange={e=>setHint(e.target.value)}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full rounded bg-black p-2 text-white dark:bg-white dark:text-black transition hover:opacity-90" type="submit">Continue</button>
      </form>
      <div className="mt-3 text-xs text-gray-500 dark:text-neutral-400">Tip: You will be asked to re-enter the passphrase when you reload or open a new session (unless remembered for this session only).</div>

      <div className="rounded border p-3 text-sm dark:border-neutral-700">
        <h3 className="mb-2 font-medium">Key Backup</h3>
        <div className="mb-2 flex items-center gap-2">
          <input
            type="password"
            placeholder="Backup password"
            className="flex-1 rounded border px-2 py-1 bg-white dark:border-neutral-700 dark:bg-neutral-800 transition focus:ring-2 focus:ring-blue-500"
            value={backupPw}
            onChange={e=>setBackupPw(e.target.value)}
          />
          <button
            className="rounded border px-3 py-1 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700/40 transition"
            onClick={async ()=>{
              setBackupError('')
              setBackupStatus('')
              if (!backupPw) {
                setBackupError('Enter a backup password to export a backup file.')
                return
              }
              try {
                const blob = await exportKeyBundle(backupPw)
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'cms-key-backup.json'
                a.click()
                URL.revokeObjectURL(url)
                setBackupStatus('Backup file downloaded.')
              } catch (err: any) {
                console.error('Failed to export key backup', err)
                setBackupError('Could not export backup. Try again.')
              }
            }}
            type="button"
          >Export</button>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="application/json" className="text-xs" />
          <button
            className="rounded border px-3 py-1 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700/40 transition"
            onClick={async ()=>{
              setBackupError('')
              setBackupStatus('')
              if (!backupPw) {
                setBackupError('Enter the backup password used to encrypt the file.')
                return
              }
              const file = fileRef.current?.files?.[0]
              if (!file) {
                setBackupError('Choose a backup file to import.')
                return
              }
              try {
                await importKeyBundle(file, backupPw)
                setBackupStatus('Backup imported. You can now unlock docs with your passphrase.')
              } catch (err: any) {
                console.error('Failed to import key backup', err)
                setBackupError('Could not import backup. Check that the backup password and file are correct.')
              }
            }}
            type="button"
          >Import</button>
        </div>
        {(backupStatus || backupError) && (
          <div className="mt-2 space-y-1 text-xs">
            {backupStatus && <div className="text-green-600">{backupStatus}</div>}
            {backupError && <div className="text-red-600">{backupError}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
