#!/bin/bash
# Startup script for Railway deployment

echo "🚀 Starting French Course Platform..."

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

# Seed database if empty (only on first deploy)
echo "🌱 Checking if database needs seeding..."
npm run seed || echo "Database already seeded or seed failed"

# Start the server
echo "▶️ Starting server..."
npm start
