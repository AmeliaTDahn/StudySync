import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import { Search } from 'lucide-react';
import { 
  supabase,
  searchUsers,
  type Profile,
  type Subject,
  AVAILABLE_SUBJECTS,
  createOrGetConversation
} from '../lib/supabase';

const TutorsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutors, setTutors] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
      return;
    }

    setProfile(data);
    searchTutors();
  };

  const searchTutors = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await searchUsers(searchQuery, 'tutor', selectedSubject || undefined);
      
      if (error) {
        console.error('Error searching tutors:', error);
        setError('Failed to load tutors');
        return;
      }

      // Filter tutors by price range
      const filteredTutors = (data || []).filter(tutor => {
        const rate = tutor.hourly_rate || 0;
        return rate >= priceRange.min && rate <= priceRange.max;
      });

      setTutors(filteredTutors);
    } catch (err) {
      console.error('Error searching tutors:', err);
      setError('Failed to load tutors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    searchTutors();
  }, [selectedSubject, priceRange]);

  const handleStartChat = async (tutorId: string, tutorUsername: string) => {
    if (!user || !profile) return;

    const { data: conversationId, error } = await createOrGetConversation(
      user.id,
      profile.username,
      tutorId,
      tutorUsername
    );

    if (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to start chat');
      return;
    }

    if (!conversationId) {
      console.error('No conversation ID returned');
      setError('Failed to start chat');
      return;
    }

    router.push(`/messages?conversation=${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Find a Tutor</h1>
          <button
            onClick={() => router.push('/student')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchTutors()}
                placeholder="Search tutors..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Subjects</option>
                {AVAILABLE_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={searchTutors}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Price Range Filter */}
          <div className="mt-4 pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range ($/hour): ${priceRange.min} - ${priceRange.max}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Price</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: Math.min(parseInt(e.target.value), prev.max) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Price</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: Math.max(parseInt(e.target.value), prev.min) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor) => (
            <div key={tutor.user_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{tutor.username}</h2>
                  <p className="text-gray-600">${tutor.hourly_rate}/hour</p>
                </div>
                <button
                  onClick={() => handleStartChat(tutor.user_id, tutor.username)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </button>
              </div>

              {tutor.specialties && tutor.specialties.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {tutor.specialties.map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tutor.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
                  <p className="text-gray-600 text-sm">{tutor.bio}</p>
                </div>
              )}
            </div>
          ))}

          {!isLoading && tutors.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No tutors found. Try adjusting your search criteria.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TutorsPage; 