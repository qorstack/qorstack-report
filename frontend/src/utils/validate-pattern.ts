/**
 * Validate only English characters (a-z, A-Z only)
 */
export function isEnglishOnly(text: string): boolean {
  return /^[A-Za-z]+$/.test(text)
}

/**
 * Validate only Thai characters (Kor Kai - Hor Nokhuk, etc., vowels, tonemarks)
 */
export function isThaiOnly(text: string): boolean {
  return /^[\u0E00-\u0E7F]+$/.test(text)
}

/**
 * Validate only numbers (0-9 only)
 */
export function isNumberOnly(text: string): boolean {
  return /^[0-9]+$/.test(text)
}

/**
 * Validate English characters or numbers only (a-z, A-Z, 0-9)
 */
export function isEnglishOrNumber(text: string): boolean {
  return /^[A-Za-z0-9]+$/.test(text)
}

/**
 * Validate Thai characters or numbers only
 */
export function isThaiOrNumber(text: string): boolean {
  return /^[\u0E00-\u0E7F0-9]+$/.test(text)
}

/**
 * Validate English characters, numbers, and special characters (a-z, A-Z, 0-9, special chars)
 */
export function isEnglishNumberSpecial(text: string): boolean {
  return /^[A-Za-z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/.test(text)
}

/**
 * Validate valid email
 */
export function isEmail(text: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text)
}

/**
 * Validate valid website (http, https, www, domain)
 */
export function isWebsite(text: string): boolean {
  return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+([\/?#].*)?$/.test(text)
}

/**
 * Validate international standard phone number (E.164) supports all countries
 * Example: +66812345678, +12025550123, +441632960961
 */
export function isInternationalPhoneNumber(text: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(text)
}

/**
 * Validate Thailand phone number
 * Supports format 02-XXX-XXXX (Bangkok) or 0X-XXX-XXX(X) (Upcountry where X = 3-7)
 */
export function isThaiPhoneNumber(text: string): boolean {
  return /^(?:02-\d{3}-\d{4}|0[3-7]\d{2}-\d{3}-\d{3,4})$/.test(text)
}
