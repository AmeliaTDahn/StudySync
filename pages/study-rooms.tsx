import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import { Users, Plus, Search, X } from 'lucide-react';
import {
  supabase,
  getProfile,
  createStudyRoom,
  getStudyRooms,
  inviteToStudyRoom,
  type Subject,
  type Profile,
  type StudyRoom,
  type StudyRoomParticipant,
  AVAILABLE_SUBJECTS
} from '../lib/supabase';

const StudyRoomsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    subject: '' as Subject | '',
    description: '',
    isPrivate: false
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState<'all' | 'my' | 'public'>('all');
  const [filteredRooms, setFilteredRooms] = useState<StudyRoom[]>([]);

  // Load user data and study rooms
  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      const { data: profile, error: profileError } = await getProfile(user.id);
      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load user profile');
        return;
      }
      if (profile) setProfile(profile);

      const { data: rooms, error: roomsError } = await getStudyRooms(selectedSubject || undefined);
      if (roomsError) {
        console.error('Error loading study rooms:', roomsError);
        setError('Failed to load study rooms');
        return;
      }
      if (rooms) {
        setStudyRooms(rooms);
        setError(null); // Clear any previous errors if successful
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('An unexpected error occurred while loading data');
    } finally {
      setLoading(false);
    }
  }, [router, selectedSubject]);

  // Filter rooms based on selected filter and subject
  useEffect(() => {
    if (!user) return;
    
    let filtered = studyRooms;
    
    // Apply subject filter
    if (selectedSubject) {
      filtered = filtered.filter(room => room.subject === selectedSubject);
    }
    
    // Apply room type filter
    switch (roomFilter) {
      case 'my':
        filtered = filtered.filter(room => 
          room.study_room_participants?.some(p => p.user_id === user.id) ?? false
        );
        break;
      case 'public':
        filtered = filtered.filter(room => 
          !(room.study_room_participants?.some(p => p.user_id === user.id) ?? false) &&
          !room.is_private
        );
        break;
      default:
        // For 'all', only show public rooms and private rooms where user is a participant
        filtered = filtered.filter(room => 
          !room.is_private || 
          (room.study_room_participants?.some(p => p.user_id === user.id) ?? false)
        );
        break;
    }
    
    setFilteredRooms(filtered);
  }, [studyRooms, selectedSubject, roomFilter, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle creating a new study room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      setError('You must be logged in to create a study room');
      return;
    }
    if (!newRoomData.name || !newRoomData.subject) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await createStudyRoom(
        newRoomData.name,
        newRoomData.subject as Subject,
        newRoomData.description || null,
        user.id,
        newRoomData.isPrivate
      );

      if (error) {
        console.error('Error creating study room:', error);
        setError(error.message || 'Failed to create study room');
        return;
      }

      // Reset form and refresh rooms
      setNewRoomData({ name: '', subject: '', description: '', isPrivate: false });
      setShowCreateModal(false);
      setError(null);
      loadData();
    } catch (err) {
      console.error('Error creating study room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create study room');
    }
  };

  // Handle inviting a user to a private room
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoom || !inviteEmail.trim()) return;

    try {
      const { error } = await inviteToStudyRoom(selectedRoom.id, inviteEmail.trim());
      if (error) throw error;

      setInviteEmail('');
      setShowInviteModal(false);
      setError(null);
    } catch (err) {
      console.error('Error inviting user:', err);
      setError('Failed to send invitation');
    }
  };

  // Handle joining a study room
  const handleJoinRoom = (room: StudyRoom) => {
    const isParticipant = room.study_room_participants?.some(p => p.user_id === user?.id) ?? false;
    if (room.is_private && !isParticipant) {
      setError("This is a private room. You need an invitation to join.");
      return;
    }
    router.push(`/study-room/${room.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Study Rooms</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(profile?.role === 'student' ? '/student' : '/tutor')}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as Subject | '')}
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {AVAILABLE_SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value as 'all' | 'my' | 'public')}
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Rooms</option>
              <option value="my">My Rooms</option>
              <option value="public">Public Rooms</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Study Room
          </button>
        </div>

        {/* Study Rooms Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => {
              const isParticipant = room.study_room_participants?.some(p => p.user_id === user?.id) ?? false;
              return (
                <div key={room.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{room.name}</h3>
                      <p className="text-sm text-gray-500">{room.subject}</p>
                      {room.is_private && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {room.is_private && room.created_by === user?.id && (
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowInviteModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        {room.study_room_participants?.length || 0}
                      </span>
                    </div>
                  </div>
                  {room.description && (
                    <p className="text-gray-600 mb-4 text-sm">{room.description}</p>
                  )}
                  <button
                    onClick={() => handleJoinRoom(room)}
                    className={`w-full px-4 py-2 rounded ${
                      isParticipant
                        ? 'bg-green-600 hover:bg-green-700'
                        : room.is_private
                        ? 'bg-gray-600 hover:bg-gray-700 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                    disabled={room.is_private && !isParticipant}
                  >
                    {isParticipant
                      ? 'Resume Room'
                      : room.is_private
                      ? 'Private Room'
                      : 'Join Room'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {roomFilter === 'my' 
              ? "You haven't joined any study rooms yet"
              : roomFilter === 'public'
              ? "No public study rooms available"
              : "No study rooms found"}
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create Study Room</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Name*
                  </label>
                  <input
                    type="text"
                    value={newRoomData.name}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject*
                  </label>
                  <select
                    value={newRoomData.subject}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, subject: e.target.value as Subject }))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a subject</option>
                    {AVAILABLE_SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRoomData.description}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={newRoomData.isPrivate}
                    onChange={(e) => setNewRoomData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-900">
                    Make this room private (invite-only)
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Invite to {selectedRoom.name}</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedRoom(null);
                  setInviteEmail('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleInviteUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedRoom(null);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoomsPage; 