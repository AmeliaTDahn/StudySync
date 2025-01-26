import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, signUp, type UserType } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import { supabase } from '../lib/supabase';

const SignInPage = () => {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<UserType>('student');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (profile) {
          // Redirect to appropriate dashboard
          router.push(profile.role === 'student' ? '/student' : '/tutor');
        } else {
          // Redirect to profile creation if no profile exists
          router.push('/profile');
        }
      } else {
        // Redirect to sign in page if not authenticated
        router.push('/signin');
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password, userType);
        if (result.error) throw result.error;
        setError('Please check your email for the confirmation link.');
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  // Always render the sign-in form unless we're confirmed to be authenticated
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          Study Connect
        </h1>
        <h2 className="text-center text-xl font-semibold">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  I want to...
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="userType"
                        value="student"
                        checked={userType === 'student'}
                        onChange={(e) => setUserType(e.target.value as UserType)}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Learn</span>
                    </label>
                  </div>
                  <div>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="userType"
                        value="tutor"
                        checked={userType === 'tutor'}
                        onChange={(e) => setUserType(e.target.value as UserType)}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Teach</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : (isSignUp ? 'Sign up' : 'Sign in')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-500"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInPage; 