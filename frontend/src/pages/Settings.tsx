import { useEffect, useState, useMemo } from 'react'
import { getTheme, toggleTheme, THEMES, setTheme as setAppTheme } from '../lib/theme'
import { changePassphrase } from '../lib/keys'

export default function Settings(){
  const [theme, setThemeState] = useState<string>(getTheme() as any || 'light')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [rememberSession, setRememberSession] = useState(true)
  const [newHint, setNewHint] = useState('')
  const [passError, setPassError] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [changing, setChanging] = useState(false)

  useEffect(()=>{
    // keep in sync if theme toggled elsewhere
    setThemeState(getTheme() as any)
  },[])

  const strength = useMemo(() => {
    const p = newPass
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (p.length >= 12) score++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return Math.min(score, 4)
  }, [newPass])

  const strengthLabel = useMemo(() => {
    if (!newPass) return ''
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
  }, [strength, newPass])

  async function handleChangePassphrase(e: React.FormEvent){
    e.preventDefault()
    setPassError('')
    setPassStatus('')
    if (!currentPass) { setPassError('Enter your current passphrase.'); return }
    if (newPass.length < 8) { setPassError('New passphrase should be at least 8 characters.'); return }
    if (strength < 2) { setPassError('New passphrase is too weak. Use a longer phrase with mixed characters.'); return }
    if (newPass !== confirmNew) { setPassError('New passphrases do not match.'); return }

    setChanging(true)
    try {
      await changePassphrase(currentPass, newPass, rememberSession, newHint || undefined)
      setPassStatus('Passphrase updated successfully.')
      setCurrentPass('')
      setNewPass('')
      setConfirmNew('')
    } catch (err: any) {
      setPassError(err?.message || 'Failed to change passphrase. Check your current passphrase and try again.')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-lg border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-lg font-semibold">Appearance</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-neutral-400">Mode</span>
          <button
            className="rounded-md border px-3 py-1.5 text-sm shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            onClick={()=>{ toggleTheme(); setThemeState(getTheme() as any) }}
          >{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</button>
          <span className="ml-4 text-sm text-gray-600 dark:text-neutral-400">Palette</span>
          <select
            className="rounded-md border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={theme}
            onChange={(e)=>{ const t = e.target.value as any; setAppTheme(t); setThemeState(t) }}
          >
            {THEMES.map(t=> (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="ml-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-400">
            <span className="h-4 w-8 rounded-full border shadow-inner" style={{background:'var(--app-bg)'}}/>
            Preview
          </span>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-2 font-medium">Defaults</h3>
        <p className="text-gray-600 dark:text-neutral-400">Using sensible defaults for now. We can add granular editor and content defaults here later.</p>
      </section>

      <section className="rounded-lg border bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-2 font-medium">Security</h3>
        <p className="mb-3 text-gray-600 dark:text-neutral-400">Change the passphrase used to derive your local encryption key. This does not affect your server account password.</p>
        <form onSubmit={handleChangePassphrase} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">Current passphrase</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500"
              value={currentPass}
              onChange={e=>setCurrentPass(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">New passphrase</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500"
              value={newPass}
              onChange={e=>setNewPass(e.target.value)}
            />
            {newPass && (
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
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">Confirm new passphrase</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500"
              value={confirmNew}
              onChange={e=>setConfirmNew(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={e=>setRememberSession(e.target.checked)}
              />
              Remember new passphrase for this session
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">New passphrase hint (optional)</label>
            <input
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500"
              value={newHint}
              onChange={e=>setNewHint(e.target.value)}
              placeholder="Only you should understand this hint"
            />
          </div>
          {passError && <div className="text-xs text-red-600 dark:text-red-400">{passError}</div>}
          {passStatus && <div className="text-xs text-green-600 dark:text-green-400">{passStatus}</div>}
          <button
            type="submit"
            disabled={changing}
            className="inline-flex items-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {changing ? 'Updating…' : 'Update passphrase'}
          </button>
        </form>
      </section>
    </div>
  )
}
