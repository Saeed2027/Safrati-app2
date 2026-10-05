/*
# Safrati — Revoke public execute on handle_new_user trigger function
   The function only needs to run as a trigger, not via REST API.
*/
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
