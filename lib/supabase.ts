import { createClient } from '@supabase/supabase-js';
import type { Database, Subject, UserType, Ticket, Response, TutorSubject, Profile, Message, Conversation, Meeting, MeetingStatus, StudyRoom, StudyRoomParticipant, StudyRoomMessage } from '../types/database';
import { AVAILABLE_SUBJECTS, DB_SCHEMA } from '../types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': '@supabase/supabase-js/2.48.1'
    }
  }
});

// Re-export types and constants
export type { Subject, UserType, Ticket, Response, TutorSubject, Profile, Message, Conversation, Meeting, MeetingStatus, StudyRoom, StudyRoomParticipant, StudyRoomMessage };
export { AVAILABLE_SUBJECTS };

// Auth functions
export const signIn = async (email: string, password: string) => {
  try {
    const result = await supabase.auth.signInWithPassword({ 
      email, 
      password,
    });
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { error };
  }
};

export const signUp = async (email: string, password: string, userType: UserType) => {
  try {
    const { origin } = window.location;
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType
        },
        emailRedirectTo: `${origin}/auth/callback`,
      }
    });
    
    if (result.error) {
      throw result.error;
    }
    
    return result;
  } catch (error) {
    console.error('Sign up error:', error);
    return { error };
  }
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

// Get current user type
export const getUserType = async (): Promise<UserType | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.user_type || null;
};

// Ticket functions
export const createTicket = async (studentId: string, subject: Subject, topic: string, description: string) => {
  console.log('Starting ticket creation with:', { studentId, subject, topic, description });
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(studentId)) {
    console.error('Invalid UUID format for studentId:', studentId);
    return { error: new Error('Invalid user ID format') };
  }
  console.log('UUID validation passed');
  
  // First get the student's username
  const { data: profile, error: profileError } = await getProfile(studentId);
  console.log('Profile lookup result:', { profile, profileError });
  
  if (profileError) {
    console.error('Profile lookup error:', profileError);
    return { error: profileError };
  }
  if (!profile) {
    console.error('No profile found for student ID:', studentId);
    return { error: new Error('Student profile not found') };
  }
  console.log('Found profile:', profile);

  // Create the ticket
  console.log('Attempting to insert ticket with data:', {
    student_id: studentId,
    student_username: profile.username,
    subject,
    topic,
    description
  });
  
  const result = await supabase
    .from(DB_SCHEMA.tickets.tableName)
    .insert([{
      student_id: studentId,
      student_username: profile.username,
      subject,
      topic,
      description
    }])
    .select()
    .single();
    
  console.log('Insert result:', result);
  return result;
};

export const getStudentTickets = async (studentId: string) => {
  return await supabase
    .from(DB_SCHEMA.tickets.tableName)
    .select(`
      *,
      responses (
        id,
        tutor_id,
        tutor_username,
        student_id,
        student_username,
        content,
        created_at,
        parent_id
      )
    `)
    .eq(DB_SCHEMA.tickets.columns.student_id, studentId)
    .order(DB_SCHEMA.tickets.columns.created_at, { ascending: false });
};

export const getTutorTickets = async (tutorId: string) => {
  const { data: tutorSubjects } = await getTutorSubjects(tutorId);
  if (!tutorSubjects) return { data: null, error: new Error('Failed to load tutor subjects') };
  
  const subjects = tutorSubjects.map(s => s.subject);
  
  return await supabase
    .from(DB_SCHEMA.tickets.tableName)
    .select(`
      *,
      responses (
        id,
        tutor_id,
        tutor_username,
        student_id,
        student_username,
        content,
        created_at,
        parent_id
      )
    `)
    .in(DB_SCHEMA.tickets.columns.subject, subjects)
    .eq(DB_SCHEMA.tickets.columns.closed, false)
    .order(DB_SCHEMA.tickets.columns.created_at, { ascending: false });
};

