const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const subjectName = req.body.subjectName || 'Untitled Subject';

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 100) {
      return res.status(400).json({ error: 'Could not extract sufficient text from PDF' });
    }

    // Truncate text if too long (Gemini has context limits)
    const maxChars = 150000;
    const truncatedText = pdfText.length > maxChars ? pdfText.substring(0, maxChars) : pdfText;

    const prompt = `You are a study content organizer. Given this educational text for the subject "${subjectName}", break it into logical units and lessons. Each unit should have 4-8 lessons. Each lesson should contain the actual relevant content extracted from the text (at least 2-3 paragraphs). Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "units": [
    {
      "id": 1,
      "name": "Unit Name",
      "icon": "📚",
      "lessons": [
        {
          "id": 1,
          "title": "Lesson Title",
          "duration": "10m",
          "type": "lesson",
          "content": "Full extracted content for this lesson from the PDF text. Include multiple paragraphs of actual content.",
          "mcqs": 8
        }
      ]
    }
  ]
}

Rules:
- Create 3-8 units depending on the content length
- Each unit should have 4-8 lessons
- Include 1 practice sheet per unit (type: "practice")
- Duration should be realistic based on content length (5m to 25m)
- The content field MUST contain actual text extracted and organized from the source material, not summaries
- Use relevant emojis for unit icons
- mcqs should be 5-10 per lesson

Here is the educational text:

${truncatedText}`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Clean up response - remove markdown code fences if present
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const courseData = JSON.parse(responseText);

    // Add unique IDs across all lessons
    let globalLessonId = 1;
    courseData.units.forEach((unit, ui) => {
      unit.id = ui + 1;
      unit.lessons.forEach((lesson) => {
        lesson.id = globalLessonId++;
        lesson.unitId = unit.id;
      });
    });

    res.json({
      success: true,
      subjectName,
      courseData,
      totalPages: pdfData.numpages
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
  }
});

module.exports = router;
