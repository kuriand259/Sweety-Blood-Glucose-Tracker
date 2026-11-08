const SLOT_ORDER = [
  'MORNING_FASTING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

const SLOT_LABELS = {
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

function getAppTimezone() {
  return process.env.APP_TIMEZONE || 'Asia/Kolkata';
}

function todayInTimezone(timeZone = getAppTimezone()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseDateOnly(value) {
  if (!isValidDateString(value)) {
    return null;
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value;
}

function isFutureDate(dateString, timeZone = getAppTimezone()) {
  return dateString > todayInTimezone(timeZone);
}

function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot;
}

function previousMonthRange(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const end = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function monthToDateRange(dateString) {
  const [year, month] = dateString.split('-');
  return {
    start: `${year}-${month}-01`,
    end: dateString,
  };
}

module.exports = {
  SLOT_ORDER,
  SLOT_LABELS,
  getAppTimezone,
  todayInTimezone,
  isValidDateString,
  parseDateOnly,
  formatDateOnly,
  isFutureDate,
  slotLabel,
  previousMonthRange,
  monthToDateRange,
};
