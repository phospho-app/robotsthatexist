# Database Migrations

This directory contains versioned database migrations for the Robot Catalog project.

## Migration Naming Convention

Migrations should follow this naming pattern:
```
YYYYMMDD_HHMMSS_description_of_change.sql
```

Example: `20241218_143000_add_robot_categories.sql`

## Migration Structure

Each migration file should:

1. **Start with a header comment** describing the change
2. **Be idempotent** - safe to run multiple times
3. **Include rollback instructions** in comments if applicable
4. **Use transactions** for atomic changes
5. **Include success/error messages**

## Migration Template

```sql
-- ============================================================================
-- MIGRATION: Add Robot Categories
-- Version: 1.1.0
-- Date: 2024-12-18
-- 
-- Description: Adds categories table and links to robots
-- Rollback: DROP TABLE robot_categories; ALTER TABLE robots DROP COLUMN category_id;
-- ============================================================================

BEGIN;

-- Check if migration already applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'robot_categories') THEN
        RAISE EXCEPTION 'Migration already applied: robot_categories table exists';
    END IF;
END $$;

-- Your migration code here
CREATE TABLE public.robot_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Add foreign key to existing table
ALTER TABLE public.robots 
ADD COLUMN category_id uuid REFERENCES public.robot_categories(id);

-- Insert default categories
INSERT INTO public.robot_categories (name, description) VALUES
    ('Robotic Arms', 'Articulated robotic arms and manipulators'),
    ('Mobile Robots', 'Wheeled, tracked, and walking robots'),
    ('Drones', 'Flying robots and UAVs');

-- Update schema version (if you track versions)
-- INSERT INTO schema_versions (version, applied_at) VALUES ('1.1.0', now());

COMMIT;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed: Added robot categories system';
END $$;
```

## Running Migrations

### Development
Run migrations manually in Supabase dashboard or using the Supabase CLI:

```bash
# Using Supabase CLI
supabase db reset  # For fresh start with all migrations
# or
psql -h localhost -p 54322 -U postgres -d postgres -f path/to/migration.sql
```

### Production
Migrations are automatically applied via GitHub Actions on deploy.

## Current Migrations

- `01-initial-schema.sql` - Base database schema with all tables and policies
- `02-sample-data.sql` - Development sample data (not run in production)

## Future Migrations

Place new migrations in this directory following the naming convention.
Examples of future migrations might include:
- Adding robot categories/tags system
- Adding user preferences table  
- Adding notification system
- Performance optimizations
- New robot file types