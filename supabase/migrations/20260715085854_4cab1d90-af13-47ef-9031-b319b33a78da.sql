
CREATE TABLE public.license_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view license keys"
  ON public.license_keys FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert license keys"
  ON public.license_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update license keys"
  ON public.license_keys FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete license keys"
  ON public.license_keys FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_license_keys_updated_at
  BEFORE UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic validate + increment. SECURITY DEFINER so the anon edge function can call it
-- without exposing raw table access to anon.
CREATE OR REPLACE FUNCTION public.redeem_license_key(_key TEXT, _count_usage BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.license_keys%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.license_keys
    WHERE key = upper(trim(_key))
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'That license key isn''t valid.');
  END IF;

  IF rec.revoked THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This key has been revoked.');
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      'This key expired on ' || to_char(rec.expires_at, 'YYYY-MM-DD') || '.');
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.uses >= rec.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'This key has reached its usage limit.');
  END IF;

  IF _count_usage THEN
    UPDATE public.license_keys SET uses = uses + 1 WHERE id = rec.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'key', rec.key,
    'expiresAt', rec.expires_at,
    'maxUses', rec.max_uses,
    'uses', rec.uses + CASE WHEN _count_usage THEN 1 ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_key(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(TEXT, BOOLEAN) TO service_role;
