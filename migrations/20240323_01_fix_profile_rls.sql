-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can create user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can create user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create and update own profile" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT
USING (true);

-- Allow profile creation during signup
CREATE POLICY "System services can create profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);  -- Allow the trigger to create profiles

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- End transaction
COMMIT; 