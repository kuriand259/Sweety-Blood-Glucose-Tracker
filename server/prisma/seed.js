require('dotenv').config();

const { prisma } = require('../src/lib/prisma');
const { hashPassword } = require('../src/lib/auth');
const {
  parseDateOnly,
  todayInTimezone,
  previousMonthRange,
} = require('../src/lib/dates');

const SLOTS = [
  'MORNING_FASTING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Build a dense, visually interesting October (or whichever previous month):
 * early calm → mid-month spike → recovery → steady finish.
 * Most days get 3–4 slots so the calendar and chart look full.
 */
function buildPreviousMonthReadings(prevYear, prevMonth) {
  const lastDay = daysInMonth(prevYear, prevMonth);
  const mm = String(prevMonth).padStart(2, '0');
  const rows = [];

  for (let day = 1; day <= lastDay; day += 1) {
    // Skip a couple of sparse days so the month is not a perfect brick.
    if (day === 4 || day === 19) {
      continue;
    }

    const date = `${prevYear}-${mm}-${String(day).padStart(2, '0')}`;

    // Narrative arc across the month (wave + mid-month stress peak).
    const progress = (day - 1) / (lastDay - 1);
    const stress = Math.sin(progress * Math.PI); // 0 → 1 → 0
    const weekendBump = [0, 6].includes(new Date(Date.UTC(prevYear, prevMonth - 1, day)).getUTCDay())
      ? 12
      : 0;

    const fasting = clamp(96 + stress * 28 + weekendBump * 0.3 + ((day % 5) - 2) * 2, 78, 145);
    const afterBreakfast = clamp(fasting + 22 + stress * 35 + (day % 3) * 4, 95, 210);
    const afterLunch = clamp(fasting + 30 + stress * 48 + ((day % 4) - 1) * 6, 100, 230);
    const afterDinner = clamp(fasting + 36 + stress * 55 + weekendBump + (day % 7), 105, 245);

    // A few deliberate outliers for colour bands on the calendar.
    let values = {
      MORNING_FASTING: fasting,
      AFTER_BREAKFAST: afterBreakfast,
      AFTER_LUNCH: afterLunch,
      AFTER_DINNER: afterDinner,
    };

    if (day === 11) {
      values = {
        MORNING_FASTING: 118,
        AFTER_BREAKFAST: 176,
        AFTER_LUNCH: 208,
        AFTER_DINNER: 224,
      };
    } else if (day === 12) {
      values = {
        MORNING_FASTING: 132,
        AFTER_BREAKFAST: 188,
        AFTER_LUNCH: 215,
        AFTER_DINNER: 198,
      };
    } else if (day === 22) {
      values = {
        MORNING_FASTING: 64,
        AFTER_BREAKFAST: 98,
        AFTER_LUNCH: 112,
        AFTER_DINNER: 121,
      };
    } else if (day === 27) {
      values = {
        MORNING_FASTING: 101,
        AFTER_BREAKFAST: 128,
        AFTER_LUNCH: 136,
        AFTER_DINNER: 142,
      };
    }

    // Most days: all 4 slots. A few days: 3 slots (skip one) for realism.
    let slotsToday = [...SLOTS];
    if (day === 8 || day === 25) {
      slotsToday = SLOTS.filter((s) => s !== 'AFTER_BREAKFAST');
    } else if (day === 16) {
      slotsToday = SLOTS.filter((s) => s !== 'AFTER_DINNER');
    }

    for (const slot of slotsToday) {
      rows.push({ date, slot, value: values[slot] });
    }
  }

  return rows;
}

function buildCurrentMonthReadings(year, month, todayDay) {
  const mm = String(month).padStart(2, '0');
  const rows = [];
  const lastLogged = Math.min(todayDay, daysInMonth(year, month));

  for (let day = 1; day <= lastLogged; day += 1) {
    // Leave a gap mid-month so "this month's progress" is not 100%.
    if (day === 3 || day === 7) {
      continue;
    }

    const date = `${year}-${mm}-${String(day).padStart(2, '0')}`;
    const base = 100 + (day % 6) * 3;

    const dayRows = [
      { date, slot: 'MORNING_FASTING', value: clamp(base - 4, 85, 130) },
      { date, slot: 'AFTER_BREAKFAST', value: clamp(base + 24, 110, 170) },
      { date, slot: 'AFTER_LUNCH', value: clamp(base + 32 + (day % 2) * 8, 115, 185) },
      { date, slot: 'AFTER_DINNER', value: clamp(base + 28 + (day % 3) * 5, 110, 175) },
    ];

    // Today: only morning + breakfast so the dashboard still has empty slots.
    if (day === todayDay) {
      rows.push(dayRows[0], dayRows[1]);
    } else if (day === todayDay - 1 && todayDay > 1) {
      rows.push(...dayRows);
    } else if (day % 2 === 0) {
      rows.push(dayRows[0], dayRows[2], dayRows[3]);
    } else {
      rows.push(...dayRows);
    }
  }

  return rows;
}

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
    ...buildPreviousMonthReadings(prevYear, prevMonth),
    ...buildCurrentMonthReadings(year, month, day),
  ];

  await prisma.reading.createMany({
    data: sample.map((row) => ({
      userId: user.id,
      date: parseDateOnly(row.date),
      slot: row.slot,
      value: row.value,
    })),
  });

  console.log(
    `Seeded demo user ${email} / ${password} with ${sample.length} readings ` +
      `(${prevYear}-${String(prevMonth).padStart(2, '0')} + current month through ${today}).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
