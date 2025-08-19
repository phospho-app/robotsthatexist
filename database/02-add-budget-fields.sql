-- ============================================================================
-- ROBOT CATALOG - Add Budget Fields
-- Version: 1.1.0
-- Created: 2024-12-19
-- 
-- This migration adds budget fields to robots and reviews tables.
-- The budget field stores a string value representing the cost/budget for the robot.
-- Reviews can optionally include a budget to share what they spent.
-- ============================================================================

-- Add budget column to robots table (required)
ALTER TABLE public.robots ADD COLUMN budget text NOT NULL DEFAULT '';

-- Add optional budget column to reviews table 
ALTER TABLE public.reviews ADD COLUMN budget text;

-- Update the robots table to remove the default after adding the column
-- This ensures new robots must specify a budget
ALTER TABLE public.robots ALTER COLUMN budget DROP DEFAULT;

-- Add indexes for performance if needed
CREATE INDEX idx_robots_budget ON public.robots(budget) WHERE budget != '';
CREATE INDEX idx_reviews_budget ON public.reviews(budget) WHERE budget IS NOT NULL;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Budget fields added successfully!';
    RAISE NOTICE 'Version: 1.1.0';
    RAISE NOTICE 'Changes: Added budget column to robots (required) and reviews (optional)';
END $$;