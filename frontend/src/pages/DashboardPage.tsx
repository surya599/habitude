import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Flame,
  Trophy,
  CheckCircle2,
  Sparkles,
  Landmark,
  Heart,
  Target,
  BookText,
  ArrowUpRight,
  Award,
  Check,
  Edit3,
  History,
  Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../lib/api';
import {
  DashboardData,
  DashboardHabitItem,
  DailyIntention,
  UnlockedAchievementItem,
} from '../types';
import { ProgressRing } from '../components/ui/ProgressRing';
import { DynamicIcon } from '../components/ui/IconMap';
import { HabitModal } from '../components/ui/HabitModal';

export const DashboardPage: React.FC = () => {
  const { user, showToast, celebrateAchievements } = useAuth();
  const { chartTheme } = useTheme();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  // Daily Intention state
  const [editingIntention, setEditingIntention] = useState(false);
  const [intentionInput, setIntentionInput] = useState('');
  const [intentionCategory, setIntentionCategory] = useState('Deep Focus');
  const [intentionHistory, setIntentionHistory] = useState<DailyIntention[]>([]);
  const [showIntentionHistory, setShowIntentionHistory] = useState(false);

  // Quick Journal state
  const [quickJournalTitle, setQuickJournalTitle] = useState('');
  const [quickJournalWell, setQuickJournalWell] = useState('');
  const [quickJournalTomorrow, setQuickJournalTomorrow] = useState('');
  const [savingJournal, setSavingJournal] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiRequest<DashboardData>('/dashboard/');
      setData(res);
      if (res.daily_intention) {
        setIntentionInput(res.daily_intention.intention_text);
        setIntentionCategory(res.daily_intention.focus_category || 'Deep Focus');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleToggleHabit = async (habit: DashboardHabitItem) => {
    try {
      const res = await apiRequest<{
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({ toggle: true }),
      });
      await fetchDashboard();
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      } else if (!habit.is_completed) {
        showToast({
          title: `Completed: ${habit.name}`,
          description: 'Progress ring and streak metrics updated.',
        });
      }
    } catch (err: any) {
      showToast({ title: 'Could not update habit', description: err.message, variant: 'error' });
    }
  };

  const handlePartialProgress = async (habit: DashboardHabitItem, delta: number) => {
    try {
      const res = await apiRequest<{
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({ increment_by: delta }),
      });
      await fetchDashboard();
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch (err: any) {
      showToast({ title: 'Update failed', description: err.message, variant: 'error' });
    }
  };

  const handleSaveIntention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentionInput.trim()) return;
    try {
      await apiRequest('/intentions/', {
        method: 'POST',
        body: JSON.stringify({
          intention_text: intentionInput.trim(),
          focus_category: intentionCategory,
        }),
      });
      setEditingIntention(false);
      await fetchDashboard();
      showToast({ title: 'Daily intention set', description: 'Stay anchored to what matters most today.' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, variant: 'error' });
    }
  };

  const handleToggleIntentionComplete = async () => {
    if (!data?.daily_intention) return;
    try {
      await apiRequest(`/intentions/${data.daily_intention.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: !data.daily_intention.is_completed }),
      });
      await fetchDashboard();
    } catch {
      // ignore
    }
  };

  const handleOpenIntentionHistory = async () => {
    setShowIntentionHistory(!showIntentionHistory);
    if (!showIntentionHistory) {
      try {
        const res = await apiRequest<{ history: DailyIntention[] }>('/intentions/');
        setIntentionHistory(res.history || []);
      } catch {
        // ignore
      }
    }
  };

  const handleToggleFavoriteQuote = async () => {
    if (!data?.daily_quote) return;
    try {
      const res = await apiRequest<{
        is_favorite: boolean;
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/stoic/quotes/${data.daily_quote.id}/favorite/`, {
        method: 'POST',
      });
      await fetchDashboard();
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch {
      // ignore
    }
  };

  const handleQuickJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJournalWell.trim() && !quickJournalTitle.trim()) return;
    setSavingJournal(true);
    try {
      const res = await apiRequest<{ newly_unlocked_achievements?: UnlockedAchievementItem[] }>(
        '/journal/',
        {
          method: 'POST',
          body: JSON.stringify({
            title:
              quickJournalTitle.trim() ||
              `Evening Reflection · ${new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`,
            content: quickJournalWell.trim(),
            prompt_went_well: quickJournalWell.trim(),
            prompt_tomorrow_focus: quickJournalTomorrow.trim(),
            mood: 'calm',
            energy_level: 4,
            tags: ['Daily Reflection'],
          }),
        }
      );
      setQuickJournalTitle('');
      setQuickJournalWell('');
      setQuickJournalTomorrow('');
      await fetchDashboard();
      showToast({
        title: 'Reflection saved to Journal',
        description: 'Your thoughts have been recorded.',
      });
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch (err: any) {
      showToast({ title: 'Could not save entry', description: err.message, variant: 'error' });
    } finally {
      setSavingJournal(false);
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.full_name || user?.username || 'Practitioner').split(' ')[0];

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-3xl bg-surface border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-96 rounded-3xl bg-surface border border-border" />
          <div className="lg:col-span-8 h-96 rounded-3xl bg-surface border border-border" />
        </div>
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="space-y-8">
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            {formattedDate}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted mt-1">
            {user?.personal_motto || 'Build a better you, one day at a time.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHabitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* 2. DAILY OVERVIEW & APPLE FITNESS CIRCULAR PROGRESS RING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Progress Ring Card */}
        <div className="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Daily Activity Ring
            </span>
            <span className="text-xs font-medium text-accent">
              {overview.completed_habits}/{overview.total_scheduled_habits} Done
            </span>
          </div>

          <div className="my-4">
            <ProgressRing
              percentage={overview.daily_completion_percentage}
              size={196}
              strokeWidth={15}
              label="Completed"
              sublabel={`${overview.remaining_habits} remaining today`}
            />
          </div>

          <div className="w-full grid grid-cols-3 gap-2.5 pt-4 border-t border-border text-center">
            <div className="p-2.5 rounded-2xl bg-surface-secondary/70">
              <p className="text-[11px] text-muted">Scheduled</p>
              <p className="text-base font-semibold text-foreground mt-0.5 tabular-nums">
                {overview.total_scheduled_habits}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface-secondary/70">
              <p className="text-[11px] text-muted">Completed</p>
              <p className="text-base font-semibold text-success mt-0.5 tabular-nums">
                {overview.completed_habits}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-surface-secondary/70">
              <p className="text-[11px] text-muted">Remaining</p>
              <p className="text-base font-semibold text-foreground mt-0.5 tabular-nums">
                {overview.remaining_habits}
              </p>
            </div>
          </div>
        </div>

        {/* Key Overview Metrics + Daily Intention */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-6">
          {/* Top 3 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Current Streak</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/12 text-amber-500 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-3 tabular-nums">
                {overview.current_streak}{' '}
                <span className="text-sm font-normal text-muted">days</span>
              </p>
              <p className="text-[11px] text-muted mt-1">
                Active daily execution continuity
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Longest Streak</span>
                <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-3 tabular-nums">
                {overview.longest_streak}{' '}
                <span className="text-sm font-normal text-muted">days</span>
              </p>
              <p className="text-[11px] text-muted mt-1">All-time personal benchmark</p>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Weekly Consistency</span>
                <div className="w-8 h-8 rounded-xl bg-success-soft text-success flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground mt-3 tabular-nums">
                {overview.weekly_consistency_score}%
              </p>
              <p className="text-[11px] text-muted mt-1">
                {overview.week_completed_total} of {overview.week_scheduled_total} sessions this week
              </p>
            </div>
          </div>

          {/* DAILY INTENTION CARD (Section 13) */}
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Daily Intention
                </span>
                {data.daily_intention?.focus_category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-secondary text-muted">
                    {data.daily_intention.focus_category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenIntentionHistory}
                  className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History</span>
                </button>
                {data.daily_intention && !editingIntention && (
                  <button
                    type="button"
                    onClick={() => setEditingIntention(true)}
                    className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {editingIntention || !data.daily_intention ? (
              <form onSubmit={handleSaveIntention} className="mt-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={intentionInput}
                    onChange={(e) => setIntentionInput(e.target.value)}
                    placeholder="What is your single most meaningful intention today?"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                  <select
                    value={intentionCategory}
                    onChange={(e) => setIntentionCategory(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                  >
                    <option value="Deep Focus">Deep Focus</option>
                    <option value="Vitality">Vitality</option>
                    <option value="Wisdom">Wisdom</option>
                    <option value="Craft">Craft</option>
                    <option value="Equanimity">Equanimity</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shrink-0"
                  >
                    Set Intention
                  </button>
                  {editingIntention && (
                    <button
                      type="button"
                      onClick={() => setEditingIntention(false)}
                      className="px-3 py-2.5 rounded-xl text-xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface-secondary/60 border border-border/80">
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={handleToggleIntentionComplete}
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      data.daily_intention.is_completed
                        ? 'bg-success text-white'
                        : 'border-2 border-border-strong hover:border-accent'
                    }`}
                    aria-label="Toggle daily intention complete"
                  >
                    {data.daily_intention.is_completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <p
                      className={`text-sm sm:text-base font-medium leading-snug ${
                        data.daily_intention.is_completed
                          ? 'line-through text-muted'
                          : 'text-foreground'
                      }`}
                    >
                      {data.daily_intention.intention_text}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {data.daily_intention.is_completed
                        ? 'Intention fulfilled today'
                        : 'Click circle when your primary intention is complete'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showIntentionHistory && intentionHistory.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border space-y-2 max-h-36 overflow-y-auto">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Previous Daily Intentions
                </p>
                {intentionHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs py-1 text-muted"
                  >
                    <span className="truncate pr-3 text-foreground">{item.intention_text}</span>
                    <span className="shrink-0 font-mono text-[11px]">
                      {item.date} {item.is_completed ? '✓' : '·'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. TODAY'S HABITS & WEEKLY PERFORMANCE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Scheduled Habits */}
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Today’s Habits
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Log completions or increment partial progress toward today’s targets.
              </p>
            </div>
            <Link
              to="/habits"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.todays_habits.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">No habits scheduled today</p>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Create your first habit to start tracking daily progress and building streaks.
              </p>
              <button
                type="button"
                onClick={() => setHabitModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
              >
                Create Habit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.todays_habits.map((h) => {
                const isNumericOrDuration = h.tracking_type !== 'boolean';
                const step =
                  h.tracking_type === 'quantity'
                    ? 0.5
                    : h.target_value >= 20
                    ? 5
                    : 1;

                return (
                  <motion.div
                    key={h.id}
                    layout
                    className={`p-4 rounded-2xl border transition-all ${
                      h.is_completed
                        ? 'bg-surface-secondary/40 border-success/30'
                        : 'bg-surface-secondary/60 border-border hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleHabit(h)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                            h.is_completed
                              ? 'bg-success text-white shadow-sm'
                              : 'bg-surface border border-border text-muted hover:border-accent hover:text-accent'
                          }`}
                          aria-label={`Complete ${h.name}`}
                        >
                          {h.is_completed ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <DynamicIcon
                              name={h.icon}
                              className="w-4 h-4"
                              style={{ color: h.color }}
                            />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/habits/${h.id}`}
                              className={`text-sm font-semibold hover:text-accent transition-colors truncate ${
                                h.is_completed ? 'text-muted line-through' : 'text-foreground'
                              }`}
                            >
                              {h.name}
                            </Link>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface border border-border text-muted shrink-0">
                              {h.category_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                            <span className="tabular-nums">
                              {isNumericOrDuration
                                ? `${h.progress_value} / ${h.target_value} ${h.unit}`
                                : h.is_completed
                                ? 'Completed today'
                                : 'Scheduled today'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                              <Flame className="w-3 h-3" />
                              {h.current_streak}d
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isNumericOrDuration && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePartialProgress(h, -step)}
                              disabled={h.progress_value <= 0}
                              className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40"
                              title={`Decrease by ${step}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePartialProgress(h, step)}
                              className="px-2.5 h-7 rounded-lg bg-surface border border-border text-xs font-medium text-foreground hover:border-accent transition-colors"
                              title={`Add ${step} ${h.unit}`}
                            >
                              +{step}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleHabit(h)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            h.is_completed
                              ? 'bg-success-soft text-success'
                              : 'bg-accent text-white hover:bg-accent-hover'
                          }`}
                        >
                          {h.is_completed ? 'Done' : 'Complete'}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar for numerical / duration / quantity */}
                    {isNumericOrDuration && (
                      <div className="mt-3 w-full h-1.5 rounded-full bg-border overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${h.progress_percentage}%` }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: h.is_completed ? chartTheme.success : h.color,
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Activity Chart & Daily Stoic Quote */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Weekly Activity Chart */}
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Weekly Activity & Rhythm
                </h2>
                <p className="text-xs text-muted">
                  Last 7 days completion rate ({overview.weekly_consistency_score}% average)
                </p>
              </div>
              <Link
                to="/analytics"
                className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.weekly_activity}
                  margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={chartTheme.grid}
                  />
                  <XAxis
                    dataKey="day"
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
                    cursor={{ fill: chartTheme.grid, opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      borderRadius: '12px',
                      color: chartTheme.tooltipText,
                      fontSize: '12px',
                    }}
                    formatter={(val: any, _name: any, props: any) => [
                      `${val}% (${props.payload.completed}/${props.payload.scheduled})`,
                      'Completion',
                    ]}
                  />
                  <Bar dataKey="completion_rate" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {data.weekly_activity.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          entry.completion_rate >= 85
                            ? chartTheme.success
                            : chartTheme.primary
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Stoic Quote Card */}
          {data.daily_quote && (
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-accent">
                    <Landmark className="w-3.5 h-3.5" />
                    Daily Stoic · {data.daily_quote.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleFavoriteQuote}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        data.daily_quote.is_favorite
                          ? 'bg-danger-soft border-danger/30 text-danger'
                          : 'bg-surface-secondary border-border text-muted hover:text-foreground'
                      }`}
                      aria-label="Save quote to favorites"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          data.daily_quote.is_favorite ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                    <Link
                      to="/stoic"
                      className="text-xs font-medium text-muted hover:text-foreground"
                    >
                      Library →
                    </Link>
                  </div>
                </div>

                <blockquote className="font-editorial text-base sm:text-lg text-foreground leading-relaxed italic">
                  “{data.daily_quote.text}”
                </blockquote>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground">
                    {data.daily_quote.philosopher}
                  </span>
                  <span className="text-muted block text-[11px]">
                    {data.daily_quote.source_reference}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-secondary text-muted">
                  {data.daily_quote.is_direct_quote ? 'Verified Direct Quote' : 'Paraphrase'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. UPCOMING GOALS, RECENT ACHIEVEMENTS & QUICK JOURNAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Goals */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <h2 className="text-base font-semibold text-foreground">Active Goals</h2>
              </div>
              <Link to="/goals" className="text-xs font-medium text-accent hover:underline">
                View All
              </Link>
            </div>

            {data.upcoming_goals.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No active goals yet. Set a milestone-driven goal to anchor your habits.
              </p>
            ) : (
              <div className="space-y-3.5">
                {data.upcoming_goals.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => navigate('/goals')}
                    className="p-3.5 rounded-2xl bg-surface-secondary/60 border border-border hover:border-border-strong cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate pr-2">
                        {g.title}
                      </span>
                      <span className="font-semibold text-accent shrink-0">
                        {Math.round(g.progress_percentage)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-border mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${g.progress_percentage}%`,
                          backgroundColor: g.color || chartTheme.primary,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted mt-2">
                      <span>
                        {g.completed_milestones}/{g.total_milestones} milestones
                      </span>
                      <span>Target: {g.target_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/reviews/weekly"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-muted hover:text-foreground"
          >
            <span>Open Weekly Executive Review</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Achievements */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">
                  Recent Achievements
                </h2>
              </div>
              <span className="text-xs text-muted">
                {data.recent_achievements.length} unlocked
              </span>
            </div>

            {data.recent_achievements.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                Complete your first habit to unlock your initial discipline badge.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recent_achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-surface-secondary/60 border border-border"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${ach.badge_color}18`,
                        color: ach.badge_color,
                      }}
                    >
                      <DynamicIcon name={ach.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{ach.title}</p>
                      <p className="text-[11px] text-muted line-clamp-2 mt-0.5">
                        {ach.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/analytics"
            className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-muted hover:text-foreground"
          >
            <span>Explore Consistency Insights</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Journal Entry */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookText className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Quick Reflection</h2>
            </div>
            <Link to="/journal" className="text-xs font-medium text-accent hover:underline">
              Full Journal
            </Link>
          </div>

          <form onSubmit={handleQuickJournalSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={quickJournalTitle}
                onChange={(e) => setQuickJournalTitle(e.target.value)}
                placeholder="Entry title (optional)..."
                className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <textarea
                rows={3}
                value={quickJournalWell}
                onChange={(e) => setQuickJournalWell(e.target.value)}
                placeholder="What went well today? What did you learn?"
                className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={quickJournalTomorrow}
                onChange={(e) => setQuickJournalTomorrow(e.target.value)}
                placeholder="What should I focus on tomorrow?"
                className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={savingJournal || (!quickJournalWell.trim() && !quickJournalTitle.trim())}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {savingJournal ? 'Saving Reflection...' : 'Save Journal Reflection'}
            </button>
          </form>
        </div>
      </div>

      <HabitModal
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        onSaved={() => {
          fetchDashboard();
          showToast({
            title: 'Habit Created',
            description: 'Your new habit has been added to your schedule.',
          });
        }}
      />
    </div>
  );
};
