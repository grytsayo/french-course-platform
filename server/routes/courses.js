const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get course details
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseResult = await db.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const lessonsResult = await db.query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_number',
      [courseId]
    );

    res.json({
      course: courseResult.rows[0],
      lessons: lessonsResult.rows
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to get course' });
  }
});

// Get user's courses
router.get('/my/enrollments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT e.*, c.title, c.description, c.price, c.currency
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1 AND e.status = 'active'
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    res.json({
      enrollments: result.rows
    });

  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Get lesson content
router.get('/lessons/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.userId;

    // Get lesson details
    const lessonResult = await db.query(
      'SELECT * FROM lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];

    // Check if user has access to this course
    const enrollmentResult = await db.query(
      `SELECT id FROM enrollments
       WHERE user_id = $1 AND course_id = $2 AND status = 'active' AND expires_at > NOW()`,
      [userId, lesson.course_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'No access to this course' });
    }

    // Get progress
    const progressResult = await db.query(
      'SELECT * FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2',
      [userId, lessonId]
    );

    res.json({
      lesson,
      progress: progressResult.rows[0] || { completed: false, progress_percent: 0 }
    });

  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

// Update lesson progress
router.post('/lessons/:lessonId/progress', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { progressPercent, completed } = req.body;
    const userId = req.user.userId;

    await db.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, progress_percent, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         progress_percent = $3,
         completed = $4,
         completed_at = CASE WHEN $4 = true THEN NOW() ELSE lesson_progress.completed_at END`,
      [userId, lessonId, progressPercent || 0, completed || false, completed ? new Date() : null]
    );

    res.json({
      success: true,
      message: 'Progress updated'
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get all lessons with progress for a course
router.get('/:courseId/lessons', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Check enrollment
    const enrollmentResult = await db.query(
      `SELECT id FROM enrollments
       WHERE user_id = $1 AND course_id = $2 AND status = 'active' AND expires_at > NOW()`,
      [userId, courseId]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'No access to this course' });
    }

    // Get lessons with progress
    const result = await db.query(
      `SELECT
         l.*,
         COALESCE(lp.completed, false) as completed,
         COALESCE(lp.progress_percent, 0) as progress_percent
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
       WHERE l.course_id = $2
       ORDER BY l.lesson_number`,
      [userId, courseId]
    );

    res.json({
      lessons: result.rows
    });

  } catch (error) {
    console.error('Get course lessons error:', error);
    res.status(500).json({ error: 'Failed to get lessons' });
  }
});

module.exports = router;
