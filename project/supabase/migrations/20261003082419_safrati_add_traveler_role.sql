/*
# Safrati — Add 'traveler' role to profiles

1. Changes
   - Alter the `profiles.role` CHECK constraint to include 'traveler' alongside 'admin' and 'partner'.
   - Update the `handle_new_user()` trigger function so that:
     - The first user ever is still auto-promoted to 'admin'.
     - All subsequent users default to 'traveler' (instead of 'partner').
   - Partners must now be created through the dedicated partner signup flow
     which explicitly sets role = 'partner'.

2. Security
   - No RLS policy changes.
   - The trigger remains SECURITY DEFINER.
*/

-- Drop the old CHECK constraint and add a new one that includes 'traveler'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin','partner','traveler'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update the trigger function: first user = admin, everyone else = traveler
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
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'traveler' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