export const closeTicket = async (ticketId: number) => {
  return await supabase
    .from(DB_SCHEMA.tickets.tableName)
    .update({ closed: true })
    .eq(DB_SCHEMA.tickets.columns.id, ticketId);
};

// Response functions
export const createResponse = async (
  ticketId: number, 
  userId: string, 
  content: string,
  userRole: UserType,
  parentId?: number | null
) => {
  // Get the user's profile
  const profileResult = await getProfile(userId);
  if (profileResult.error) return { error: profileResult.error };
  if (!profileResult.data) return { error: new Error('User profile not found') };

  // If it's a student response, verify they own the ticket
  if (userRole === 'student') {
    const { data: ticket, error: ticketError } = await supabase
      .from(DB_SCHEMA.tickets.tableName)
      .select('student_id')
      .eq(DB_SCHEMA.tickets.columns.id, ticketId)
      .single();

    if (ticketError) return { error: ticketError };
    if (!ticket) return { error: new Error('Ticket not found') };
    if (ticket.student_id !== userId) return { error: new Error('Not authorized to respond to this ticket') };
  }

  const response = await supabase
    .from(DB_SCHEMA.responses.tableName)
    .insert([{
      ticket_id: ticketId,
      tutor_id: userRole === 'tutor' ? userId : null,
      tutor_username: userRole === 'tutor' ? profileResult.data.username : null,
      student_id: userRole === 'student' ? userId : null,
      student_username: userRole === 'student' ? profileResult.data.username : null,
      content,
      parent_id: parentId || null
    }])
    .select();

  if (response.error) return response;

  // Update the ticket's last_response_at
  await supabase
    .from(DB_SCHEMA.tickets.tableName)
    .update({ last_response_at: new Date().toISOString() })
    .eq(DB_SCHEMA.tickets.columns.id, ticketId);

  return response;
};

// Tutor subject functions
export const getTutorSubjects = async (tutorId: string) => {
  return await supabase
    .from(DB_SCHEMA.tutor_subjects.tableName)
    .select(DB_SCHEMA.tutor_subjects.columns.subject)
    .eq(DB_SCHEMA.tutor_subjects.columns.tutor_id, tutorId);
};

export const addTutorSubject = async (tutorId: string, subject: Subject) => {
  return await supabase
    .from(DB_SCHEMA.tutor_subjects.tableName)
    .insert([{
      tutor_id: tutorId,
      subject
    }]);
};

export const removeTutorSubject = async (tutorId: string, subject: Subject) => {
  return await supabase
    .from(DB_SCHEMA.tutor_subjects.tableName)
    .delete()
    .eq(DB_SCHEMA.tutor_subjects.columns.tutor_id, tutorId)
    .eq(DB_SCHEMA.tutor_subjects.columns.subject, subject);
};

// Profile functions
export const getProfile = async (userId: string) => {
  return await supabase
    .from(DB_SCHEMA.profiles.tableName)
    .select('*')
    .eq(DB_SCHEMA.profiles.columns.user_id, userId)
    .single();
};

export async function createProfile(
  user_id: string,
  username: string,
  email: string,
  role: UserType,
  data?: Partial<Profile>
) {
  const profileData = {
    user_id,
    username,
    email,
    role,
    ...data
  };

  return await supabase
    .from('profiles')
    .insert([profileData])
    .select()
    .single();
}

export const updateProfile = async (
  userId: string,
  data: {
    username?: string;
    hourly_rate?: number | null;
    specialties?: string[];
    struggles?: string[];
    bio?: string;
  }
) => {
  return await supabase
    .from(DB_SCHEMA.profiles.tableName)
    .update(data)
    .eq(DB_SCHEMA.profiles.columns.user_id, userId);
};

// Messaging functions
export const searchUsers = async (query: string, role?: UserType) => {
  let profilesQuery = supabase
    .from(DB_SCHEMA.profiles.tableName)
    .select('*')
    .ilike(DB_SCHEMA.profiles.columns.username, `%${query}%`);

  if (role) {
    profilesQuery = profilesQuery.eq(DB_SCHEMA.profiles.columns.role, role);
  }

  return await profilesQuery;
};

