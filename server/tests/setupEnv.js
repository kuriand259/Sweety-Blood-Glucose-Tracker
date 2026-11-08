const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
