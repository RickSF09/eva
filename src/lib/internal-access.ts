export function getInternalAdminEmails(): string[] {
  const raw = process.env.INTERNAL_ADMIN_EMAILS ?? process.env.CONSENT_OPERATORS_EMAILS ?? ''

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isInternalAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false

  const normalizedEmail = email.trim().toLowerCase()
  const allowed = getInternalAdminEmails()

  return allowed.includes(normalizedEmail)
}

