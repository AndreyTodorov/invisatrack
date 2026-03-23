export interface ThemeDefinition {
  id: string
  name: string
  swatchColors: [string, string, string]  // bg, accent, text
}

export const THEMES: ThemeDefinition[] = [
  { id: 'obsidian',     name: 'Obsidian',     swatchColors: ['#060913', '#22D3EE', '#E8EEFF'] },
  { id: 'neobrutalism', name: 'Neobrutalism', swatchColors: ['#FFFBF0', '#0066FF', '#0A0A0A'] },
]

export const DEFAULT_THEME_ID = 'obsidian'

export function resolveTheme(id: string | undefined | null): string {
  return THEMES.find(t => t.id === id) ? id! : DEFAULT_THEME_ID
}
