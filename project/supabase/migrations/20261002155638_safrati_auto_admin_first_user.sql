/*
# Safrati — Auto-promote first user to admin

1. Logic
   - When a new profile is created (via the existing trigger on auth.users),
   - if there are zero existing profiles before the insert, set role = 'admin'.
   - Otherwise, keep the default 'partner' role.

2. Implementation
   - Drop the existing trigger that creates profiles (if any) and recreate it
     with the admin-promotion logic built in.
   - The function checks `SELECT count(*) FROM profiles` before inserting.
     If count = 0, the new user is admin.

3. Security
   - This is a SECURITY DEFINER function (runs as the DB owner) triggered by auth.
   - No changes to RLS policies.
*/

-- Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create new function that assigns admin to the first user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_count int;
BEGIN
  SELECT count(*) INTO existing_count FROM profiles;
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'partner' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
