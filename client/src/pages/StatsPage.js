import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Trophy, Target, Flame } from 'lucide-react';

export default function StatsPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [stats, setStats] = useState({
    totalLessons: 0,
    readLessons: 0,
    totalUnits: 0,
    completedUnits: 0,
    quizzesTaken: 0,
    avgScore: 0,
    streak: 0,
    completion: 0
  });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    const found = stored.find(s => s.id === subjectId);
    if (!found) return;
    setSubject(found);

    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    const subProg = prog[subjectId] || { readLessons: [], quizScores: {} };

    const totalLessons = found.courseData.units.reduce((s, u) => s + u.lessons.length, 0);
    const readLessons = subProg.readLessons?.length || 0;
    const totalUnits = found.courseData.units.length;

    const completedUnits = found.courseData.units.filter(unit =>
      unit.lessons.every(l => subProg.readLessons?.includes(l.id))
    ).length;

    const quizScores = subProg.quizScores || {};
    const quizzesTaken = Object.keys(quizScores).length;
    const avgScore = quizzesTaken > 0
      ? Math.round(Object.values(quizScores).reduce((s, q) => s + (q.score / q.total) * 100, 0) / quizzesTaken)
      : 0;

    // Calculate streak
    let streak = 0;
    if (subProg.lastAccessed) {
      const last = new Date(subProg.lastAccessed);
      const today = new Date();
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      streak = diffDays <= 1 ? Math.max(1, subProg.streak || 1) : 0;
    }

    setStats({
      totalLessons,
      readLessons,
      totalUnits,
      completedUnits,
      quizzesTaken,
      avgScore,
      streak,
      completion: totalLessons > 0 ? Math.round((readLessons / totalLessons) * 100) : 0
    });
  }, [subjectId]);

  if (!subject) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Progress & Stats</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-6">
        {/* Big Progress Ring */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center mb-4">
          <div className="relative w-44 h-44 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="#F3F4F6" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="#3B82F6"
                strokeWidth="10" fill="none"
                strokeDasharray={`${(stats.completion / 100) * 327} 327`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">{stats.completion}%</span>
              <span className="text-xs text-gray-500 mt-1">Complete</span>
            </div>
          </div>
          <h2 className="font-bold text-gray-900">{subject.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Keep going, you're doing great!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<BookOpen size={20} className="text-blue-500" />}
            label="Lessons Read"
            value={`${stats.readLessons}/${stats.totalLessons}`}
            color="blue"
          />
          <StatCard
            icon={<Target size={20} className="text-green-500" />}
            label="Units Done"
            value={`${stats.completedUnits}/${stats.totalUnits}`}
            color="green"
          />
          <StatCard
            icon={<Trophy size={20} className="text-orange-500" />}
            label="Quiz Avg"
            value={stats.quizzesTaken > 0 ? `${stats.avgScore}%` : 'N/A'}
            sub={`${stats.quizzesTaken} taken`}
            color="orange"
          />
          <StatCard
            icon={<Flame size={20} className="text-red-500" />}
            label="Study Streak"
            value={`${stats.streak}`}
            sub="days"
            color="red"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
