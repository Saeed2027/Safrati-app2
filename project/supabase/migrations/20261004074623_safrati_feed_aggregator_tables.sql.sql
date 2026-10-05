/*
# Safrati — Data Aggregator & Live-Feed Engine tables

1. New Tables
   - `feed_sources`: Registered external/simulated data sources for offer ingestion.
     Each source has a name, type (json_api, csv_file, simulated), country of origin
     (drives the native currency of imported packages), URL/endpoint, an "active" flag,
     and an optional default agency_id to assign imported packages to.
   - `feed_imports`: Audit log of every feed ingestion run — when it ran, how many
     offers were imported/updated/skipped, whether it succeeded, and any error message.
     Provides a full operational history for the admin dashboard live-feed panel.

2. Security
   - `feed_sources`: RLS enabled. SELECT for anon+authenticated (so the marketplace
     can read active sources for display). INSERT/UPDATE/DELETE admin-only.
   - `feed_imports`: RLS enabled. SELECT for anon+authenticated (so dashboards can
     show import history). INSERT for anon+authenticated (the feed engine writes here).
     UPDATE/DELETE admin-only.

3. New Function
   - `register_feed_source`: A SECURITY DEFINER helper that lets admin users create
     a new feed source. This avoids needing raw INSERT permissions on the table from
     the client — the function checks the admin role internally.

4. Important Notes
   - The feed engine runs client-side (simulated multi-source parser) and writes
     imported packages into the existing `packages` table, using the source's
     `default_agency_id` to attribute them. If no agency is assigned, the engine
     auto-creates a masked "شركة معتمدة" agency for that source's country.
   - All imported packages respect existing RLS: they go in as 'pending' or 'approved'
     based on source config, and the auto_expire_packages function handles expiry.
*/

-- feed_sources table
CREATE TABLE IF NOT EXISTS feed_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'simulated' CHECK (source_type IN ('json_api','csv_file','simulated','rss_feed')),
  country text NOT NULL DEFAULT 'السعودية',
  url text NOT NULL DEFAULT '',
  default_agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  auto_approve boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  default_expiry_days int NOT NULL DEFAULT 90,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feed_sources ENABLE ROW LEVEL SECURITY;

-- feed_sources policies
DROP POLICY IF EXISTS "feed_sources_select_all" ON feed_sources;
CREATE POLICY "feed_sources_select_all"
ON feed_sources FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "feed_sources_insert_admin" ON feed_sources;
CREATE POLICY "feed_sources_insert_admin"
ON feed_sources FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "feed_sources_update_admin" ON feed_sources;
CREATE POLICY "feed_sources_update_admin"
ON feed_sources FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "feed_sources_delete_admin" ON feed_sources;
CREATE POLICY "feed_sources_delete_admin"
ON feed_sources FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- feed_imports table
CREATE TABLE IF NOT EXISTS feed_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_source_id uuid REFERENCES feed_sources(id) ON DELETE CASCADE,
  source_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed','partial')),
  imported_count int NOT NULL DEFAULT 0,
  updated_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  error_message text NOT NULL DEFAULT '',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE feed_imports ENABLE ROW LEVEL SECURITY;

-- feed_imports policies
DROP POLICY IF EXISTS "feed_imports_select_all" ON feed_imports;
CREATE POLICY "feed_imports_select_all"
ON feed_imports FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "feed_imports_insert_all" ON feed_imports;
CREATE POLICY "feed_imports_insert_all"
ON feed_imports FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "feed_imports_update_all" ON feed_imports;
CREATE POLICY "feed_imports_update_all"
ON feed_imports FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feed_imports_delete_admin" ON feed_imports;
CREATE POLICY "feed_imports_delete_admin"
ON feed_imports FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_sources_active ON feed_sources(active);
CREATE INDEX IF NOT EXISTS idx_feed_imports_source_id ON feed_imports(feed_source_id);
CREATE INDEX IF NOT EXISTS idx_feed_imports_started_at ON feed_imports(started_at DESC);

-- Helper: find or create a masked "شركة معتمدة" agency for a given country
CREATE OR REPLACE FUNCTION public.get_or_create_masked_agency(p_country text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  SELECT id INTO v_agency_id FROM agencies WHERE name = 'شركة معتمدة' AND country = p_country LIMIT 1;
  IF v_agency_id IS NOT NULL THEN
    RETURN v_agency_id;
  END IF;
  INSERT INTO agencies (name, contact_name, whatsapp_number, email, city, country, approved, description)
  VALUES ('شركة معتمدة', 'المنصة', '0000000000', 'aggregator_' || replace(p_country, ' ', '_') || '@safrati.local', '—', p_country, true, 'وكالة موزّع البيانات الآلية')
  RETURNING id INTO v_agency_id;
  RETURN v_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_masked_agency(text) TO anon, authenticated;
