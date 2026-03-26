import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Flame, Target, BookOpen, ArrowRight } from 'lucide-react';
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

const quotes = [
  "The expert in anything was once a beginner.",
  "Small daily improvements lead to stunning results.",
  "Education is the passport to the future.",
  "The more you learn, the more you earn.",
  "Success is the sum of small efforts repeated daily.",
  "Every accomplishment starts with the decision to try.",
  "Learning never exhausts the mind.",
];

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

export default function HomePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

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

  const progress = useMemo(() => JSON.parse(localStorage.getItem('edutrack_progress') || '{}'), []);
  const recentlyViewed = useMemo(() => JSON.parse(localStorage.getItem('edutrack_recent') || '[]'), []);

  const getSubjectProgress = useCallback((subject) => {
    const subProg = progress[subject.id] || {};
    const readLessons = subProg.readLessons || [];
    const totalLessons = subject.courseData.units.reduce((sum, u) => sum + u.lessons.length, 0);
    return {
      read: readLessons.length,
      total: totalLessons,
      pct: totalLessons > 0 ? Math.round((readLessons.length / totalLessons) * 100) : 0
    };
  }, [progress]);

  // Global stats
  const globalStats = useMemo(() => {
    let totalLessons = 0, totalRead = 0;
    subjects.forEach(s => {
      const p = getSubjectProgress(s);
      totalLessons += p.total;
      totalRead += p.read;
    });
    const pct = totalLessons > 0 ? Math.round((totalRead / totalLessons) * 100) : 0;
    return { subjects: subjects.length, totalLessons, totalRead, pct };
  }, [subjects, getSubjectProgress]);

  // Daily goal
  const dailyGoal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem('edutrack_daily') || '{}');
    if (data.date !== today) return { done: 0, goal: 2, date: today };
    return { done: data.done || 0, goal: 2, date: today };
  }, []);

  // Streak
  const streak = useMemo(() => {
    const data = JSON.parse(localStorage.getItem('edutrack_streak') || '{}');
    return data.count || 0;
  }, []);

  // Last accessed subject
  const lastSubject = useMemo(() => {
    let latest = null;
    let latestDate = null;
    subjects.forEach(s => {
      const subProg = progress[s.id];
      if (subProg?.lastAccessed) {
        const d = new Date(subProg.lastAccessed);
        if (!latestDate || d > latestDate) {
          latestDate = d;
          latest = s;
        }
      }
    });
    return latest;
  }, [subjects, progress]);

  // Last lesson for continue learning
  const lastLessonInfo = useMemo(() => {
    if (recentlyViewed.length === 0) return null;
    const r = recentlyViewed[0];
    const subj = subjects.find(s => s.id === r.subjectId);
    if (!subj) return null;
    for (const unit of subj.courseData.units) {
      const lesson = unit.lessons.find(l => l.id === r.lessonId);
      if (lesson) return { ...r, lessonTitle: lesson.title, subjectName: subj.name };
    }
    return null;
  }, [recentlyViewed, subjects]);

  // Estimated completion days
  const getEstDays = useCallback((subject) => {
    const p = getSubjectProgress(subject);
    const remaining = p.total - p.read;
    if (remaining <= 0) return 'Complete';
    const perDay = 2; // daily goal
    return `${Math.ceil(remaining / perDay)}d`;
  }, [getSubjectProgress]);

  // Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results = [];
    subjects.forEach(subject => {
      if (subject.name.toLowerCase().includes(q)) {
        results.push({ type: 'subject', label: subject.name, emoji: getSubjectEmoji(subject.name), path: `/course/${subject.id}` });
      }
      subject.courseData.units.forEach(unit => {
        if (unit.name.toLowerCase().includes(q)) {
          results.push({ type: 'unit', label: `${unit.name}`, emoji: unit.icon, sub: subject.name, path: `/course/${subject.id}` });
        }
        unit.lessons.forEach(lesson => {
          if (lesson.title.toLowerCase().includes(q)) {
            results.push({ type: 'lesson', label: lesson.title, emoji: '📄', sub: `${unit.name} · ${subject.name}`, path: `/lesson/${subject.id}/${lesson.id}` });
          }
        });
      });
    });
    return results.slice(0, 8);
  }, [searchQuery, subjects]);

  const hasSubjects = subjects.length > 0;

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">EduTrack</h1>
              <p className="text-xs text-gray-500">Gamified Study Tracker</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects, units, lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={16} className="text-gray-400" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-72 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onMouseDown={() => navigate(r.path)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                      {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-5">
        {/* Hero Section */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">📚🎓🧠</div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to EduTrack</h2>
          <p className="text-sm text-gray-500 mt-1">Turn any PDF into a full course with AI</p>
        </div>

        {/* Quick Stats Row */}
        {hasSubjects && (
          <div className="flex gap-2 mb-5">
            <div className="flex-1 bg-white rounded-xl py-2.5 px-3 text-center border border-gray-100 shadow-sm">
              <p className="text-lg font-bold text-blue-500">{globalStats.subjects}</p>
              <p className="text-[10px] text-gray-500">Subjects</p>
            </div>
            <div className="flex-1 bg-white rounded-xl py-2.5 px-3 text-center border border-gray-100 shadow-sm">
              <p className="text-lg font-bold text-green-500">{globalStats.totalRead}</p>
              <p className="text-[10px] text-gray-500">Lessons Done</p>
            </div>
            <div className="flex-1 bg-white rounded-xl py-2.5 px-3 text-center border border-gray-100 shadow-sm">
              <p className="text-lg font-bold text-orange-500">{globalStats.pct}%</p>
              <p className="text-[10px] text-gray-500">Complete</p>
            </div>
          </div>
        )}

        {/* Daily Goal + Streak Row */}
        {hasSubjects && (
          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-blue-500" />
                <span className="text-xs font-semibold text-gray-700">Daily Goal</span>
              </div>
              <p className="text-sm text-gray-600">Read <span className="font-bold">{dailyGoal.goal}</span> lessons</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((dailyGoal.done / dailyGoal.goal) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{dailyGoal.done}/{dailyGoal.goal} done today</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center min-w-[100px]">
              <span className="text-3xl mb-1">🔥</span>
              <p className="text-2xl font-bold text-orange-500">{streak}</p>
              <p className="text-[10px] text-gray-500">day streak</p>
            </div>
          </div>
        )}

        {/* Quick Start Card */}
        <div
          onClick={() => navigate('/upload')}
          className="rounded-2xl p-5 mb-5 cursor-pointer shadow-lg relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #7C3AED)' }}
        >
          <div className="relative z-10">
            <h3 className="text-white font-bold text-lg">Start Learning Today</h3>
            <p className="text-blue-100 text-sm mt-1">Upload a PDF and AI will create your personalized course</p>
            <button className="mt-4 bg-white text-blue-600 font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-colors">
              <Plus size={16} /> Upload New Subject
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -right-2 bottom-0 w-16 h-16 bg-white/10 rounded-full" />
        </div>

        {/* Continue Learning */}
        {lastSubject && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Continue Learning</h3>
            <button
              onClick={() => navigate(`/course/${lastSubject.id}`)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getSubjectEmoji(lastSubject.name)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{lastSubject.name}</h4>
                  {lastLessonInfo && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">Last: {lastLessonInfo.lessonTitle}</p>
                  )}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${getSubjectProgress(lastSubject).pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{getSubjectProgress(lastSubject).pct}% complete</p>
                </div>
                <div className="bg-blue-500 text-white rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1">
                  Continue <ArrowRight size={12} />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Recently Viewed</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {recentlyViewed.slice(0, 3).map((r, i) => {
                const subj = subjects.find(s => s.id === r.subjectId);
                if (!subj) return null;
                let lessonTitle = '';
                for (const unit of subj.courseData.units) {
                  const l = unit.lessons.find(l => l.id === r.lessonId);
                  if (l) { lessonTitle = l.title; break; }
                }
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/lesson/${r.subjectId}/${r.lessonId}`)}
                    className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm min-w-[160px] text-left hover:shadow-md transition-all flex-shrink-0"
                  >
                    <span className="text-lg">{getSubjectEmoji(subj.name)}</span>
                    <p className="text-xs font-semibold text-gray-900 mt-1 truncate">{lessonTitle}</p>
                    <p className="text-[10px] text-gray-400 truncate">{subj.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Subjects */}
        {hasSubjects && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Your Subjects</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const p = getSubjectProgress(subject);
                return (
                  <button
                    key={subject.id}
                    onClick={() => navigate(`/course/${subject.id}`)}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all"
                  >
                    <span className="text-2xl">{getSubjectEmoji(subject.name)}</span>
                    <h4 className="font-semibold text-gray-900 text-sm mt-2 truncate">{subject.name}</h4>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{p.read} of {p.total} lessons</p>
                    <p className="text-[10px] text-gray-400">Est. {getEstDays(subject)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Motivational Section */}
        {hasSubjects && (
          <div className="mb-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={16} className="text-orange-500" />
              <span className="text-xs font-semibold text-gray-700">
                {streak > 0 ? `${streak} day streak! Keep it up!` : 'Start a streak today!'}
              </span>
            </div>
            <p className="text-xs text-gray-500 italic">"{getDailyQuote()}"</p>
          </div>
        )}

        {/* Tips for new users */}
        {!hasSubjects && (
          <div className="space-y-3 mb-5">
            <h3 className="text-sm font-semibold text-gray-800">How it works</h3>
            {[
              { emoji: '📄', title: 'Upload Any PDF', desc: 'We support textbooks, notes, and study material' },
              { emoji: '🤖', title: 'AI Breakdown', desc: 'Claude AI splits your PDF into bite-sized lessons' },
              { emoji: '📊', title: 'Track Progress', desc: 'Mark lessons done and take quizzes to test yourself' },
            ].map((tip, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                <span className="text-3xl">{tip.emoji}</span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{tip.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="home" />
    </div>
  );
}
