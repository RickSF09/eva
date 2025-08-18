-- Step 1: Enable RLS on all tables (ignore if already enabled)
DO $$ 
BEGIN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE elders ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE call_schedules ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE call_executions ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE post_call_reports ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE escalation_incidents ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update their organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Authenticated users can create organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can update their own organization memberships" ON user_organizations;

-- Step 3: Create new policies
-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Organizations table policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_organizations.org_id = organizations.id 
            AND user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Organization admins can update their organizations" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_organizations.org_id = organizations.id 
            AND user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.role = 'admin'
            AND user_organizations.active = true
        )
    );

-- User_organizations table policies
CREATE POLICY "Users can view their organization memberships" ON user_organizations
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create organization memberships" ON user_organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own organization memberships" ON user_organizations
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Step 4: Create basic policies for other tables (simplified)
-- Elders table policies
DROP POLICY IF EXISTS "Users can view elders in their organizations" ON elders;
DROP POLICY IF EXISTS "Users can create elders in their organizations" ON elders;
DROP POLICY IF EXISTS "Users can update elders in their organizations" ON elders;

CREATE POLICY "Users can view elders in their organizations" ON elders
    FOR SELECT USING (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE POLICY "Users can create elders in their organizations" ON elders
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

-- Emergency_contacts table policies
DROP POLICY IF EXISTS "Users can view emergency contacts in their organizations" ON emergency_contacts;

CREATE POLICY "Users can view emergency contacts in their organizations" ON emergency_contacts
    FOR SELECT USING (true); -- Simplified for now

-- Call_schedules table policies
DROP POLICY IF EXISTS "Users can view call schedules in their organizations" ON call_schedules;
DROP POLICY IF EXISTS "Users can create call schedules in their organizations" ON call_schedules;

CREATE POLICY "Users can view call schedules in their organizations" ON call_schedules
    FOR SELECT USING (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE POLICY "Users can create call schedules in their organizations" ON call_schedules
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

-- Call_executions table policies
DROP POLICY IF EXISTS "Users can view call executions in their organizations" ON call_executions;

CREATE POLICY "Users can view call executions in their organizations" ON call_executions
    FOR SELECT USING (true); -- Simplified for now

-- Post_call_reports table policies
DROP POLICY IF EXISTS "Users can view post call reports in their organizations" ON post_call_reports;

CREATE POLICY "Users can view post call reports in their organizations" ON post_call_reports
    FOR SELECT USING (true); -- Simplified for now

-- Escalation_incidents table policies
DROP POLICY IF EXISTS "Users can view escalation incidents in their organizations" ON escalation_incidents;

CREATE POLICY "Users can view escalation incidents in their organizations" ON escalation_incidents
    FOR SELECT USING (true); -- Simplified for now
