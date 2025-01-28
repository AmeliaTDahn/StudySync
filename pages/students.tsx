import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import BackOnlyNav from '../components/BackOnlyNav';
import type { Profile } from '../lib/supabase';

export default function StudentsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student');

        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStudents();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BackOnlyNav title="Students" />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-gray-500">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BackOnlyNav title="Students" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-100 text-red-700 p-4 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BackOnlyNav title="Students" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <div
              key={student.user_id}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <h3 className="text-lg font-semibold">{student.username}</h3>
              {student.bio && (
                <p className="text-gray-600 mt-2">{student.bio}</p>
              )}
              {student.struggles && student.struggles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700">Areas of Focus:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {student.struggles.map((struggle) => (
                      <span
                        key={struggle}
                        className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                      >
                        {struggle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => router.push(`/messages?user=${student.user_id}`)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Message
                </button>
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <div className="col-span-full text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">No students found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}