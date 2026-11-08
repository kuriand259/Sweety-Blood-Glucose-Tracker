const { z } = require('zod');
const {
  SLOT_ORDER,
  isValidDateString,
  isFutureDate,
  slotLabel,
} = require('../lib/dates');

const slotSchema = z.enum(SLOT_ORDER);

function validateDateField(date) {
  if (date === undefined || date === null || date === '') {
    return 'Date is required.';
  }
  if (!isValidDateString(date)) {
    return 'Date must be a valid YYYY-MM-DD value.';
  }
  if (isFutureDate(date)) {
    return 'Date cannot be in the future.';
  }
  return null;
}

function validateValueField(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? 'Please enter a glucose value.' : null;
  }
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 40 ||
    value > 600
  ) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  return null;
}

function parseCreateReading(body) {
  const dateError = validateDateField(body?.date);
  if (dateError) {
    return { error: dateError };
  }

  const slotResult = slotSchema.safeParse(body?.slot);
  if (!slotResult.success) {
    return { error: 'Please select a valid time slot.' };
  }

  const valueError = validateValueField(body?.value, { required: true });
  if (valueError) {
    return { error: valueError };
  }

  return {
    data: {
      date: body.date,
      slot: slotResult.data,
      value: body.value,
    },
  };
}

function parseUpdateReading(body) {
  const data = {};

  if (body?.date !== undefined) {
    const dateError = validateDateField(body.date);
    if (dateError) {
      return { error: dateError };
    }
    data.date = body.date;
  }

  if (body?.slot !== undefined) {
    const slotResult = slotSchema.safeParse(body.slot);
    if (!slotResult.success) {
      return { error: 'Please select a valid time slot.' };
    }
    data.slot = slotResult.data;
  }

  if (body?.value !== undefined) {
    const valueError = validateValueField(body.value, { required: true });
    if (valueError) {
      return { error: valueError };
    }
    data.value = body.value;
  }

  if (Object.keys(data).length === 0) {
    return { error: 'No fields to update.' };
  }

  return { data };
}

function parseDateQuery(date) {
  const dateError = validateDateField(date);
  if (dateError) {
    // Query dates for listing/reports may allow selecting today; future still blocked.
    // For reports, selected date also cannot be in the future per brief.
    return { error: dateError };
  }
  return { data: date };
}

function parseOptionalDateQuery(date) {
  if (date === undefined || date === null || date === '') {
    return { data: null };
  }
  return parseDateQuery(date);
}

function parsePaginationQuery(query = {}) {
  const pageRaw = query.page === undefined || query.page === '' ? 1 : Number(query.page);
  const limitRaw =
    query.limit === undefined || query.limit === '' ? 20 : Number(query.limit);

  if (!Number.isInteger(pageRaw) || pageRaw < 1) {
    return { error: 'page must be an integer >= 1.' };
  }
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) {
    return { error: 'limit must be an integer between 1 and 100.' };
  }

  return { data: { page: pageRaw, limit: limitRaw } };
}

function duplicateSlotMessage(slot) {
  const label = slotLabel(slot);
  const article = /^[AEIOUaeiou]/.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

module.exports = {
  parseCreateReading,
  parseUpdateReading,
  parseDateQuery,
  parseOptionalDateQuery,
  parsePaginationQuery,
  duplicateSlotMessage,
  validateDateField,
  validateValueField,
};
