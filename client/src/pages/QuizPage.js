import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw, CheckCircle, XCircle, ArrowRight, BookOpen } from 'lucide-react';
import Confetti, { UnitCompleteModal } from '../components/Confetti';

const PASS_THRESHOLD = 0.7;

export default function QuizPage() {
  const navigate = useNavigate();
  const { subjectId, lessonId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState(null);
  const [unitName, setUnitName] = useState('');
  const [unitLessons, setUnitLessons] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUnitComplete, setShowUnitComplete] = useState(false);
  const [nextLessonId, setNextLessonId] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    const found = stored.find(s => s.id === subjectId);
    if (!found) return;

    let foundLesson = null;
    let foundUnit = null;
    for (const unit of found.courseData.units) {
      const l = unit.lessons.find(l => l.id === parseInt(lessonId));
      if (l) {
        foundLesson = l;
        foundUnit = unit;
        break;
      }
    }
    if (!foundLesson || !foundUnit) return;
    setLesson(foundLesson);
    setUnitName(foundUnit.name);
    setUnitLessons(foundUnit.lessons);

    // Find next lesson
    const idx = foundUnit.lessons.findIndex(l => l.id === parseInt(lessonId));
    if (idx < foundUnit.lessons.length - 1) {
      setNextLessonId(foundUnit.lessons[idx + 1].id);
    } else {
      // Try next unit's first lesson
      const unitIdx = found.courseData.units.findIndex(u => u.id === foundUnit.id);
      if (unitIdx < found.courseData.units.length - 1) {
        const nextUnit = found.courseData.units[unitIdx + 1];
        if (nextUnit.lessons.length > 0) setNextLessonId(nextUnit.lessons[0].id);
      }
    }

    // Check cache
    const cacheKey = `edutrack_quiz_${subjectId}_${lessonId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setQuestions(JSON.parse(cached));
      setLoading(false);
      return;
    }

    // Get completed lessons in same unit for cumulative context
    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    const subProg = prog[subjectId] || { readLessons: [] };
    const completedLessonNames = foundUnit.lessons
      .filter(l => l.id !== parseInt(lessonId) && subProg.readLessons?.includes(l.id))
      .map(l => l.title);

    // Generate quiz
    fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: foundLesson.title,
        lessonContent: foundLesson.content,
        unitName: foundUnit.name,
        completedLessons: completedLessonNames,
        numQuestions: foundLesson.mcqs || 8
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          localStorage.setItem(cacheKey, JSON.stringify(data.questions));
        } else {
          setError(data.error || 'Failed to generate quiz questions');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [subjectId, lessonId]);

  const handleSelect = (idx) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === questions[currentQ].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const markLessonComplete = useCallback((finalScore) => {
    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    if (!prog[subjectId]) prog[subjectId] = { readLessons: [], quizScores: {}, lastAccessed: null };
    const lid = parseInt(lessonId);

    // Save quiz score
    prog[subjectId].quizScores[lessonId] = {
      score: finalScore,
      total: questions.length,
      date: new Date().toISOString()
    };

    const passed = finalScore / questions.length >= PASS_THRESHOLD;

    if (passed && !prog[subjectId].readLessons.includes(lid)) {
      prog[subjectId].readLessons.push(lid);

      // Update daily goal
      const today = new Date().toISOString().split('T')[0];
      const daily = JSON.parse(localStorage.getItem('edutrack_daily') || '{}');
      if (daily.date !== today) {
        localStorage.setItem('edutrack_daily', JSON.stringify({ date: today, done: 1 }));
      } else {
        daily.done = (daily.done || 0) + 1;
        localStorage.setItem('edutrack_daily', JSON.stringify(daily));
      }

      // Update streak
      const streakData = JSON.parse(localStorage.getItem('edutrack_streak') || '{}');
      if (streakData.lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        streakData.count = streakData.lastDate === yesterdayStr ? (streakData.count || 0) + 1 : 1;
        streakData.lastDate = today;
        localStorage.setItem('edutrack_streak', JSON.stringify(streakData));
      }

      // Check if unit is now complete
      const allUnitRead = unitLessons.every(l => prog[subjectId].readLessons.includes(l.id));
      if (allUnitRead) {
        setTimeout(() => setShowUnitComplete(true), 800);
      }
    }

    prog[subjectId].lastAccessed = new Date().toISOString();
    localStorage.setItem('edutrack_progress', JSON.stringify(prog));

    return passed;
  }, [subjectId, lessonId, questions, unitLessons]);

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      // Calculate final score: current score + whether current question is correct
      const finalScore = score;
      const passed = markLessonComplete(finalScore);
      if (passed) setShowConfetti(true);
      setFinished(true);
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const retry = () => {
    // Clear cache and regenerate fresh questions
    localStorage.removeItem(`edutrack_quiz_${subjectId}_${lessonId}`);
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
    setQuestions([]);
    setLoading(true);
    setError('');

    // Re-fetch new questions
    const stored = JSON.parse(localStorage.getItem('edutrack_subjects') || '[]');
    const found = stored.find(s => s.id === subjectId);
    if (!found) return;
    let foundLesson = null, foundUnit = null;
    for (const unit of found.courseData.units) {
      const l = unit.lessons.find(l => l.id === parseInt(lessonId));
      if (l) { foundLesson = l; foundUnit = unit; break; }
    }
    if (!foundLesson || !foundUnit) return;

    const prog = JSON.parse(localStorage.getItem('edutrack_progress') || '{}');
    const subProg = prog[subjectId] || { readLessons: [] };
    const completedLessonNames = foundUnit.lessons
      .filter(l => l.id !== parseInt(lessonId) && subProg.readLessons?.includes(l.id))
      .map(l => l.title);

    fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: foundLesson.title,
        lessonContent: foundLesson.content,
        unitName: foundUnit.name,
        completedLessons: completedLessonNames,
        numQuestions: foundLesson.mcqs || 8
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          localStorage.setItem(`edutrack_quiz_${subjectId}_${lessonId}`, JSON.stringify(data.questions));
        } else {
          setError(data.error || 'Failed to generate quiz questions');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-gray-600 font-medium">Generating quiz questions...</p>
        <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <XCircle className="text-red-400 mb-4" size={48} />
        <p className="text-gray-900 font-semibold mb-2">Quiz Generation Failed</p>
        <p className="text-gray-500 text-sm text-center mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setError(''); setLoading(true); window.location.reload(); }}
            className="px-5 py-3 bg-blue-500 text-white rounded-xl font-semibold"
          >
            Retry
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= PASS_THRESHOLD * 100;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <Confetti active={showConfetti} big={passed} onDone={() => setShowConfetti(false)} />
        {showUnitComplete && (
          <>
            <Confetti active={true} big={true} />
            <UnitCompleteModal unitName={unitName} onClose={() => setShowUnitComplete(false)} />
          </>
        )}

        {/* Result Icon */}
        {passed ? (
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle size={48} className="text-green-500" />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle size={48} className="text-red-500" />
          </div>
        )}

        {/* Score Ring */}
        <div className="relative w-36 h-36 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" stroke="#F3F4F6" strokeWidth="8" fill="none" />
            <circle
              cx="60" cy="60" r="52"
              stroke={passed ? '#22C55E' : '#EF4444'}
              strokeWidth="8" fill="none"
              strokeDasharray={`${(pct / 100) * 327} 327`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{pct}%</span>
            <span className="text-xs text-gray-500">{score}/{questions.length}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${
          passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {passed ? 'PASSED' : 'NOT PASSED'}
        </div>

        <h2 className={`text-xl font-bold mb-1 ${passed ? 'text-green-700' : 'text-red-700'}`}>
          {passed ? 'Lesson Complete! 🎉' : 'Keep Practicing!'}
        </h2>
        <p className="text-gray-500 text-sm text-center mb-2">
          You scored {score} out of {questions.length} ({pct}%)
        </p>
        <p className="text-gray-400 text-xs text-center mb-8 max-w-xs">
          {passed
            ? 'Great job! This lesson is now marked as complete.'
            : 'You need 70% to complete this lesson. Review the material and try again!'}
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          {passed ? (
            <>
              {nextLessonId && (
                <button
                  onClick={() => navigate(`/lesson/${subjectId}/${nextLessonId}`)}
                  className="flex-1 py-3.5 rounded-xl font-semibold bg-blue-500 text-white flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
                >
                  Next Lesson <ArrowRight size={16} />
                </button>
              )}
              <button
                onClick={() => navigate(`/course/${subjectId}`)}
                className={`${nextLessonId ? '' : 'flex-1'} py-3.5 px-5 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50`}
              >
                Back to Course
              </button>
            </>
          ) : (
            <>
              <button
                onClick={retry}
                className="flex-1 py-3.5 rounded-xl font-semibold bg-orange-500 text-white flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/25"
              >
                <RotateCcw size={16} /> Retry Quiz
              </button>
              <button
                onClick={() => navigate(`/lesson/${subjectId}/${lessonId}`)}
                className="flex-1 py-3.5 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <BookOpen size={16} /> Back to Lesson
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const labels = ['A', 'B', 'C', 'D'];
  const correctSoFar = score;
  const answeredSoFar = currentQ + (showResult ? 1 : 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{lesson?.title || 'Quiz'}</h1>
            <p className="text-xs text-gray-400">{unitName}</p>
          </div>
          <div className="bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1">
            <CheckCircle size={12} className="text-green-500" />
            <span className="text-xs font-semibold text-green-700">{correctSoFar}/{answeredSoFar}</span>
          </div>
        </div>
      </div>

      {/* Question Counter */}
      <div className="px-5 mt-2 mb-1">
        <p className="text-xs font-semibold text-blue-500">Question {currentQ + 1} of {questions.length}</p>
      </div>

      {/* Progress */}
      <div className="px-5 mb-5">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQ + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto px-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">{q.question}</h2>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let bg = 'bg-white border-gray-200 hover:border-gray-300';
            let text = 'text-gray-700';
            let labelBg = 'bg-gray-100 text-gray-600';

            if (showResult) {
              if (idx === q.correctIndex) {
                bg = 'bg-green-50 border-green-400';
                text = 'text-green-800';
                labelBg = 'bg-green-500 text-white';
              } else if (idx === selected && idx !== q.correctIndex) {
                bg = 'bg-red-50 border-red-400';
                text = 'text-red-800';
                labelBg = 'bg-red-500 text-white';
              } else {
                bg = 'bg-gray-50 border-gray-100';
                text = 'text-gray-400';
              }
            } else if (idx === selected) {
              bg = 'bg-blue-50 border-blue-400';
              text = 'text-blue-800';
              labelBg = 'bg-blue-500 text-white';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all ${bg}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${labelBg}`}>
                  {labels[idx]}
                </span>
                <span className={`text-sm font-medium flex-1 ${text}`}>{opt}</span>
                {showResult && idx === q.correctIndex && (
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                )}
                {showResult && idx === selected && idx !== q.correctIndex && (
                  <XCircle size={18} className="text-red-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && q.explanation && (
          <div className={`mt-4 p-4 rounded-xl border ${
            selected === q.correctIndex
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium mb-1 ${selected === q.correctIndex ? 'text-green-800' : 'text-red-800'}`}>
              {selected === q.correctIndex ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-sm text-gray-700">{q.explanation}</p>
          </div>
        )}

        {/* Next Button */}
        {showResult && (
          <button
            onClick={nextQuestion}
            className="w-full mt-6 mb-8 py-3.5 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition-colors"
          >
            {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
