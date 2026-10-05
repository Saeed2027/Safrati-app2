/*
# Safrati — RLS policies for packages and inquiries
*/

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select_public" ON packages;
CREATE POLICY "packages_select_public" ON packages FOR SELECT
TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "packages_select_own" ON packages;
CREATE POLICY "packages_select_own" ON packages FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = packages.agency_id)
);

DROP POLICY IF EXISTS "packages_select_admin" ON packages;
CREATE POLICY "packages_select_admin" ON packages FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "packages_insert_own" ON packages;
CREATE POLICY "packages_insert_own" ON packages FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = packages.agency_id)
);

DROP POLICY IF EXISTS "packages_update_own" ON packages;
CREATE POLICY "packages_update_own" ON packages FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = packages.agency_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = packages.agency_id)
);

DROP POLICY IF EXISTS "packages_update_admin" ON packages;
CREATE POLICY "packages_update_admin" ON packages FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "packages_delete_own" ON packages;
CREATE POLICY "packages_delete_own" ON packages FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.agency_id = packages.agency_id)
);

DROP POLICY IF EXISTS "packages_delete_admin" ON packages;
CREATE POLICY "packages_delete_admin" ON packages FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
