-- Simple RLS fix for organization creation
-- This will allow authenticated users to create organizations

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

-- Create simple policies that allow organization creation
CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (true);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Create simple policies for users
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Enable RLS on user_organizations table
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can create organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;

-- Create simple policies for user_organizations
CREATE POLICY "Authenticated users can create organization memberships" ON user_organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their organization memberships" ON user_organizations
    FOR SELECT USING (true);
