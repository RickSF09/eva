-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Clean slate - drop existing policies if they exist
DROP POLICY IF EXISTS org_select_members ON public.organizations;
DROP POLICY IF EXISTS org_insert_members ON public.organizations;
DROP POLICY IF EXISTS org_update_members ON public.organizations;
DROP POLICY IF EXISTS org_delete_members ON public.organizations;

-- Policy: Users can SELECT organizations they are members of
CREATE POLICY org_select_members
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = organizations.id
  )
);

-- Policy: Users can INSERT organizations (for organization creation)
CREATE POLICY org_insert_members
ON public.organizations
FOR INSERT
WITH CHECK (
  -- Allow insert for organization creation
  -- The user will be linked to this org via user_organizations table
  true
);

-- Policy: Users can UPDATE organizations they are members of
CREATE POLICY org_update_members
ON public.organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = organizations.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = organizations.id
  )
);

-- Policy: Users can DELETE organizations they are members of
-- (You might want to restrict this to org owners only)
CREATE POLICY org_delete_members
ON public.organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = organizations.id
  )
);
