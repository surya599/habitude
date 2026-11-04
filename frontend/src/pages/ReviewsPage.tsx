import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CalendarRange,
  CheckCircle2,
  Flame,
  TrendingUp,
  Award,
  Target,
  Check,
  Sparkles,
  BookText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { AchievementItem, WeeklyReviewData } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { DynamicIcon } from '../components/ui/IconMap';

export const ReviewsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chartTheme } = useTheme();
  const { showToast } = useAuth();

  const reviewType: 'weekly' | 'monthly' = location.pathname.includes('monthly')
    ? 'monthly'
    : 'weekly';

  const [review, setReview] = useState<WeeklyReviewData | null>(null);
  const [pastReviews, setPastReviews] = useState<WeeklyReviewData[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reflection prompts
  const [accomplished, setAccomplished] = useState('');
  const [challenged, setChallenged] = useState('');
  const [improve, setImprove] = useState('');
  const [prioritizeNext, setPrioritizeNext] = useState('');

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, achRes] = await Promise.all([
        apiRequest<{ current_review: WeeklyReviewData; past_reviews: WeeklyReviewData[] }>(
          `/reviews/?type=${reviewType}`
        ),
        apiRequest<{ achievements: AchievementItem[] }>('/achievements/'),
      ]);
      const curr = revRes.current_review;
      setReview(curr);
      setPastReviews(revRes.past_reviews || []);
      setAchievements(achRes.achievements || []);

      setAccomplished(curr.prompt_accomplished || '');
      setChallenged(curr.prompt_challenged || '');
      setImprove(curr.prompt_improve || '');
      setPrioritizeNext(curr.prompt_prioritize_next || '');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [reviewType]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleSaveReflections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;
    setSaving(true);
    try {
      const updated = await apiRequest<WeeklyReviewData>(`/reviews/${review.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          prompt_accomplished: accomplished,
          prompt_challenged: challenged,
          prompt_improve: improve,
          prompt_prioritize_next: prioritizeNext,
        }),
      });
      setReview(updated);
      showToast({
        title: `${reviewType === 'monthly' ? 'Monthly' : 'Weekly'} Review Saved`,
        description: 'Your executive reflections have been recorded.',
      });
    } catch (err: any) {
      showToast({ title: 'Could not save review', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !review) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-3xl bg-surface border border-border" />
        <div className="h-96 rounded-3xl bg-surface border border-border" />
      </div>
    );
  }

  const payload = review.metrics_payload;
  const deltaPositive = (payload?.rate_delta || 0) >= 0;

  return (
    <div className="space-y-8">
      {/* Header & Weekly / Monthly Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Executive Synthesis & Achievements
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            {reviewType === 'monthly' ? 'Monthly Growth Review' : 'Weekly Executive Review'}
          </h1>
          <p className="text-sm text-muted mt-1">
            Period: {review.period_start} to {review.period_end} · Generated from real completion history.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-2xl bg-surface border border-border shadow-apple self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/reviews/weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              reviewType === 'weekly'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Weekly Review
          </button>
          <button
            type="button"
            onClick={() => navigate('/reviews/monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              reviewType === 'monthly'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Monthly Review
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {review.completion_percentage}%
          </p>
          <p className="text-[11px] text-muted mt-1">
            {review.total_completed} of {review.total_scheduled} scheduled habits
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {reviewType === 'monthly' ? 'Month-over-Month' : 'Week-over-Week'} Delta
            </span>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p
            className={`text-3xl font-semibold mt-2 tabular-nums ${
              deltaPositive ? 'text-success' : 'text-warning'
            }`}
          >
            {deltaPositive ? `+${payload?.rate_delta || 0}%` : `${payload?.rate_delta || 0}%`}
          </p>
          <p className="text-[11px] text-muted mt-1">
            Previous period: {payload?.previous_period_rate || 0}% (
            {payload?.previous_period_completed || 0} completed)
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Best Performing Habit</span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <p className="text-lg font-semibold text-foreground mt-2 truncate">
            {review.best_habit_name || 'N/A'}
          </p>
          <p className="text-[11px] text-muted mt-1">
            Strongest Day: <strong>{review.best_day_name || 'Monday'}</strong>
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Streak & Reflections</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2 tabular-nums">
            {review.streak_snapshot}d{' '}
            <span className="text-sm font-normal text-muted">streak</span>
          </p>
          <p className="text-[11px] text-muted mt-1">
            {payload?.journals_written || 0} journals · {payload?.intentions_completed || 0}{' '}
            intentions fulfilled
          </p>
        </div>
      </div>

      {/* Period Performance Chart & Habit Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-3xl bg-surface border border-border shadow-apple">
          <h2 className="text-base font-semibold text-foreground mb-1">
            {reviewType === 'monthly' ? 'Monthly Consistency Trend' : 'Weekly Daily Breakdown'}
          </h2>
          <p className="text-xs text-muted mb-5">
            Daily completion percentage across {review.period_start} – {review.period_end}
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={payload?.daily_series || []}
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
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Habit & Goal Summary
            </h2>
            <p className="text-xs text-muted mb-4">
              Lowest habit: <strong>{review.lowest_habit_name || 'None'}</strong>
            </p>

            <div className="space-y-3">
              {(payload?.habit_breakdown || []).slice(0, 5).map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate">{h.name}</span>
                    <span className="text-muted tabular-nums">{h.completion_rate}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-secondary overflow-hidden">
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

          {payload?.goals_summary?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Active Goal Progress
              </p>
              <div className="space-y-2">
                {payload.goals_summary.slice(0, 3).map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate pr-2">{g.title}</span>
                    <span className="font-semibold text-accent">
                      {Math.round(g.progress_percentage)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Reflection Prompts (Section 14) */}
      <form
        onSubmit={handleSaveReflections}
        className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-apple space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Guided {reviewType === 'monthly' ? 'Monthly' : 'Weekly'} Reflection
            </h2>
            <p className="text-xs text-muted">
              Examine your progress honestly and set clear priorities for the next cycle.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Review Reflections'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              1. What did I accomplish?
            </label>
            <textarea
              rows={3}
              value={accomplished}
              onChange={(e) => setAccomplished(e.target.value)}
              placeholder="Key habit streaks, milestones completed, and wins..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              2. What challenged me?
            </label>
            <textarea
              rows={3}
              value={challenged}
              onChange={(e) => setChallenged(e.target.value)}
              placeholder="Friction points, energy dips, or scheduling conflicts..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              3. What should I improve?
            </label>
            <textarea
              rows={3}
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              placeholder="Environment design, evening wind-down, or habit stacking..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
            <label className="block text-xs font-semibold text-accent mb-1.5">
              4. What should I prioritize next {reviewType === 'monthly' ? 'month' : 'week'}?
            </label>
            <textarea
              rows={3}
              value={prioritizeNext}
              onChange={(e) => setPrioritizeNext(e.target.value)}
              placeholder="Core focus habits and primary milestone for the upcoming period..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
            />
          </div>
        </div>
      </form>

      {/* GAMIFICATION & ACHIEVEMENTS GALLERY (Section 15) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-apple">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-foreground">
                Personal Discipline Achievements
              </h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Earned through sustained consistency, reflection, and milestone mastery.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-soft text-accent">
            {achievements.filter((a) => a.is_unlocked).length} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all ${
                ach.is_unlocked
                  ? 'bg-surface-secondary/70 border-border shadow-sm'
                  : 'bg-surface-secondary/20 border-border/50 opacity-55'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${ach.badge_color}18`,
                    color: ach.badge_color,
                  }}
                >
                  <DynamicIcon name={ach.icon} className="w-5 h-5" />
                </div>
                {ach.is_unlocked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-soft text-success">
                    Unlocked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface border border-border text-muted">
                    Locked
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{ach.title}</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">{ach.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
