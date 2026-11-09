#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding demo user..."
npm run seed

echo "Starting API..."
exec npm start
