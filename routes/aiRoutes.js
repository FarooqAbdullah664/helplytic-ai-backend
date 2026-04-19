const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSuggestions } = require('../utils/geminiAI');
const { detectCategory, extractTags, detectUrgency, generateSummary } = require('../utils/aiEngine');

router.post('/suggest', protect, async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title && !description)
      return res.status(400).json({ message: 'title or description required' });

    // Try Gemini first, fallback to local engine
    if (process.env.GEMINI_API_KEY) {
      try {
        const result = await getSuggestions(title || '', description || '');
        return res.json(result);
      } catch (aiErr) {
        console.error('Gemini failed:', aiErr.message);
      }
    }

    // Local AI fallback
    const text = `${title} ${description}`;
    res.json({
      category:   detectCategory(text),
      urgency:    detectUrgency(text),
      tags:       extractTags(text),
      rewrite:    description,
      aiSummary:  generateSummary(title, description),
    });

  } catch (err) { next(err); }
});

module.exports = router;
