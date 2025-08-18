-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view emergency contacts in their organization" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can insert emergency contacts in their organization" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can update emergency contacts in their organization" ON public.emergency_contacts;
DROP POLICY IF EXISTS "Users can delete emergency contacts in their organization" ON public.emergency_contacts;

-- Create RLS policies
CREATE POLICY "Users can view emergency contacts in their organization" ON public.emergency_contacts
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.user_organizations 
      WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert emergency contacts in their organization" ON public.emergency_contacts
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.user_organizations 
      WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update emergency contacts in their organization" ON public.emergency_contacts
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.user_organizations 
      WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete emergency contacts in their organization" ON public.emergency_contacts
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.user_organizations 
      WHERE user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  );
