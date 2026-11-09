import { useEffect, useState } from 'react';
import { ActionIcon, Alert, Menu, Modal, NumberInput } from '@mantine/core';
import { IconCheck, IconDots, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { api, ApiError } from '../lib/api';
import { glucoseStatus, glucoseStatusLabel } from '../lib/glucose';
import { prettyDate } from '../lib/month';
import { SLOT_OPTIONS } from '../lib/slots';
import { SLOT_ICONS } from './ReadingMetricCard';
import './DayDetailModal.css';

/**
 * One slot as a small card. Edit and add happen in place (value → input with
 * save / cancel); delete is in the ⋯ menu. No second modal.
 */
function DaySlotCard({ slot, reading, date, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const Icon = SLOT_ICONS[slot.value];

  function startEdit() {
    onError('');
    setValue(reading ? reading.value : '');
    setEditing(true);
  }

  async function save() {
    if (value === '' || value === null) return;
    setSaving(true);
    onError('');
    try {
      if (reading) {
        await api(`/api/readings/${reading.id}`, { method: 'PUT', body: { value: Number(value) } });
      } else {
        await api('/api/readings', {
          method: 'POST',
          body: { date, slot: slot.value, value: Number(value) },
        });
      }
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to save reading.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    onError('');
    try {
      await api(`/api/readings/${reading.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Unable to delete reading.');
    }
  }

  const status = reading ? glucoseStatus(reading.value) : 'none';

  // empty slot: the whole card is the add button (like the dashboard)
  if (!reading && !editing) {
    return (
      <button type="button" className="sw-day-card empty" onClick={startEdit}>
        <Icon size={20} stroke={1.5} style={{ opacity: 0.5 }} />
        <span className="sw-day-card-add-label">
          <IconPlus size={16} /> {slot.short}
        </span>
      </button>
    );
  }

  return (
    <div className="sw-day-card">
      <div className="sw-day-card-head">
        <Icon size={16} stroke={1.7} />
        <span className="sw-day-card-slot">{slot.short}</span>
        {reading && !editing ? (
          <Menu position="bottom-end" radius="md" shadow="md" withinPortal classNames={{ dropdown: 'sw-dark-menu' }}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="dark" radius="xl" size="sm" aria-label={`${slot.label} actions`}>
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={startEdit}>
                Edit
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={14} />} onClick={remove}>
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </div>

      {editing ? (
        <div className="sw-day-card-edit">
          <NumberInput
            size="xs"
            data-autofocus
            autoFocus
            placeholder="mg/dl"
            aria-label={`${slot.label} value in mg/dl`}
            value={value}
            onChange={setValue}
            min={40}
            max={600}
            allowDecimal={false}
            hideControls
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') {
                e.stopPropagation(); // cancel the edit, don't close the modal
                setEditing(false);
              }
            }}
          />
          <ActionIcon size="md" radius="xl" color="dark" onClick={save} loading={saving} aria-label="Save">
            <IconCheck size={14} />
          </ActionIcon>
          <ActionIcon size="md" radius="xl" variant="default" onClick={() => setEditing(false)} aria-label="Cancel">
            <IconX size={14} />
          </ActionIcon>
        </div>
      ) : (
        <div className="sw-day-card-body">
          <div>
            <span className="sw-day-card-value">{reading.value}</span>
            <span className="sw-day-card-unit">mg/dl</span>
          </div>
          <span className={`sw-pill ${status} sw-day-card-pill`}>{glucoseStatusLabel(reading.value)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Modal opened from a calendar day: a compact summary of that day plus its
 * four slot cards, editable in place.
 *
 * Props
 *  - date        'YYYY-MM-DD' to show; null keeps the modal closed
 *  - readings    that day's readings (the caller refetches after onChanged)
 *  - onClose()
 *  - onChanged() called after a reading is added, edited or deleted
 */
export function DayDetailModal({ date, readings = [], onClose, onChanged }) {
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [date]);

  const values = readings.map((r) => r.value);
  const avg = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : null;

  return (
    <Modal
      opened={Boolean(date)}
      onClose={onClose}
      centered
      radius="xl"
      padding="lg"
      size={480}
      overlayProps={{ backgroundOpacity: 0.25, blur: 6 }}
      title={
        <span className="sw-card-title" style={{ fontSize: 18 }}>
          {date ? prettyDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        </span>
      }
    >
      {date ? (
        <div className="sw-day-modal">
          {error ? (
            <Alert color="red" withCloseButton onClose={() => setError('')} mb="sm">
              {error}
            </Alert>
          ) : null}

          <div className="sw-day-summary">
            <div className="sw-day-summary-main">
              <span className="sw-day-summary-avg">{avg ?? '—'}</span>
              <span className="sw-subtle">avg mg/dl</span>
              {avg !== null ? (
                <span className={`sw-pill ${glucoseStatus(avg)}`}>{glucoseStatusLabel(avg)}</span>
              ) : null}
            </div>
            <div className="sw-day-summary-stats">
              <div>
                <b>{readings.length}/4</b>logged
              </div>
              <div>
                <b>{values.length ? Math.max(...values) : '—'}</b>highest
              </div>
              <div>
                <b>{values.length ? Math.min(...values) : '—'}</b>lowest
              </div>
              <div>
                <b>{values.length ? Math.max(...values) - Math.min(...values) : '—'}</b>spread
              </div>
            </div>
          </div>

          <div className="sw-day-cards">
            {SLOT_OPTIONS.map((s) => (
              <DaySlotCard
                // remount when the reading changes so a stale edit state is dropped
                key={`${date}-${s.value}-${readings.find((r) => r.slot === s.value)?.id ?? 'new'}`}
                slot={s}
                date={date}
                reading={readings.find((r) => r.slot === s.value)}
                onChanged={() => onChanged?.()}
                onError={setError}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
