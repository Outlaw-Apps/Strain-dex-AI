CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_strains_name_lower ON public.strains (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_strains_name_trgm ON public.strains USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_strains_effects_gin ON public.strains USING gin (effects);
CREATE INDEX IF NOT EXISTS idx_strains_aromas_gin ON public.strains USING gin (aromas);
CREATE INDEX IF NOT EXISTS idx_strains_tastes_gin ON public.strains USING gin (tastes);
CREATE INDEX IF NOT EXISTS idx_strains_medical_uses_gin ON public.strains USING gin (medical_uses);
CREATE INDEX IF NOT EXISTS idx_strains_type_deleted ON public.strains (type) WHERE deleted_at IS NULL;