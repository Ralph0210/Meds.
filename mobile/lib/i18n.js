import { getLocales } from "expo-localization"
import { I18n } from "i18n-js"
import en from "../locales/en.json"
import zhHant from "../locales/zh-Hant.json"

const i18n = new I18n({
  en,
  "zh-Hant": zhHant,
  "zh-TW": zhHant,
  zh: zhHant, // Fallback for generic Chinese
})

// Get device locale
const deviceLocale = getLocales()[0]?.languageTag || "en"

// Set locale based on device language
// Check for Traditional Chinese variants
if (
  deviceLocale.startsWith("zh-Hant") ||
  deviceLocale.startsWith("zh-TW") ||
  deviceLocale.startsWith("zh-HK") ||
  deviceLocale.startsWith("zh-MO")
) {
  i18n.locale = "zh-Hant"
} else if (deviceLocale.startsWith("zh")) {
  // Simplified Chinese falls back to Traditional for now
  i18n.locale = "zh-Hant"
} else {
  i18n.locale = "en"
}

// Enable fallback to English if translation is missing
i18n.enableFallback = true
i18n.defaultLocale = "en"

/**
 * Translate a key
 * @param {string} key - Translation key
 * @param {object} options - Interpolation options
 * @returns {string} Translated string
 */
export const t = (key, options) => i18n.t(key, options)

/**
 * Get current locale
 */
export const getCurrentLocale = () => i18n.locale

export default i18n
