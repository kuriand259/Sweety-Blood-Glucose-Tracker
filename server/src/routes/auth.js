const express = require('express');
const { Prisma } = require('@prisma/client');
const { prisma } = require('../lib/prisma');
const {
  hashPassword,
  verifyPassword,
  signToken,
  publicUser,
} = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');
const { registerSchema, loginSchema, parseBody } = require('../validation/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const parsed = parseBody(registerSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = signToken(user);
    return res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register failed:', err);
    return res.status(500).json({ error: 'Unable to register right now.' });
  }
});

router.post('/login', async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ user: publicUser(user), token });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Unable to log in right now.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = { authRouter: router };
