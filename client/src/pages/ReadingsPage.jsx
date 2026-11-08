import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  NumberInput,
  Pagination,
  Select,
  Stack,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconArrowUpRight, IconChartLine, IconPencil, IconTrash } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { MonthCalendar } from '../components/MonthCalendar';
import { EmptySlotCard, ReadingMetricCard } from '../components/ReadingMetricCard';
import { api, ApiError } from '../lib/api';
import { glucoseStatus, glucoseStatusLabel } from '../lib/glucose';
import { monthKey, monthLabel, prettyDate, todayString, useMonthReadings } from '../lib/month';
import { SLOT_OPTIONS, formatDateInput } from '../lib/slots';

const HISTORY_LIMIT = 10;

const SHORT_SLOT = {
  MORNING_FASTING: 'Fasting',
  AFTER_BREAKFAST: 'Breakfast',
  AFTER_LUNCH: 'Lunch',
  AFTER_DINNER: 'Dinner',
};

function Ring({ outer = 0, inner = 0, label, caption }) {
  const R1 = 62;
  const R2 = 48;
  const c1 = 2 * Math.PI * R1;
  const c2 = 2 * Math.PI * R2;
  return (
    <div className="sw-ring">
      <svg viewBox="0 0 140 140" width="140" height="140">
        <circle cx="70" cy="70" r={R1} fill="none" stroke="#ececec" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={R1}
          fill="none"
          stroke="#161616"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(outer / 100) * c1} ${c1}`}
          transform="rotate(-90 70 70)"
        />
        <circle cx="70" cy="70" r={R2} fill="none" stroke="#f1f1f1" strokeWidth="4" />
        <circle
          cx="70"
          cy="70"
          r={R2}
          fill="none"
          stroke="#9a9a9a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(inner / 100) * c2} ${c2}`}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="sw-ring-label">
        {label}
        <small>{caption}</small>
      </div>
    </div>
  );
}