export const createConversation = async (otherUserId: string, otherUsername: string, currentUserId: string, currentUsername: string) => {
  // Start a transaction
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({})
    .select()
    .single();

  if (conversationError || !conversation) {
    return { error: conversationError };
  }

  // Add participants
  const { error: participantsError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, user_id: currentUserId, username: currentUsername },
      { conversation_id: conversation.id, user_id: otherUserId, username: otherUsername }
    ]);

  if (participantsError) {
    return { error: participantsError };
  }

  return { data: conversation };
};

export const getUserConversations = async (userId: string) => {
  const { data: participations, error: participationsError } = await supabase
    .from(DB_SCHEMA.conversation_participants.tableName)
    .select('conversation_id')
    .eq(DB_SCHEMA.conversation_participants.columns.user_id, userId);

  if (participationsError) {
    console.error('Error getting user conversations:', participationsError);
    return { error: participationsError };
  }

  // If no participations, return empty array
  if (!participations || participations.length === 0) {
    return { data: [] };
  }

  const conversationIds = participations.map(p => p.conversation_id);

  const { data: conversations, error: conversationsError } = await supabase
    .from(DB_SCHEMA.conversations.tableName)
    .select(`
      *,
      conversation_participants (
        user_id,
        username
      ),
      messages (
        id,
        sender_id,
        sender_username,
        content,
        created_at
      )
    `)
    .in(DB_SCHEMA.conversations.columns.id, conversationIds)
    .order('updated_at', { ascending: false });

  if (conversationsError) {
    console.error('Error getting conversations:', conversationsError);
    return { error: conversationsError };
  }

  return { data: conversations || [] };
};

export const getConversationMessages = async (conversationId: number) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { data, error };
};

export const sendMessage = async (conversationId: number, senderId: string, senderUsername: string, content: string) => {
  const { data: message, error } = await supabase
    .from(DB_SCHEMA.messages.tableName)
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_username: senderUsername,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return { error };
  }

  // Update conversation's updated_at timestamp
  await supabase
    .from(DB_SCHEMA.conversations.tableName)
    .update({ updated_at: new Date().toISOString() })
    .eq(DB_SCHEMA.conversations.columns.id, conversationId);

  return { data: message };
};

export const subscribeToMessages = (conversationId: number, onMessage: (message: Message) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: DB_SCHEMA.messages.tableName,
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();
};

