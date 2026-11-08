import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  List,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { MonthReadingsChart } from '../components/MonthReadingsChart';
import { api, ApiError } from '../lib/api';
import { formatDateInput } from '../lib/slots';

function ReportCard({ title, report }) {
  if (!report) {
    return null;
  }

  const empty = report.count === 0;

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">
            {report.start}
            {report.start !== report.end ? ` → ${report.end}` : ''}
          </Text>
        </div>

        {empty ? (
          <Text c="dimmed">No readings in this range.</Text>
        ) : (
          <>
            <SimpleGrid cols={2} spacing="xs">
              <Text size="sm">Highest: {report.highest} mg/dl</Text>
              <Text size="sm">Lowest: {report.lowest} mg/dl</Text>
              <Text size="sm">Average: {report.average} mg/dl</Text>
              <Text size="sm">Count: {report.count}</Text>
            </SimpleGrid>
            {report.readings?.length ? (
              <List size="sm" spacing={4}>
                {report.readings.map((reading) => (
                  <List.Item key={reading.id}>
                    {reading.date} · {reading.slotLabel}: {reading.value} mg/dl
                  </List.Item>
                ))}
              </List>
            ) : null}
          </>
        )}
      </Stack>
    </Card>
  );
}

export function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [daily, setDaily] = useState(null);
  const [monthToDate, setMonthToDate] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dateString = formatDateInput(selectedDate);

  const loadReports = useCallback(async () => {
    if (!dateString) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [dailyData, mtdData, monthlyData] = await Promise.all([
        api(`/api/reports/daily?date=${dateString}`),
        api(`/api/reports/month-to-date?date=${dateString}`),
        api(`/api/reports/monthly?date=${dateString}`),
      ]);
      setDaily(dailyData.report);
      setMonthToDate(mtdData.report);
      setMonthly(monthlyData.report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reports.');
      setDaily(null);
      setMonthToDate(null);
      setMonthly(null);
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <Stack maw={960} mx="auto" gap="lg">
      <div>
        <Title order={2}>Reports</Title>
        <Text c="dimmed">
          Daily, month-to-date, and previous-month summaries for a selected date.
        </Text>
      </div>

      <Group align="flex-end">
        <DatePickerInput
          label="Selected date"
          value={selectedDate}
          onChange={setSelectedDate}
          valueFormat="YYYY-MM-DD"
          maxDate={new Date()}
          w={260}
        />
        {loading ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : null}
      </Group>

      {error ? <Alert color="red">{error}</Alert> : null}

      <MonthReadingsChart report={monthToDate} />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <ReportCard title="Daily" report={daily} />
        <ReportCard title="Month to date" report={monthToDate} />
        <ReportCard title="Previous month" report={monthly} />
      </SimpleGrid>
    </Stack>
  );
}