export function ReadingsPage() {
  const location = useLocation();
  const valueRef = useRef(null);
  const formCardRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [calMonth, setCalMonth] = useState(() => monthKey(todayString()));
  const [calReload, setCalReload] = useState(0);
  const [slot, setSlot] = useState('MORNING_FASTING');
  const [value, setValue] = useState('');
  const [readings, setReadings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dateString = formatDateInput(selectedDate);
  const month = useMonthReadings(calMonth, calReload);

  const loadReadings = useCallback(async () => {
    if (!dateString) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/readings?date=${dateString}`);
      setReadings(data.readings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load readings.');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api(`/api/readings?page=${historyPage}&limit=${HISTORY_LIMIT}`);
      setHistory(data.readings);
      setTotalPages(data.pagination.totalPages);
      setHistoryTotal(data.pagination.total);
      if (data.pagination.totalPages > 0 && historyPage > data.pagination.totalPages) {
        setHistoryPage(data.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load history.');
      setHistory([]);
      setTotalPages(0);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // "Add reading" button in the top bar
  useEffect(() => {
    if (location.state?.focusAdd) {
      focusForm();
    }
  }, [location.state?.focusAdd]);

  // keep the calendar on the month of the selected day
  useEffect(() => {
    if (dateString) setCalMonth(monthKey(dateString));
  }, [dateString]);

  // when not editing, move the slot picker off slots already logged that day
  useEffect(() => {
    if (editingId) return;
    const used = new Set(readings.map((r) => r.slot));
    if (used.has(slot)) {
      const free = SLOT_OPTIONS.find((s) => !used.has(s.value));
      if (free) setSlot(free.value);
    }
  }, [readings, editingId, slot]);

  function focusForm() {
    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => valueRef.current?.focus(), 250);
  }

  async function refreshLists() {
    setCalReload((n) => n + 1);
    await Promise.all([loadReadings(), loadHistory()]);
  }

  function resetForm() {
    const used = new Set(readings.map((r) => r.slot));
    setSlot(SLOT_OPTIONS.find((s) => !used.has(s.value))?.value ?? 'MORNING_FASTING');
    setValue('');
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      date: dateString,
      slot,
      value: value === '' || value === null ? null : Number(value),
    };

    try {
      if (editingId) {
        await api(`/api/readings/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await api('/api/readings', { method: 'POST', body: payload });
      }
      setValue('');
      setEditingId(null);
      await refreshLists();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save reading.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(reading) {
    setEditingId(reading.id);
    setSlot(reading.slot);
    setValue(reading.value);
    setSelectedDate(reading.date);
    setError('');
    focusForm();
  }

  function startAdd(slotValue) {
    setEditingId(null);
    setSlot(slotValue);
    setValue('');
    focusForm();
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api(`/api/readings/${id}`, { method: 'DELETE' });
      if (editingId === id) {
        resetForm();
      }
      await refreshLists();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete reading.');
    }
  }

  // ---- derived numbers ---------------------------------------------------
  const dayValues = readings.map((r) => r.value);
  const dayAvg = dayValues.length
    ? Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length)
    : null;

  const monthStats = useMemo(() => {
    const values = month.readings.map((r) => r.value);
    const counts = { good: 0, warn: 0, bad: 0 };
    values.forEach((v) => {
      counts[glucoseStatus(v)] += 1;
    });
    const days = new Set(month.readings.map((r) => r.date)).size;
    const [y, m] = calMonth.split('-').map(Number);
    const today = todayString();
    const elapsed =
      calMonth === monthKey(today) ? Number(today.slice(8, 10)) : new Date(y, m, 0).getDate();
    return {
      total: values.length,
      counts,
      inRangePct: values.length ? Math.round((counts.good / values.length) * 100) : 0,
      daysPct: elapsed ? Math.round((days / elapsed) * 100) : 0,
      days,
      elapsed,
    };
  }, [month.readings, calMonth]);

  const slotOptionsForForm = SLOT_OPTIONS.map((s) => ({
    ...s,
    disabled:
      !editingId && readings.some((r) => r.slot === s.value),
  }));

  return (
    <Stack gap={20}>
      {error ? (
        <Alert color="red" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {/* ---------------- Row 1 ---------------- */}
      <div className="sw-grid dash-top">
        {/* Overview (dark) */}
        <section className="sw-card dark flex-col">
          <div className="sw-card-head">
            <h3 className="sw-card-title">Daily overview</h3>
            <span className="sw-subtle">{prettyDate(dateString)}</span>
          </div>

          <div className="sw-stat-row">
            <div className="sw-stat">
              <span className="sw-big-number">{dayAvg ?? '—'}</span>
              <small>avg mg/dl {dayAvg ? `· ${glucoseStatusLabel(dayAvg).toLowerCase()}` : ''}</small>
            </div>
            <div className="sw-stat">
              <span className="sw-big-number">{readings.length}</span>
              <small>of 4 readings logged</small>
            </div>
            {loading ? <Loader size="xs" color="gray" /> : null}
          </div>

          <div className="sw-bar">
            <span style={{ width: `${(readings.length / 4) * 100}%` }} />
          </div>

          <div className="sw-tiles">
            {SLOT_OPTIONS.map((s) => {
              const r = readings.find((x) => x.slot === s.value);
              return (
                <div key={s.value} className="sw-tile">
                  {r ? (
                    <span className={`sw-dot sw-bg-${glucoseStatus(r.value)}`} />
                  ) : (
                    <span className="sw-dot" style={{ border: '1px solid #888' }} />
                  )}
                  <strong>{r ? r.value : '—'}</strong>
                  <span>{SHORT_SLOT[s.value]}</span>
                </div>
              );
            })}
          </div>

          <div className="sw-card-foot sw-mini-stats">
            <div>
              <b>{dayValues.length ? Math.max(...dayValues) : '—'}</b>highest
            </div>
            <div>
              <b>{dayValues.length ? Math.min(...dayValues) : '—'}</b>lowest
            </div>
            <div>
              <b>{dayValues.length ? Math.max(...dayValues) - Math.min(...dayValues) : '—'}</b>spread
            </div>
          </div>
        </section>

        {/* Log reading form */}
        <section className="sw-card" ref={formCardRef}>
          <div className="sw-card-head">
            <h3 className="sw-card-title">{editingId ? 'Edit reading' : 'Log a reading'}</h3>
            {editingId ? <span className="sw-pill none">Editing</span> : null}
          </div>
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <DatePickerInput
                label="Date"
                value={selectedDate}
                onChange={(v) => v && setSelectedDate(v)}
                valueFormat="DD MMM YYYY"
                maxDate={new Date()}
                required
              />
              <Select
                label="Time slot"
                data={slotOptionsForForm}
                value={slot}
                onChange={(v) => v && setSlot(v)}
                allowDeselect={false}
                required
              />
              <NumberInput
                ref={valueRef}
                label="Glucose (mg/dl)"
                placeholder="Enter value"
                value={value}
                onChange={setValue}
                min={40}
                max={600}
                allowDecimal={false}
              />
              <Group gap="xs" mt={4}>
                <Button type="submit" loading={saving} size="md" style={{ flex: 1 }}>
                  {editingId ? 'Update reading' : 'Save reading'}
                </Button>
                {editingId ? (
                  <Button variant="default" size="md" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </Group>
            </Stack>
          </form>
        </section>

        {/* Month progress */}
        <section className="sw-card flex-col">
          <div className="sw-card-head">
            <div>
              <h3 className="sw-card-title">Month progress</h3>
              <div className="sw-subtle" style={{ fontSize: 12 }}>
                {monthLabel(calMonth)} · {monthStats.total} readings
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Stack gap={10}>
              <div className="sw-legend-row" style={{ padding: 0 }}>
                <span className="sw-dot sw-bg-good" /> In range · {monthStats.counts.good}
              </div>
              <div className="sw-legend-row" style={{ padding: 0 }}>
                <span className="sw-dot sw-bg-warn" /> Elevated · {monthStats.counts.warn}
              </div>
              <div className="sw-legend-row" style={{ padding: 0 }}>
                <span className="sw-dot sw-bg-bad" /> Low / High · {monthStats.counts.bad}
              </div>
              <div className="sw-legend-row" style={{ padding: 0, color: '#8a8a8a' }}>
                <span className="sw-dot" style={{ background: '#9a9a9a' }} />
                {monthStats.days}/{monthStats.elapsed} days logged
              </div>
            </Stack>
            <Ring
              outer={monthStats.inRangePct}
              inner={monthStats.daysPct}
              label={`${monthStats.inRangePct}%`}
              caption="in range"
            />
          </div>
          <div className="sw-card-foot">
            <Link to="/reports" className="sw-round-btn dark" aria-label="Open reports">
              <IconChartLine size={18} />
            </Link>
            <Link to="/reports" className="sw-outline-btn">
              View full report <IconArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </div>

      {/* ---------------- Row 2 ---------------- */}
      <div className="sw-grid dash-mid">
        <MonthCalendar
          month={calMonth}
          onMonthChange={setCalMonth}
          readings={month.readings}
          loading={month.loading}
          selectedDate={dateString}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setEditingId(null);
            setValue('');
          }}
        />

        <section className="sw-day-panel">
          <div className="sw-card-head" style={{ padding: '4px 4px 0' }}>
            <h3 className="sw-card-title">
              Readings on {prettyDate(dateString, { day: 'numeric', month: 'short' })} ({readings.length})
            </h3>
          </div>
          <div className="sw-slot-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {SLOT_OPTIONS.map((s) => {
              const r = readings.find((x) => x.slot === s.value);
              return r ? (
                <ReadingMetricCard
                  key={s.value}
                  reading={r}
                  active={editingId === r.id}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ) : (
                <EmptySlotCard key={s.value} slot={s} onAdd={startAdd} />
              );
            })}
          </div>
        </section>
      </div>

      {/* ---------------- Row 3 ---------------- */}
      <section className="sw-card">
        <div className="sw-card-head">
          <div>
            <h3 className="sw-card-title">Reading history</h3>
            <div className="sw-subtle" style={{ fontSize: 12 }}>
              {historyTotal} total reading{historyTotal === 1 ? '' : 's'}
            </div>
          </div>
          {historyLoading ? <Loader size="xs" color="dark" /> : null}
        </div>

        {history.length === 0 && !historyLoading ? (
          <div className="sw-subtle">No readings yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sw-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((reading) => (
                  <tr key={reading.id}>
                    <td>{prettyDate(reading.date)}</td>
                    <td>{reading.slotLabel}</td>
                    <td>
                      <strong>{reading.value}</strong> <span className="sw-subtle">mg/dl</span>
                    </td>
                    <td>
                      <span className={`sw-pill ${glucoseStatus(reading.value)}`}>
                        {glucoseStatusLabel(reading.value)}
                      </span>
                    </td>
                    <td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="dark"
                          aria-label="Edit reading"
                          onClick={() => startEdit(reading)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="dark"
                          aria-label="Delete reading"
                          onClick={() => handleDelete(reading.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <Group justify="flex-end" mt="md">
            <Pagination value={historyPage} onChange={setHistoryPage} total={totalPages} />
          </Group>
        ) : null}
      </section>
    </Stack>
  );
}
