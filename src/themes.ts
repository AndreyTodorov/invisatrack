export interface ThemeDefinition {
  id: string
  name: string
  swatchColors: [string, string, string]  // bg, accent, text
}

export const THEMES: ThemeDefinition[] = [
  { id: 'obsidian',     name: 'Obsidian',     swatchColors: ['#060913', '#00D8FF', '#E8EEFF'] },
  { id: 'light',        name: 'Light',        swatchColors: ['#FFFBF0', '#0055FF', '#0A0A0A'] },
  { id: 'neobrutalism', name: 'Neobrutalism', swatchColors: ['#FAFAFA', '#FFD400', '#0D0D0D'] },
]

export const DEFAULT_THEME_ID = 'obsidian'

export function resolveTheme(id: string | undefined | null): string {
  return THEMES.find(t => t.id === id) ? id! : DEFAULT_THEME_ID
}
