import {
  ActiveIncidentsCard,
  LineChartCard,
  MiningPoolsPanel,
  type LineChartCardData,
  type MiningPoolRow,
  type TIncidentRowProps,
} from "@tetherto/mdk-react-devkit/domain";
import { Divider } from "@tetherto/mdk-react-devkit/primitives";

import {
  DASHBOARD_TIMELINE_OPTIONS,
  HASH_SERIES_COLORS,
  HS_PER_THS,
  POWER_SERIES_COLOR,
} from "./constants";
import type { History } from "./types";
import { flatLine, historyToPoints } from "./utils";

const HALF_HOUR_MS = 30 * 60 * 1000;

// x-range for flat reference lines: span the real history when present,
// otherwise a 30-min window ending "now" so the line still renders.
function xRange(points: { x: number }[], nowTs: number): [number, number] {
  if (points.length) return [points[0].x, points[points.length - 1].x];
  return [nowTs - HALF_HOUR_MS, nowTs];
}

function hashChartData(
  hashHistory: History | undefined,
  siteThs: number,
  nominalThs: number,
  nowTs: number,
): LineChartCardData {
  // Real, time-varying series available from the backend: aggregate pool hashrate.
  const aggrPool = historyToPoints(hashHistory, HS_PER_THS);
  const [x0, x1] = xRange(aggrPool, nowTs);
  const aggrLatest = aggrPool.length ? aggrPool[aggrPool.length - 1].y : 0;
  const fmt = (v: number) => `${v.toFixed(0)} TH/s`;

  return {
    datasets: [
      {
        label: "Site Hash Rate",
        borderColor: HASH_SERIES_COLORS.mdkFullSite,
        data: flatLine(x0, x1, siteThs),
        currentValue: { value: siteThs.toFixed(0), unit: "TH/s" },
      },
      {
        label: "Aggr Pool Hash Rate",
        borderColor: HASH_SERIES_COLORS.aggrPool,
        data: aggrPool,
        currentValue: { value: aggrLatest.toFixed(0), unit: "TH/s" },
      },
      {
        label: "F2pool Hash Rate",
        borderColor: HASH_SERIES_COLORS.f2pool,
        data: flatLine(x0, x1, 0),
        currentValue: { value: 0, unit: "TH/s" },
      },
      {
        label: "Ocean Hash Rate",
        borderColor: HASH_SERIES_COLORS.ocean,
        data: flatLine(x0, x1, 0),
        currentValue: { value: 0, unit: "TH/s" },
      },
      {
        label: "Nominal Hash Rate",
        borderColor: HASH_SERIES_COLORS.nominal,
        data: flatLine(x0, x1, nominalThs),
        currentValue: { value: nominalThs.toFixed(0), unit: "TH/s" },
      },
    ],
    minMaxAvg: { min: fmt(siteThs), max: fmt(siteThs), avg: fmt(siteThs) },
    yTicksFormatter: (v: number) => `${v.toFixed(0)} TH/s`,
  };
}

function powerChartData(containerPowerKw: number, nowTs: number): LineChartCardData {
  // Total container consumption. The example backend exposes only the
  // current aggregate (no per-container tail-log), so this renders as a flat
  // reference line at the live value — the same treatment the target uses.
  const [x0, x1] = xRange([], nowTs);
  const fmt = (v: number) => `${v.toFixed(2)} kW`;
  return {
    datasets: [
      {
        label: "Total Consumption",
        borderColor: POWER_SERIES_COLOR,
        data: flatLine(x0, x1, containerPowerKw),
        currentValue: { value: containerPowerKw.toFixed(2), unit: "kW" },
      },
    ],
    minMaxAvg: { min: fmt(containerPowerKw), max: fmt(containerPowerKw), avg: fmt(containerPowerKw) },
    highlightedValue: { value: containerPowerKw.toFixed(2), unit: "kW" },
    yTicksFormatter: (v: number) => `${v.toFixed(2)} kW`,
  };
}

export function DashboardPage({
  hashHistory,
  siteThs,
  containerPowerKw,
  nominalThs,
  nowTs,
  incidents,
  incidentsLoading,
  poolRows,
  poolsLoading,
}: {
  hashHistory: History | undefined;
  siteThs: number;
  containerPowerKw: number;
  nominalThs: number;
  nowTs: number;
  incidents: TIncidentRowProps[];
  incidentsLoading: boolean;
  poolRows: MiningPoolRow[];
  poolsLoading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <LineChartCard
        title="Hash Rate"
        data={hashChartData(hashHistory, siteThs, nominalThs, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        detailLegends
        isLoading={hashHistory === undefined}
        minHeight={280}
      />

      <Divider />

      <LineChartCard
        title="Power Consumption"
        data={powerChartData(containerPowerKw, nowTs)}
        timelineOptions={DASHBOARD_TIMELINE_OPTIONS}
        defaultTimeline="5m"
        minHeight={280}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        <ActiveIncidentsCard label="Active Alerts" items={incidents} isLoading={incidentsLoading} emptyMessage="No active alerts" />
        <MiningPoolsPanel rows={poolRows} isLoading={poolsLoading} />
      </div>
    </div>
  );
}
