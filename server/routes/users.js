const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT id, email, name, access_code, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await db.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
      [name, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total lessons completed
    const completedResult = await db.query(
      'SELECT COUNT(*) as completed_count FROM lesson_progress WHERE user_id = $1 AND completed = true',
      [userId]
    );

    // Get total lessons in enrolled courses
    const totalResult = await db.query(
      `SELECT COUNT(l.id) as total_count
       FROM lessons l
       JOIN enrollments e ON l.course_id = e.course_id
       WHERE e.user_id = $1 AND e.status = 'active'`,
      [userId]
    );

    // Get average progress
    const avgResult = await db.query(
      'SELECT AVG(progress_percent) as avg_progress FROM lesson_progress WHERE user_id = $1',
      [userId]
    );

    res.json({
      stats: {
        completed_lessons: parseInt(completedResult.rows[0].completed_count),
        total_lessons: parseInt(totalResult.rows[0].total_count),
        average_progress: parseFloat(avgResult.rows[0].avg_progress || 0)
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
