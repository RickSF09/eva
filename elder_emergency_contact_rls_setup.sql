-- Enable RLS on elder_emergency_contact table
ALTER TABLE public.elder_emergency_contact ENABLE ROW LEVEL SECURITY;

-- Clean slate - drop existing policies if they exist
DROP POLICY IF EXISTS eec_select_org_members ON public.elder_emergency_contact;
DROP POLICY IF EXISTS eec_insert_org_members ON public.elder_emergency_contact;
DROP POLICY IF EXISTS eec_update_org_members ON public.elder_emergency_contact;
DROP POLICY IF EXISTS eec_delete_org_members ON public.elder_emergency_contact;

-- Policy: Users can SELECT elder_emergency_contact records for their organization
CREATE POLICY eec_select_org_members
ON public.elder_emergency_contact
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.emergency_contacts ec ON ec.id = elder_emergency_contact.emergency_contact_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = ec.org_id
  )
);

-- Policy: Users can INSERT elder_emergency_contact records for their organization
CREATE POLICY eec_insert_org_members
ON public.elder_emergency_contact
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.emergency_contacts ec ON ec.id = elder_emergency_contact.emergency_contact_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = ec.org_id
  )
);

-- Policy: Users can UPDATE elder_emergency_contact records for their organization
CREATE POLICY eec_update_org_members
ON public.elder_emergency_contact
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.emergency_contacts ec ON ec.id = elder_emergency_contact.emergency_contact_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = ec.org_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.emergency_contacts ec ON ec.id = elder_emergency_contact.emergency_contact_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = ec.org_id
  )
);

-- Policy: Users can DELETE elder_emergency_contact records for their organization
CREATE POLICY eec_delete_org_members
ON public.elder_emergency_contact
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.emergency_contacts ec ON ec.id = elder_emergency_contact.emergency_contact_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.active = true
      AND uo.org_id = ec.org_id
  )
);
