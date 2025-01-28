
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const StudentStatistics = ({ studentId }: { studentId: string }) => {
  const [stats, setStats] = useState({
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
      }, {});

      const topTutors = Object.entries(tutorCounts || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5);

      // Get subject breakdown
      const subjectCounts = tickets?.reduce((acc, curr) => {
        acc[curr.subject] = (acc[curr.subject] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalTickets: tickets?.length || 0,
        topTutors,
        subjectBreakdown: Object.entries(subjectCounts || {}),
        averageResponseTime: 0 // You can calculate this if needed
      });
    };

    fetchStats();
  }, [studentId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Total Tickets</h3>
        <p className="text-3xl font-bold text-blue-600">{stats.totalTickets}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Top Tutors</h3>
        <ul>
          {stats.topTutors.map(([tutor, count]) => (
            <li key={tutor} className="flex justify-between items-center mb-1">
              <span>{tutor}</span>
              <span className="text-blue-600 font-semibold">{count} responses</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Subject Breakdown</h3>
        <ul>
          {stats.subjectBreakdown.map(([subject, count]) => (
            <li key={subject} className="flex justify-between items-center mb-1">
              <span className="capitalize">{subject}</span>
              <span className="text-blue-600 font-semibold">{count} tickets</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default StudentStatistics;
