import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar,
  Edit3,
  Archive,
  Trash2,
  Check,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { HabitDetail, UnlockedAchievementItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { DynamicIcon } from '../components/ui/IconMap';
import { HabitModal } from '../components/ui/HabitModal';

export const HabitDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chartTheme } = useTheme();
  const { showToast, celebrateAchievements } = useAuth();

  const [habit, setHabit] = useState<HabitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [customProgressInput, setCustomProgressInput] = useState<string>('');
  const [logNoteInput, setLogNoteInput] = useState<string>('');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiRequest<HabitDetail>(`/habits/${id}/`);
      setHabit(res);
      setCustomProgressInput(String(res.today_progress || res.target_value));
    } catch {
      navigate('/habits');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLogDateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habit) return;
    try {
      const val =
        habit.tracking_type === 'boolean'
          ? habit.today_completed
            ? 0
            : 1
          : parseFloat(customProgressInput) || 0;

      const res = await apiRequest<{
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({
          progress_value: val,
          notes: logNoteInput,
        }),
      });
      setLogNoteInput('');
      await fetchDetail();
      showToast({
        title: 'Progress Logged',
        description: `Updated ${habit.name} record.`,
      });
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch (err: any) {
      showToast({ title: 'Log failed', description: err.message, variant: 'error' });
    }
  };

  const handleToggleDateInCalendar = async (dateStr: string, currentlyCompleted: boolean) => {
    if (!habit) return;
    try {
      await apiRequest(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({
          date: dateStr,
          progress_value: currentlyCompleted ? 0 : habit.target_value,
        }),
      });
      await fetchDetail();
    } catch {
      // ignore
    }
  };

  const handleArchiveToggle = async () => {
    if (!habit) return;
    try {
      await apiRequest(`/habits/${habit.id}/archive/`, {
        method: 'POST',
        body: JSON.stringify({ is_archived: !habit.is_archived }),
      });
      await fetchDetail();
      showToast({
        title: habit.is_archived ? 'Habit Restored' : 'Habit Archived',
      });
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!habit) return;
    if (!window.confirm(`Delete "${habit.name}" permanently?`)) return;
    try {
      await apiRequest(`/habits/${habit.id}/`, { method: 'DELETE' });
      navigate('/habits');
    } catch {
      // ignore
    }
  };

  if (loading || !habit) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-3xl bg-surface border border-border" />
        <div className="h-80 rounded-3xl bg-surface border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/habits"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Habits</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground hover:bg-surface-secondary"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={handleArchiveToggle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground hover:bg-surface-secondary"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{habit.is_archived ? 'Restore' : 'Archive'}</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-danger-soft text-danger text-xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Habit Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-apple flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${habit.color}18`, color: habit.color }}
          >
            <DynamicIcon name={habit.icon} className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-muted">
                {habit.category_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-secondary text-muted capitalize">
                {habit.priority} Priority · {habit.difficulty}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-soft text-accent capitalize">
                {habit.tracking_type} ({habit.target_value} {habit.unit})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-2">
              {habit.name}
            </h1>
            {habit.description && (
              <p className="text-sm text-muted mt-1.5 max-w-2xl leading-relaxed">
                {habit.description}
              </p>
            )}
          </div>
        </div>

        {/* Today's Quick Logger */}
        <form
          onSubmit={handleLogDateProgress}
          className="p-4 rounded-2xl bg-surface-secondary/70 border border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0"
        >
          {habit.tracking_type !== 'boolean' && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                Today ({habit.unit})
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={customProgressInput}
                onChange={(e) => setCustomProgressInput(e.target.value)}
                className="w-28 px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-foreground"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
              Session Note
            </label>
            <input
              type="text"
              value={logNoteInput}
              onChange={(e) => setLogNoteInput(e.target.value)}
              placeholder="Optional note..."
              className="w-44 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground"
            />
          </div>
          <button
            type="submit"
            className="mt-auto px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>
              {habit.tracking_type === 'boolean'
                ? habit.today_completed
                  ? 'Mark Incomplete'
                  : 'Complete Today'
                : 'Save Progress'}
            </span>
          </button>
        </form>
      </div>

      {/* 4 Key Habit Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {habit.current_streak} <span className="text-sm font-normal text-muted">days</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Longest Streak</span>
            <Trophy className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {habit.longest_streak} <span className="text-sm font-normal text-muted">days</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Completions</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {habit.total_completions}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>90-Day Completion Rate</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {habit.completion_percentage}%
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {habit.completed_occurrences_90d} of {habit.scheduled_occurrences_90d} scheduled
          </p>
        </div>
      </div>

      {/* 90-Day Interactive Historical Calendar */}
      <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              90-Day Historical Calendar
            </h2>
            <p className="text-xs text-muted">
              Click any date cell to toggle completion or inspect historical consistency.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success inline-block" /> Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/60 inline-block" /> Partial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-surface-secondary border border-border inline-block" /> Scheduled
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-15 md:grid-cols-18 gap-2">
          {habit.historical_calendar.map((day) => {
            const isPartial = !day.is_completed && day.progress_value > 0;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => handleToggleDateInCalendar(day.date, day.is_completed)}
                title={`${day.label} (${day.date}): ${
                  day.is_completed
                    ? 'Completed'
                    : isPartial
                    ? `Partial (${day.progress_value}/${day.target_value})`
                    : day.is_scheduled
                    ? 'Missed'
                    : 'Rest Day'
                }`}
                className={`p-2 rounded-xl border text-center transition-all ${
                  day.is_completed
                    ? 'bg-success text-white border-success shadow-sm'
                    : isPartial
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : day.is_scheduled
                    ? 'bg-surface-secondary text-muted border-border hover:border-accent'
                    : 'bg-transparent text-subtle border-border/40 opacity-50'
                }`}
              >
                <span className="block text-[10px] opacity-80">
                  {day.label.split(' ')[0]}
                </span>
                <span className="block text-xs font-semibold mt-0.5 tabular-nums">
                  {day.label.split(' ')[1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Performance & 30-Day Progress Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            Monthly Performance
          </h2>
          <p className="text-xs text-muted mb-5">
            Completion percentage by month over the last 6 months
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={habit.monthly_performance}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
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
                <Bar
                  dataKey="completion_rate"
                  fill={habit.color || chartTheme.primary}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            30-Day Progress Trend
          </h2>
          <p className="text-xs text-muted mb-5">
            Daily logged output ({habit.unit || 'sessions'}) over the last 30 days
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={habit.progress_trends}
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
                  tick={{ fill: chartTheme.axis, fontSize: 10 }}
                  interval={4}
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
                  dataKey="progress_value"
                  name={habit.unit || 'Value'}
                  stroke={habit.color || chartTheme.primary}
                  fill={habit.color || chartTheme.primary}
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Completion Logs */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Recent Completion Log History
        </h2>
        {habit.recent_completions.length === 0 ? (
          <p className="text-xs text-muted py-4">No completion records logged yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {habit.recent_completions.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.is_completed ? 'bg-success' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-mono font-medium text-foreground">{log.date}</span>
                  {log.notes && <span className="text-muted">— “{log.notes}”</span>}
                </div>
                <span className="font-semibold text-foreground tabular-nums">
                  {log.progress_value} / {log.target_snapshot} {habit.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <HabitModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialHabit={habit}
        onSaved={() => {
          fetchDetail();
          showToast({ title: 'Habit Updated' });
        }}
      />
    </div>
  );
};
