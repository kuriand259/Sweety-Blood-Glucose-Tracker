const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/lib/prisma');
const { parseDateOnly } = require('../src/lib/dates');

async function registerUser({
  name = 'Test User',
  email,
  password = 'password123',
} = {}) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password });

  return {
    response,
    token: response.body.token,
    user: response.body.user,
  };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function cleanupUsersByEmail(emails) {
  await prisma.reading.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: emails } },
  });
}

async function createReadingDirect(userId, { date, slot, value }) {
  return prisma.reading.create({
    data: {
      userId,
      date: parseDateOnly(date),
      slot,
      value,
    },
  });
}

module.exports = {
  app,
  request,
  prisma,
  registerUser,
  authHeader,
  cleanupUsersByEmail,
  createReadingDirect,
};
