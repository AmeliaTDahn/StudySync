import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import { Users, Send, ArrowLeft } from 'lucide-react';
import {
  supabase,
  getProfile,
  getStudyRooms,
  joinStudyRoom,
  leaveStudyRoom,
  getStudyRoomMessages,
  sendStudyRoomMessage,
  subscribeToStudyRoomMessages,
  subscribeToStudyRoomParticipants,
  type Profile,
  type StudyRoom,
  type StudyRoomParticipant,
  type StudyRoomMessage
} from '../../lib/supabase';

const StudyRoomPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<StudyRoom & { study_room_participants: StudyRoomParticipant[] } | null>(null);
  const [messages, setMessages] = useState<StudyRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load room data and messages
  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      const { data: profile, error: profileError } = await getProfile(user.id);
      if (profileError) throw profileError;
      if (profile) setProfile(profile);

      const { data: rooms, error: roomError } = await getStudyRooms();
      if (roomError) throw roomError;
      const currentRoom = rooms?.find(r => r.id === id);
      if (!currentRoom) {
        setError('Study room not found');
        return;
      }
      setRoom(currentRoom);

      // Join the room if not already joined
      if (!currentRoom.study_room_participants.some(p => p.user_id === user.id)) {
        const { error: joinError } = await joinStudyRoom(id as string, user.id, profile?.username || '');
        if (joinError) throw joinError;
      }

      const { data: messages, error: messagesError } = await getStudyRoomMessages(id as string);
      if (messagesError) throw messagesError;
      if (messages) setMessages(messages);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Subscribe to new messages and participant changes
  useEffect(() => {
    if (!id || !user) return;

    const messageSubscription = subscribeToStudyRoomMessages(id as string, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    const participantSubscription = subscribeToStudyRoomParticipants(id as string, () => {
      // Refresh room data to get updated participant list
      loadData();
    });

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(participantSubscription);
    };
  }, [id, user, loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle leaving the room
  const handleLeaveRoom = async () => {
    if (!user || !id) return;

    try {
      const { error } = await leaveStudyRoom(id as string, user.id);
      if (error) throw error;
      router.push('/study-rooms');
    } catch (err) {
      console.error('Error leaving room:', err);
      setError('Failed to leave room');
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !id || !newMessage.trim()) return;

    try {
      const { error } = await sendStudyRoomMessage(
        id as string,
        user.id,
        profile.username,
        newMessage.trim()
      );

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Study room not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/study-rooms')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-blue-600">{room.name}</h1>
              <p className="text-sm text-gray-500">{room.subject}</p>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-red-600 hover:text-red-800"
          >
            Leave Room
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Participants List */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold">Participants</h2>
            </div>
            <div className="space-y-2">
              {room.study_room_participants.map(participant => (
                <div
                  key={participant.user_id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <span className="font-medium">{participant.username}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm mb-1">
                        {message.sender_username}
                      </div>
                      <div>{message.content}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudyRoomPage; 