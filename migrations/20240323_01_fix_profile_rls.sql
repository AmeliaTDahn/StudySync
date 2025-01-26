-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can create user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can create user profiles" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create and update own profile"
ON public.profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- End transaction
COMMIT; 