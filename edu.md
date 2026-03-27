# EduTrack - Gamified PDF Study Tracker

A full-stack web application that lets users upload educational PDFs, automatically breaks them into structured courses using AI, and provides a gamified learning experience with progress tracking, cumulative quizzes, and detailed analytics.

---

## Tech Stack

- **Frontend:** React 18 + Tailwind CSS (via CDN)
- **Backend:** Node.js + Express
- **PDF Processing:** pdf-parse
- **AI:** Google Gemini API (gemini-1.5-flash)
- **Storage:** localStorage (no database)
- **Port:** 5000 (production), 3000 (React dev server)

---

## Project Structure

```
EduTrack/
├── .env                          # Environment variables (GEMINI_API_KEY, PORT)
├── package.json                  # Root package with concurrently, express, pdf-parse, Google Generative AI SDK
├── edu.md                        # This file
│
├── server/
│   ├── index.js                  # Express server - serves API routes + static React build
│   └── routes/
│       ├── upload.js             # POST /api/upload - PDF upload, text extraction, AI course breakdown
│       └── quiz.js               # POST /api/quiz/generate - AI-powered cumulative MCQ generation
│
└── client/
    ├── package.json              # React dependencies (react-router-dom, lucide-react)
    ├── public/
    │   └── index.html            # HTML template with Tailwind CDN, Inter font
    ├── build/                    # Production build (served by Express on port 5000)
    └── src/
        ├── index.js              # React entry point
        ├── App.js                # Router with 8 routes
        ├── components/
        │   ├── BottomNav.js      # Fixed bottom navigation bar (Home, Learn, Progress) - 3 tabs
        │   └── Confetti.js       # Celebration animations + UnitCompleteModal
        ├── data/
        │   └── sampleData.js     # Pre-loaded "Ancient History" sample with 4 units, 23 lessons
        └── pages/
            ├── HomePage.js       # Dashboard with global stats, daily goals, streak, continue learning
            ├── LearnPage.js      # Subject listing with progress, upload button
            ├── UploadPage.js     # Subject name input, PDF file upload, AI processing
            ├── CoursePage.js     # Collapsible unit cards with lesson lists
            ├── LessonPage.js     # Lesson content reader with scroll progress
            ├── QuizPage.js       # MCQ quiz with confetti, unit completion celebrations
            ├── StatsPage.js      # Per-subject circular progress ring, stats grid
            └── ProgressPage.js   # Overall analytics: accuracy gauge, strength analysis
```

---

## What Was Built

### Backend (server/)

**server/index.js**
- Express server on port 5000
- CORS enabled, JSON body limit 50MB
- Mounts `/api/upload` and `/api/quiz` routes
- Serves React production build as static files

**server/routes/upload.js**
- Accepts multipart form data (PDF file + subject name) via multer
- Extracts text from PDF using pdf-parse (up to 150,000 chars)
- Sends extracted text to Gemini API with a structured prompt
- Gemini breaks content into 3-8 units with 4-8 lessons each
- Each lesson includes full extracted content (not summaries), durations (5m-25m), and MCQ counts
- Includes 1 practice sheet per unit
- Assigns unique global lesson IDs across all units
- Returns the full course structure to the frontend

**server/routes/quiz.js**
- Accepts lesson title, content, unit name, completed lessons list, and question count (default 8)
- **API key validation**: checks if GEMINI_API_KEY is missing or still set to placeholder, returns clear error message
- Sends to Gemini API to generate MCQ questions
- **Cumulative learning**: includes 2-3 questions connecting current topic to previously completed lessons
- **Robust JSON parsing**: multiple fallback strategies — direct parse → array extraction → object wrapper extraction → markdown fence removal
- Returns questions with 4 options each, correct answer index, and explanations
- Questions test understanding, not just memorization, with mixed difficulty levels
- Questions are cached in localStorage on the frontend for retries

### Frontend (client/)

**App.js**
- React Router with 8 routes:
  - `/` → HomePage
  - `/learn` → LearnPage
  - `/upload` → UploadPage
  - `/course/:subjectId` → CoursePage
  - `/lesson/:subjectId/:lessonId` → LessonPage
  - `/quiz/:subjectId/:lessonId` → QuizPage
  - `/stats/:subjectId` → StatsPage
  - `/progress` → ProgressPage

