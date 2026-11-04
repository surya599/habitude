import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Flame,
  Trophy,
  Archive,
  RotateCcw,
  Edit3,
  Trash2,
  Check,
  ArrowUpRight,
  Clock,
  Minus,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Habit, HabitCategory, UnlockedAchievementItem } from '../types';
import { DynamicIcon } from '../components/ui/IconMap';
import { HabitModal } from '../components/ui/HabitModal';
import { useAuth } from '../context/AuthContext';

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const HabitsPage: React.FC = () => {
  const { showToast, celebrateAchievements } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [trackingFilter, setTrackingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (trackingFilter !== 'all') params.set('tracking_type', trackingFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiRequest<Habit[]>(`/habits/?${params.toString()}`);
      setHabits(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, trackingFilter, searchQuery]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    apiRequest<HabitCategory[]>('/categories/')
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleToggleToday = async (habit: Habit) => {
    try {
      const res = await apiRequest<{
        habit: Habit;
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({ toggle: true }),
      });
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? res.habit : h)));
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch (err: any) {
      showToast({ title: 'Could not update habit', description: err.message, variant: 'error' });
    }
  };

  const handleIncrementProgress = async (habit: Habit, delta: number) => {
    try {
      const res = await apiRequest<{
        habit: Habit;
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/habits/${habit.id}/log/`, {
        method: 'POST',
        body: JSON.stringify({ increment_by: delta }),
      });
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? res.habit : h)));
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, variant: 'error' });
    }
  };

  const handleArchiveToggle = async (habit: Habit) => {
    try {
      await apiRequest(`/habits/${habit.id}/archive/`, {
        method: 'POST',
        body: JSON.stringify({ is_archived: !habit.is_archived }),
      });
      showToast({
        title: habit.is_archived ? 'Habit Restored' : 'Habit Archived',
        description: habit.is_archived
          ? `${habit.name} is active again.`
          : `${habit.name} archived. Historical analytics are preserved.`,
      });
      fetchHabits();
    } catch (err: any) {
      showToast({ title: 'Action failed', description: err.message, variant: 'error' });
    }
  };

  const handleDeleteHabit = async (habit: Habit) => {
    if (!window.confirm(`Delete "${habit.name}" permanently? Consider archiving to preserve history.`)) {
      return;
    }
    try {
      await apiRequest(`/habits/${habit.id}/`, { method: 'DELETE' });
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      showToast({ title: 'Habit Deleted', description: `${habit.name} has been removed.` });
    } catch (err: any) {
      showToast({ title: 'Delete failed', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Habit System
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            My Habits
          </h1>
          <p className="text-sm text-muted mt-1">
            Configure daily protocols, track numerical and duration targets, and manage your routines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Habit</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-surface-secondary border border-border self-start">
            {(
              [
                { id: 'active', label: 'Active Habits' },
                { id: 'archived', label: 'Archived' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            >
              <option value="all">All Formats</option>
              <option value="boolean">Boolean</option>
              <option value="numerical">Numerical</option>
              <option value="duration">Duration</option>
              <option value="quantity">Quantity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Habits Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-56 rounded-3xl bg-surface border border-border animate-pulse"
            />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 shadow-apple">
          <p className="text-base font-semibold text-foreground">No matching habits found</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Create a new habit or adjust your filters to view your scheduled routines.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingHabit(null);
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold"
          >
            Create New Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {habits.map((habit) => {
            const pct = Math.min(
              100,
              Math.round((habit.today_progress / Math.max(habit.target_value, 0.1)) * 100)
            );
            const isQuantitative = habit.tracking_type !== 'boolean';
            const step =
              habit.tracking_type === 'quantity'
                ? 0.5
                : habit.target_value >= 20
                ? 5
                : 1;

            return (
              <motion.div
                key={habit.id}
                layout
                className="p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between hover:border-border-strong transition-all"
              >
                <div>
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${habit.color}18`,
                          color: habit.color,
                        }}
                      >
                        <DynamicIcon name={habit.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-secondary text-muted">
                            {habit.category_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                              habit.priority === 'high'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-surface-secondary text-muted'
                            }`}
                          >
                            {habit.priority}
                          </span>
                          {habit.is_archived && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-danger-soft text-danger">
                              Archived
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/habits/${habit.id}`}
                          className="text-base font-semibold text-foreground hover:text-accent transition-colors block truncate mt-1"
                        >
                          {habit.name}
                        </Link>
                      </div>
                    </div>

                    <Link
                      to={`/habits/${habit.id}`}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary shrink-0"
                      title="View Habit Details & History"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {habit.description && (
                    <p className="text-xs text-muted mt-3 line-clamp-2 leading-relaxed">
                      {habit.description}
                    </p>
                  )}

                  {/* Schedule & Streak Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary text-foreground font-medium">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      {habit.current_streak}d streak
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary">
                      <Trophy className="w-3.5 h-3.5 text-accent" />
                      Best: {habit.longest_streak}d
                    </span>
                    {habit.reminder_enabled && habit.reminder_time && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-secondary">
                        <Clock className="w-3 h-3 text-accent" />
                        {habit.reminder_time.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {/* Weekday Schedule Dots */}
                  <div className="flex items-center gap-1 mt-3">
                    {WEEKDAY_SHORT.map((label, idx) => {
                      const active =
                        habit.frequency === 'daily' ||
                        (habit.selected_weekdays || []).includes(idx);
                      return (
                        <span
                          key={label}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            active
                              ? 'bg-accent-soft text-accent'
                              : 'bg-surface-secondary text-subtle'
                          }`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Today's Progress & Action Footer */}
                <div className="mt-5 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Today:{' '}
                      <strong className="text-foreground tabular-nums">
                        {isQuantitative
                          ? `${habit.today_progress} / ${habit.target_value} ${habit.unit}`
                          : habit.today_completed
                          ? 'Completed'
                          : 'Incomplete'}
                      </strong>
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: habit.today_completed ? '#248A3D' : habit.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {!habit.is_archived && isQuantitative && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleIncrementProgress(habit, -step)}
                            disabled={habit.today_progress <= 0}
                            className="w-7 h-7 rounded-lg bg-surface-secondary border border-border flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleIncrementProgress(habit, step)}
                            className="px-2.5 h-7 rounded-lg bg-surface-secondary border border-border text-xs font-medium text-foreground hover:border-accent"
                          >
                            +{step}
                          </button>
                        </>
                      )}

                      {!habit.is_archived && (
                        <button
                          type="button"
                          onClick={() => handleToggleToday(habit)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            habit.today_completed
                              ? 'bg-success-soft text-success'
                              : 'bg-accent text-white hover:bg-accent-hover'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{habit.today_completed ? 'Completed' : 'Mark Complete'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHabit(habit);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary"
                        title="Edit Habit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveToggle(habit)}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary"
                        title={habit.is_archived ? 'Restore Habit' : 'Archive Habit'}
                      >
                        {habit.is_archived ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHabit(habit)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft"
                        title="Delete Habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <HabitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialHabit={editingHabit}
        onSaved={() => {
          fetchHabits();
          showToast({
            title: editingHabit ? 'Habit Updated' : 'Habit Created',
            description: 'Your habit configuration has been saved.',
          });
        }}
      />
    </div>
  );
};
