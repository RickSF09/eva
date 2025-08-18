-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE elders ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_incidents ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE OR REPLACE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE OR REPLACE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE OR REPLACE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Organizations table policies
CREATE OR REPLACE POLICY "Users can view organizations they belong to" ON organizations
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

CREATE OR REPLACE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE POLICY "Organization admins can update their organizations" ON organizations
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
CREATE OR REPLACE POLICY "Users can view their organization memberships" ON user_organizations
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create organization memberships" ON user_organizations;
CREATE OR REPLACE POLICY "Users can join orgs only via a valid invitation" ON user_organizations
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM organization_invitations inv
            WHERE inv.org_id = user_organizations.org_id
              AND lower(inv.email) = lower((SELECT email FROM users WHERE auth_user_id = auth.uid()))
              AND inv.status = 'pending'
              AND (inv.expires_at IS NULL OR inv.expires_at > now())
        )
    );

CREATE OR REPLACE POLICY "Users can update their own organization memberships" ON user_organizations
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Elders table policies
CREATE OR REPLACE POLICY "Users can view elders in their organizations" ON elders
    FOR SELECT USING (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE OR REPLACE POLICY "Users can create elders in their organizations" ON elders
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE OR REPLACE POLICY "Users can update elders in their organizations" ON elders
    FOR UPDATE USING (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

-- Emergency_contacts table policies
CREATE OR REPLACE POLICY "Users can view emergency contacts in their organizations" ON emergency_contacts
    FOR SELECT USING (
        id IN (
            SELECT elder_id FROM elders WHERE org_id IN (
                SELECT user_organizations.org_id FROM user_organizations 
                WHERE user_organizations.user_id IN (
                    SELECT id FROM users WHERE auth_user_id = auth.uid()
                )
                AND user_organizations.active = true
            )
        )
    );

-- Call_schedules table policies
CREATE OR REPLACE POLICY "Users can view call schedules in their organizations" ON call_schedules
    FOR SELECT USING (
        org_id IN (
            SELECT user_organizations.org_id FROM user_organizations 
            WHERE user_organizations.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND user_organizations.active = true
        )
    );

CREATE OR REPLACE POLICY "Users can create call schedules in their organizations" ON call_schedules
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
CREATE OR REPLACE POLICY "Users can view call executions in their organizations" ON call_executions
    FOR SELECT USING (
        elder_id IN (
            SELECT id FROM elders WHERE org_id IN (
                SELECT user_organizations.org_id FROM user_organizations 
                WHERE user_organizations.user_id IN (
                    SELECT id FROM users WHERE auth_user_id = auth.uid()
                )
                AND user_organizations.active = true
            )
        )
    );

-- Post_call_reports table policies
CREATE OR REPLACE POLICY "Users can view post call reports in their organizations" ON post_call_reports
    FOR SELECT USING (
        elder_id IN (
            SELECT id FROM elders WHERE org_id IN (
                SELECT user_organizations.org_id FROM user_organizations 
                WHERE user_organizations.user_id IN (
                    SELECT id FROM users WHERE auth_user_id = auth.uid()
                )
                AND user_organizations.active = true
            )
        )
    );

-- Escalation_incidents table policies
CREATE OR REPLACE POLICY "Users can view escalation incidents in their organizations" ON escalation_incidents
    FOR SELECT USING (
        elder_id IN (
            SELECT id FROM elders WHERE org_id IN (
                SELECT user_organizations.org_id FROM user_organizations 
                WHERE user_organizations.user_id IN (
                    SELECT id FROM users WHERE auth_user_id = auth.uid()
                )
                AND user_organizations.active = true
            )
        )
    );
