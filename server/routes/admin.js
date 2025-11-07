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

// Delete course
router.delete('/courses/:courseId', adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Delete course (CASCADE will delete lessons, enrollments, etc.)
    const result = await db.query(
      'DELETE FROM courses WHERE id = $1 RETURNING *',
      [courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Create new course
router.post('/courses', adminAuth, async (req, res) => {
  try {
    const { title, description, price, currency, access_duration_days } = req.body;

    const result = await db.query(
      `INSERT INTO courses (title, description, price, currency, access_duration_days)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, price || 0, currency || 'EUR', access_duration_days || 60]
    );

    res.json({
      success: true,
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Admin create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Duplicate course
router.post('/courses/:courseId/duplicate', adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get original course
    const courseResult = await db.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const originalCourse = courseResult.rows[0];

    // Create new course
    const newCourseResult = await db.query(
      `INSERT INTO courses (title, description, price, currency, access_duration_days)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        `${originalCourse.title} (копия)`,
        originalCourse.description,
        originalCourse.price,
        originalCourse.currency,
        originalCourse.access_duration_days
      ]
    );

    const newCourse = newCourseResult.rows[0];

    // Get original lessons
    const lessonsResult = await db.query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_number',
      [courseId]
    );

    // Copy lessons
    for (const lesson of lessonsResult.rows) {
      await db.query(
        `INSERT INTO lessons (course_id, lesson_number, title, description, video_url, pdf_url, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newCourse.id,
          lesson.lesson_number,
          lesson.title,
          lesson.description,
          lesson.video_url,
          lesson.pdf_url,
          lesson.duration_minutes
        ]
      );
    }

    res.json({
      success: true,
      course: newCourse,
      message: `Course duplicated with ${lessonsResult.rows.length} lessons`
    });
  } catch (error) {
    console.error('Admin duplicate course error:', error);
    res.status(500).json({ error: 'Failed to duplicate course' });
  }
});

// Create new lesson in course
router.post('/courses/:courseId/lessons', adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lesson_number, title, description, video_url, pdf_url, duration_minutes } = req.body;

    const result = await db.query(
      `INSERT INTO lessons (course_id, lesson_number, title, description, video_url, pdf_url, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, lesson_number, title, description, video_url || null, pdf_url || null, duration_minutes || 15]
    );

    res.json({
      success: true,
      lesson: result.rows[0]
    });
  } catch (error) {
    console.error('Admin create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Delete lesson
router.delete('/lessons/:lessonId', adminAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const result = await db.query(
      'DELETE FROM lessons WHERE id = $1 RETURNING *',
      [lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete lesson error:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
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
