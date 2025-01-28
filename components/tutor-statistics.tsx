
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TutorStatistics = ({ tutorId }: { tutorId: string }) => {
  const [stats, setStats] = useState({
    totalResponses: 0,
    topStudents: [],
    subjectBreakdown: [],
    averageResponseRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get all responses
      const { data: responses } = await supabase
        .from('responses')
        .select('*, tickets(subject)')
        .eq('tutor_id', tutorId);

      // Get student interaction counts
      const studentCounts = responses?.reduce((acc, curr) => {
        if (curr.student_username) {
          acc[curr.student_username] = (acc[curr.student_username] || 0) + 1;
        }
        return acc;
      }, {});

      const topStudents = Object.entries(studentCounts || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5);

      // Get subject breakdown
      const subjectCounts = responses?.reduce((acc, curr) => {
        const subject = curr.tickets?.subject;
        if (subject) {
          acc[subject] = (acc[subject] || 0) + 1;
        }
        return acc;
      }, {});

      setStats({
        totalResponses: responses?.length || 0,
        topStudents,
        subjectBreakdown: Object.entries(subjectCounts || {}),
        averageResponseRate: 0 // You can calculate this if needed
      });
    };

    fetchStats();
  }, [tutorId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Total Responses</h3>
        <p className="text-3xl font-bold text-blue-600">{stats.totalResponses}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Top Students Helped</h3>
        <ul>
          {stats.topStudents.map(([student, count]) => (
            <li key={student} className="flex justify-between items-center mb-1">
              <span>{student}</span>
              <span className="text-blue-600 font-semibold">{count} interactions</span>
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
              <span className="text-blue-600 font-semibold">{count} responses</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TutorStatistics;
