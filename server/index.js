require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 French Course Platform API`);
});

module.exports = app;
