import React, { useState, useEffect } from 'react';
import { PlusCircle, Clock, MessageSquare, BookOpen } from 'lucide-react';
import { createTicket, getStudentTickets, signOut, supabase, AVAILABLE_SUBJECTS, type Subject } from '../lib/supabase';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';

interface Ticket {
  id: number;
  subject: Subject;
  topic: string;
  description: string;
  status: string;
  created_at: string;
  last_response_at?: string;
}

const StudentHomepage = () => {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [newTicket, setNewTicket] = useState({
    subject: '' as Subject,
    topic: '',
    description: ''
  });

  useEffect(() => {
    // Check authentication status
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        loadTickets(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTickets = async (userId: string) => {
    const { data, error } = await getStudentTickets(userId);
    if (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load tickets. Please try again.');
    } else {
      setTickets(data || []);
      setError('');
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newTicket.subject || !newTicket.topic || !newTicket.description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const { error: submitError } = await createTicket({
      ...newTicket,
      student_id: user.id
    });

    if (submitError) {
      console.error('Error creating ticket:', submitError);
      setError('Failed to create ticket. Please try again.');
    } else {
      setNewTicket({
        subject: '' as Subject,
        topic: '',
        description: ''
      });
      setError('');
      loadTickets(user.id);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-3"
                onClick={() => document.getElementById('newTicketForm').scrollIntoView({ behavior: 'smooth' })}
              >
                <PlusCircle className="text-blue-500" />
                <span>Create New Help Request</span>
              </button>
              <button className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-3">
                <Clock className="text-blue-500" />
                <span>View Past Sessions</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Activity</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Tickets</span>
                <span className="text-lg font-semibold">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Sessions</span>
                <span className="text-lg font-semibold">15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tickets */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Active Tickets</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Response</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ticket.topic}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === 'New' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {ticket.last_response_at ? new Date(ticket.last_response_at).toLocaleString() : 'No response yet'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-blue-600 hover:text-blue-800">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Ticket Form */}
        <div className="mt-8" id="newTicketForm">
          <h2 className="text-xl font-semibold mb-4">Create New Help Request</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value as Subject})}
                  required
                >
                  <option value="">Select a subject</option>
                  {AVAILABLE_SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Calculus, Mechanics, etc."
                  value={newTicket.topic}
                  onChange={(e) => setNewTicket({...newTicket, topic: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                  placeholder="Describe what you need help with..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit Help Request
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentHomepage;