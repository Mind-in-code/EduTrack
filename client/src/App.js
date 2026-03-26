import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import UploadPage from './pages/UploadPage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import QuizPage from './pages/QuizPage';
import StatsPage from './pages/StatsPage';
import ProgressPage from './pages/ProgressPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/course/:subjectId" element={<CoursePage />} />
          <Route path="/lesson/:subjectId/:lessonId" element={<LessonPage />} />
          <Route path="/quiz/:subjectId/:lessonId" element={<QuizPage />} />
          <Route path="/stats/:subjectId" element={<StatsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </div>
    </Router>
  );
}
