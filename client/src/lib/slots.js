// `short` is the compact label used on tiles and the calendar day modal.
export const SLOT_OPTIONS = [
  { value: 'MORNING_FASTING', label: 'Morning (fasting)', short: 'Fasting' },
  { value: 'AFTER_BREAKFAST', label: 'After breakfast', short: 'Breakfast' },
  { value: 'AFTER_LUNCH', label: 'After lunch', short: 'Lunch' },
  { value: 'AFTER_DINNER', label: 'After dinner', short: 'Dinner' },
];

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
