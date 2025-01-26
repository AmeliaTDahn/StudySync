import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  createProfile, 
  updateProfile, 
  getProfile,
  type Profile,
  type UserType,
  type Subject,
  AVAILABLE_SUBJECTS
} from '../lib/supabase';

interface ProfileFormProps {
  user: User;
  userType: UserType;
  onComplete?: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user, userType, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: user.email || '',
    hourly_rate: '',
    specialties: [] as string[],
    struggles: [] as string[],
    bio: ''
  });

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    const { data, error } = await getProfile(user.id);
    if (error) {
      console.error('Error loading profile:', error);
      return;
    }
    if (data) {
      setProfile(data);
      setFormData({
        username: data.username || '',
        email: data.email || user.email || '',
        hourly_rate: data.hourly_rate?.toString() || '',
        specialties: data.specialties || [],
        struggles: data.struggles || [],
        bio: data.bio || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        username: formData.username,
        email: formData.email,
        hourly_rate: userType === 'tutor' ? parseFloat(formData.hourly_rate) || undefined : undefined,
        specialties: userType === 'tutor' ? formData.specialties : [],
        struggles: userType === 'student' ? formData.struggles : [],
        bio: formData.bio || undefined
      };

      const { error } = profile
        ? await updateProfile(user.id, data)
        : await createProfile(user.id, formData.username, formData.email, userType, data);

      if (error) throw error;
      onComplete?.();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subject: string, field: 'specialties' | 'struggles') => {
    setFormData(prev => {
      const current = prev[field];
      const updated = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject];
      return { ...prev, [field]: updated };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      {userType === 'tutor' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Hourly Rate ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      )}

      {userType === 'tutor' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specialties
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SUBJECTS.map(subject => (
              <button
                key={subject}
                type="button"
                onClick={() => handleSubjectToggle(subject, 'specialties')}
                className={`p-2 rounded-md text-left ${
                  formData.specialties.includes(subject)
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      )}

      {userType === 'student' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Areas You Need Help With
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SUBJECTS.map(subject => (
              <button
                key={subject}
                type="button"
                onClick={() => handleSubjectToggle(subject, 'struggles')}
                className={`p-2 rounded-md text-left ${
                  formData.struggles.includes(subject)
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Tell us about yourself..."
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
      </button>
    </form>
  );
}; 