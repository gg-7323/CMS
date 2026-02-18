const THEME_KEY = 'theme'

export type Theme =
  | 'light'
  | 'dark'
  | 'light-red'
  | 'light-yellow'
  | 'light-blue'
  | 'light-green'
  | 'light-purple'
  | 'light-orange'
  | 'light-teal'
  | 'light-pink'
  | 'dark-red'
  | 'dark-yellow'
  | 'dark-blue'
  | 'dark-green'
  | 'dark-purple'
  | 'dark-orange'
  | 'dark-teal'
  | 'dark-pink'

export const THEMES: Theme[] = [
  'light',
  'dark',
  'light-red',
  'light-yellow',
  'light-blue',
  'light-green',
  'light-purple',
  'light-orange',
  'light-teal',
  'light-pink',
  'dark-red',
  'dark-yellow',
  'dark-blue',
  'dark-green',
  'dark-purple',
  'dark-orange',
  'dark-teal',
  'dark-pink',
]

export function getTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme | null) || 'light'
}

export function getMode(): 'light' | 'dark' {
  const t = getTheme()
  return t.startsWith('dark') ? 'dark' : 'light'
}

export function applyTheme(t: Theme) {
  const root = document.documentElement
  // dark mode toggle for all dark-* themes
  if (t.startsWith('dark')) root.classList.add('dark')
  else root.classList.remove('dark')
  // data-theme for color accents
  root.setAttribute('data-theme', t)
}

export function setTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, t)
  applyTheme(t)
}

export function initTheme() {
  applyTheme(getTheme())
}

export function toggleTheme() {
  const mode = getMode()
  const next: Theme = mode === 'dark' ? 'light' : 'dark'
  setTheme(next)
}
