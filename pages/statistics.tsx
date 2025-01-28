
import React from 'react';
import { useAuth } from '../contexts/auth';
import StudentStatistics from '../components/student-statistics';
import TutorStatistics from '../components/tutor-statistics';
import BackOnlyNav from '../components/BackOnlyNav';

export default function StatisticsPage() {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <BackOnlyNav />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Statistics</h1>
        {profile.role === 'student' ? (
          <StudentStatistics studentId={user.id} />
        ) : (
          <TutorStatistics tutorId={user.id} />
        )}
      </main>
    </div>
  );
}
