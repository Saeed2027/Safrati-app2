-- Safrati — Auto-expire offers: set default expiry dates and create periodic auto-expire function

-- 1) Set default 90-day expiry on all packages that have no expiry date
UPDATE packages
SET expires_at = (created_at + INTERVAL '90 days')::timestamptz
WHERE expires_at IS NULL;

-- 2) Create a function that marks expired packages (past expiry date AND still approved/pending)
CREATE OR REPLACE FUNCTION public.auto_expire_packages()
RETURNS TABLE (expired_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE packages
  SET status = 'expired', updated_at = now()
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status IN ('approved', 'pending');

  RETURN QUERY SELECT count(*) FROM packages WHERE status = 'expired';
END;
$$;

-- 3) Grant execute to anon and authenticated (so client-side can trigger it)
GRANT EXECUTE ON FUNCTION public.auto_expire_packages() TO anon, authenticated;

-- 4) Create a view for "live offers" — only non-expired approved packages
CREATE OR REPLACE VIEW public.live_offers AS
SELECT *
FROM packages
WHERE status = 'approved'
  AND (expires_at IS NULL OR expires_at >= now());

GRANT SELECT ON public.live_offers TO anon, authenticated;
