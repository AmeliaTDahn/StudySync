import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { 
  getTutorTickets, 
  updateTicketStatus, 
  createResponse, 
  signOut, 
  supabase,
  AVAILABLE_SUBJECTS,
  type Subject,
  addTutorSubject,
  removeTutorSubject,
  getTutorSubjects
} from '../lib/supabase';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';

interface Ticket {
  id: number;
  student_id: string;
  subject: Subject;
  topic: string;
  status: string;
  description: string;
  created_at: string;
  last_response_at?: string;
  responses?: Response[];
}

interface Response {
  id: number;
  ticket_id: number;
  tutor_id: string;
  content: string;
  created_at: string;
}

const TutorHomepage = () => {
  const router = useRouter();
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [error, setError] = useState<string>('');
  const [tutorSubjects, setTutorSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  useEffect(() => {
    // Check authentication status
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        loadTutorData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTutorData = async (userId: string) => {
    // Load tutor subjects
    const { data: subjectData, error: subjectError } = await getTutorSubjects(userId);
    if (subjectError) {
      console.error('Error loading subjects:', subjectError);
      setError('Failed to load your subjects');
      return;
    }
    setTutorSubjects(subjectData?.map(s => s.subject) || []);

    // Load tickets
    await loadTickets(userId);
  };

  const loadTickets = async (userId: string) => {
    const { data, error } = await getTutorTickets(userId);
    if (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load tickets');
    } else {
      setActiveTickets(data || []);
      setError('');
    }
  };

  const handleAddSubject = async (subject: Subject) => {
    if (!user) return;
    
    const { error } = await addTutorSubject(user.id, subject);
    if (error) {
      console.error('Error adding subject:', error);
      setError('Failed to add subject');
    } else {
      setTutorSubjects([...tutorSubjects, subject]);
      loadTickets(user.id);
      setError('');
    }
  };

  const handleRemoveSubject = async (subject: Subject) => {
    if (!user) return;
    
    const { error } = await removeTutorSubject(user.id, subject);
    if (error) {
      console.error('Error removing subject:', error);
      setError('Failed to remove subject');
    } else {
      setTutorSubjects(tutorSubjects.filter(s => s !== subject));
      loadTickets(user.id);
      setError('');
    }
  };

  const handleAcceptTicket = async (ticketId: number) => {
    if (!user) return;

    const { error } = await updateTicketStatus(ticketId, 'In Progress');
    if (error) {
      console.error('Error accepting ticket:', error);
    } else {
      loadTickets(user.id);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket) return;

    const { error } = await createResponse({
      ticket_id: selectedTicket.id,
      tutor_id: user.id,
      content: newResponse
    });

    if (error) {
      console.error('Error creating response:', error);
    } else {
      setNewResponse('');
      loadTickets(user.id);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Study Connect</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSubjectModal(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              Manage Subjects
            </button>
            <span className="text-gray-600">Welcome, {user?.email}</span>
            <button 
              className="text-gray-600 hover:text-gray-800"
              onClick={handleLogout}
            >
              Logout
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

        {/* Subject Selection Modal */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Your Subjects</h2>
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">Select the subjects you can tutor:</p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SUBJECTS.map(subject => {
                    const isSelected = tutorSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        onClick={() => isSelected ? handleRemoveSubject(subject) : handleAddSubject(subject)}
                        className={`p-2 rounded-md flex items-center justify-between ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {subject}
                        {isSelected ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <Users className="text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold">Active Students</h3>
                <p className="text-2xl font-bold">{activeTickets.filter(t => t.status === 'In Progress').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold">New Requests</h3>
                <p className="text-2xl font-bold">{activeTickets.filter(t => t.status === 'New').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold">Completed</h3>
                <p className="text-2xl font-bold">{activeTickets.filter(t => t.status === 'Closed').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets and Details */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Help Requests</h2>
            <div className="space-y-4">
              {activeTickets.map(ticket => (
                <div 
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{ticket.subject} - {ticket.topic}</h3>
                      <p className="text-gray-500 mt-2">{ticket.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === 'New' ? 'bg-green-100 text-green-800' : 
                        ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                      <span className="text-gray-500 text-sm mt-2">
                        {new Date(ticket.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {ticket.status === 'New' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptTicket(ticket.id);
                      }}
                      className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Accept Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Details */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Request Details</h2>
            {selectedTicket ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                    <p className="mt-1">{selectedTicket.subject}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Topic</h3>
                    <p className="mt-1">{selectedTicket.topic}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1">{selectedTicket.description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">{selectedTicket.status}</p>
                  </div>
                  
                  {/* Responses */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Responses</h3>
                    <div className="mt-2 space-y-2">
                      {selectedTicket.responses?.map(response => (
                        <div key={response.id} className="bg-gray-50 p-3 rounded">
                          <p className="text-sm">{response.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(response.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* New Response Form */}
                  {selectedTicket.status !== 'Closed' && (
                    <form onSubmit={handleSubmitResponse} className="mt-4">
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        placeholder="Type your response..."
                        required
                      />
                      <button
                        type="submit"
                        className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Send Response
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                Select a request to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TutorHomepage;