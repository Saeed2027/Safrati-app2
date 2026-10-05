/*
# Safrati — Update trigger to read role from user metadata

1. Changes
   - The handle_new_user() trigger now reads the 'role' field from raw_user_meta_data.
   - If the role metadata is 'partner', it is used as-is.
   - If the role metadata is missing or any other value, it defaults to 'traveler'.
   - First user is still auto-promoted to 'admin' regardless of metadata.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_count int;
  new_role text;
BEGIN
  SELECT count(*) INTO existing_count FROM profiles;
  new_role := COALESCE(NEW.raw_user_meta_data->>'role', 'traveler');
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN existing_count = 0 THEN 'admin'
      WHEN new_role = 'partner' THEN 'partner'
      ELSE 'traveler'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
