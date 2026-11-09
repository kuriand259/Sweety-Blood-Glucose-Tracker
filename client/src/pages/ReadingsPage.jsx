import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Group,
  Loader,
  Pagination,
  Stack,
} from '@mantine/core';
import { IconArrowUpRight, IconChartLine, IconPencil, IconTrash } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { MonthCalendar } from '../components/MonthCalendar';
import { EmptySlotCard, ReadingMetricCard } from '../components/ReadingMetricCard';
import { ExpandButton } from '../components/ExpandButton';
import { ReadingFormModal } from '../components/ReadingFormModal';
import { api, ApiError } from '../lib/api';
import { glucoseStatus, glucoseStatusLabel } from '../lib/glucose';
import { monthKey, monthLabel, prettyDate, todayString, useMonthReadings } from '../lib/month';
import { SLOT_OPTIONS } from '../lib/slots';

const HISTORY_LIMIT = 10;

/** Single circular progress ring with a centred value + caption. */
function ProgressRing({ value = 0, label, caption, color = '#161616' }) {
  const R = 46;
  const c = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="sw-ring" role="img" aria-label={`${label} ${caption}`}>
      <svg viewBox="0 0 108 108" width="100%" height="100%">
        <circle cx="54" cy="54" r={R} fill="none" stroke="#ececec" strokeWidth="9" />
        {pct > 0 ? (
          <circle
            cx="54"
            cy="54"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            transform="rotate(-90 54 54)"
          />
        ) : null}
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
  // reading modal: { opened, reading (edit) | null (add), slot (add) }
  const [modal, setModal] = useState({ opened: false, reading: null, slot: undefined });

  // bumped after any add / edit / delete so month stats and the calendar refetch
  const [reloadToken, setReloadToken] = useState(0);
  const [readings, setReadings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // the dashboard always shows today (and today's month)
  const dateString = todayString();
  const currentMonth = monthKey(dateString);
  const month = useMonthReadings(currentMonth, reloadToken);

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
      setModal({ opened: true, reading: null, slot: undefined });
    }
  }, [location.state?.focusAdd]);

  async function refreshLists() {
    setReloadToken((n) => n + 1);
    await Promise.all([loadReadings(), loadHistory()]);
  }

  function startEdit(reading) {
    setError('');
    setModal({ opened: true, reading, slot: undefined });
  }

  function startAdd(slotValue) {
    setModal({ opened: true, reading: null, slot: slotValue });
  }

  async function handleSaved() {
    await refreshLists();
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api(`/api/readings/${id}`, { method: 'DELETE' });
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
    const elapsed = Number(dateString.slice(8, 10)); // days so far this month
    return {
      total: values.length,
      counts,
      inRangePct: values.length ? Math.round((counts.good / values.length) * 100) : 0,
      daysPct: elapsed ? Math.round((days / elapsed) * 100) : 0,
      days,
      elapsed,
    };
  }, [month.readings, dateString]);

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
            <h3 className="sw-card-title">Today's overview</h3>
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
                  <span>{s.short}</span>
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

        {/* Month progress */}
        <section className="sw-card flex-col">
          <div className="sw-card-head">
            <div>
              <h3 className="sw-card-title">Month progress</h3>
              <div className="sw-subtle" style={{ fontSize: 12 }}>
                {monthLabel(currentMonth)} · {monthStats.total} readings
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
            <div className="sw-ring-pair">
              <ProgressRing
                value={monthStats.inRangePct}
                label={`${monthStats.inRangePct}%`}
                caption="in range"
              />
              <ProgressRing
                value={monthStats.daysPct}
                label={`${monthStats.daysPct}%`}
                caption="days logged"
                color="#9a9a9a"
              />
            </div>
          </div>
          <div className="sw-card-foot">
            <ExpandButton
              to="/reports"
              icon={IconChartLine}
              label="View full report"
              trailingIcon={IconArrowUpRight}
            />
          </div>
        </section>
      </div>

      {/* ---------------- Row 2 ---------------- */}
      <div className="sw-grid dash-cal">
        <MonthCalendar reloadToken={reloadToken} onReadingsChange={refreshLists} />

        <section className="sw-day-panel">
          <div className="sw-card-head" style={{ padding: '4px 4px 0' }}>
            <h3 className="sw-card-title">
              Today's readings ({readings.length})
            </h3>
          </div>
          <div className="sw-slot-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {SLOT_OPTIONS.map((s) => {
              const r = readings.find((x) => x.slot === s.value);
              return r ? (
                <ReadingMetricCard
                  key={s.value}
                  reading={r}
                  active={modal.opened && modal.reading?.id === r.id}
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

      <ReadingFormModal
        opened={modal.opened}
        reading={modal.reading}
        initialDate={dateString}
        initialSlot={modal.slot}
        onClose={() => setModal((m) => ({ ...m, opened: false }))}
        onSaved={handleSaved}
      />
    </Stack>
  );
}