**BottomNav.js**
- Fixed bottom navigation bar with 3 tabs using lucide-react icons:
  - Home (`/`)
  - Learn (`/learn`)
  - Progress (`/progress`)
- Active tab scales up with blue highlight

**Confetti.js**
- Celebration particle animation component
- Normal mode: 35 multi-colored particles (circles & rectangles)
- Big mode: 80 particles for major achievements
- 1.5-3 second animation duration
- Includes `UnitCompleteModal` component for celebrating unit completion

**HomePage.js**
- Dashboard-style home screen with:
  - Global stats bar (subjects count, lessons completed, overall %)
  - Daily goal tracking (default 2 lessons/day) with progress bar
  - Streak counter with fire emoji
  - Daily-rotating motivational quotes
  - "Continue Learning" card for last accessed subject
  - Recently viewed lessons (horizontal scroll, up to 5)
  - Your Subjects grid (2-column layout)
  - Subject search functionality
  - Tips section for new users
- Initializes localStorage with sample "Ancient History" data on first load

**LearnPage.js**
- Lists all enrolled subjects with progress percentage
- Progress bar per subject
- "Upload New Subject" button

**UploadPage.js**
- Input field for subject name
- Drag-style PDF upload area showing file name and size (50MB limit)
- "Process with AI" button
- 3-stage loading feedback: extracting text → AI processing → saving
- Saves processed course to localStorage, redirects to course page

**CoursePage.js**
- Back arrow, centered subject name, blue stats icon in header
- Collapsible unit cards (first unit expanded by default) with emoji icon, unit name, lesson count, progress
- "Add to targets" row with blue "+ Add" button per unit
- Lesson list with status badges:
  - Orange circle with number → current/first unread lesson
  - Gray circle with number → unread lessons
  - Green circle with checkmark → completed lessons
  - Gray circle with file icon → practice sheets
- Quiz count indicator for practice sheets
- Duration shown on the right side of each lesson row

**LessonPage.js**
- Green scroll progress bar at the very top (tracks reading progress)
- Sticky header with back arrow, lesson title, read time, completion badge
- Clean paragraph-based content display
- **Context-aware bottom action bar:**
  - Regular lessons (`type: "lesson"`) → blue "Take Quiz →" button with 70% score note
  - Practice sheets (`type: "practice"` or title contains "Practice") → green "Mark as Done" button that directly marks the lesson complete in localStorage (updates readLessons, daily goal); grays out with checkmark once done
- Pulse animation on button when user scrolls to bottom
- Tracks recently viewed lessons in localStorage

**QuizPage.js**
- Loading state while AI generates questions
- Question counter and progress bar
- Real-time score tracking (green badge showing correct/answered)
- 4 option cards labeled A/B/C/D
- Instant feedback: green highlight for correct, red for wrong
- Explanation shown below after answering
- "Next Question" button advances through quiz
- **70% pass threshold** - lesson auto-marked as read on pass
- Final score screen with:
  - Circular progress indicator
  - PASSED / NOT PASSED badge
  - Percentage and fraction score
  - Encouraging message based on performance
  - "Retry" and "Course" / "Next Lesson" buttons
- **Confetti animation** on pass (normal confetti at ≥70%, big confetti at 100%)
- **Unit completion modal** when all lessons in a unit are completed
- **Retry generates fresh questions**: clears cache, calls API for new questions instead of reusing old ones
- Scores saved to localStorage

**StatsPage.js**
- Large circular progress ring showing overall completion percentage
- 2x2 stats grid:
  - Lessons Read (x/total)
  - Units Done (x/total)
  - Quiz Average (percentage, count taken)
  - Study Streak (days)

**ProgressPage.js**
- Overall analytics dashboard across all subjects:
  - Subject filtering chips
  - Units completed / total (with progress bar)
  - **Prelims Accuracy** gauge chart (rainbow-colored arc with needle)
  - MCQs attempted counter
  - Practice sheets done / total
  - Mains Answers Written counter (placeholder, hardcoded at 0)
  - **Strength Analysis** donut chart:
    - Weak units (red) - avg score < 50%
    - Average units (orange) - avg score 50-69%
    - Strong units (green) - avg score ≥ 70%
    - Low Practice units (gray) - no quiz data