export const subscribeToConversations = (userId: string, callback: (conversation: Conversation) => void) => {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=in.(select conversation_id from conversation_participants where user_id='${userId}')`
      },
      (payload) => {
        callback(payload.new as Conversation);
      }
    )
    .subscribe();
};

// Create or get existing conversation with another user
export const createOrGetConversation = async (userId: string, userUsername: string, otherUserId: string, otherUsername: string) => {
  // Check if conversation already exists between these two users
  const { data: existingConversations, error: existingError } = await supabase
    .from(DB_SCHEMA.conversations.tableName)
    .select(`
      id,
      conversation_participants!inner (
        user_id,
        username
      )
    `)
    .or(`and(conversation_participants.user_id.eq.${userId},conversation_participants.user_id.eq.${otherUserId})`);

  if (existingError) {
    console.error('Error checking existing conversation:', existingError);
    return { error: existingError };
  }

  // Check if any of the returned conversations have both users as participants
  const sharedConversation = existingConversations?.find(conv => {
    const participants = conv.conversation_participants;
    return participants.some(p => p.user_id === userId) && 
           participants.some(p => p.user_id === otherUserId);
  });

  if (sharedConversation) {
    return { data: sharedConversation.id };
  }

  // Create new conversation if none exists
  const { data: conversation, error: conversationError } = await supabase
    .from(DB_SCHEMA.conversations.tableName)
    .insert({})
    .select()
    .single();

  if (conversationError) {
    console.error('Error creating conversation:', conversationError);
    return { error: conversationError };
  }

  if (!conversation) {
    console.error('No conversation created');
    return { error: new Error('Failed to create conversation') };
  }

  // Add participants
  const { error: participantsError } = await supabase
    .from(DB_SCHEMA.conversation_participants.tableName)
    .insert([
      {
        conversation_id: conversation.id,
        user_id: userId,
        username: userUsername
      },
      {
        conversation_id: conversation.id,
        user_id: otherUserId,
        username: otherUsername
      }
    ]);

  if (participantsError) {
    console.error('Error adding participants:', participantsError);
    return { error: participantsError };
  }

  return { data: conversation.id };
};

// Meeting functions
export const requestMeeting = async (
  studentId: string,
  tutorId: string,
  subject: Subject,
  startTime: string,
  endTime: string,
  notes?: string
) => {
  // Get usernames
  const [studentProfile, tutorProfile] = await Promise.all([
    getProfile(studentId),
    getProfile(tutorId)
  ]);

  if (studentProfile.error || !studentProfile.data) {
    return { error: new Error('Student profile not found') };
  }
  if (tutorProfile.error || !tutorProfile.data) {
    return { error: new Error('Tutor profile not found') };
  }

  return await supabase
    .from(DB_SCHEMA.meetings.tableName)
    .insert({
      student_id: studentId,
      student_username: studentProfile.data.username,
      tutor_id: tutorId,
      tutor_username: tutorProfile.data.username,
      subject,
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      notes
    })
    .select()
    .single();
};

export const getUserMeetings = async (userId: string, userType: UserType) => {
  return await supabase
    .from(DB_SCHEMA.meetings.tableName)
    .select('*')
    .or(`${userType}_id.eq.${userId}`)
    .order('start_time', { ascending: true });
};

export const updateMeetingStatus = async (meetingId: number, status: MeetingStatus) => {
  return await supabase
    .from(DB_SCHEMA.meetings.tableName)
    .update({ status, updated_at: new Date().toISOString() })
    .eq(DB_SCHEMA.meetings.columns.id, meetingId)
    .select()
    .single();
};

export const subscribeToMeetings = (userId: string, userType: UserType, callback: (meeting: Meeting) => void) => {
  return supabase
    .channel(`meetings:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: DB_SCHEMA.meetings.tableName,
        filter: `${userType}_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Meeting);
      }
    )
    .subscribe();
};

// Study room functions
export const createStudyRoom = async (
  name: string,
  subject: Subject,
  description: string | null,
  userId: string,
  isPrivate: boolean = false
) => {
  try {
    // First check if the user has a profile
    const { data: profile, error: profileError } = await getProfile(userId);
    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return { data: null, error: new Error('Failed to get user profile') };
    }
    if (!profile) {
      return { data: null, error: new Error('User profile not found') };
    }

    // Create the study room
    const { data: room, error: roomError } = await supabase
      .from(DB_SCHEMA.study_rooms.tableName)
      .insert({
        name,
        subject,
        description,
        created_by: userId,
        is_private: isPrivate
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating study room:', roomError);
      return { data: null, error: new Error('Failed to create study room: ' + roomError.message) };
    }

    if (!room) {
      return { data: null, error: new Error('Study room was not created') };
    }

    // Automatically join the creator to the room
    const { error: joinError } = await joinStudyRoom(room.id, userId, profile.username);
    if (joinError) {
      console.error('Error joining study room:', joinError);
      // Try to delete the room since we couldn't join it
      await supabase
        .from(DB_SCHEMA.study_rooms.tableName)
        .delete()
        .eq('id', room.id);
      return { data: null, error: new Error('Failed to join the created study room') };
    }

    return { data: room, error: null };
  } catch (err) {
    console.error('Unexpected error creating study room:', err);
    return { data: null, error: new Error('An unexpected error occurred while creating the study room') };
  }
};

export const getStudyRooms = async (subject?: Subject) => {
  let query = supabase
    .from(DB_SCHEMA.study_rooms.tableName)
    .select(`
      *,
      study_room_participants (
        user_id,
        username
      )
    `)
    .order('created_at', { ascending: false });

  if (subject) {
    query = query.eq('subject', subject);
  }

  return await query;
};

export const joinStudyRoom = async (roomId: string, userId: string, username: string) => {
  return await supabase
    .from(DB_SCHEMA.study_room_participants.tableName)
    .insert({
      room_id: roomId,
      user_id: userId,
      username
    })
    .select()
    .single();
};

export const leaveStudyRoom = async (roomId: string, userId: string) => {
  return await supabase
    .from(DB_SCHEMA.study_room_participants.tableName)
    .delete()
    .match({
      room_id: roomId,
      user_id: userId
    });
};

export const getStudyRoomMessages = async (roomId: string) => {
  return await supabase
    .from(DB_SCHEMA.study_room_messages.tableName)
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
};

export const sendStudyRoomMessage = async (
  roomId: string,
  senderId: string,
  senderUsername: string,
  content: string
) => {
  return await supabase
    .from(DB_SCHEMA.study_room_messages.tableName)
    .insert({
      room_id: roomId,
      sender_id: senderId,
      sender_username: senderUsername,
      content
    })
    .select()
    .single();
};

export const subscribeToStudyRoomMessages = (roomId: string, onMessage: (message: StudyRoomMessage) => void) => {
  return supabase
    .channel(`study_room_messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: DB_SCHEMA.study_room_messages.tableName,
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessage(payload.new as StudyRoomMessage);
      }
    )
    .subscribe();
};

