export type ThemePreference = 'dark' | 'light'

const THEME_KEY = 'buckets.theme.v1'

export function readThemePreference(): ThemePreference {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function saveThemePreference(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // The current tab still uses the selected theme if storage is unavailable.
  }
}
