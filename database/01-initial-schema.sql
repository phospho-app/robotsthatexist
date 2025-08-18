-- ============================================================================
-- ROBOT CATALOG - INITIAL DATABASE SCHEMA
-- Version: 1.0.0
-- Created: 2024-12-18
-- 
-- This is the consolidated initial schema for the Robot Catalog project.
-- Run this on a fresh Supabase database to set up all required tables,
-- types, functions, and policies.
-- ============================================================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'creator', 'admin');
CREATE TYPE robot_status AS ENUM ('draft', 'published');
CREATE TYPE file_type AS ENUM ('urdf', 'mjcf', 'stl', 'bom', 'guide');
CREATE TYPE social_platform AS ENUM ('youtube', 'twitter', 'discord', 'documentation');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'creator', -- Changed from 'user' to 'creator'
  github_username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Robots table
CREATE TABLE public.robots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  github_url text NOT NULL, -- Made required per recent changes
  github_readme text,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status robot_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tags text[] DEFAULT '{}'
);

-- Robot files table
CREATE TABLE public.robot_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id uuid REFERENCES public.robots(id) ON DELETE CASCADE NOT NULL,
  file_type file_type NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  version text NOT NULL,
  description text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_owner_added boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Robot file ratings table
CREATE TABLE public.robot_file_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id uuid REFERENCES public.robot_files(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating text CHECK (rating IN ('up', 'down')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(file_id, user_id)
);

-- Robot social links table (with community contributions)
CREATE TABLE public.robot_social_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id uuid REFERENCES public.robots(id) ON DELETE CASCADE NOT NULL,
  platform social_platform NOT NULL,
  url text NOT NULL,
  title text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Track contributor
  created_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id uuid REFERENCES public.robots(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(robot_id, user_id)
);

-- ============================================================================
-- INDEXES (Performance Optimized)
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_github_username ON public.profiles(github_username);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Robots indexes
CREATE INDEX idx_robots_creator_id ON public.robots(creator_id);
CREATE INDEX idx_robots_status ON public.robots(status);
CREATE INDEX idx_robots_created_at ON public.robots(created_at DESC);
CREATE INDEX idx_robots_slug ON public.robots(slug);
CREATE INDEX idx_robots_tags ON public.robots USING GIN(tags);

-- Robot files indexes
CREATE INDEX idx_robot_files_robot_id ON public.robot_files(robot_id);
CREATE INDEX idx_robot_files_user_id ON public.robot_files(user_id);
CREATE INDEX idx_robot_files_file_type ON public.robot_files(file_type);

-- Robot file ratings indexes
CREATE INDEX idx_robot_file_ratings_file_id ON public.robot_file_ratings(file_id);
CREATE INDEX idx_robot_file_ratings_user_id ON public.robot_file_ratings(user_id);

-- Robot social links indexes
CREATE INDEX idx_robot_social_links_robot_id ON public.robot_social_links(robot_id);
CREATE INDEX idx_robot_social_links_user_id ON public.robot_social_links(user_id);

-- Reviews indexes
CREATE INDEX idx_reviews_robot_id ON public.reviews(robot_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER robots_updated_at 
  BEFORE UPDATE ON public.robots 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER robot_files_updated_at 
  BEFORE UPDATE ON public.robot_files 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER robot_file_ratings_updated_at 
  BEFORE UPDATE ON public.robot_file_ratings 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER reviews_updated_at 
  BEFORE UPDATE ON public.reviews 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- New user signup function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, github_username, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name',
    'creator'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_file_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- ROBOTS POLICIES
-- ============================================
CREATE POLICY "Published robots are viewable by everyone" 
  ON public.robots FOR SELECT USING (status = 'published');

CREATE POLICY "Creators can view their own robots" 
  ON public.robots FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Admins can view all robots" 
  ON public.robots FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert robots" 
  ON public.robots FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own robots" 
  ON public.robots FOR UPDATE USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete robots" 
  ON public.robots FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- ROBOT FILES POLICIES
-- ============================================
CREATE POLICY "Robot files are viewable for published robots" 
  ON public.robot_files FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.status = 'published'
    )
  );

CREATE POLICY "Creators can view files for their robots" 
  ON public.robot_files FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.creator_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can add files to published robots" 
  ON public.robot_files FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.status = 'published'
    )
  );

CREATE POLICY "Contributors and robot owners can update files" 
  ON public.robot_files FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Contributors and robot owners can delete files" 
  ON public.robot_files FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- ROBOT FILE RATINGS POLICIES
-- ============================================
CREATE POLICY "File ratings are viewable for published robots" 
  ON public.robot_file_ratings FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.robot_files rf
      JOIN public.robots r ON r.id = rf.robot_id
      WHERE rf.id = file_id AND r.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can rate files" 
  ON public.robot_file_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" 
  ON public.robot_file_ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" 
  ON public.robot_file_ratings FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ROBOT SOCIAL LINKS POLICIES
-- ============================================
CREATE POLICY "Social links are viewable for published robots" 
  ON public.robot_social_links FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can add social links" 
  ON public.robot_social_links FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.status = 'published'
    )
  );

CREATE POLICY "Contributors can update their own social links" 
  ON public.robot_social_links FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Contributors can delete their own social links" 
  ON public.robot_social_links FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.robots
      WHERE robots.id = robot_id AND robots.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- REVIEWS POLICIES
-- ============================================
CREATE POLICY "Reviews are viewable by everyone" 
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" 
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" 
  ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" 
  ON public.reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" 
  ON public.reviews FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Robot Catalog database schema initialized successfully!';
    RAISE NOTICE 'Version: 1.0.0';
    RAISE NOTICE 'Tables created: profiles, robots, robot_files, robot_file_ratings, robot_social_links, reviews';
    RAISE NOTICE 'Next steps: Configure authentication in Supabase dashboard';
END $$;