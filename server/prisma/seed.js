require('dotenv').config();

const { prisma } = require('../src/lib/prisma');
const { hashPassword } = require('../src/lib/auth');
const {
  parseDateOnly,
  todayInTimezone,
  previousMonthRange,
} = require('../src/lib/dates');

async function main() {
  const email = 'demo@sweety.test';
  const password = 'password123';
  const today = todayInTimezone();
  const [year, month, day] = today.split('-').map(Number);
  const { start: prevStart } = previousMonthRange(today);
  const [prevYear, prevMonth] = prevStart.split('-').map(Number);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Demo Patient',
      passwordHash,
    },
    create: {
      name: 'Demo Patient',
      email,
      passwordHash,
    },
  });

  await prisma.reading.deleteMany({ where: { userId: user.id } });

  const sample = [
    {
      date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-05`,
      slot: 'MORNING_FASTING',
      value: 98,
    },
    {
      date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-05`,
      slot: 'AFTER_LUNCH',
      value: 145,
    },
    {
      date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-18`,
      slot: 'AFTER_BREAKFAST',
      value: 132,
    },
    {
      date: `${year}-${String(month).padStart(2, '0')}-01`,
      slot: 'MORNING_FASTING',
      value: 105,
    },
    {
      date: `${year}-${String(month).padStart(2, '0')}-01`,
      slot: 'AFTER_DINNER',
      value: 158,
    },
    {
      date: today,
      slot: 'MORNING_FASTING',
      value: 102,
    },
    {
      date: today,
      slot: 'AFTER_BREAKFAST',
      value: 128,
    },
  ];

  // Keep day-of-month valid if today is the 1st and we already used the 1st sample.
  if (day > 1) {
    sample.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day - 1, 28)).padStart(2, '0')}`,
      slot: 'AFTER_LUNCH',
      value: 141,
    });
  }

  for (const row of sample) {
    await prisma.reading.create({
      data: {
        userId: user.id,
        date: parseDateOnly(row.date),
        slot: row.slot,
        value: row.value,
      },
    });
  }

  console.log(`Seeded demo user ${email} / ${password} with ${sample.length} readings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
