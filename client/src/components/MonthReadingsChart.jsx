import { Card, Stack, Text, Title } from '@mantine/core';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SLOT_OPTIONS } from '../lib/slots';

const SLOT_COLORS = {
  MORNING_FASTING: '#0ca678',
  AFTER_BREAKFAST: '#1c7ed6',
  AFTER_LUNCH: '#f08c00',
  AFTER_DINNER: '#e03131',
};

function buildChartData(readings = []) {
  const byDate = new Map();

  for (const reading of readings) {
    if (!byDate.has(reading.date)) {
      byDate.set(reading.date, { date: reading.date });
    }
    byDate.get(reading.date)[reading.slot] = reading.value;
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function MonthReadingsChart({ report }) {
  if (!report) {
    return null;
  }

  const empty = report.count === 0;
  const data = buildChartData(report.readings);

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>Month-to-date trend</Title>
          <Text size="sm" c="dimmed">
            {report.start}
            {report.start !== report.end ? ` → ${report.end}` : ''}
          </Text>
        </div>

        {empty ? (
          <Text c="dimmed">No readings in this range.</Text>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  unit=" mg/dl"
                  width={64}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                {SLOT_OPTIONS.map((slot) => (
                  <Line
                    key={slot.value}
                    type="monotone"
                    dataKey={slot.value}
                    name={slot.label}
                    stroke={SLOT_COLORS[slot.value]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Stack>
    </Card>
  );
}
