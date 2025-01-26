import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase, signIn, signUp, type UserType } from '../lib/supabase';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<UserType>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
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
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, userType);
        if (error) throw error;
        setError('Please check your email to confirm your account.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;

        // Get user profile after successful sign in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          // Redirect to appropriate dashboard
          router.push(profile.role === 'student' ? '/student' : '/tutor');
        } else {
          // Redirect to profile creation
          router.push('/profile');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                I am a...
              </label>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('student')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    userType === 'student'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('tutor')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    userType === 'tutor'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tutor
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-md p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
} 