import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { formatDateInput } from './slots';

export function todayString() {
  return formatDateInput(new Date());
}

export function monthKey(dateString) {
  return dateString.slice(0, 7); // YYYY-MM
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function prettyDate(dateString, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

/**
 * Loads every reading for a calendar month using the existing report
 * endpoints (no server change needed):
 *  - current month  -> /month-to-date?date=today
 *  - past months    -> /monthly?date=<1st of the following month>
 * Future months return an empty list without a request.
 */
export function useMonthReadings(key, reloadToken = 0) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const today = todayString();
    const currentKey = monthKey(today);

    if (key > currentKey) {
      setReadings([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const path =
        key === currentKey
          ? `/api/reports/month-to-date?date=${today}`
          : `/api/reports/monthly?date=${shiftMonth(key, 1)}-01`;
      const data = await api(path);
      setReadings(data.report?.readings ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load month.');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  return { readings, loading, error };
}
