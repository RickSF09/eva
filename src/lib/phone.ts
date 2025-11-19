'use client'

export type SupportedCountryCode = '+1' | '+31' | '+44'

export const DEFAULT_COUNTRY_CODE: SupportedCountryCode = '+1'

export function detectCountryCodeFromE164(
  value: string | null | undefined,
  fallback: SupportedCountryCode = DEFAULT_COUNTRY_CODE
): SupportedCountryCode {
  if (!value) return fallback
  if (value.startsWith('+44')) return '+44'
  if (value.startsWith('+31')) return '+31'
  if (value.startsWith('+1')) return '+1'
  return fallback
}

export function sanitizeDigits(input: string): string {
  return input.replace(/[^\d]/g, '')
}

export function composeE164(countryCode: SupportedCountryCode, nationalDigits: string): string {
  const digits = sanitizeDigits(nationalDigits)
  return digits ? `${countryCode}${digits}` : ''
}

export function getNationalNumber(e164: string, countryCode: SupportedCountryCode): string {
  if (!e164) return ''
  if (e164.startsWith(countryCode)) return e164.slice(countryCode.length)
  const match = e164.match(/^\+\d{1,3}(.*)$/)
  return match ? match[1] : e164
}

/**
 * Validate a phone number against E.164 format with country-specific rules.
 * Rules:
 * - Must start with '+'
 * - Must match expected country code
 * - Must have exact number of digits per country:
 *   - +1 (US/Canada): 10 digits → total length 12
 *   - +31 (Netherlands): 9 digits → total length 12
 *   - +44 (UK): 10 digits → total length 13
 */
function formatNumberList(values: number[]): string {
  if (values.length === 1) return `${values[0]}`
  if (values.length === 2) return `${values[0]} or ${values[1]}`
  return `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`
}

export function validateE164(fullNumber: string, expectedCode?: SupportedCountryCode): string | null {
  if (!fullNumber) return 'Phone number is required'

  const cleaned = fullNumber.replace(/[^\d+]/g, '')
  
  if (!cleaned.startsWith('+')) {
    return 'Phone number must start with +'
  }

  if (expectedCode && !cleaned.startsWith(expectedCode)) {
    return `Phone number must start with ${expectedCode}`
  }

  // If no expected code, detect it
  const code = expectedCode || detectCountryCodeFromE164(cleaned)
  
  // Country-specific validation
  const rules: Record<SupportedCountryCode, { digits: number[] }> = {
    '+1': { digits: [10] },           // +1 2125551234
    '+31': { digits: [9, 11] },       // +31 612345678 or +3197012345678 (M2M)
    '+44': { digits: [10] },          // +44 7123456789
  }

  const rule = rules[code]
  if (!rule) {
    return 'Unsupported country code'
  }

  const totalLengths = rule.digits.map((digits) => code.length + digits)
  if (!totalLengths.includes(cleaned.length)) {
    const digitsText = formatNumberList(rule.digits)
    const lengthText = formatNumberList(totalLengths)
    return `Enter ${digitsText} digits after ${code} (total ${lengthText} characters including ${code})`
  }

  // Verify all characters after the + are digits
  const afterPlus = cleaned.slice(1)
  if (!/^\d+$/.test(afterPlus)) {
    return 'Phone number must contain only digits after +'
  }

  // Verify the national number part has correct digits
  const nationalPart = cleaned.slice(code.length)
  if (!rule.digits.includes(nationalPart.length)) {
    const digitsText = formatNumberList(rule.digits)
    return `Enter exactly ${digitsText} digits after ${code}`
  }

  return null
}


