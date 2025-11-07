const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (adminPassword !== correctPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get all courses with lessons
router.get('/courses', adminAuth, async (req, res) => {
  try {
    const coursesResult = await db.query(
      'SELECT * FROM courses ORDER BY id'
    );

    const courses = [];

    for (const course of coursesResult.rows) {
      const lessonsResult = await db.query(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_number',
        [course.id]
      );

      courses.push({
        ...course,
        lessons: lessonsResult.rows
      });
    }

    res.json({ courses });
  } catch (error) {
    console.error('Admin get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Update lesson
router.put('/lessons/:lessonId', adminAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, video_url, pdf_url, duration_minutes } = req.body;

    const result = await db.query(
      `UPDATE lessons
       SET title = $1,
           description = $2,
           video_url = $3,
           pdf_url = $4,
           duration_minutes = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description, video_url || null, pdf_url || null, duration_minutes, lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({
      success: true,
      lesson: result.rows[0]
    });
  } catch (error) {
    console.error('Admin update lesson error:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Update course
router.put('/courses/:courseId', adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, price, currency, access_duration_days } = req.body;

    const result = await db.query(
      `UPDATE courses
       SET title = $1,
           description = $2,
           price = $3,
           currency = $4,
           access_duration_days = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description, price, currency, access_duration_days, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Admin update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Get statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const enrollmentsResult = await db.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE status = $1',
      ['active']
    );
    const paymentsResult = await db.query(
      'SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE status = $1',
      ['completed']
    );

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      activeEnrollments: parseInt(enrollmentsResult.rows[0].count),
      totalPayments: parseInt(paymentsResult.rows[0].count),
      totalRevenue: parseFloat(paymentsResult.rows[0].total || 0)
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
