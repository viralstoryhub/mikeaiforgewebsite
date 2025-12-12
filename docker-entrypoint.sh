#!/bin/sh

# Start the backend
echo "Starting backend..."
cd /app/backend
npm start &

# Start the frontend
echo "Starting frontend..."
cd /app
npm run dev
