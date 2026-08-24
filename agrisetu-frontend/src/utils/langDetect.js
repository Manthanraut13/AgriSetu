import i18n from '../i18n'

/**
 * Detect language from input text (Devanagari Marathi/Hindi vs Latin English).
 * Returns 'mr', 'hi', 'en', or null if undetermined.
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return null
  const clean = text.trim()
  if (clean.length < 2) return null

  // Check for Devanagari script (Hindi / Marathi)
  const hasDevanagari = /[\u0900-\u097F]/.test(clean)
  if (hasDevanagari) {
    // ळ character or Marathi common words
    const hasMarathiChar = /[\u0933]/.test(clean)
    const marathiKeywords = [
      'आहे', 'कसे', 'कधी', 'शेतात', 'शेतकरी', 'पिकाला', 'गव्हाला',
      'कापूस', 'सोयाबीन', 'खत', 'माहिती', 'नाही', 'नमस्कार', 'जिल्हा', 'राज्य', 'नाव'
    ]
    if (hasMarathiChar || marathiKeywords.some(w => clean.includes(w))) {
      return 'mr'
    }

    const hindiKeywords = [
      'है', 'कैसे', 'कब', 'किसान', 'फसल', 'गेहूं', 'खाद', 'खेती',
      'नमस्ते', 'जानकारी', 'नहीं', 'नाम', 'जिला', 'राज्य'
    ]
    if (hindiKeywords.some(w => clean.includes(w))) {
      return 'hi'
    }

    // Default Devanagari preference: if already on mr keep mr, else hi
    return i18n.language === 'mr' ? 'mr' : 'hi'
  }

  // Check for Latin script (English)
  const hasLatin = /[a-zA-Z]/.test(clean)
  if (hasLatin) {
    return 'en'
  }

  return null
}

/**
 * Automatically update i18n active language if user types in a different language.
 */
export function autoDetectAndSwitchLanguage(text) {
  const detected = detectLanguage(text)
  if (detected && detected !== i18n.language) {
    i18n.changeLanguage(detected)
  }
}
