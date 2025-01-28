
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import AddUserButton from '../components/add-user-button';
import BackOnlyNav from '../components/BackOnlyNav';
import { useAuth } from '../contexts/auth';
import type { Profile } from '../lib/supabase';

export default function TutorsPage() {
  const { user, profile } = useAuth();
  const [tutors, setTutors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTutors = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tutor');
      
      if (!error && data) {
        setTutors(data);
      }
      setLoading(false);
    };

    fetchTutors();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <BackOnlyNav title="Available Tutors" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tutors.map((tutor) => (
          <div key={tutor.user_id} className="border p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold">{tutor.username}</h2>
            <p className="text-gray-600">{tutor.bio}</p>
            {tutor.hourly_rate && (
              <p className="mt-2">Rate: ${tutor.hourly_rate}/hour</p>
            )}
            <div className="mt-4">
              <AddUserButton
                currentUserType="student"
                targetUserId={tutor.user_id}
                onUserAdded={() => {}}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
