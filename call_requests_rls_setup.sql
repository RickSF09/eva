-- Enable RLS
ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Users can view call requests for their elders" ON public.call_requests;
DROP POLICY IF EXISTS "Users can update call requests for their elders" ON public.call_requests;

-- Select Policy
CREATE POLICY "Users can view call requests for their elders"
ON public.call_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.elders e
    JOIN public.users u ON e.user_id = u.id
    WHERE e.id = call_requests.elder_id
    AND u.auth_user_id = auth.uid()
  )
  OR
  -- Also allow if the elder belongs to an org the user is a member of (B2B)
  EXISTS (
    SELECT 1
    FROM public.elders e
    JOIN public.user_organizations uo ON e.org_id = uo.org_id
    JOIN public.users u ON uo.user_id = u.id
    WHERE e.id = call_requests.elder_id
    AND u.auth_user_id = auth.uid()
    AND uo.active = true
  )
);

-- Update Policy
CREATE POLICY "Users can update call requests for their elders"
ON public.call_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.elders e
    JOIN public.users u ON e.user_id = u.id
    WHERE e.id = call_requests.elder_id
    AND u.auth_user_id = auth.uid()
  )
  OR
  -- Also allow if the elder belongs to an org the user is a member of (B2B)
  EXISTS (
    SELECT 1
    FROM public.elders e
    JOIN public.user_organizations uo ON e.org_id = uo.org_id
    JOIN public.users u ON uo.user_id = u.id
    WHERE e.id = call_requests.elder_id
    AND u.auth_user_id = auth.uid()
    AND uo.active = true
  )
);
