// NFR14 — EN | BM language switcher. Renders a small segmented control.
import { useI18n } from '../i18n/I18nContext'
import { LANGS, LANG_LABEL } from '../i18n/strings'

export default function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useI18n()
  return (
    <div className={`inline-flex rounded-md bg-gray-800 border border-gray-700 p-0.5 ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
            lang === l ? 'bg-orange-500 text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  )
}
