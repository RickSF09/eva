# Eva Cares Frontend

AI-powered elder care platform with organization management, automated calling, and emergency escalation systems.

## Features

- **Multi-tenant Organizations**: Invite members, manage roles (admin/member)
- **Elder Management**: Complete profiles with health monitoring
- **Automated Calling**: Scheduled wellness checks with AI voice assistant
- **Emergency System**: Priority-based contact escalation
- **Dashboard**: Real-time statistics and activity feed

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project

### Local Development

1. **Clone and install**:
```bash
git clone <your-repo-url>
cd eva-cares-frontend
npm install
```

2. **Environment Setup**:
```bash
cp env.example .env.local
```
Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Database Setup**:
Run the SQL migrations in your Supabase project:
- `organization_invitations_setup.sql`
- `supabase_rls_setup.sql`

4. **Start Development**:
```bash
npm run dev
```
Visit `http://localhost:3000`

## Deployment to Vercel

### 1. Connect to Vercel
- Import your GitHub repository to Vercel
- Framework: Next.js (auto-detected)

### 2. Environment Variables
In Vercel dashboard, add these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 3. Supabase Configuration
- **Auth URLs**: Add your Vercel domains to redirect URLs:
  - `https://your-domain.com/*`
  - `https://*.vercel.app/*`
  - `http://localhost:3000/*` (for local dev)

### 4. Deploy Edge Function
```bash
# Set function secrets in Supabase
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_ANON_KEY=your_supabase_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SITE_URL=https://your-domain.com

# Deploy the function
supabase functions deploy send-invite
```

## User Flow

1. **Sign Up**: Create account or join via invitation
2. **Organization Setup**: Create or join an organization
3. **Invite Members**: Send email invitations (admin only)
4. **Elder Management**: Add and monitor care recipients
5. **Call Scheduling**: Set up automated wellness checks
6. **Emergency Contacts**: Configure escalation procedures

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Main dashboard
│   ├── elders/           # Elder management
│   ├── invite/           # Invitation acceptance
│   ├── onboarding/       # Profile setup
│   └── settings/         # User & org settings
├── components/           # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configs
└── types/               # TypeScript definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Private - All rights reserved
