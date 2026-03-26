import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import sampleData from '../data/sampleData';

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

export default function LearnPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('edutrack_subjects');
    if (stored) {
      setSubjects(JSON.parse(stored));
    } else {
      const initial = [{
        id: 'sample-1',
        name: sampleData.subjectName,
        courseData: sampleData.courseData,
        createdAt: new Date().toISOString()
      }];
      localStorage.setItem('edutrack_subjects', JSON.stringify(initial));
      setSubjects(initial);
    }
  }, []);

  const getProgress = (subject) => {
    const progress = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    const subjectProgress = progress[subject.id] || {};
    const readLessons = subjectProgress.readLessons || [];
    const totalLessons = subject.courseData.units.reduce((sum, u) => sum + u.lessons.length, 0);
    return {
      read: readLessons.length,
      total: totalLessons,
      pct: totalLessons > 0 ? Math.round((readLessons.length / totalLessons) * 100) : 0
    };
  };

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-gray-900">My Subjects</h1>
          <p className="text-xs text-gray-500 mt-1">{subjects.length} subjects enrolled</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-4">
        {subjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No subjects yet</h3>
            <p className="text-sm text-gray-500 mb-6">Upload a PDF to create your first course</p>
            <button
              onClick={() => navigate('/upload')}
              className="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              <Plus size={18} className="inline mr-2" /> Upload Subject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map((subject) => {
              const p = getProgress(subject);
              return (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/course/${subject.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getSubjectEmoji(subject.name)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {subject.courseData.units.length} Units · {p.total} Lessons
                      </p>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{p.read} of {p.total} complete · {p.pct}%</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => navigate('/upload')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-colors"
            >
              <Plus size={20} />
              <span className="font-semibold">Upload New Subject</span>
            </button>
          </div>
        )}
      </div>

      <BottomNav active="learn" />
    </div>
  );
}
