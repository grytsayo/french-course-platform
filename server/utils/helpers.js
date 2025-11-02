const crypto = require('crypto');

// Generate random access code
function generateAccessCode(length = 10) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove similar looking characters
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

// Generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Calculate days until expiration
function daysUntilExpiration(expiresAt) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize user input
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

module.exports = {
  generateAccessCode,
  generateUUID,
  formatDate,
  daysUntilExpiration,
  isValidEmail,
  sanitizeInput,
};
