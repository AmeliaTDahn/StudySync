
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Statistics {
  totalTickets: number;
  topTutors: [string, number][];
  subjectBreakdown: [string, number][];
  averageResponseTime: number;
}

const StudentStatistics = ({ studentId }: { studentId: string }) => {
  const [stats, setStats] = useState<Statistics>({
    totalTickets: 0,
    topTutors: [],
    subjectBreakdown: [],
    averageResponseTime: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get total tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('student_id', studentId);

      // Get tutor response counts
      const { data: responses } = await supabase
        .from('responses')
        .select('tutor_username, ticket_id')
        .eq('student_id', studentId);

      // Process stats
      const tutorCounts = responses?.reduce((acc, curr) => {
        if (curr.tutor_username) {
          acc[curr.tutor_username] = (acc[curr.tutor_username] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topTutors = Object.entries(tutorCounts || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      // Get subject breakdown
      const subjectCounts = tickets?.reduce((acc, curr) => {
        acc[curr.subject] = (acc[curr.subject] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        totalTickets: tickets?.length || 0,
        topTutors,
        subjectBreakdown: Object.entries(subjectCounts || {}),
        averageResponseTime: 0
      });
    };

    fetchStats();
  }, [studentId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow mb-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Total Activity</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-3xl font-bold text-blue-600">{stats.totalTickets}</p>
          <p className="text-sm text-gray-600">Total Tickets Created</p>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Top Tutors</h3>
        <div className="space-y-2">
          {stats.topTutors.map(([tutor, count]) => (
            <div key={tutor} className="flex justify-between items-center">
              <span className="text-gray-700">{tutor}</span>
              <span className="text-blue-600 font-semibold">{count} responses</span>
            </div>
          ))}
          {stats.topTutors.length === 0 && (
            <p className="text-gray-500">No tutor interactions yet</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Subject Distribution</h3>
        <div className="space-y-2">
          {stats.subjectBreakdown.map(([subject, count]) => (
            <div key={subject} className="flex justify-between items-center">
              <span className="text-gray-700 capitalize">{subject}</span>
              <span className="text-blue-600 font-semibold">{count} tickets</span>
            </div>
          ))}
          {stats.subjectBreakdown.length === 0 && (
            <p className="text-gray-500">No tickets created yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentStatistics;
