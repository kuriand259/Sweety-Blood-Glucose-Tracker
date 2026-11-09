import { useCallback, useEffect, useState } from 'react';
import { Alert, Loader, Stack } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPencil } from '@tabler/icons-react';
import { DayDetailModal } from '../components/DayDetailModal';
import { ExpandButton } from '../components/ExpandButton';
import { MonthCalendar } from '../components/MonthCalendar';
import { MonthReadingsChart } from '../components/MonthReadingsChart';
import { api, ApiError } from '../lib/api';
import { glucoseStatus, glucoseStatusLabel } from '../lib/glucose';
import { monthKey, prettyDate, shiftMonth, todayString } from '../lib/month';
import { formatDateInput } from '../lib/slots';

function ReportCard({ title, report, dark = false }) {
  if (!report) {
    return <section className={`sw-card${dark ? ' dark' : ''}`} style={{ minHeight: 220 }} />;
  }

  const empty = report.count === 0;
  const tileClass = dark ? 'sw-tile' : 'sw-tile light';

  return (
    <section className={`sw-card${dark ? ' dark' : ''}`}>
      <div className="sw-card-head">
        <h3 className="sw-card-title">{title}</h3>
        <span className="sw-subtle" style={{ fontSize: 12 }}>
          {prettyDate(report.start, { day: 'numeric', month: 'short' })}
          {report.start !== report.end
            ? ` – ${prettyDate(report.end, { day: 'numeric', month: 'short' })}`
            : ''}
        </span>
      </div>

      {empty ? (
        <div className="sw-subtle">No readings in this range.</div>
      ) : (
        <>
          <div className="sw-stat-row" style={{ marginBottom: 18 }}>
            <div className="sw-stat">
              <span className="sw-big-number">{Math.round(report.average)}</span>
              <small>avg mg/dl</small>
            </div>
            <span className={`sw-pill ${glucoseStatus(report.average)}`} style={{ marginBottom: 6 }}>
              {glucoseStatusLabel(report.average)}
            </span>
          </div>
          <div className="sw-tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className={tileClass}>
              <strong>{report.highest}</strong>
              <span>Highest</span>
            </div>
            <div className={tileClass}>
              <strong>{report.lowest}</strong>
              <span>Lowest</span>
            </div>
            <div className={tileClass}>
              <strong>{report.count}</strong>
              <span>Readings</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [daily, setDaily] = useState(null);
  // Current month: always 1st -> today (not the picked day). Past months: whole month.
  const [monthToDate, setMonthToDate] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // day modal for the selected date + a token so the calendar refetches after edits
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [calReload, setCalReload] = useState(0);

  const dateString = formatDateInput(selectedDate);

  const loadReports = useCallback(async () => {
    if (!dateString) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const today = todayString();
      const selectedMonth = monthKey(dateString);
      const isCurrentMonth = selectedMonth === monthKey(today);
      // Month overview stays fixed while browsing days in the current month
      // (always MTD through today). Past months use /monthly via the 1st of
      // the following month so the whole selected month is returned.
      const monthPath = isCurrentMonth
        ? `/api/reports/month-to-date?date=${today}`
        : `/api/reports/monthly?date=${shiftMonth(selectedMonth, 1)}-01`;
      const [dailyData, mtdData, monthlyData] = await Promise.all([
        api(`/api/reports/daily?date=${dateString}`),
        api(monthPath),
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
    <Stack gap={20}>
      <div className="sw-card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 24px' }}>
        <div>
          <h3 className="sw-card-title">Reports</h3>
          <div className="sw-subtle" style={{ fontSize: 13 }}>
            Daily for the selected date, plus month overview and previous month.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading ? <Loader size="xs" color="dark" /> : null}
          <DatePickerInput
            aria-label="Selected date"
            value={selectedDate}
            onChange={(v) => v && setSelectedDate(v)}
            valueFormat="DD MMM YYYY"
            maxDate={new Date()}
            w={200}
          />
          <ExpandButton
            icon={IconPencil}
            label="Edit readings"
            onClick={() => setDayModalOpen(true)}
          />
        </div>
      </div>

      {error ? <Alert color="red">{error}</Alert> : null}

      <div className="sw-grid three">
        <ReportCard title="Daily" report={daily} dark />
        <ReportCard title="Month overview" report={monthToDate} />
        <ReportCard title="Previous month" report={monthly} />
      </div>

      <div className="sw-grid dash-mid">
        <MonthReadingsChart
          report={monthToDate}
          title="Monthly trend"
        />
        <MonthCalendar
          reloadToken={calReload}
          onReadingsChange={loadReports}
          focusDate={dateString}
        />
      </div>

      {/* same day modal as the calendar, for the date picked above */}
      <DayDetailModal
        date={dayModalOpen ? dateString : null}
        readings={daily?.readings ?? []}
        onClose={() => setDayModalOpen(false)}
        onChanged={() => {
          loadReports();
          setCalReload((n) => n + 1);
        }}
      />
    </Stack>
  );
}
