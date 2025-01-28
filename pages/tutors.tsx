import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import BackOnlyNav from '../components/BackOnlyNav';
import { useAuth } from '../contexts/auth';
import AddUserButton from '../components/add-user-button';

const TutorsPage = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectedTutors, setConnectedTutors] = useState([]);
  const [showingConnected, setShowingConnected] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.id || !profile) return;

      if (profile.role !== 'student') {
        router.push('/dashboard');
        return;
      }

      try {
        await loadConnectedTutors(user.id);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load your tutors');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user?.id, profile]);

  const loadConnectedTutors = async (userId) => {
    try {
      const { data: connections, error: connectionsError } = await supabase
        .from('student_tutor_connections')
        .select('tutor_id')
        .eq('student_id', userId);

      if (connectionsError) throw connectionsError;

      if (connections?.length > 0) {
        const { data: tutors, error: tutorsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'tutor')
          .in('user_id', connections.map(c => c.tutor_id));

        if (tutorsError) throw tutorsError;
        setConnectedTutors(tutors || []);
      } else {
        setConnectedTutors([]);
      }
    } catch (err) {
      console.error('Error loading tutors:', err);
      setError('Failed to load tutors');
    }
  };

  const handleSearch = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tutor')
        .ilike('username', `%${searchQuery}%`);

      if (error) throw error;
      setSearchResults(data || []);
      setShowingConnected(false);
    } catch (err) {
      console.error('Error searching tutors:', err);
      setError('Failed to search tutors');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAdded = async () => {
    // Refresh both lists
    if (!user?.id) return;
    try {
      await loadConnectedTutors(user.id);
      await handleSearch();
    } catch (err) {
      console.error('Error refreshing lists:', err);
      setError('Failed to refresh tutor lists');
    }
  };


  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const displayedTutors = showingConnected ? connectedTutors : searchResults;

  return (
    <div className="min-h-screen bg-gray-50">
      <BackOnlyNav title="Tutors" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between mb-6">
          <div className="space-x-2">
            <button
              onClick={() => setShowingConnected(true)}
              className={`px-4 py-2 rounded ${showingConnected ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              My Tutors
            </button>
            <button
              onClick={() => {
                setShowingConnected(false);
                handleSearch();
              }}
              className={`px-4 py-2 rounded ${!showingConnected ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Find Tutors
            </button>
          </div>
        </div>

        {!showingConnected && (
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutors..."
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Search
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTutors.map((tutor) => (
            <div key={tutor.user_id} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold">{tutor.username}</h3>
              {tutor.bio && <p className="text-gray-600 mt-2">{tutor.bio}</p>}
              {tutor.hourly_rate && (
                <p className="text-sm text-gray-500 mb-2">
                  Rate: ${tutor.hourly_rate}/hour
                </p>
              )}
              {tutor.specialties && tutor.specialties.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {tutor.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                {!showingConnected && (
                  <AddUserButton
                    currentUserType="student"
                    targetUserId={tutor.user_id}
                    onUserAdded={handleUserAdded}
                  />
                )}
                {showingConnected && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/messages?user=${tutor.user_id}`)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => router.push(`/schedule?tutor=${tutor.user_id}`)}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded"
                    >
                      Schedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {displayedTutors.length === 0 && (
            <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                {showingConnected
                  ? "You haven't connected with any tutors yet. Click 'Find Tutors' to get started!"
                  : searchQuery
                    ? 'No tutors found matching your search.'
                    : 'No tutors available at the moment.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TutorsPage;