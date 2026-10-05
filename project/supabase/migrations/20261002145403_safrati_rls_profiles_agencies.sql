/*
# Safrati — Enable RLS and create policies for all tables
*/

-- ============ PROFILES RLS ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

-- ============ AGENCIES RLS ============
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agencies_select_public" ON agencies;
CREATE POLICY "agencies_select_public" ON agencies FOR SELECT
TO anon, authenticated USING (approved = true);

DROP POLICY IF EXISTS "agencies_select_own" ON agencies;
CREATE POLICY "agencies_select_own" ON agencies FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = agencies.id)
);

DROP POLICY IF EXISTS "agencies_insert_partner" ON agencies;
CREATE POLICY "agencies_insert_partner" ON agencies FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "agencies_update_own" ON agencies;
CREATE POLICY "agencies_update_own" ON agencies FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = agencies.id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = agencies.id)
);

DROP POLICY IF EXISTS "agencies_update_admin" ON agencies;
CREATE POLICY "agencies_update_admin" ON agencies FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "agencies_delete_admin" ON agencies;
CREATE POLICY "agencies_delete_admin" ON agencies FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
