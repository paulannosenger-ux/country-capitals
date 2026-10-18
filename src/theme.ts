// Light/dark theme. No saved choice = follow the system setting.
const KEY = 'country-capitals:theme'
export type Theme = 'light' | 'dark'

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(KEY, theme) } catch { /* private mode: theme just isn't remembered */ }
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f5f7')
}
