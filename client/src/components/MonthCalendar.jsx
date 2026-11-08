import { Fragment, useMemo } from 'react';
import { Loader, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { glucoseStatus, GLUCOSE_BANDS } from '../lib/glucose';
import { SLOT_OPTIONS } from '../lib/slots';
import { monthLabel, shiftMonth, todayString } from '../lib/month';
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

function DayTooltip({ date, list }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{date}</div>
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
 * Monthly glucose calendar. Each day is a circle; logged days get a coloured
 * pill with that day's average and four dots for the slots filled.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  readings = [],
  selectedDate,
  onSelectDate,
  loading = false,
  title = 'Glucose calendar',
}) {
  const today = todayString();
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
              onClick={() => {
                onMonthChange(today.slice(0, 7));
                onSelectDate?.(today);
              }}
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            className="sw-round-btn"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="sw-round-btn"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => canGoNext && onMonthChange(shiftMonth(month, 1))}
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
          const isSelected = cell.date === selectedDate;
          const avg = list.length
            ? Math.round(list.reduce((a, r) => a + r.value, 0) / list.length)
            : null;
          const status = glucoseStatus(avg);
          const filled = new Set(list.map((r) => r.slot));

          const classes = [
            'sw-cal-cell',
            isFuture && 'future',
            isToday && 'today',
            isSelected && 'selected',
            list.length && 'has-data',
          ]
            .filter(Boolean)
            .join(' ');

          const circle = (
            <button
              type="button"
              className={classes}
              disabled={isFuture}
              onClick={() => onSelectDate?.(cell.date)}
              aria-label={`${cell.date}${avg ? `, average ${avg} mg/dl` : ''}`}
            >
              <span className="sw-cal-day">{cell.day}</span>
              {avg !== null ? (
                <span className={`sw-pill ${status} sw-cal-pill`}>{avg}</span>
              ) : null}
              {list.length ? (
                <span className="sw-cal-dots">
                  {SLOT_OPTIONS.map((s) => (
                    <i key={s.value} className={filled.has(s.value) ? 'on' : ''} />
                  ))}
                </span>
              ) : null}
            </button>
          );

          return (
            <Fragment key={cell.date}>
              {list.length ? (
                <Tooltip
                  label={<DayTooltip date={cell.date} list={list} />}
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
    </div>
  );
}
