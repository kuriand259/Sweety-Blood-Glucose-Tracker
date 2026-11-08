const GLUCOSE_MIN = 40;
const GLUCOSE_MAX = 600;

export function glucoseProgress(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return 0;
  }
  const clamped = Math.min(GLUCOSE_MAX, Math.max(GLUCOSE_MIN, Number(value)));
  return ((clamped - GLUCOSE_MIN) / (GLUCOSE_MAX - GLUCOSE_MIN)) * 100;
}

// Display bands used for colour-coding values in the UI.
//   < 70        low       (red)
//   70 – 140    in range  (green)
//   141 – 180   elevated  (amber)
//   > 180       high      (red)
export const GLUCOSE_BANDS = [
  { key: 'good', label: 'In range (70–140)' },
  { key: 'warn', label: 'Elevated (141–180)' },
  { key: 'bad', label: 'Low / High' },
];

export function glucoseStatus(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return 'none';
  }
  const v = Number(value);
  if (v < 70) return 'bad';
  if (v <= 140) return 'good';
  if (v <= 180) return 'warn';
  return 'bad';
}

export function glucoseStatusLabel(value) {
  const v = Number(value);
  if (value == null || Number.isNaN(v)) return 'No data';
  if (v < 70) return 'Low';
  if (v <= 140) return 'In range';
  if (v <= 180) return 'Elevated';
  return 'High';
}
