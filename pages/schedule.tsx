import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import { 
  supabase,
  requestMeeting,
  getUserMeetings,
  updateMeetingStatus,
  subscribeToMeetings,
  type Profile,
  type Meeting,
  type Subject,
  type UserType,
  AVAILABLE_SUBJECTS
} from '../lib/supabase';

const SchedulePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Profile | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [tutors, setTutors] = useState<Profile[]>([]);
  const [isLoadingTutors, setIsLoadingTutors] = useState(false);

  useEffect(() => {
    // Check authentication and load user data
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        
        // Get user type
        const userType = session.user.user_metadata.user_type as UserType;
        setUserType(userType);

        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }

        // Load meetings
        const { data: meetingsData } = await getUserMeetings(session.user.id, userType);
        if (meetingsData) {
          setMeetings(meetingsData);
        }

        // Subscribe to meeting updates
        const meetingSubscription = subscribeToMeetings(
          session.user.id,
          userType,
          (updatedMeeting) => {
            setMeetings(prevMeetings => {
              const index = prevMeetings.findIndex(m => m.id === updatedMeeting.id);
              if (index >= 0) {
                const newMeetings = [...prevMeetings];
                newMeetings[index] = updatedMeeting;
                return newMeetings;
              }
              return [...prevMeetings, updatedMeeting];
            });
          }
        );

        return () => {
          if (meetingSubscription) {
            supabase.removeChannel(meetingSubscription);
          }
        };
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedTutor || !selectedSubject || !startTime || !endTime) {
      setError('Please fill in all required fields');
      return;
    }

    const { error: meetingError } = await requestMeeting(
      user.id,
      selectedTutor.user_id,
      selectedSubject,
      startTime,
      endTime,
      notes
    );

    if (meetingError) {
      console.error('Error scheduling meeting:', meetingError);
      setError('Failed to schedule meeting');
      return;
    }

    // Clear form
    setSelectedTutor(null);
    setSelectedSubject(null);
    setStartTime('');
    setEndTime('');
    setNotes('');
  };

  const handleUpdateStatus = async (meetingId: number, status: Meeting['status']) => {
    const { error } = await updateMeetingStatus(meetingId, status);
    if (error) {
      console.error('Error updating meeting status:', error);
      setError('Failed to update meeting status');
    }
  };

  const handleBackToDashboard = () => {
    router.push(userType === 'student' ? '/student' : '/tutor');
  };

  const loadTutorsForSubject = async (subject: Subject) => {
    setIsLoadingTutors(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'tutor')
        .contains('specialties', [subject]);

      if (error) {
        console.error('Error loading tutors:', error);
        setError('Failed to load tutors');
        return;
      }

      setTutors(data || []);
    } catch (err) {
      console.error('Error loading tutors:', err);
      setError('Failed to load tutors');
    } finally {
      setIsLoadingTutors(false);
    }
  };

  const handleSubjectChange = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTutor(null);
    if (subject) {
      loadTutorsForSubject(subject);
    } else {
      setTutors([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Schedule Meeting</h1>
          <button
            onClick={handleBackToDashboard}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule Meeting Form */}
          {userType === 'student' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Schedule New Meeting</h2>
              <form onSubmit={handleScheduleMeeting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <select
                    value={selectedSubject || ''}
                    onChange={(e) => handleSubjectChange(e.target.value as Subject)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a subject</option>
                    {AVAILABLE_SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSubject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Tutor
                    </label>
                    {isLoadingTutors ? (
                      <div className="text-center py-4 text-gray-500">
                        Loading tutors...
                      </div>
                    ) : tutors.length > 0 ? (
                      <div className="mt-1 space-y-2">
                        {tutors.map((tutor) => (
                          <div
                            key={tutor.user_id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedTutor?.user_id === tutor.user_id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setSelectedTutor(tutor)}
                          >
                            <div className="font-medium">{tutor.username}</div>
                            <div className="text-sm text-gray-500">
                              Rate: ${tutor.hourly_rate}/hour
                            </div>
                            {tutor.bio && (
                              <div className="text-sm text-gray-600 mt-1">
                                {tutor.bio}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No tutors available for this subject
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Add any additional notes..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Schedule Meeting
                </button>
              </form>
            </div>
          )}

          {/* Meetings List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Meetings</h2>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {userType === 'student'
                          ? `Meeting with ${meeting.tutor_username}`
                          : `Meeting with ${meeting.student_username}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Subject: {meeting.subject}
                      </p>
                      <p className="text-sm text-gray-500">
                        Time: {new Date(meeting.start_time).toLocaleString()} -{' '}
                        {new Date(meeting.end_time).toLocaleString()}
                      </p>
                      {meeting.notes && (
                        <p className="text-sm text-gray-500">
                          Notes: {meeting.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-sm rounded-full ${
                        meeting.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : meeting.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : meeting.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : meeting.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </div>

                  {userType === 'tutor' && meeting.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUpdateStatus(meeting.id, 'accepted')}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(meeting.id, 'rejected')}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchedulePage; 