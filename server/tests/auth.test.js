const {
  request,
  app,
  registerUser,
  authHeader,
  cleanupUsersByEmail,
  prisma,
} = require('./helpers');

const email = 'auth-test@sweety.test';

beforeEach(async () => {
  await cleanupUsersByEmail([email]);
});

afterAll(async () => {
  await cleanupUsersByEmail([email]);
  await prisma.$disconnect();
});

describe('auth', () => {
  test('registers a user and returns a token without the password hash', async () => {
    const { response } = await registerUser({ email });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({
      name: 'Test User',
      email,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test('logs in with valid credentials', async () => {
    await registerUser({ email });

    const response = await request(app).post('/api/auth/login').send({
      email,
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe(email);
  });

  test('rejects invalid credentials with a generic message', async () => {
    await registerUser({ email });

    const response = await request(app).post('/api/auth/login').send({
      email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password.');
  });

  test('returns the current user from /me', async () => {
    const { token } = await registerUser({ email });

    const response = await request(app)
      .get('/api/auth/me')
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
  });
});
