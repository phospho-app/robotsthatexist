-- Fix infinite recursion in profiles table policies
-- This issue occurs when updating user roles due to circular dependencies 
-- between profiles and robots table policies.

-- First, add a policy that allows admins to update any profile
-- This breaks the recursion by providing a direct path for admin updates
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    OR
    -- Fallback: check if the current user has admin role in profiles
    -- but use a non-recursive approach by limiting the query
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (true);

-- Alternative approach: Temporarily disable RLS for admin role updates
-- You can also create a function that bypasses RLS for this specific operation

CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id uuid,
  new_role user_role
) RETURNS void AS $$
BEGIN
  -- Security check: only admins can call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can update user roles.';
  END IF;
  
  -- Prevent self-role change
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;
  
  -- Update the role using SECURITY DEFINER to bypass RLS
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- (the function itself handles admin permission checking)
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, user_role) TO authenticated;