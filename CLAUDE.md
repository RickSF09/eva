# DailyFriend Frontend

AI-powered elder care platform built with Next.js 15 and Supabase. Multi-tenant SaaS supporting B2B (care organizations) and B2C (direct consumers) user flows with automated calling, emergency escalation, and subscription billing.

## Commands

```bash
npm run dev      # Start dev server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run ESLint
```

## Environment Setup

Copy `env.example` to `.env.local` and populate:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL=
NEXT_PUBLIC_STRIPE_PRICE_PEACE_OF_MIND=
NEXT_PUBLIC_STRIPE_PRICE_COMPLETE_CARE=

NEXT_PUBLIC_APP_URL=http://localhost:3000
SITE_URL=http://localhost:3000
INTERNAL_ADMIN_EMAILS=
```

## Project Structure

```
src/
├── app/
│   ├── (b2c)/app/          # B2C authenticated pages (home, elder, settings, onboarding)
│   ├── (b2b)/b2b/          # B2B org pages (dashboard, elders, escalations, schedules)
│   ├── api/                # API routes (auth, stripe, webhooks, internal)
│   └── internal/           # Admin-only pages (impersonation, demo recordings)
├── components/             # React components grouped by feature
├── config/                 # App-wide config (plans, branding, onboarding, schedules)
├── hooks/                  # Custom React hooks
├── lib/                    # Supabase/Stripe clients + utilities
└── types/                  # TypeScript types (database.ts auto-generated from Supabase)
```

## Key Patterns

**Supabase clients:**
- `lib/supabase.ts` — browser client
- `lib/supabase-server.ts` — server/API routes (cookie-based)
- `lib/supabase-admin.ts` — service role (bypasses RLS)

**Auth:**
- `AuthProvider` in `components/auth/` wraps the entire app
- Use `useAuth()` hook for current user/session
- Server-side auth uses `createServerSupabase()` with cookies

**Styling:**
- Tailwind CSS 4 utility-first
- Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes

**Path alias:** `@/*` maps to `src/*`

**TypeScript types:** `src/types/database.ts` is auto-generated — do not edit manually. Regenerate with Supabase CLI when schema changes.

## Billing

Three subscription tiers defined in `src/config/plans.ts` (single source of truth):
- Essential — £29.99/mo
- Peace of Mind — £49.99/mo (default/popular)
- Complete Care — £79.99/mo

7-day free trial with 90 call minutes. Stripe Checkout for new subscriptions, Customer Portal for management.

## Notes

- ESLint is disabled during `next build` (see `next.config.ts`) — run `npm run lint` manually
- No test framework configured
- Internal routes are protected by `INTERNAL_ADMIN_EMAILS` env var whitelist
- Deployment target: Vercel + Supabase
