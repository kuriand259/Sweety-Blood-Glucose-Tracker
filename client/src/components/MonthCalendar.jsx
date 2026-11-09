import { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { glucoseStatus, glucoseStatusLabel, GLUCOSE_BANDS } from '../lib/glucose';
import { SLOT_OPTIONS } from '../lib/slots';
import { monthKey, monthLabel, shiftMonth, todayString, useMonthReadings } from '../lib/month';
import { DayDetailModal } from './DayDetailModal';
import './MonthCalendar.css';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function groupByDate(readings) {
  const map = new Map();
  for (const r of readings) {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date).push(r);
  }
  return map;
}

function buildCells(key) {
  const [y, m] = key.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({
      day: d,
      date: `${key}-${String(d).padStart(2, '0')}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayTooltip({ date, list, avg }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {date} · avg {avg} mg/dl ({glucoseStatusLabel(avg).toLowerCase()})
      </div>
      {SLOT_OPTIONS.map((slot) => {
        const r = list.find((x) => x.slot === slot.value);
        return (
          <div key={slot.value} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ opacity: 0.7 }}>{slot.label}</span>
            <span>{r ? `${r.value} mg/dl` : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Monthly glucose calendar. It keeps its own displayed month and loads that
 * month's readings itself; it never changes the page's state. Each logged day
 * is filled with the glucose band colour of that day's average, with four dots
 * for the slots logged. Values live in the tooltip so dates stay readable.
 *
 * Clicking a day (today or earlier) opens a modal with that day's summary and
 * its four readings, which can be added / edited / deleted in place.
 *
 * Props:
 *  - reloadToken: bump it after the page adds / edits / deletes a reading so
 *    the calendar refetches the month it is showing.
 *  - onReadingsChange(): optional; called after a reading is changed from the
 *    day modal, so the page can refresh its own numbers.
 *  - focusDate: optional 'YYYY-MM-DD'. When it changes the calendar jumps to
 *    that month and highlights the day (the arrows still browse freely).
 *  - title: small label above the month name.
 */
export function MonthCalendar({
  reloadToken = 0,
  onReadingsChange,
  focusDate,
  title = 'Glucose calendar',
}) {
  const today = todayString();
  const [month, setMonth] = useState(() => monthKey(focusDate || today));

  // follow the page's selected date: show its month
  useEffect(() => {
    if (focusDate) setMonth(monthKey(focusDate));
  }, [focusDate]);
  const [openDate, setOpenDate] = useState(null);
  const [localReload, setLocalReload] = useState(0);
  const { readings, loading } = useMonthReadings(month, reloadToken + localReload);

  function handleDayChanged() {
    setLocalReload((n) => n + 1);
    onReadingsChange?.();
  }

  const cells = useMemo(() => buildCells(month), [month]);
  const byDate = useMemo(() => groupByDate(readings), [readings]);
  const canGoNext = shiftMonth(month, 1) <= today.slice(0, 7);

  const summary = useMemo(() => {
    const days = byDate.size;
    const values = readings.map((r) => r.value);
    const avg = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;
    const inRange = values.filter((v) => glucoseStatus(v) === 'good').length;
    return { days, avg, inRange, total: values.length };
  }, [byDate, readings]);

  return (
    <div className="sw-card sw-cal">
      <div className="sw-card-head">
        <div>
          <div className="sw-subtle" style={{ fontSize: 12 }}>
            {title}
          </div>
          <h3 className="sw-card-title" style={{ fontSize: 22 }}>
            {monthLabel(month)}
          </h3>
        </div>
        <div className="sw-cal-nav">
          {loading ? <Loader size="xs" color="dark" /> : null}
          {month !== today.slice(0, 7) ? (
            <button
              type="button"
              className="sw-cal-today"
              onClick={() => setMonth(today.slice(0, 7))}
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            className="sw-round-btn"
            aria-label="Previous month"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="sw-round-btn"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => canGoNext && setMonth(shiftMonth(month, 1))}
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="sw-cal-grid sw-cal-weekdays">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>

      <div className="sw-cal-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="sw-cal-cell blank" />;

          const list = byDate.get(cell.date) || [];
          const isFuture = cell.date > today;
          const isToday = cell.date === today;
          const avg = list.length
            ? Math.round(list.reduce((a, r) => a + r.value, 0) / list.length)
            : null;
          const status = glucoseStatus(avg);
          const filled = new Set(list.map((r) => r.slot));

          const classes = [
            'sw-cal-cell',
            isFuture && 'future',
            isToday && 'today',
            cell.date === focusDate && 'focused',
            list.length && 'has-data',
            list.length && `sw-bg-${status}`,
          ]
            .filter(Boolean)
            .join(' ');

          const ariaLabel = `${cell.date}${avg !== null ? `, average ${avg} mg/dl, ${glucoseStatusLabel(avg).toLowerCase()}` : ''}`;
          const Cell = isFuture ? 'div' : 'button';
          const circle = (
            <Cell
              {...(isFuture
                ? { role: 'img' }
                : { type: 'button', onClick: () => setOpenDate(cell.date) })}
              className={classes}
              aria-label={ariaLabel}
            >
              <span className="sw-cal-day">{cell.day}</span>
              {list.length ? (
                <span className="sw-cal-dots">
                  {SLOT_OPTIONS.map((s) => (
                    <i key={s.value} className={filled.has(s.value) ? 'on' : ''} />
                  ))}
                </span>
              ) : null}
            </Cell>
          );

          return (
            <Fragment key={cell.date}>
              {list.length ? (
                <Tooltip
                  label={<DayTooltip date={cell.date} list={list} avg={avg} />}
                  color="dark"
                  radius="md"
                  withArrow
                  openDelay={150}
                >
                  {circle}
                </Tooltip>
              ) : (
                circle
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="sw-cal-foot">
        <div className="sw-cal-legend">
          {GLUCOSE_BANDS.map((b) => (
            <span key={b.key} className="sw-cal-legend-item">
              <span className={`sw-dot sw-bg-${b.key}`} />
              {b.label}
            </span>
          ))}
          <span className="sw-cal-legend-item">
            <span className="sw-dot sw-cal-hatch" />
            Upcoming
          </span>
        </div>
        <div className="sw-cal-summary">
          <div>
            <strong>{summary.days}</strong>
            <span>days logged</span>
          </div>
          <div>
            <strong>{summary.avg ?? '—'}</strong>
            <span>avg mg/dl</span>
          </div>
          <div>
            <strong>
              {summary.total ? `${Math.round((summary.inRange / summary.total) * 100)}%` : '—'}
            </strong>
            <span>in range</span>
          </div>
        </div>
      </div>

      <DayDetailModal
        date={openDate}
        readings={openDate ? byDate.get(openDate) || [] : []}
        onClose={() => setOpenDate(null)}
        onChanged={handleDayChanged}
      />
    </div>
  );
}
