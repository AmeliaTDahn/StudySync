import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase, getUserType } from '../lib/supabase';
import { ProfileForm } from '../components/profile-form';
import type { UserType } from '../lib/supabase';

const ProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Get user type
      const type = await getUserType();
      if (!type) {
        router.push('/');
        return;
      }

      setUser(session.user);
      setUserType(type);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    // Redirect to appropriate homepage
    router.push(userType === 'student' ? '/student' : '/tutor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !userType) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          {user.email}
        </h1>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">
            {userType === 'student' ? 'Student Profile' : 'Tutor Profile'}
          </h2>
          <ProfileForm
            user={user}
            userType={userType}
            onComplete={handleProfileComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 