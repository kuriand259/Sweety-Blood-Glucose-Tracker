const {
  request,
  app,
  registerUser,
  authHeader,
  cleanupUsersByEmail,
  createReadingDirect,
  prisma,
} = require('./helpers');

const email = 'reports-test@sweety.test';

beforeEach(async () => {
  await cleanupUsersByEmail([email]);
});

afterAll(async () => {
  await cleanupUsersByEmail([email]);
  await prisma.$disconnect();
});

describe('reports', () => {
  test('computes daily, month-to-date, and previous-month ranges for 2026-10-15', async () => {
    const { token, user } = await registerUser({ email, name: 'Report User' });
    const headers = authHeader(token);

    const rows = [
      { date: '2026-09-10', slot: 'MORNING_FASTING', value: 90 },
      { date: '2026-09-20', slot: 'AFTER_LUNCH', value: 150 },
      { date: '2026-10-01', slot: 'MORNING_FASTING', value: 100 },
      { date: '2026-10-15', slot: 'AFTER_BREAKFAST', value: 140 },
      { date: '2026-10-15', slot: 'AFTER_LUNCH', value: 160 },
      { date: '2026-10-20', slot: 'AFTER_DINNER', value: 130 },
    ];

    for (const row of rows) {
      await createReadingDirect(user.id, row);
    }

    const daily = await request(app)
      .get('/api/reports/daily?date=2026-10-15')
      .set(headers);
    expect(daily.status).toBe(200);
    expect(daily.body.report).toMatchObject({
      start: '2026-10-15',
      end: '2026-10-15',
      count: 2,
      highest: 160,
      lowest: 140,
      average: 150,
    });
    expect(daily.body.report.readings).toHaveLength(2);

    const monthToDate = await request(app)
      .get('/api/reports/month-to-date?date=2026-10-15')
      .set(headers);
    expect(monthToDate.status).toBe(200);
    expect(monthToDate.body.report).toMatchObject({
      start: '2026-10-01',
      end: '2026-10-15',
      count: 3,
      highest: 160,
      lowest: 100,
      average: 133.3,
    });

    const monthly = await request(app)
      .get('/api/reports/monthly?date=2026-10-15')
      .set(headers);
    expect(monthly.status).toBe(200);
    expect(monthly.body.report).toMatchObject({
      start: '2026-09-01',
      end: '2026-09-30',
      count: 2,
      highest: 150,
      lowest: 90,
      average: 120,
    });
  });

  test('returns an empty-friendly report when there are no readings', async () => {
    const { token } = await registerUser({ email });

    const response = await request(app)
      .get('/api/reports/daily?date=2026-01-01')
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.report).toEqual({
      start: '2026-01-01',
      end: '2026-01-01',
      highest: null,
      lowest: null,
      average: null,
      count: 0,
      readings: [],
    });
  });
});
