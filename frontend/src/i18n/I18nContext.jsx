// NFR14 — i18n context: holds the active language, persists the choice, and
// exposes a t(key, vars) translator. Mirrors the AuthContext pattern (provider
// + hook colocated).
import { createContext, useContext, useState, useCallback } from 'react'
import { STRINGS, LANGS } from './strings'

const I18nContext = createContext(null)
const STORAGE_KEY = 'harda_lang'

function resolve(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return LANGS.includes(saved) ? saved : 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
    setLangState(next)
  }, [])

  const t = useCallback(
    (key, vars) => {
      let s = resolve(STRINGS[lang], key)
      if (s == null) s = resolve(STRINGS.en, key) // fall back to English
      if (s == null) return key // last resort: show the key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v))
        }
      }
      return s
    },
    [lang],
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext)
}
