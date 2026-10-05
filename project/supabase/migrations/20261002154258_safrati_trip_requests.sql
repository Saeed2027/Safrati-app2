/*
# Safrati — Create trip_requests table for Custom Trip Requests

1. New Table
   - `trip_requests`: Custom travel/medical/study requests submitted by customers.
     - `id` (uuid PK)
     - `customer_name` (text, not null)
     - `customer_phone` (text, not null — WhatsApp number)
     - `category` (text: 'leisure' | 'medical' | 'study')
     - `destination` (text — desired destination)
     - `departure_city` (text — GCC departure city)
     - `travelers` (int — number of travelers, default 1)
     - `budget_sar` (numeric — approximate budget in SAR)
     - `notes` (text — additional requirements)
     - `status` (text: 'open' | 'responded' | 'closed', default 'open')
     - `created_at` (timestamptz)

2. Security — RLS
   - Public (anon + authenticated) can INSERT requests (customers don't need accounts).
   - Partners (authenticated) can READ all requests (so agencies can see incoming requests).
   - Partners can UPDATE status (to mark as responded).
   - Admins can READ, UPDATE, DELETE all requests.

3. Important Notes
   - Customers submit without signing in, so INSERT must be open to anon.
   - Partners see ALL requests (broadcast model — any agency can respond).
   - No agency_id foreign key — requests are broadcast to all agencies.
*/

CREATE TABLE IF NOT EXISTS trip_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  category text NOT NULL CHECK (category IN ('leisure','medical','study')),
  destination text NOT NULL DEFAULT '',
  departure_city text NOT NULL DEFAULT '',
  travelers int NOT NULL DEFAULT 1,
  budget_sar numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','responded','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert trip requests (customers don't have accounts)
DROP POLICY IF EXISTS "trip_requests_insert_public" ON trip_requests;
CREATE POLICY "trip_requests_insert_public" ON trip_requests FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Partners can read all requests (broadcast model)
DROP POLICY IF EXISTS "trip_requests_select_partner" ON trip_requests;
CREATE POLICY "trip_requests_select_partner" ON trip_requests FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'partner')
);

-- Admins can read all requests
DROP POLICY IF EXISTS "trip_requests_select_admin" ON trip_requests;
CREATE POLICY "trip_requests_select_admin" ON trip_requests FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Partners can update request status (mark as responded/closed)
DROP POLICY IF EXISTS "trip_requests_update_partner" ON trip_requests;
CREATE POLICY "trip_requests_update_partner" ON trip_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'partner')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'partner')
);

-- Admins can update requests
DROP POLICY IF EXISTS "trip_requests_update_admin" ON trip_requests;
CREATE POLICY "trip_requests_update_admin" ON trip_requests FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Admins can delete requests
DROP POLICY IF EXISTS "trip_requests_delete_admin" ON trip_requests;
CREATE POLICY "trip_requests_delete_admin" ON trip_requests FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_category ON trip_requests(category);
