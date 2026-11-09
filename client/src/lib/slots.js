// `key` maps to the .sw-pill.slot-<key> / .sw-bg-slot-<key> colour classes.
export const SLOT_OPTIONS = [
  { value: 'MORNING_FASTING', label: 'Morning (fasting)', short: 'Fasting', key: 'fasting' },
  { value: 'AFTER_BREAKFAST', label: 'After breakfast', short: 'Breakfast', key: 'breakfast' },
  { value: 'AFTER_LUNCH', label: 'After lunch', short: 'Lunch', key: 'lunch' },
  { value: 'AFTER_DINNER', label: 'After dinner', short: 'Dinner', key: 'dinner' },
];

const SLOT_BY_VALUE = Object.fromEntries(SLOT_OPTIONS.map((s) => [s.value, s]));

export function slotMeta(value) {
  return SLOT_BY_VALUE[value] || { value, label: value, short: value, key: 'none' };
}

export function formatDateInput(date) {
  if (!date) {
    return '';
  }
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
