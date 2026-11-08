import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { api, ApiError } from '../lib/api';
import { SLOT_OPTIONS, formatDateInput, parseLocalDate } from '../lib/slots';

const HISTORY_LIMIT = 20;

export function ReadingsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
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
      const data = await api(
        `/api/readings?page=${historyPage}&limit=${HISTORY_LIMIT}`
      );
      setHistory(data.readings);
      setTotalPages(data.pagination.totalPages);
      setHistoryTotal(data.pagination.total);
      if (
        data.pagination.totalPages > 0 &&
        historyPage > data.pagination.totalPages
      ) {
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

  async function refreshLists() {
    await Promise.all([loadReadings(), loadHistory()]);
  }

  function resetForm() {
    setSlot('MORNING_FASTING');
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
        await api(`/api/readings/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await api('/api/readings', {
          method: 'POST',
          body: payload,
        });
      }
      resetForm();
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
    setSelectedDate(parseLocalDate(reading.date));
    setError('');
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

  return (
    <Stack maw={800} mx="auto" gap="lg">
      <div>
        <Title order={2}>Readings</Title>
        <Text c="dimmed">Add up to four glucose readings for a day.</Text>
      </div>

      <form onSubmit={handleSubmit}>
        <Stack>
          {error ? <Alert color="red">{error}</Alert> : null}
          <DatePickerInput
            label="Date"
            value={selectedDate}
            onChange={setSelectedDate}
            valueFormat="YYYY-MM-DD"
            maxDate={new Date()}
            required
          />
          <Select
            label="Time slot"
            data={SLOT_OPTIONS}
            value={slot}
            onChange={setSlot}
            required
          />
          <NumberInput
            label="Glucose value (mg/dl)"
            value={value}
            onChange={setValue}
            min={40}
            max={600}
            allowDecimal={false}
            hideControls={false}
          />
          <Group>
            <Button type="submit" loading={saving} color="teal">
              {editingId ? 'Update reading' : 'Add reading'}
            </Button>
            {editingId ? (
              <Button variant="default" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </Group>
        </Stack>
      </form>

      <div>
        <Title order={4} mb="sm">
          Readings for {dateString}
        </Title>
        {loading ? (
          <Text c="dimmed">Loading…</Text>
        ) : readings.length === 0 ? (
          <Text c="dimmed">No readings for this date yet.</Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Slot</Table.Th>
                <Table.Th>Value</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {readings.map((reading) => (
                <Table.Tr key={reading.id}>
                  <Table.Td>{reading.slotLabel}</Table.Td>
                  <Table.Td>{reading.value} mg/dl</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => startEdit(reading)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(reading.id)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <div>
        <Title order={4} mb="sm">
          Reading history
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          {historyTotal} total reading{historyTotal === 1 ? '' : 's'}
        </Text>
        {historyLoading ? (
          <Text c="dimmed">Loading…</Text>
        ) : history.length === 0 ? (
          <Text c="dimmed">No readings yet.</Text>
        ) : (
          <Stack gap="md">
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Slot</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {history.map((reading) => (
                  <Table.Tr key={reading.id}>
                    <Table.Td>{reading.date}</Table.Td>
                    <Table.Td>{reading.slotLabel}</Table.Td>
                    <Table.Td>{reading.value} mg/dl</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => startEdit(reading)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(reading.id)}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {totalPages > 1 ? (
              <Pagination
                value={historyPage}
                onChange={setHistoryPage}
                total={totalPages}
                color="teal"
              />
            ) : null}
          </Stack>
        )}
      </div>
    </Stack>
  );
}
