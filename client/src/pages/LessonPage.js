import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';

export default function LessonPage() {
  const navigate = useNavigate();
  const { subjectId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [isRead, setIsRead] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    const found = stored.find(s => s.id === subjectId);
    if (found) {
      for (const u of found.courseData.units) {
        const l = u.lessons.find(l => l.id === parseInt(lessonId));
        if (l) { setLesson(l); break; }
      }
    }

    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    const subProg = prog[subjectId] || {};
    setIsRead((subProg.readLessons || []).includes(parseInt(lessonId)));

    // Track recently viewed
    const recent = JSON.parse(localStorage.getItem('edutrack_recent') || '[]');
    const lid = parseInt(lessonId);
    const filtered = recent.filter(r => !(r.subjectId === subjectId && r.lessonId === lid));
    filtered.unshift({ subjectId, lessonId: lid, viewedAt: new Date().toISOString() });
    localStorage.setItem('edutrack_recent', JSON.stringify(filtered.slice(0, 5)));

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 100;
      setScrollProgress(pct);
      setAtBottom(pct >= 95);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [subjectId, lessonId]);

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const contentParagraphs = lesson.content.split('\n').filter(p => p.trim());

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-100 z-50">
        <div
          className="h-full bg-green-500 transition-all duration-150 rounded-r-full"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="sticky top-1.5 bg-white/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-gray-100 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{lesson.title}</h1>
            <p className="text-xs text-gray-500">{lesson.duration} read</p>
          </div>
          {isRead && (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Completed</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 mt-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen size={18} className="text-blue-500" />
          <span className="text-sm text-gray-500">Estimated read time: {lesson.duration}</span>
        </div>

        <div className="prose prose-gray max-w-none">
          {contentParagraphs.map((para, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-4 text-[15px]">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
        <div className="max-w-2xl mx-auto">
          {(lesson.type === 'practice' || lesson.title?.toLowerCase().includes('practice')) ? (
            <>
              <button
                onClick={() => {
                  if (isRead) return;
                  const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
                  if (!prog[subjectId]) prog[subjectId] = { readLessons: [], quizScores: {}, lastAccessed: null };
                  const lid = parseInt(lessonId);
                  if (!prog[subjectId].readLessons.includes(lid)) {
                    prog[subjectId].readLessons.push(lid);
                    const today = new Date().toISOString().split('T')[0];
                    const daily = JSON.parse(localStorage.getItem('edutrack_daily') || '{}');
                    if (daily.date !== today) {
                      localStorage.setItem('edutrack_daily', JSON.stringify({ date: today, done: 1 }));
                    } else {
                      daily.done = (daily.done || 0) + 1;
                      localStorage.setItem('edutrack_daily', JSON.stringify(daily));
                    }
                  }
                  prog[subjectId].lastAccessed = new Date().toISOString();
                  localStorage.setItem('edutrack_progress', JSON.stringify(prog));
                  setIsRead(true);
                }}
                className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isRead
                    ? 'bg-gray-200 text-gray-500 cursor-default'
                    : `bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25 ${atBottom ? 'animate-pulse ring-2 ring-green-300 ring-offset-2' : ''}`
                }`}
              >
                {isRead ? (
                  <><CheckCircle size={18} /> Done</>
                ) : (
                  'Mark as Done'
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/quiz/${subjectId}/${lessonId}`)}
                className={`w-full py-3.5 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 ${
                  atBottom ? 'animate-pulse ring-2 ring-blue-300 ring-offset-2' : ''
                }`}
              >
                Take Quiz →
              </button>
              {!isRead && (
                <p className="text-[10px] text-gray-400 text-center mt-2">Score 70% or above to complete this lesson</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
