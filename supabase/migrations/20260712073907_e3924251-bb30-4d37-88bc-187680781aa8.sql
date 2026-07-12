-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_strains_name ON public.strains (name);
CREATE INDEX IF NOT EXISTS idx_strains_type ON public.strains (type);
CREATE INDEX IF NOT EXISTS idx_strains_thc ON public.strains (thc DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_strain ON public.favorites (strain_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

-- Soft delete
ALTER TABLE public.strains ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_strains_deleted_at ON public.strains (deleted_at);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_strains_updated_at ON public.strains;
CREATE TRIGGER trg_strains_updated_at
  BEFORE UPDATE ON public.strains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile & default 'user' role on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();