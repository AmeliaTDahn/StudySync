export type Subject = 'Math' | 'Science' | 'English' | 'History' | 'Computer Science';
export const AVAILABLE_SUBJECTS: Subject[] = ['Math', 'Science', 'English', 'History', 'Computer Science'];

export type UserType = 'student' | 'tutor';

export interface Response {
  id: number;
  ticket_id: number;
  tutor_id: string | null;
  tutor_username: string | null;
  student_id: string | null;
  student_username: string | null;
  content: string;
  parent_id: number | null;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Meeting {
  id: number;
  student_id: string;
  student_username: string;
  tutor_id: string;
  tutor_username: string;
  subject: Subject;
  start_time: string;
  end_time: string;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  subject: Subject;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_private: boolean;
  study_room_participants?: StudyRoomParticipant[];
}

export interface StudyRoomParticipant {
  room_id: string;
  user_id: string;
  username: string;
  joined_at: string;
}

export interface StudyRoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

export type StudyRoomInvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface StudyRoomInvitation {
  id: string;
  room_id: string;
  invitee_id: string;
  status: StudyRoomInvitationStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  user_id: string;
  username: string;
  role: UserType;
  email: string;
  hourly_rate: number | null;
  specialties: string[];
  struggles: string[];
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  student_id: string;
  student_username: string;
  subject: Subject;
  topic: string;
  description: string;
  created_at: string;
  last_response_at: string | null;
  responses: Response[];
  closed: boolean;
}

export interface TutorSubject {
  tutor_id: string;
  subject: Subject;
}

// Define the database schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: number;
          user_id: string;
          username: string;
          role: UserType;
          hourly_rate: number | null;
          specialties: string[];
          struggles: string[];
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Tables['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['profiles']['Row']>;
      };
      tickets: {
        Row: {
          id: number;
          student_id: string;
          student_username: string;
          subject: Subject;
          topic: string;
          description: string;
          created_at: string;
          last_response_at: string | null;
          responses: Response[];
          closed: boolean;
        };
        Insert: Omit<Tables['tickets']['Row'], 'id' | 'created_at' | 'last_response_at' | 'responses' | 'closed'>;
        Update: Partial<Tables['tickets']['Row']>;
      };
      responses: {
        Row: Response;
        Insert: Omit<Response, 'id' | 'created_at'>;
        Update: Partial<Response>;
      };
      tutor_subjects: {
        Row: {
          tutor_id: string;
          subject: Subject;
        };
        Insert: {
          tutor_id: string;
          subject: Subject;
        };
        Update: Partial<{
          tutor_id: string;
          subject: Subject;
        }>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Conversation>;
      };
      conversation_participants: {
        Row: {
          conversation_id: number;
          user_id: string;
          username: string;
        };
        Insert: {
          conversation_id: number;
          user_id: string;
          username: string;
        };
        Update: Partial<{
          conversation_id: number;
          user_id: string;
          username: string;
        }>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Message>;
      };
      meetings: {
        Row: Meeting;
        Insert: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Meeting>;
      };
      study_rooms: {
        Row: StudyRoom;
        Insert: Omit<StudyRoom, 'id' | 'created_at' | 'updated_at' | 'study_room_participants'>;
        Update: Partial<StudyRoom>;
      };
      study_room_participants: {
        Row: StudyRoomParticipant;
        Insert: Omit<StudyRoomParticipant, 'joined_at'>;
        Update: Partial<StudyRoomParticipant>;
      };
      study_room_messages: {
        Row: StudyRoomMessage;
        Insert: Omit<StudyRoomMessage, 'id' | 'created_at'>;
        Update: Partial<StudyRoomMessage>;
      };
      study_room_invitations: {
        Row: StudyRoomInvitation;
        Insert: Omit<StudyRoomInvitation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<StudyRoomInvitation>;
      };
    };
  };
}

// Helper type to access table types
type Tables = Database['public']['Tables'];

// Database schema constants
export const DB_SCHEMA = {
  profiles: {
    tableName: 'profiles',
    columns: {
      id: 'id',
      user_id: 'user_id',
      username: 'username',
      role: 'role',
      hourly_rate: 'hourly_rate',
      specialties: 'specialties',
      struggles: 'struggles',
      bio: 'bio',
      created_at: 'created_at',
      updated_at: 'updated_at'
    }
  },
  tickets: {
    tableName: 'tickets',
    columns: {
      id: 'id',
      student_id: 'student_id',
      student_username: 'student_username',
      subject: 'subject',
      topic: 'topic',
      description: 'description',
      created_at: 'created_at',
      last_response_at: 'last_response_at',
      responses: 'responses',
      closed: 'closed'
    }
  },
  responses: {
    tableName: 'responses',
    columns: {
      id: 'id',
      ticket_id: 'ticket_id',
      tutor_id: 'tutor_id',
      tutor_username: 'tutor_username',
      student_id: 'student_id',
      student_username: 'student_username',
      content: 'content',
      parent_id: 'parent_id',
      created_at: 'created_at'
    }
  },
  tutor_subjects: {
    tableName: 'tutor_subjects',
    columns: {
      tutor_id: 'tutor_id',
      subject: 'subject'
    }
  },
  conversations: {
    tableName: 'conversations',
    columns: {
      id: 'id',
      created_at: 'created_at',
      updated_at: 'updated_at'
    }
  },
  conversation_participants: {
    tableName: 'conversation_participants',
    columns: {
      conversation_id: 'conversation_id',
      user_id: 'user_id',
      username: 'username'
    }
  },
  messages: {
    tableName: 'messages',
    columns: {
      id: 'id',
      conversation_id: 'conversation_id',
      sender_id: 'sender_id',
      sender_username: 'sender_username',
      content: 'content',
      created_at: 'created_at'
    }
  },
  meetings: {
    tableName: 'meetings',
    columns: {
      id: 'id',
      student_id: 'student_id',
      student_username: 'student_username',
      tutor_id: 'tutor_id',
      tutor_username: 'tutor_username',
      subject: 'subject',
      start_time: 'start_time',
      end_time: 'end_time',
      status: 'status',
      created_at: 'created_at',
      updated_at: 'updated_at',
      notes: 'notes'
    }
  },
  study_rooms: {
    tableName: 'study_rooms',
    columns: {
      id: 'id',
      name: 'name',
      subject: 'subject',
      description: 'description',
      created_at: 'created_at',
      updated_at: 'updated_at',
      created_by: 'created_by',
      is_private: 'is_private'
    }
  },
  study_room_participants: {
    tableName: 'study_room_participants',
    columns: {
      room_id: 'room_id',
      user_id: 'user_id',
      username: 'username',
      joined_at: 'joined_at'
    }
  },
  study_room_messages: {
    tableName: 'study_room_messages',
    columns: {
      id: 'id',
      room_id: 'room_id',
      sender_id: 'sender_id',
      sender_username: 'sender_username',
      content: 'content',
      created_at: 'created_at'
    }
  },
  study_room_invitations: {
    tableName: 'study_room_invitations',
    columns: {
      id: 'id',
      room_id: 'room_id',
      invitee_id: 'invitee_id',
      status: 'status',
      created_at: 'created_at',
      updated_at: 'updated_at'
    }
  }
}; 