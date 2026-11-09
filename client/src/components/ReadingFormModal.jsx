import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Select, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { api, ApiError } from '../lib/api';
import { SLOT_OPTIONS, formatDateInput } from '../lib/slots';
import { todayString } from '../lib/month';

/**
 * Reusable "Log / Edit reading" modal.
 *
 * Props
 *  - opened        boolean
 *  - onClose()     called on Cancel, ✕, overlay click or Esc
 *  - reading       reading object to edit; omit/null for "add" mode
 *  - initialDate   'YYYY-MM-DD' to start on in add mode (default: today)
 *  - initialSlot   slot value to start on in add mode (default: first free slot)
 *  - onSaved(r)    called with the saved reading after a successful POST/PUT;
 *                  the modal closes itself afterwards
 *
 * The modal loads the readings for the chosen date itself so slots that are
 * already logged are disabled in add mode.
 */
export function ReadingFormModal({
  opened,
  onClose,
  reading = null,
  initialDate,
  initialSlot,
  onSaved,
}) {
  const isEdit = Boolean(reading);

  const [date, setDate] = useState(todayString());
  const [slot, setSlot] = useState('MORNING_FASTING');
  const [value, setValue] = useState('');
  const [dayReadings, setDayReadings] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (!opened) return;
    setError('');
    if (reading) {
      setDate(reading.date);
      setSlot(reading.slot);
      setValue(reading.value);
    } else {
      setDate(initialDate || todayString());
      setSlot(initialSlot || '');
      setValue('');
    }
  }, [opened, reading, initialDate, initialSlot]);

  // Readings already logged on the chosen date (for disabling taken slots).
  useEffect(() => {
    if (!opened || !date) return undefined;
    let cancelled = false;
    api(`/api/readings?date=${date}`)
      .then((data) => {
        if (!cancelled) setDayReadings(data.readings ?? []);
      })
      .catch(() => {
        if (!cancelled) setDayReadings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [opened, date]);

  const takenSlots = new Set(
    dayReadings.filter((r) => !reading || r.id !== reading.id).map((r) => r.slot)
  );

  // In add mode, move off a slot that is already taken (or pick the first free one).
  useEffect(() => {
    if (!opened || isEdit) return;
    if (!slot || takenSlots.has(slot)) {
      const free = SLOT_OPTIONS.find((s) => !takenSlots.has(s.value));
      if (free && free.value !== slot) setSlot(free.value);
    }
  }, [opened, isEdit, slot, dayReadings]);

  const slotOptions = SLOT_OPTIONS.map((s) => ({ ...s, disabled: takenSlots.has(s.value) }));
  const dayFull = !isEdit && takenSlots.size >= SLOT_OPTIONS.length;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      date: formatDateInput(date),
      slot,
      value: value === '' || value === null ? null : Number(value),
    };

    try {
      const data = isEdit
        ? await api(`/api/readings/${reading.id}`, { method: 'PUT', body: payload })
        : await api('/api/readings', { method: 'POST', body: payload });
      onSaved?.(data.reading);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save reading.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="xl"
      padding="xl"
      size="md"
      overlayProps={{ backgroundOpacity: 0.25, blur: 6 }}
      title={<span className="sw-card-title">{isEdit ? 'Edit reading' : 'Log a reading'}</span>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          {error ? <Alert color="red">{error}</Alert> : null}
          {dayFull ? (
            <Alert color="gray">All four readings are already logged for this date.</Alert>
          ) : null}
          <DatePickerInput
            label="Date"
            value={date}
            onChange={(v) => v && setDate(v)}
            valueFormat="DD MMM YYYY"
            maxDate={new Date()}
            required
          />
          <Select
            label="Time slot"
            data={slotOptions}
            value={slot || null}
            onChange={(v) => v && setSlot(v)}
            allowDeselect={false}
            required
          />
          <NumberInput
            data-autofocus
            label="Glucose (mg/dl)"
            placeholder="Enter value"
            value={value}
            onChange={setValue}
            min={40}
            max={600}
            allowDecimal={false}
          />
          <Group gap="xs" mt="sm" grow>
            <Button variant="default" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} size="md" disabled={dayFull}>
              {isEdit ? 'Update reading' : 'Save reading'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
