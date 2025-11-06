const { Pool } = require('pg');

// Railway and other platforms provide DATABASE_URL
// If not available, use individual environment variables
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'french_course',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
);

// Test connection (non-blocking - won't crash the server if it fails)
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
    console.log('⚠️  Server will continue running, but database operations will fail');
    console.log('💡 Set DATABASE_URL environment variable or configure DB_* variables in .env');
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
