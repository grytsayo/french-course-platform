const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Login with access code
router.post('/login', async (req, res) => {
  try {
    const { email, accessCode } = req.body;

    if (!email || !accessCode) {
      return res.status(400).json({ error: 'Email and access code are required' });
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, name, access_code FROM users WHERE email = $1 AND access_code = $2',
      [email, accessCode]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or access code' });
    }

    const user = result.rows[0];

    // Check if user has active enrollment
    const enrollmentResult = await db.query(
      `SELECT e.id, e.expires_at, c.title, c.id as course_id
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1 AND e.status = 'active' AND e.expires_at > NOW()`,
      [user.id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'No active course enrollment found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      enrollment: enrollmentResult.rows[0]
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const result = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Request new access code (if user lost it)
router.post('/request-access', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await db.query(
      'SELECT id, access_code FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send email with access code
    const { sendEmail } = require('../services/emailService');
    await sendEmail({
      to: email,
      subject: 'Ваш код доступа к курсу',
      template: 'access_code_reminder',
      data: {
        accessCode: result.rows[0].access_code
      }
    });

    res.json({
      success: true,
      message: 'Access code sent to your email'
    });

  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: 'Failed to send access code' });
  }
});

module.exports = router;