### Sample Data (sampleData.js)

Pre-loaded "Ancient History" subject with 4 units:

| Unit | Lessons | Topics |
|------|---------|--------|
| Pre-Historic Time | 8 | Sources, Society, Art, Practice Sheet, Palaeolithic, Mesolithic, Neolithic, Chalcolithic |
| Indus Valley Civilization | 6 | Discovery, Urban Planning, Economy & Trade, Religion & Society, Decline, Practice Sheet |
| Vedic Period | 5 | Early Vedic, Later Vedic, Literature, Religion & Philosophy, Practice Sheet |
| Mahajanapadas | 4 | Rise of Mahajanapadas, Magadha Empire, Republican States, Practice Sheet |

Each lesson contains 2-3 paragraphs of actual educational content.

---

## localStorage Schema

**edutrack_subjects** - Array of subject objects:
```json
[{
  "id": "sample-1",
  "name": "Ancient History",
  "courseData": { "units": [...] },
  "createdAt": "2026-03-26T..."
}]
```

**edutrack_progress** - Progress keyed by subject ID:
```json
{
  "sample-1": {
    "readLessons": [1, 2, 5],
    "quizScores": { "1": { "score": 6, "total": 8, "date": "..." } },
    "lastAccessed": "2026-03-26T..."
  }
}
```

**edutrack_quiz_{subjectId}_{lessonId}** - Cached quiz questions per lesson

**edutrack_recent** - Recently viewed lessons (up to 5 entries)

**edutrack_daily** - Daily goal tracking (lessons completed today, target count)

**edutrack_streak** - Study streak counter (consecutive days with activity)

---

## UI Design

- White/light gray background (#F8FAFC)
- Blue accent (#3B82F6) for buttons, active states, links
- Orange (#F97316) for current lesson badge
- Green (#22C55E) for completed states, pass indicators, strong units
- Red (#EF4444) for wrong answers, weak units
- Inter font family
- Rounded cards (rounded-2xl) with subtle shadows
- Mobile-first responsive layout (max-w-lg centered)

---

## Setup & Running

```bash
# 1. Install all dependencies
npm run install:all

# 2. Add your Gemini API key to .env
# GEMINI_API_KEY=your_gemini_api_key_here

# 3. Start both servers (production)
npm start

# 4. Or start in dev mode (with hot reload)
npm run dev

# App runs on http://localhost:5000
```

---

## Dependencies

**Root (server):**
- express, cors, dotenv
- multer (file uploads)
- pdf-parse (PDF text extraction)
- @google/generative-ai (Gemini API)
- concurrently (run both servers)
- nodemon (dev hot reload)

**Client:**
- react, react-dom
- react-router-dom (routing)
- react-scripts (CRA toolchain)
- lucide-react (icons)
- Tailwind CSS (via CDN in index.html)

---

## Changelog

### 2026-03-26

**Migration:**
1. **Switched from Anthropic Claude API to Google Gemini API** — Replaced `@anthropic-ai/sdk` with `@google/generative-ai`. Model changed from `claude-sonnet-4-20250514` to `gemini-1.5-flash` (free tier). Updated `upload.js`, `quiz.js`, `.env` (now uses `GEMINI_API_KEY`), and `package.json`.

**Bug Fixes:**
2. **Quiz generation API key validation** (`server/routes/quiz.js`) — Added check for missing or placeholder API key (`your_key_here`). Now returns a clear error message instead of a cryptic SDK failure.
3. **Retry quiz generates new questions** (`client/src/pages/QuizPage.js`) — Previously, clicking "Retry Quiz" cleared the cache but reused the same questions from React state. Now it resets all state, shows loading, and fetches brand new questions from the API.

**Features:**
4. **Practice sheets show "Mark as Done"** (`client/src/pages/LessonPage.js`) — Practice sheets (type `"practice"` or title containing "Practice") now show a green "Mark as Done" button instead of "Take Quiz →". Clicking it marks the practice as complete in localStorage and updates the daily goal. Regular lessons still show "Take Quiz →" with the 70% pass requirement.

**DevOps:**
5. **Added `.gitignore`** — Excludes `node_modules/`, `client/build/`, `.env`, and log files from version control.
6. **Pushed to GitHub** — Repository created at `github.com/Mind-in-code/EduTrack` (public).
