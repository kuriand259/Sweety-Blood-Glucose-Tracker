const { prisma } = require('../lib/prisma');
const {
  SLOT_ORDER,
  parseDateOnly,
  formatDateOnly,
  slotLabel,
  monthToDateRange,
  previousMonthRange,
} = require('../lib/dates');
const { serializeReading } = require('./readings');

function emptyStats() {
  return {
    highest: null,
    lowest: null,
    average: null,
    count: 0,
  };
}

function computeStats(readings) {
  if (readings.length === 0) {
    return emptyStats();
  }

  const values = readings.map((reading) => reading.value);
  const sum = values.reduce((total, value) => total + value, 0);
  const average = Math.round((sum / values.length) * 10) / 10;

  return {
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average,
    count: values.length,
  };
}

function sortReadings(readings) {
  return [...readings].sort((a, b) => {
    const dateCmp = formatDateOnly(a.date).localeCompare(formatDateOnly(b.date));
    if (dateCmp !== 0) {
      return dateCmp;
    }
    return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
  });
}

async function fetchReadingsInRange(userId, start, end) {
  const readings = await prisma.reading.findMany({
    where: {
      userId,
      date: {
        gte: parseDateOnly(start),
        lte: parseDateOnly(end),
      },
    },
  });
  return sortReadings(readings);
}

function buildReport({ start, end, readings }) {
  const serialized = readings.map(serializeReading);
  return {
    start,
    end,
    ...computeStats(readings),
    readings: serialized,
  };
}

async function dailyReport(userId, dateString) {
  const readings = await fetchReadingsInRange(userId, dateString, dateString);
  return buildReport({
    start: dateString,
    end: dateString,
    readings,
  });
}

async function monthToDateReport(userId, dateString) {
  const { start, end } = monthToDateRange(dateString);
  const readings = await fetchReadingsInRange(userId, start, end);
  return buildReport({ start, end, readings });
}

async function monthlyReport(userId, dateString) {
  const { start, end } = previousMonthRange(dateString);
  const readings = await fetchReadingsInRange(userId, start, end);
  return buildReport({ start, end, readings });
}

module.exports = {
  emptyStats,
  computeStats,
  dailyReport,
  monthToDateReport,
  monthlyReport,
  slotLabel,
};
