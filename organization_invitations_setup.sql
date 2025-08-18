-- Create organization_invitations table for inviting users to orgs
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | revoked | expired
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one active invite per org+email (token rotates on resend)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'organization_invitations_org_email_unique'
  ) THEN
    CREATE UNIQUE INDEX organization_invitations_org_email_unique
      ON public.organization_invitations (org_id, lower(email));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org members or invited user can view invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can update invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Invited user can accept their invitation" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete invitations" ON public.organization_invitations;

-- Select: allow org members to see their org's invites and invited user to see their own
CREATE POLICY "Org members or invited user can view invitations" ON public.organization_invitations
  FOR SELECT USING (
    -- Members of the org can view
    org_id IN (
      SELECT org_id FROM public.user_organizations
      WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND active = true
    )
    OR
    -- The invited user can view if emails match
    lower(email) = lower((SELECT email FROM public.users WHERE auth_user_id = auth.uid()))
  );

-- Allow anonymous read by token so the accept page can load basic info
-- No anon policy; invite details are fetched after login to verify email via RLS

-- Insert: only admins of the org can create invites
CREATE POLICY "Org admins can create invitations" ON public.organization_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.org_id = organization_invitations.org_id
        AND uo.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND uo.role = 'admin'
        AND uo.active = true
    )
  );

-- Update: allow admins to manage invites in their org
CREATE POLICY "Org admins can update invitations" ON public.organization_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.org_id = organization_invitations.org_id
        AND uo.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND uo.role = 'admin'
        AND uo.active = true
    )
  );

-- Update: allow invited user to accept their own invite (match by email)
CREATE POLICY "Invited user can accept their invitation" ON public.organization_invitations
  FOR UPDATE USING (
    lower(email) = lower((SELECT email FROM public.users WHERE auth_user_id = auth.uid()))
  );

-- Delete: allow admins to delete invites in their org
CREATE POLICY "Org admins can delete invitations" ON public.organization_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.org_id = organization_invitations.org_id
        AND uo.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND uo.role = 'admin'
        AND uo.active = true
    )
  );


