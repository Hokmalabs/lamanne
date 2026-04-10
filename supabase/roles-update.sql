-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'commercial', 'admin', 'super_admin'));

-- Track who created a client (commercial or admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Assign a commercial to a client
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_commercial UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_commercial ON profiles(assigned_commercial);

-- RLS: admins and super_admins can read all profiles
-- (run after enabling RLS on profiles table)
CREATE POLICY IF NOT EXISTS "admins_read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'commercial')
  );

CREATE POLICY IF NOT EXISTS "users_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "admins_update_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
