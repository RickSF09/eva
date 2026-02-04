-- Fix RLS policies for Escalation tables to support B2C users (direct elder ownership)
-- Previously these tables only supported B2B (organization-based) access.

--------------------------------------------------------------------------------
-- 1. escalation_incidents
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view escalation incidents in same organization" ON escalation_incidents;
DROP POLICY IF EXISTS "Users can insert escalation incidents in same organization" ON escalation_incidents;
DROP POLICY IF EXISTS "Users can update escalation incidents in same organization" ON escalation_incidents;

CREATE POLICY "Users can select escalation incidents" ON escalation_incidents
FOR SELECT USING (
  elder_id IN (
    SELECT id FROM elders
    WHERE (org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert escalation incidents" ON escalation_incidents
FOR INSERT WITH CHECK (
  elder_id IN (
    SELECT id FROM elders
    WHERE (org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update escalation incidents" ON escalation_incidents
FOR UPDATE USING (
  elder_id IN (
    SELECT id FROM elders
    WHERE (org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

--------------------------------------------------------------------------------
-- 2. escalation_contact_attempts
--------------------------------------------------------------------------------
-- Note: Dropping policies with potential truncated names from previous setup
DROP POLICY IF EXISTS "Users can view escalation contact attempts in same organization" ON escalation_contact_attempts;
DROP POLICY IF EXISTS "Users can view escalation contact attempts in same organizatio" ON escalation_contact_attempts;
DROP POLICY IF EXISTS "Users can insert escalation contact attempts in same organizati" ON escalation_contact_attempts;
DROP POLICY IF EXISTS "Users can update escalation contact attempts in same organizati" ON escalation_contact_attempts;

CREATE POLICY "Users can select escalation contact attempts" ON escalation_contact_attempts
FOR SELECT USING (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert escalation contact attempts" ON escalation_contact_attempts
FOR INSERT WITH CHECK (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update escalation contact attempts" ON escalation_contact_attempts
FOR UPDATE USING (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

--------------------------------------------------------------------------------
-- 3. escalation_followups
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view escalation followups in same organization" ON escalation_followups;
DROP POLICY IF EXISTS "Users can insert escalation followups in same organization" ON escalation_followups;
DROP POLICY IF EXISTS "Users can update escalation followups in same organization" ON escalation_followups;

CREATE POLICY "Users can select escalation followups" ON escalation_followups
FOR SELECT USING (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert escalation followups" ON escalation_followups
FOR INSERT WITH CHECK (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update escalation followups" ON escalation_followups
FOR UPDATE USING (
  escalation_incident_id IN (
    SELECT ei.id FROM escalation_incidents ei
    JOIN elders e ON ei.elder_id = e.id
    WHERE (e.org_id IN (
      SELECT org_id FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.active = true
    ))
    OR (e.user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid()
    ))
  )
);
