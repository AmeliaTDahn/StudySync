import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/auth';
import { ProfileForm } from '../components/profile-form';

const ProfilePage = () => {
  const router = useRouter();
  const { user, profile, loading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const handleProfileComplete = () => {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-xl font-semibold text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
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
            Complete Your Profile
          </h2>
          {formError && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">
              {formError}
            </div>
          )}
          <ProfileForm
            user={user}
            onComplete={handleProfileComplete}
            onError={setFormError}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 