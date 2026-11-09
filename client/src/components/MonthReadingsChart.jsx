import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SLOT_OPTIONS } from '../lib/slots';
import { monthKey, monthLabel, prettyDate } from '../lib/month';

// Monochrome series, distinguished by shade + dash pattern.
const SLOT_STYLE = {
  MORNING_FASTING: { stroke: '#161616', dash: undefined, width: 2.5 },
  AFTER_BREAKFAST: { stroke: '#6b6b6b', dash: undefined, width: 2 },
  AFTER_LUNCH: { stroke: '#a3a3a3', dash: '5 4', width: 2 },
  AFTER_DINNER: { stroke: '#c4c4c4', dash: '2 3', width: 2 },
};

function buildChartData(readings = []) {
  const byDate = new Map();
  for (const reading of readings) {
    if (!byDate.has(reading.date)) {
      byDate.set(reading.date, { date: reading.date });
    }
    byDate.get(reading.date)[reading.slot] = reading.value;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#161616', color: '#fff', padding: '10px 12px', borderRadius: 12, fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{prettyDate(label)}</div>
      {payload
        .filter((p) => p.value != null && p.dataKey !== 'band')
        .map((p) => (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <span style={{ opacity: 0.7 }}>{p.name}</span>
            <span>{p.value} mg/dl</span>
          </div>
        ))}
    </div>
  );
}

export function MonthReadingsChart({ report, title = 'Month-to-date trend' }) {
  if (!report) {
    return null;
  }

  const empty = report.count === 0;
  const data = buildChartData(report.readings);

  return (
    <section className="sw-card">
      <div className="sw-card-head">
        <div>
          <h3 className="sw-card-title">{title}</h3>
          <div className="sw-subtle" style={{ fontSize: 12 }}>
            {monthLabel(monthKey(report.start))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {SLOT_OPTIONS.map((s) => (
            <span key={s.value} className="sw-cal-legend-item">
              <svg width="18" height="6">
                <line
                  x1="0"
                  y1="3"
                  x2="18"
                  y2="3"
                  stroke={SLOT_STYLE[s.value].stroke}
                  strokeWidth="2.5"
                  strokeDasharray={SLOT_STYLE[s.value].dash}
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="sw-subtle">No readings in this range.</div>
      ) : (
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="swFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#161616" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#161616" stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* in-range band; extendDomain keeps 70–140 on the axis so the band is
                  never dropped when a month's readings sit inside or beside it */}
              <ReferenceArea
                y1={70}
                y2={140}
                fill="#9be27a"
                fillOpacity={0.12}
                ifOverflow="extendDomain"
              />
              <CartesianGrid vertical={false} stroke="#efefef" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => Number(d.slice(8, 10))}
                tick={{ fontSize: 12, fill: '#8a8a8a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                width={48}
                tick={{ fontSize: 12, fill: '#8a8a8a' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d0d0d0' }} />
              <Area
                type="monotone"
                dataKey="MORNING_FASTING"
                stroke="none"
                fill="url(#swFill)"
                legendType="none"
                tooltipType="none"
                connectNulls
                isAnimationActive={false}
              />
              {SLOT_OPTIONS.map((slot) => (
                <Line
                  key={slot.value}
                  type="monotone"
                  dataKey={slot.value}
                  name={slot.label}
                  stroke={SLOT_STYLE[slot.value].stroke}
                  strokeWidth={SLOT_STYLE[slot.value].width}
                  strokeDasharray={SLOT_STYLE[slot.value].dash}
                  dot={false}
                  activeDot={{ r: 5, fill: '#161616', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
