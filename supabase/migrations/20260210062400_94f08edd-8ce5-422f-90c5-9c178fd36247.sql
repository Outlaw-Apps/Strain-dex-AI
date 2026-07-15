-- Create strain type enum (idempotent)
DO $$ BEGIN
  CREATE TYPE public.strain_type AS ENUM ('Sativa', 'Indica', 'Hybrid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create app role enum (idempotent)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Strains table
CREATE TABLE IF NOT EXISTS public.strains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type strain_type NOT NULL,
  thc NUMERIC(5,2) NOT NULL DEFAULT 0,
  cbd NUMERIC(5,2) NOT NULL DEFAULT 0,
  dominant_terpene TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  aromas TEXT[] NOT NULL DEFAULT '{}',
  effects TEXT[] NOT NULL DEFAULT '{}',
  negative_effects TEXT[] NOT NULL DEFAULT '{}',
  medical_uses TEXT[] NOT NULL DEFAULT '{}',
  tastes TEXT[] NOT NULL DEFAULT '{}',
  genetics TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strain_id UUID NOT NULL REFERENCES public.strains(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, strain_id)
);

-- Enable RLS on all tables
ALTER TABLE public.strains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_strains_updated_at ON public.strains;
CREATE TRIGGER update_strains_updated_at BEFORE UPDATE ON public.strains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: Strains (publicly readable, admin-only writes)
DROP POLICY IF EXISTS "Strains are publicly readable" ON public.strains;
CREATE POLICY "Strains are publicly readable" ON public.strains FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert strains" ON public.strains;
CREATE POLICY "Admins can insert strains" ON public.strains FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update strains" ON public.strains;
CREATE POLICY "Admins can update strains" ON public.strains FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete strains" ON public.strains;
CREATE POLICY "Admins can delete strains" ON public.strains FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS: User roles (only viewable by owner, no self-assignment)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS: Favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can add own favorites" ON public.favorites;
CREATE POLICY "Users can add own favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove own favorites" ON public.favorites;
CREATE POLICY "Users can remove own favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_strain_id ON public.favorites(strain_id);
CREATE INDEX IF NOT EXISTS idx_strains_type ON public.strains(type);
CREATE INDEX IF NOT EXISTS idx_strains_name ON public.strains(name);
CREATE INDEX IF NOT EXISTS idx_strains_effects ON public.strains USING GIN(effects);
CREATE INDEX IF NOT EXISTS idx_strains_aromas ON public.strains USING GIN(aromas);
