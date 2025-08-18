# Contributing

Welcome! This guide will help you set up the project for development and contribution.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Git**
- **Supabase account** (free tier is fine)
- **GitHub account**

### 1. Fork & Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/robot-catalog.git
cd robot-catalog
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Your Database

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize (2-3 minutes)
3. Go to **Settings > API** and copy your project details

#### Run Database Setup

In the Supabase SQL Editor, run `database/01-initial-schema.sql`

#### Configure GitHub OAuth

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Enable **GitHub provider**
3. Create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - **Application name**: `Robot that exist Development`
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase GitHub provider settings

### 4. Environment Variables

Create `.env.local`:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Fill in your Supabase details in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# GitHub OAuth (from your GitHub OAuth App)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional: GitHub API Token for better rate limits
# GITHUB_TOKEN=ghp_your_github_personal_access_token
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with GitHub!

## 🛠️ Development Workflow

### Running Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Linting & Type Checking

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Format code (if you set up Prettier)
npm run format
```

### Database Changes

When making database changes:

1. **Create a migration file** in `database/migrations/`
2. **Use the naming convention**: `YYYYMMDD_HHMMSS_description.sql`
3. **Make it idempotent** - safe to run multiple times
4. **Test locally** before committing

Example migration:

```sql
-- database/migrations/20241218_140000_add_robot_categories.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'robot_categories') THEN
        CREATE TABLE public.robot_categories (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name text NOT NULL UNIQUE,
            description text,
            created_at timestamptz DEFAULT now()
        );

        RAISE NOTICE '✅ Added robot_categories table';
    ELSE
        RAISE NOTICE 'ℹ️ robot_categories table already exists';
    END IF;
END $$;
```

### Making Changes

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Test thoroughly**:

   ```bash
   npm test
   npm run lint
   npm run build  # Ensure it builds successfully
   ```

4. **Commit with clear messages**:

   ```bash
   git commit -m "feat: add robot search functionality"
   ```

5. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Contribution Guidelines

### What We're Looking For

- **Bug fixes** and performance improvements
- **New robot file types** (MJCF, SDF, etc.)
- **UI/UX improvements**
- **Search and filtering enhancements**
- **Documentation improvements**
- **Test coverage improvements**

### Code Standards

- **TypeScript** - Use proper typing
- **ESLint** - Follow the configured rules
- **Responsive design** - Mobile-first approach
- **Accessibility** - Follow WCAG guidelines
- **Performance** - Optimize images, lazy load, etc.

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all CI checks pass**
4. **Request review** from maintainers
5. **Address feedback** promptly

**Happy coding!** 🤖✨
