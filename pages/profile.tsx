import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/auth';
import { ProfileForm } from '../components/profile-form';

const ProfilePage = () => {
  const router = useRouter();
  const { user, profile, loading, error: authError } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = !!profile;

  useEffect(() => {
    console.log('ProfilePage mounted/updated:', { 
      user: user?.id, 
      hasProfile: !!profile, 
      loading, 
      authError,
      pathname: router.pathname,
      isReady: router.isReady,
      isEditing
    });
  }, [user, profile, loading, authError, router.pathname, router.isReady, isEditing]);

  const handleProfileComplete = () => {
    console.log('Profile saved, redirecting to dashboard:', {
      role: profile?.role,
      userId: user?.id
    });
    router.push(profile?.role === 'student' ? '/student' : '/tutor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-xl font-semibold text-red-600 mb-4">{authError}</div>
          <p className="text-gray-600 mb-4">There was an error loading your profile. Please try signing in again.</p>
          <button 
            onClick={() => router.push('/signin')} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to signin');
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">
            {isEditing ? 'Edit Profile' : 'Complete Your Profile'}
          </h1>
          {isEditing && (
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
            >
              <span>Back</span>
            </button>
          )}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          {formError && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
              {formError}
            </div>
          )}
          <ProfileForm
            user={user}
            userType={profile?.role || user.user_metadata?.user_type || 'student'}
            existingProfile={profile || undefined}
            onComplete={handleProfileComplete}
            onError={setFormError}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 