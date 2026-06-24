const express = require('express');
const authMiddleware = require('../middleware/auth');
const Review = require('../models/Review');
const hashCode = require('../utils/hashCode');
const analyseCode = require('../utils/astAnalyser');
const { streamReview } = require('../utils/gemini');

const router = express.Router();

const JS_TS_LANGUAGES = new Set(['javascript', 'typescript', 'js', 'ts']);

// POST /api/review/submit
router.post('/submit', authMiddleware, async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  // AST analysis for JS/TS
  let astSummary = 'AST analysis not available for this language.';
  if (JS_TS_LANGUAGES.has(language.toLowerCase())) {
    try {
      astSummary = analyseCode(code);
    } catch (e) {
      astSummary = `AST analysis error: ${e.message}`;
    }
  }

  // Cache check: same code hash within 7 days
  const codeHash = hashCode(code);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const cached = await Review.findOne({
      userId: req.user._id,
      codeHash,
      createdAt: { $gte: sevenDaysAgo },
    });

    if (cached) {
      return res.json({
        cached: true,
        reviewId: cached._id,
        comments: cached.comments,
        summary: cached.summary,
      });
    }
  } catch (dbErr) {
    console.error('DB cache check error:', dbErr);
    // Don't block — continue to stream
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.flushHeaders(); // Flush immediately so client knows SSE started

  // Keep-alive ping every 15s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  let fullText = '';

  try {
    for await (const chunk of streamReview(code, language, astSummary)) {
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
  } catch (streamErr) {
    clearInterval(keepAlive);
    console.error('Gemini stream error:', streamErr);
    res.write(`data: ${JSON.stringify({ error: 'AI stream failed: ' + streamErr.message })}\n\n`);
    res.end();
    return;
  }

  clearInterval(keepAlive);

  // Parse accumulated text
  let comments = [];
  let summary = '';

  const summaryIndex = fullText.indexOf('SUMMARY:');
  let jsonPart = fullText;
  if (summaryIndex !== -1) {
    jsonPart = fullText.slice(0, summaryIndex).trim();
    summary = fullText.slice(summaryIndex + 8).trim();
  }

  // Strip any accidental markdown fences
  jsonPart = jsonPart.replace(/```json|```/g, '').trim();

  try {
    comments = JSON.parse(jsonPart);
    if (!Array.isArray(comments)) comments = [];
  } catch (parseErr) {
    console.error('JSON parse error:', parseErr.message);
    console.error('Raw JSON part (first 300 chars):', jsonPart.slice(0, 300));
    comments = [];
  }

  // Validate & sanitize comments
  const validSeverities = new Set(['bug', 'security', 'performance', 'style', 'suggestion']);
  comments = comments
    .filter((c) => c && typeof c === 'object')
    .map((c) => ({
      line: Number(c.line) || 1,
      endLine: Number(c.endLine) || Number(c.line) || 1,
      severity: validSeverities.has(c.severity) ? c.severity : 'suggestion',
      title: String(c.title || '').slice(0, 100),
      description: String(c.description || ''),
      suggestion: String(c.suggestion || ''),
    }));

  // Save to MongoDB
  let review;
  try {
    review = await Review.create({
      userId: req.user._id,
      code,
      language,
      comments,
      summary,
      codeHash,
    });
  } catch (saveErr) {
    console.error('Failed to save review:', saveErr);
    // Still send results to client even if save fails
    res.write(
      `data: ${JSON.stringify({ done: true, reviewId: null, comments, summary })}\n\n`
    );
    res.end();
    return;
  }

  res.write(
    `data: ${JSON.stringify({
      done: true,
      reviewId: review._id,
      comments,
      summary,
    })}\n\n`
  );
  res.end();
});

// GET /api/review/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('_id language createdAt comments codeHash');

    const result = reviews.map((r) => ({
      _id: r._id,
      language: r.language,
      createdAt: r.createdAt,
      commentCount: r.comments.length,
      codeHash: r.codeHash,
      severityBreakdown: r.comments.reduce((acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {}),
    }));

    res.json(result);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/review/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(review);
  } catch (err) {
    console.error('Get review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
