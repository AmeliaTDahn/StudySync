import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  supabase,
  searchUsers,
  getUserConversations,
  createOrGetConversation,
  sendMessage,
  subscribeToMessages,
  subscribeToConversations,
  type Profile,
  type Message,
  type UserType
} from '../lib/supabase';

const MessagesPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchRole, setSearchRole] = useState<UserType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Check if user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/');
        return;
      }

      // Load conversations
      const { data: conversationsData, error: conversationsError } = await getUserConversations(userId);
      if (conversationsError) {
        console.error('Error loading conversations:', conversationsError);
        setError('Failed to load conversations');
        return;
      }
      setConversations(conversationsData || []);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile');
        return;
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Error in loadUserData:', err);
      setError('Failed to load user data');
    }
  }, [router]);

  const handleBackToDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userType = user?.user_metadata?.user_type;
    if (userType) {
      router.push(userType === 'student' ? '/student' : '/tutor');
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    // Check authentication status
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, loadUserData]);

  // Add new useEffect to handle conversation from URL
  useEffect(() => {
    const conversationId = router.query.conversation;
    if (conversationId && conversations.length > 0) {
      const targetConversation = conversations.find(
        (conv: any) => conv.id === parseInt(conversationId as string)
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
        // Scroll chat into view on mobile
        if (window.innerWidth < 768) {
          const chatArea = document.querySelector('.md\\:col-span-2');
          chatArea?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [router.query.conversation, conversations]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  useEffect(() => {
    let messageSubscription: any;
    let conversationSubscription: any;
    
    if (selectedConversation) {
      // Subscribe to new messages
      messageSubscription = subscribeToMessages(selectedConversation.id, (newMessage) => {
        setSelectedConversation((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), newMessage]
          };
        });
        
        // Also update the conversation in the list
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  messages: [...(conv.messages || []), newMessage]
                }
              : conv
          )
        );
      });
    }

    if (user) {
      // Subscribe to conversation updates
      conversationSubscription = subscribeToConversations(user.id, async (updatedConversation) => {
        // Fetch the full conversation data when it's updated
        const { data: conversationsData } = await getUserConversations(user.id);
        if (conversationsData) {
          setConversations(conversationsData);
          // If this is the selected conversation, update it
          if (selectedConversation?.id === updatedConversation.id) {
            const updatedFullConversation = conversationsData.find(
              (conv: any) => conv.id === updatedConversation.id
            );
            if (updatedFullConversation) {
              setSelectedConversation(updatedFullConversation);
            }
          }
        }
      });
    }

    return () => {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
      if (conversationSubscription) {
        supabase.removeChannel(conversationSubscription);
      }
    };
  }, [selectedConversation?.id, user?.id]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error } = await searchUsers(query.trim(), searchRole || undefined);
      if (error) {
        console.error('Error searching users:', error);
        setError('Failed to search users');
        return;
      }
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  }, [searchRole, setSearchResults, setIsSearching, setError, searchUsers, searchQuery, supabase]);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  // Update search when role changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  }, [searchRole, handleSearch, searchQuery]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleStartConversation = async (otherUser: Profile) => {
    if (!user || !profile) return;

    try {
      const { data: conversationId, error } = await createOrGetConversation(
        user.id,
        profile.username,
        otherUser.user_id,
        otherUser.username
      );

      if (error) {
        console.error('Error creating conversation:', error);
        setError('Failed to start conversation');
        return;
      }

      if (!conversationId) {
        console.error('No conversation ID returned');
        setError('Failed to start conversation');
        return;
      }

      // Refresh conversations and find the new/existing conversation
      const { data: conversationsData, error: loadError } = await getUserConversations(user.id);
      if (loadError) {
        console.error('Error loading conversations:', loadError);
        setError('Failed to load conversations');
        return;
      }

      if (conversationsData) {
        setConversations(conversationsData);
        // Find and select the conversation
        const targetConversation = conversationsData.find(
          (conv: any) => conv.id === conversationId
        );
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          // Clear search
          setSearchQuery('');
          setSearchResults([]);
          // Scroll chat into view on mobile
          if (window.innerWidth < 768) {
            const chatArea = document.querySelector('.md\\:col-span-2');
            chatArea?.scrollIntoView({ behavior: 'smooth' });
          }
          // Scroll to message input
          const messageInput = document.querySelector('input[placeholder="Type a message..."]');
          messageInput?.focus();
        } else {
          console.error('Could not find conversation with ID:', conversationId);
          setError('Failed to open conversation');
        }
      }
    } catch (err) {
      console.error('Error in handleStartConversation:', err);
      setError('Failed to start conversation');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedConversation || !newMessage.trim()) return;

    const { error } = await sendMessage(
      selectedConversation.id,
      user.id,
      profile.username,
      newMessage.trim()
    );

    if (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      return;
    }

    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Messages</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - Conversations list */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={searchRole || ''}
                  onChange={(e) => {
                    setSearchRole(e.target.value as UserType || null);
                    if (searchQuery.trim()) {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="student">Students</option>
                  <option value="tutor">Tutors</option>
                </select>
              </div>
              {/* Search Results */}
              {isSearching ? (
                <div className="text-center py-4 text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="border-t pt-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Search Results ({searchResults.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.user_id}
                        onClick={() => handleStartConversation(result)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded flex justify-between items-center group"
                      >
                        <span className="font-medium text-gray-900">{result.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{result.role}</span>
                          <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Start Chat →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchQuery.trim() && !isSearching ? (
                <div className="text-center py-4 text-gray-500">
                  No users found
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold mb-4">Conversations</h2>
              {conversations.map((conversation) => {
                const otherParticipant = conversation.conversation_participants.find(
                  (p: any) => p.user_id !== user?.id
                );
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{otherParticipant?.username}</div>
                    <div className="text-sm text-gray-500">
                      {conversation.messages?.[conversation.messages.length - 1]?.content?.substring(0, 30)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side - Chat area */}
          <div className="md:col-span-2">
            {selectedConversation ? (
              <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
                {/* Chat header */}
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">
                    {selectedConversation.conversation_participants.find(
                      (p: any) => p.user_id !== user?.id
                    )?.username}
                  </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages?.map((message: Message) => (
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

                {/* Message input */}
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
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-[600px] flex items-center justify-center text-gray-500">
                Select a conversation or start a new one
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessagesPage; 