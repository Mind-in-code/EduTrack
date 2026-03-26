const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey && apiKey !== 'your_key_here' ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

router.post('/generate', async (req, res) => {
  try {
    const { lessonTitle, lessonContent, unitName, completedLessons, numQuestions = 8 } = req.body;

    if (!lessonTitle) {
      return res.status(400).json({ error: 'No lesson title provided' });
    }

    if (!model) {
      console.error('[Quiz] GEMINI_API_KEY is missing or set to placeholder. Set a valid key in .env');
      return res.status(500).json({ error: 'Gemini API key not configured. Add your GEMINI_API_KEY to the .env file.' });
    }

    const contentForQuiz = lessonContent && lessonContent.trim().length > 50
      ? lessonContent
      : null;

    // Build cumulative context
    let cumulativeNote = '';
    if (completedLessons && completedLessons.length > 0) {
      cumulativeNote = `\n\nAlso include 2-3 questions that connect this topic to previously studied lessons: ${completedLessons.join(', ')}`;
    }

    const prompt = `Generate exactly ${numQuestions} MCQ questions for a student studying "${lessonTitle}" from the unit "${unitName || 'General'}".

${contentForQuiz ? `Content to base questions on:\n${contentForQuiz}` : `Generate based on the topic: ${lessonTitle}`}
${cumulativeNote}

Return ONLY a valid JSON array like this, no other text, no markdown fences:
[
  {
    "question": "question text here",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correct": 0,
    "explanation": "why this answer is correct"
  }
]

Rules:
- Questions should test understanding, not just memorization
- All 4 options should be plausible
- "correct" is 0-based index (0=first option, 1=second, 2=third, 3=fourth)
- Explanations should be 1-2 sentences
- Mix difficulty levels
- Return ONLY the JSON array, nothing else`;

    console.log(`[Quiz] Generating ${numQuestions} questions for "${lessonTitle}" (unit: "${unitName || 'N/A'}")`);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log('[Quiz] Raw response length:', responseText.length);

    // Try to extract JSON array from response
    let questions;
    try {
      // Direct parse first
      questions = JSON.parse(responseText);
    } catch (e1) {
      console.log('[Quiz] Direct parse failed, trying extraction...');
      // Try extracting JSON array
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('[Quiz] Array extraction failed:', e2.message);
        }
      }
      // Try extracting from object wrapper
      if (!questions) {
        const objMatch = responseText.match(/\{[\s\S]*"questions"\s*:\s*(\[[\s\S]*\])[\s\S]*\}/);
        if (objMatch) {
          try {
            questions = JSON.parse(objMatch[1]);
          } catch (e3) {
            console.error('[Quiz] Object extraction failed:', e3.message);
          }
        }
      }
      // Try removing markdown fences
      if (!questions) {
        const cleaned = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          questions = Array.isArray(parsed) ? parsed : parsed.questions;
        } catch (e4) {
          console.error('[Quiz] Cleaned parse failed:', e4.message);
          console.error('[Quiz] Response was:', responseText.substring(0, 500));
        }
      }
    }

    // Handle object wrapper { questions: [...] }
    if (questions && !Array.isArray(questions) && questions.questions) {
      questions = questions.questions;
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: 'Failed to parse quiz questions from AI response' });
    }

    // Normalize question format
    const normalized = questions.map((q, i) => ({
      id: i + 1,
      question: q.question,
      options: q.options || [],
      correctIndex: q.correct !== undefined ? q.correct : q.correctIndex !== undefined ? q.correctIndex : 0,
      explanation: q.explanation || ''
    }));

    console.log(`[Quiz] Successfully generated ${normalized.length} questions`);
    res.json({ success: true, questions: normalized });
  } catch (error) {
    console.error('[Quiz] Generation error:', error.message);
    console.error('[Quiz] Full error:', error);
    res.status(500).json({ error: 'Failed to generate quiz: ' + error.message });
  }
});

module.exports = router;
