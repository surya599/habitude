import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Flame,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Award,
  Layers,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { AnalyticsReport } from '../types';
import { useTheme } from '../context/ThemeContext';

export const AnalyticsPage: React.FC = () => {
  const { chartTheme } = useTheme();
  const [rangeKey, setRangeKey] = useState<'7d' | '30d' | '90d' | '12m' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', rangeKey);
      if (rangeKey === 'custom') {
        params.set('start_date', customStart);
        params.set('end_date', customEnd);
      }
      const res = await apiRequest<AnalyticsReport>(`/analytics/?${params.toString()}`);
      setReport(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [rangeKey, customStart, customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-3xl bg-surface border border-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-surface border border-border" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-surface border border-border" />
      </div>
    );
  }

  const { metrics } = report;

  // Group 365-day heatmap into weeks (columns of 7 days)
  const heatmapWeeks: Array<typeof report.yearly_heatmap> = [];
  let currentWeek: typeof report.yearly_heatmap = [];
  report.yearly_heatmap.forEach((day, idx) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || idx === report.yearly_heatmap.length - 1) {
      heatmapWeeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="space-y-8">
      {/* Header & Date Range Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Behavioral Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            Advanced Analytics
          </h1>
          <p className="text-sm text-muted mt-1">
            Precision diagnostics across your scheduled habit occurrences, streaks, and growth domains.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-surface border border-border shadow-apple">
            {(
              [
                { key: '7d', label: 'Last 7 Days' },
                { key: '30d', label: 'Last 30 Days' },
                { key: '90d', label: 'Last 90 Days' },
                { key: '12m', label: '12 Months' },
                { key: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRangeKey(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  rangeKey === opt.key
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {rangeKey === 'custom' && (
            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-border">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-surface-secondary text-xs text-foreground"
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-surface-secondary text-xs text-foreground"
              />
            </div>
          )}
        </div>
      </div>

      {/* Clearly Distinguished Primary Metrics: Consistency Score vs Completion Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium">Overall Consistency Score</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {metrics.consistency_score}%
          </p>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-accent shrink-0" />
            <span>Blends completion rate & daily presence stability</span>
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium">Raw Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {metrics.completion_rate}%
          </p>
          <p className="text-[11px] text-muted mt-1">
            {metrics.total_completed_in_range} of {metrics.total_scheduled} scheduled occurrences
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium">Current / Longest Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {metrics.current_streak}d{' '}
            <span className="text-base font-normal text-muted">
              / {metrics.longest_streak}d best
            </span>
          </p>
          <p className="text-[11px] text-muted mt-1">
            {metrics.total_all_time_completions} all-time completions
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium">Daily / Weekly / Monthly</span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
            <div className="p-2 rounded-xl bg-surface-secondary">
              <span className="block text-[10px] text-muted">Today</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {metrics.daily_completion_rate}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-secondary">
              <span className="block text-[10px] text-muted">7-Day</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {metrics.weekly_completion_rate}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-secondary">
              <span className="block text-[10px] text-muted">30-Day</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {metrics.monthly_completion_rate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Executive Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">Best-Performing Habit</p>
            <p className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[180px]">
              {metrics.best_performing_habit}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-success-soft text-success text-xs font-semibold">
            {metrics.best_performing_habit_rate}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">Lowest-Performing Habit</p>
            <p className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[180px]">
              {metrics.lowest_performing_habit}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-warning-soft text-warning text-xs font-semibold">
            {metrics.lowest_performing_habit_rate}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">Most Productive Weekday</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {metrics.most_productive_weekday}
            </p>
          </div>
          <Calendar className="w-4 h-4 text-accent" />
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">Most Consistent Category</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {metrics.most_consistent_category}
            </p>
          </div>
          <Layers className="w-4 h-4 text-accent" />
        </div>
      </div>

      {/* INTELLIGENT INSIGHTS (Data-Backed) */}
      {report.insights.length > 0 && (
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              Intelligent Behavioral Insights
            </h2>
            <span className="text-xs text-muted">
              — Calculated directly from your PostgreSQL completion records
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.insights.map((ins, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-secondary/70 border border-border"
              >
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                  {ins.title}
                </p>
                <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                  {ins.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISUALIZATION 1: GitHub-Style Yearly Habit Consistency Heatmap */}
      <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              1. Yearly Habit Consistency Heatmap (365 Days)
            </h2>
            <p className="text-xs text-muted">
              Every square represents a single day’s completed habits over the past year.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                className="w-3 h-3 rounded-[3px] inline-block"
                style={{ backgroundColor: `var(--heatmap-${lv})` }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-[4px] min-w-max">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[4px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} habits completed`}
                    className="w-3 h-3 rounded-[3px] transition-transform hover:scale-125"
                    style={{ backgroundColor: `var(--heatmap-${day.level})` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VISUALIZATION 2 (Daily Productivity Line Chart) & VISUALIZATION 3 (Weekly Comparison Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            2. Daily Productivity Line Chart
          </h2>
          <p className="text-xs text-muted mb-5">
            Daily completion percentage across the selected date window
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={report.daily_series}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                  formatter={(v: any, _n: any, p: any) => [
                    `${v}% (${p.payload.completed}/${p.payload.scheduled})`,
                    'Completion Rate',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="completion_rate"
                  stroke={chartTheme.primary}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            3. Weekly Day-of-Week Comparison
          </h2>
          <p className="text-xs text-muted mb-5">
            Completion rate by day of the week (Monday – Sunday)
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.weekday_performance}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="weekday"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="completion_rate"
                  name="Completion %"
                  fill={chartTheme.primary}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* VISUALIZATION 4 (Monthly Progress) & VISUALIZATION 5 (Category Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            4. Monthly Progress Chart
          </h2>
          <p className="text-xs text-muted mb-5">
            6-month trajectory of scheduled vs. completed habit occurrences
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.monthly_progress}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="short_month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="scheduled"
                  name="Scheduled"
                  fill={chartTheme.muted}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill={chartTheme.success}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            5. Category-Wise Performance
          </h2>
          <p className="text-xs text-muted mb-5">
            Consistency percentage across your personal growth categories
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={report.category_performance}
                margin={{ top: 4, right: 16, left: 20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="completion_rate" name="Completion %" radius={[0, 6, 6, 0]} barSize={20}>
                  {report.category_performance.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color || chartTheme.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* VISUALIZATION 6 (Habit-Specific Performance) & VISUALIZATION 7 (Completion Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            6. Habit-Specific Performance Ranking
          </h2>
          <p className="text-xs text-muted mb-5">
            Individual completion rates and scheduled adherence per habit
          </p>
          <div className="space-y-3.5">
            {report.habit_performance.map((h) => (
              <div key={h.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{h.name}</span>
                  <span className="text-muted tabular-nums">
                    {h.completed}/{h.scheduled} ({h.completion_rate}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${h.completion_rate}%`,
                      backgroundColor: h.color || chartTheme.primary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            7. Completion Distribution
          </h2>
          <p className="text-xs text-muted mb-4">
            Proportion of completed, partial progress, and missed sessions
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.completion_distribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {report.completion_distribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* VISUALIZATION 8 (Streak History) & VISUALIZATION 9 (Historical Progress Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            8. Habit Streak History Comparison
          </h2>
          <p className="text-xs text-muted mb-5">
            Current active streak vs. all-time longest streak per habit (days)
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.streak_history}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 10 }}
                  tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="current_streak"
                  name="Current Streak"
                  fill={chartTheme.primary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="longest_streak"
                  name="Longest Streak"
                  fill={chartTheme.success}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            9. Cumulative Historical Progress Timeline
          </h2>
          <p className="text-xs text-muted mb-5">
            Compounding habit completions accumulated over the selected period
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={report.progress_timeline}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: '12px',
                    color: chartTheme.tooltipText,
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_completions"
                  name="Cumulative Completions"
                  stroke={chartTheme.success}
                  fill={chartTheme.success}
                  fillOpacity={0.18}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
