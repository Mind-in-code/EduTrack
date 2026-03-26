import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp, Plus, FileText, CheckCircle2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function CoursePage() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [progress, setProgress] = useState({ readLessons: [], quizScores: {} });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    const found = stored.find(s => s.id === subjectId);
    if (found) {
      setSubject(found);
      // Expand first unit by default
      setExpandedUnits({ [found.courseData.units[0]?.id]: true });
    }
    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    if (prog[subjectId]) setProgress(prog[subjectId]);
  }, [subjectId]);

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const isRead = (lessonId) => progress.readLessons?.includes(lessonId);
  const hasQuiz = (lessonId) => progress.quizScores?.[lessonId] !== undefined;

  const getUnitProgress = (unit) => {
    const read = unit.lessons.filter(l => isRead(l.id)).length;
    return { read, total: unit.lessons.length };
  };

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{subject.name}</h1>
          <button
            onClick={() => navigate(`/stats/${subjectId}`)}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-xl"
          >
            <BarChart3 size={22} className="text-blue-500" />
          </button>
        </div>
      </div>

      {/* Units */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        {subject.courseData.units.map((unit) => {
          const isExpanded = expandedUnits[unit.id];
          const unitProg = getUnitProgress(unit);

          return (
            <div key={unit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Unit Header */}
              <button
                onClick={() => toggleUnit(unit.id)}
                className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{unit.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{unit.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Unit {unit.id} · {unit.lessons.length} lessons
                    {unitProg.read > 0 && (
                      <span className="text-green-500 ml-2">({unitProg.read}/{unitProg.total} done)</span>
                    )}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </button>

              {/* Add to targets */}
              {isExpanded && (
                <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Add to targets</span>
                  <button className="text-xs text-blue-500 font-semibold flex items-center gap-1 hover:text-blue-600">
                    <Plus size={14} /> Add
                  </button>
                </div>
              )}

              {/* Lesson List */}
              {isExpanded && (
                <div className="border-t border-gray-50">
                  {unit.lessons.map((lesson, idx) => {
                    const read = isRead(lesson.id);
                    const isPractice = lesson.type === 'practice';

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => navigate(`/lesson/${subjectId}/${lesson.id}`)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-50 first:border-t-0"
                      >
                        {/* Status Circle */}
                        {read ? (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={16} className="text-white" />
                          </div>
                        ) : isPractice ? (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-gray-500" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            idx === 0 && !read ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </div>
                        )}

                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${read ? 'text-gray-500' : 'text-gray-900'} truncate`}>
                            {lesson.title}
                          </p>
                        </div>

                        {/* Duration */}
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {isPractice ? `${lesson.mcqs} MCQs` : lesson.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav active="learn" />
    </div>
  );
}
