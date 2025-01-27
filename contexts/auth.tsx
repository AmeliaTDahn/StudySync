import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { supabase, getProfile, testConnection, type Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  error: null
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Handle initial session and auth state changes
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Clear any stale auth state
        if (typeof window !== 'undefined') {
          const staleKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || 
            key.startsWith('supabase.auth.')
          );
          staleKeys.forEach(key => localStorage.removeItem(key));
        }

        // Test database connection first
        const isConnected = await testConnection();
        if (!mounted) return;
        
        if (!isConnected) {
          setError('Unable to connect to the database. Please check your configuration.');
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          try {
            const { data: profileData, error: profileError } = await getProfile(session.user.id);
            if (!mounted) return;
            
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              setError('Unable to fetch user profile. Please try again.');
            } else {
              setProfile(profileData);
            }
          } catch (e) {
            console.error('Unexpected error fetching profile:', e);
            setError('An unexpected error occurred while fetching your profile.');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setError('An unexpected error occurred. Please refresh the page.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    initializeAuth();

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('Auth state changed:', event, session?.user?.id);

      setLoading(true);
      setError(null);
      
      if (session?.user) {
        setUser(session.user);
        const { data: profileData, error: profileError } = await getProfile(session.user.id);
        if (!mounted) return;
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Unable to fetch user profile. Please try again.');
        } else {
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  // Handle routing based on auth state
  useEffect(() => {
    if (!initialized) return;

    const path = router.pathname;
    const isAuthPage = path === '/' || path === '/auth/callback';
    
    if (!loading) {
      if (error) {
        // Don't redirect if there's an error, let the error be displayed
        return;
      }
      
      if (!user && !isAuthPage) {
        router.push('/');
      } else if (user && !profile && path !== '/profile') {
        router.push('/profile');
      } else if (user && profile && isAuthPage) {
        router.push(profile.role === 'student' ? '/student' : '/tutor');
      }
    }
  }, [user, profile, loading, initialized, error, router.pathname]);

  const value = {
    user,
    profile,
    loading,
    initialized,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 