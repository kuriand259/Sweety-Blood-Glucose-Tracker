const { Prisma } = require('@prisma/client');
const { prisma } = require('../lib/prisma');
const {
  SLOT_ORDER,
  parseDateOnly,
  formatDateOnly,
  slotLabel,
} = require('../lib/dates');
const { duplicateSlotMessage } = require('../validation/reading');

function serializeReading(reading) {
  return {
    id: reading.id,
    date: formatDateOnly(reading.date),
    slot: reading.slot,
    slotLabel: slotLabel(reading.slot),
    value: reading.value,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
  };
}

function slotSortIndex(slot) {
  return SLOT_ORDER.indexOf(slot);
}

async function listReadingsForDate(userId, dateString) {
  const readings = await prisma.reading.findMany({
    where: {
      userId,
      date: parseDateOnly(dateString),
    },
  });

  return readings
    .sort((a, b) => slotSortIndex(a.slot) - slotSortIndex(b.slot))
    .map(serializeReading);
}

async function listReadings(userId, { date = null, page = 1, limit = 20 } = {}) {
  const where = {
    userId,
    ...(date ? { date: parseDateOnly(date) } : {}),
  };

  const [total, readings] = await Promise.all([
    prisma.reading.count({ where }),
    prisma.reading.findMany({
      where,
      orderBy: [{ date: 'desc' }, { slot: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    readings: readings.map(serializeReading),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

async function assertCanCreate(userId, dateString, slot) {
  const date = parseDateOnly(dateString);
  const existingForSlot = await prisma.reading.findFirst({
    where: { userId, date, slot },
  });
  if (existingForSlot) {
    return { error: duplicateSlotMessage(slot), status: 409 };
  }

  const count = await prisma.reading.count({
    where: { userId, date },
  });
  if (count >= 4) {
    return { error: 'You can add only 4 readings per day.', status: 409 };
  }

  return { ok: true };
}

async function createReading(userId, input) {
  const guard = await assertCanCreate(userId, input.date, input.slot);
  if (guard.error) {
    return guard;
  }

  try {
    const reading = await prisma.reading.create({
      data: {
        userId,
        date: parseDateOnly(input.date),
        slot: input.slot,
        value: input.value,
      },
    });
    return { reading: serializeReading(reading) };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { error: duplicateSlotMessage(input.slot), status: 409 };
    }
    throw err;
  }
}

async function getOwnedReading(userId, id) {
  return prisma.reading.findFirst({
    where: { id, userId },
  });
}

async function updateReading(userId, id, input) {
  const existing = await getOwnedReading(userId, id);
  if (!existing) {
    return { error: 'Reading not found.', status: 404 };
  }

  const nextDate = input.date ?? formatDateOnly(existing.date);
  const nextSlot = input.slot ?? existing.slot;
  const dateChanged =
    nextDate !== formatDateOnly(existing.date) || nextSlot !== existing.slot;

  if (dateChanged) {
    const conflict = await prisma.reading.findFirst({
      where: {
        userId,
        date: parseDateOnly(nextDate),
        slot: nextSlot,
        NOT: { id },
      },
    });
    if (conflict) {
      return { error: duplicateSlotMessage(nextSlot), status: 409 };
    }

    if (nextDate !== formatDateOnly(existing.date)) {
      const count = await prisma.reading.count({
        where: {
          userId,
          date: parseDateOnly(nextDate),
          NOT: { id },
        },
      });
      if (count >= 4) {
        return { error: 'You can add only 4 readings per day.', status: 409 };
      }
    }
  }

  try {
    const reading = await prisma.reading.update({
      where: { id },
      data: {
        ...(input.date !== undefined
          ? { date: parseDateOnly(input.date) }
          : {}),
        ...(input.slot !== undefined ? { slot: input.slot } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
      },
    });
    return { reading: serializeReading(reading) };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { error: duplicateSlotMessage(nextSlot), status: 409 };
    }
    throw err;
  }
}

async function deleteReading(userId, id) {
  const existing = await getOwnedReading(userId, id);
  if (!existing) {
    return { error: 'Reading not found.', status: 404 };
  }

  await prisma.reading.delete({ where: { id } });
  return { ok: true };
}

module.exports = {
  serializeReading,
  listReadingsForDate,
  listReadings,
  createReading,
  updateReading,
  deleteReading,
  getOwnedReading,
};