export const subscribeToStudyRoomParticipants = (roomId: string, onParticipantChange: (participant: StudyRoomParticipant) => void) => {
  return supabase
    .channel(`study_room_participants:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: DB_SCHEMA.study_room_participants.tableName,
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onParticipantChange(payload.new as StudyRoomParticipant);
      }
    )
    .subscribe();
};

export const inviteToStudyRoom = async (roomId: string, inviteeEmail: string) => {
  // First, check if the room exists and is private
  const { data: room, error: roomError } = await supabase
    .from(DB_SCHEMA.study_rooms.tableName)
    .select('*')
    .eq('id', roomId)
    .single();

  if (roomError) return { data: null, error: roomError };
  if (!room.is_private) return { data: null, error: new Error('Room is not private') };

  // Get the invitee's profile
  const { data: inviteeProfile, error: profileError } = await supabase
    .from(DB_SCHEMA.profiles.tableName)
    .select('*')
    .eq('email', inviteeEmail)
    .single();

  if (profileError) return { data: null, error: new Error('User not found') };

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('study_room_invitations')
    .insert({
      room_id: roomId,
      invitee_id: inviteeProfile.user_id,
      status: 'pending'
    })
    .select()
    .single();

  if (inviteError) return { data: null, error: inviteError };

  // TODO: Send email notification to invitee (implement this based on your email service)

  return { data: invitation, error: null };
};

export const acceptStudyRoomInvitation = async (invitationId: string, userId: string) => {
  // Get the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('study_room_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('invitee_id', userId)
    .single();

  if (inviteError) return { data: null, error: inviteError };
  if (!invitation) return { data: null, error: new Error('Invitation not found') };

  // Get user profile
  const { data: profile } = await getProfile(userId);
  if (!profile) return { data: null, error: new Error('User profile not found') };

  // Join the room
  const { error: joinError } = await joinStudyRoom(invitation.room_id, userId, profile.username);
  if (joinError) return { data: null, error: joinError };

  // Update invitation status
  const { error: updateError } = await supabase
    .from('study_room_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  if (updateError) return { data: null, error: updateError };

  return { data: true, error: null };
}; 