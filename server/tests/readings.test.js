const {
  request,
  app,
  registerUser,
  authHeader,
  cleanupUsersByEmail,
  prisma,
} = require('./helpers');
const { todayInTimezone } = require('../src/lib/dates');
const { createReading } = require('../src/services/readings');

const emailA = 'readings-a@sweety.test';
const emailB = 'readings-b@sweety.test';

beforeEach(async () => {
  await cleanupUsersByEmail([emailA, emailB]);
});

afterAll(async () => {
  await cleanupUsersByEmail([emailA, emailB]);
  await prisma.$disconnect();
});

describe('readings', () => {
  test('enforces the brief validation messages', async () => {
    const { token } = await registerUser({ email: emailA });
    const today = todayInTimezone();
    const headers = authHeader(token);

    const missing = await request(app)
      .post('/api/readings')
      .set(headers)
      .send({ date: today, slot: 'AFTER_LUNCH' });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('Please enter a glucose value.');

    const range = await request(app)
      .post('/api/readings')
      .set(headers)
      .send({ date: today, slot: 'AFTER_LUNCH', value: 601 });
    expect(range.status).toBe(400);
    expect(range.body.error).toBe(
      'Value must be between 40 and 600 mg/dl.'
    );

    const future = await request(app)
      .post('/api/readings')
      .set(headers)
      .send({ date: '2099-12-31', slot: 'AFTER_LUNCH', value: 100 });
    expect(future.status).toBe(400);
    expect(future.body.error).toBe('Date cannot be in the future.');

    const created = await request(app)
      .post('/api/readings')
      .set(headers)
      .send({ date: today, slot: 'AFTER_LUNCH', value: 120 });
    expect(created.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/readings')
      .set(headers)
      .send({ date: today, slot: 'AFTER_LUNCH', value: 130 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe(
      'You already have an After lunch reading for this date.'
    );
  });

  test('returns the four-per-day backstop message when the day is full', async () => {
    const { user } = await registerUser({ email: emailA });
    const today = todayInTimezone();

    jest.spyOn(prisma.reading, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.reading, 'count').mockResolvedValue(4);

    const result = await createReading(user.id, {
      date: today,
      slot: 'AFTER_DINNER',
      value: 100,
    });

    expect(result.status).toBe(409);
    expect(result.error).toBe('You can add only 4 readings per day.');

    prisma.reading.findFirst.mockRestore();
    prisma.reading.count.mockRestore();
  });

  test('prevents user B from reading, updating, or deleting user A readings', async () => {
    const userA = await registerUser({ email: emailA, name: 'User A' });
    const userB = await registerUser({ email: emailB, name: 'User B' });
    const today = todayInTimezone();

    const created = await request(app)
      .post('/api/readings')
      .set(authHeader(userA.token))
      .send({ date: today, slot: 'MORNING_FASTING', value: 95 });
    expect(created.status).toBe(201);
    const readingId = created.body.reading.id;

    const listB = await request(app)
      .get(`/api/readings?date=${today}`)
      .set(authHeader(userB.token));
    expect(listB.status).toBe(200);
    expect(listB.body.readings).toHaveLength(0);

    const updateB = await request(app)
      .put(`/api/readings/${readingId}`)
      .set(authHeader(userB.token))
      .send({ value: 200 });
    expect(updateB.status).toBe(404);

    const deleteB = await request(app)
      .delete(`/api/readings/${readingId}`)
      .set(authHeader(userB.token));
    expect(deleteB.status).toBe(404);

    const listA = await request(app)
      .get(`/api/readings?date=${today}`)
      .set(authHeader(userA.token));
    expect(listA.body.readings).toHaveLength(1);
  });
});
