import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const subjectEmojis = {
  'ancient': '🏛️', 'history': '📜', 'medieval': '⚔️', 'modern': '🏗️',
  'science': '🔬', 'physics': '⚛️', 'chemistry': '🧪', 'biology': '🧬',
  'math': '📐', 'geography': '🌍', 'economics': '📊', 'polity': '🏛️',
  'environment': '🌱', 'art': '🎨', 'culture': '🎭', 'philosophy': '💭',
  'literature': '📚', 'technology': '💻', 'law': '⚖️', 'sociology': '👥',
};

function getSubjectEmoji(name) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(subjectEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return '📖';
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedId, setSelectedId] = useState('all');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    setSubjects(stored);
  }, []);

  const progress = useMemo(() => JSON.parse(localStorage.getItem('edutrack_progress') || '{}'), []);

  // Compute stats for selected subject(s)
  const stats = useMemo(() => {
    const targetSubjects = selectedId === 'all' ? subjects : subjects.filter(s => s.id === selectedId);

    let totalUnits = 0;
    let completedUnits = 0;
    let totalMcqsAttempted = 0;
    let totalMcqsCorrect = 0;
    let totalPracticeSheets = 0;
    let completedPracticeSheets = 0;
    let unitStrengths = { weak: 0, average: 0, strong: 0, lowPractice: 0 };

    targetSubjects.forEach(subject => {
      const subProg = progress[subject.id] || { readLessons: [], quizScores: {} };
      const readLessons = subProg.readLessons || [];
      const quizScores = subProg.quizScores || {};

      subject.courseData.units.forEach(unit => {
        totalUnits++;

        // Check unit completion
        const allRead = unit.lessons.every(l => readLessons.includes(l.id));
        if (allRead) completedUnits++;

        // Count practice sheets
        unit.lessons.forEach(l => {
          if (l.type === 'practice') {
            totalPracticeSheets++;
            if (readLessons.includes(l.id)) completedPracticeSheets++;
          }
        });

        // MCQs from quiz scores for lessons in this unit
        let unitCorrect = 0;
        let unitTotal = 0;
        unit.lessons.forEach(l => {
          const qs = quizScores[l.id];
          if (qs) {
            totalMcqsAttempted += qs.total;
            totalMcqsCorrect += qs.score;
            unitTotal += qs.total;
            unitCorrect += qs.score;
          }
        });

        // Strength analysis per unit
        const unitLessonCount = unit.lessons.length;
        const unitReadCount = unit.lessons.filter(l => readLessons.includes(l.id)).length;
        const unitPct = unitLessonCount > 0 ? (unitReadCount / unitLessonCount) * 100 : 0;

        if (unitReadCount === 0 && unitTotal === 0) {
          unitStrengths.lowPractice++;
        } else if (unitPct < 40) {
          unitStrengths.weak++;
        } else if (unitPct < 70) {
          unitStrengths.average++;
        } else {
          unitStrengths.strong++;
        }
      });
    });

    const prelimsAccuracy = totalMcqsAttempted > 0
      ? Math.round((totalMcqsCorrect / totalMcqsAttempted) * 100)
      : 0;

    return {
      totalUnits,
      completedUnits,
      totalMcqsAttempted,
      prelimsAccuracy,
      totalPracticeSheets,
      completedPracticeSheets,
      unitStrengths
    };
  }, [subjects, selectedId, progress]);

  const selectedName = selectedId === 'all'
    ? 'All Subjects'
    : subjects.find(s => s.id === selectedId)?.name || '';

  const strengthTotal = stats.unitStrengths.weak + stats.unitStrengths.average + stats.unitStrengths.strong + stats.unitStrengths.lowPractice;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Subject Progress</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Subject Chips */}
        <div className="px-4 mt-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
            <button
              onClick={() => setSelectedId('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedId === 'all'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>📚</span> All Subjects
            </button>
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedId === s.id
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-400 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span>{getSubjectEmoji(s.name)}</span> {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Name */}
        <div className="px-5 mt-4 mb-3">
          <h2 className="text-xl font-bold text-gray-900">{selectedName}</h2>
        </div>

        {/* Stats Grid 2x2 */}
        <div className="px-4 grid grid-cols-2 gap-3">
          {/* Units Completed */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-gray-900">
              {stats.completedUnits}<span className="text-lg text-gray-400">/{stats.totalUnits}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Units Completed</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalUnits > 0 ? (stats.completedUnits / stats.totalUnits) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Prelims Accuracy */}
          <div className="rounded-2xl p-4 shadow-sm border border-gray-100" style={{ background: '#FFF5F5' }}>
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-12 mb-1">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  {/* Rainbow arc background */}
                  <path d="M 10 48 A 40 40 0 0 1 90 48" fill="none" stroke="#E5E7EB" strokeWidth="7" strokeLinecap="round" />
                  {/* Red segment */}
                  <path d="M 10 48 A 40 40 0 0 1 30 14" fill="none" stroke="#EF4444" strokeWidth="7" strokeLinecap="round" />
                  {/* Orange segment */}
                  <path d="M 30 14 A 40 40 0 0 1 50 8" fill="none" stroke="#F97316" strokeWidth="7" strokeLinecap="round" />
                  {/* Yellow segment */}
                  <path d="M 50 8 A 40 40 0 0 1 70 14" fill="none" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
                  {/* Green segment */}
                  <path d="M 70 14 A 40 40 0 0 1 90 48" fill="none" stroke="#22C55E" strokeWidth="7" strokeLinecap="round" />
                  {/* Needle */}
                  {(() => {
                    const angle = 180 - (stats.prelimsAccuracy / 100) * 180;
                    const rad = (angle * Math.PI) / 180;
                    const nx = 50 + 30 * Math.cos(rad);
                    const ny = 48 - 30 * Math.sin(rad);
                    return <line x1="50" y1="48" x2={nx} y2={ny} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />;
                  })()}
                  <circle cx="50" cy="48" r="3" fill="#374151" />
                </svg>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#F97316' }}>{stats.prelimsAccuracy}%</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">Prelims Accuracy</p>
          </div>

          {/* MCQs Attempted */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-gray-900">{stats.totalMcqsAttempted}</p>
            <p className="text-xs text-gray-500 mt-1">MCQs Attempted</p>
          </div>

          {/* Practice Sheets Done */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
            <Info size={14} className="absolute top-3 right-3 text-gray-300" />
            <p className="text-3xl font-bold text-gray-900">
              {stats.completedPracticeSheets}<span className="text-lg text-gray-400">/{stats.totalPracticeSheets}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Practice Sheets Done</p>
          </div>
        </div>

        {/* Mains Answers Written */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">Mains Answers Written</p>
          </div>
        </div>

        {/* Strength Analysis */}
        <div className="px-4 mt-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold mb-0.5" style={{ color: '#F97316' }}>Strength Analysis</h3>
            <p className="text-xs text-gray-400 mb-4">Check which units to revise</p>

            <div className="flex items-center gap-6">
              {/* Donut Chart */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {strengthTotal === 0 ? (
                    <circle cx="50" cy="50" r="38" stroke="#E5E7EB" strokeWidth="12" fill="none" />
                  ) : (
                    (() => {
                      const segments = [
                        { count: stats.unitStrengths.weak, color: '#EF4444' },
                        { count: stats.unitStrengths.average, color: '#F97316' },
                        { count: stats.unitStrengths.strong, color: '#22C55E' },
                        { count: stats.unitStrengths.lowPractice, color: '#D1D5DB' },
                      ];
                      const circumference = 2 * Math.PI * 38;
                      let offset = 0;
                      return segments.map((seg, i) => {
                        const pct = seg.count / strengthTotal;
                        const dashLen = pct * circumference;
                        const el = (
                          <circle
                            key={i}
                            cx="50" cy="50" r="38"
                            stroke={seg.color}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += dashLen;
                        return el;
                      });
                    })()
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-700">{strengthTotal}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                <LegendRow color="#EF4444" label="Weak" count={stats.unitStrengths.weak} />
                <LegendRow color="#F97316" label="Average" count={stats.unitStrengths.average} />
                <LegendRow color="#22C55E" label="Strong" count={stats.unitStrengths.strong} />
                <LegendRow color="#D1D5DB" label="Low Practice" count={stats.unitStrengths.lowPractice} />
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-6" />
      </div>

      <BottomNav active="progress" />
    </div>
  );
}

function LegendRow({ color, label, count }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800">{count}</span>
    </div>
  );
}
