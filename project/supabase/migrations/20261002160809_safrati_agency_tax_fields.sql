/*
# Safrati — Add tax/compliance fields to agencies table

1. New Columns on `agencies`
   - `country` (text) — country where the agency is registered (e.g. السعودية, الإمارات)
   - `commercial_reg_number` (text) — commercial registration number (السجل التجاري)
   - `tax_cert_number` (text) — tax certificate / VAT ID number (رقم الشهادة الضريبية)
   - `tax_cert_url` (text) — optional URL to uploaded tax certificate document
   - `description` (text) — optional agency description/bio

2. Security
   - No changes to RLS. Existing policies already cover SELECT/INSERT/UPDATE.
   - New columns are writable by the agency owner (via existing INSERT/UPDATE policies).

3. Important Notes
   - All new columns are nullable so existing rows are not broken.
   - The frontend AgencyForm will make `country`, `commercial_reg_number`, and
     `tax_cert_number` required for new registrations.
*/

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS country text DEFAULT '';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS commercial_reg_number text DEFAULT '';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS tax_cert_number text DEFAULT '';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS tax_cert_url text DEFAULT '';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS description text DEFAULT '';
