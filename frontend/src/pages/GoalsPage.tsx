import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Target,
  CheckCircle2,
  Calendar,
  Trash2,
  Check,
  X,
  Flame,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Goal, Habit } from '../types';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_COLORS } from '../components/ui/IconMap';

const GOAL_TYPES = [
  { id: 'all', label: 'All Goals' },
  { id: 'short_term', label: 'Short-Term' },
  { id: 'long_term', label: 'Long-Term' },
  { id: 'personal', label: 'Personal' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'learning', label: 'Learning' },
  { id: 'career', label: 'Career' },
];

export const GoalsPage: React.FC = () => {
  const { showToast } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Create Goal Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<Goal['goal_type']>('personal');
  const [category, setCategory] = useState('Personal development');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  });
  const [color, setColor] = useState('#0066CC');
  const [selectedHabitIds, setSelectedHabitIds] = useState<number[]>([]);
  const [milestoneInputs, setMilestoneInputs] = useState<Array<{ title: string; target_date: string }>>([
    { title: '', target_date: '' },
    { title: '', target_date: '' },
  ]);

  // Inline new milestone input per goal card
  const [inlineMilestoneText, setInlineMilestoneText] = useState<Record<number, string>>({});

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('goal_type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await apiRequest<Goal[]>(`/goals/?${params.toString()}`);
      setGoals(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    apiRequest<Habit[]>('/habits/?status=active')
      .then(setHabits)
      .catch(() => {});
  }, []);

  const handleToggleMilestone = async (milestoneId: number, currentCompleted: boolean) => {
    try {
      const res = await apiRequest<{ goal: Goal }>(`/milestones/${milestoneId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: !currentCompleted }),
      });
      setGoals((prev) => prev.map((g) => (g.id === res.goal.id ? res.goal : g)));
      if (!currentCompleted) {
        showToast({
          title: 'Milestone Completed',
          description: `Goal progress updated to ${Math.round(res.goal.progress_percentage)}%.`,
        });
      }
    } catch (err: any) {
      showToast({ title: 'Update failed', description: err.message, variant: 'error' });
    }
  };

  const handleAddInlineMilestone = async (goalId: number) => {
    const text = (inlineMilestoneText[goalId] || '').trim();
    if (!text) return;
    try {
      const res = await apiRequest<{ goal: Goal }>(`/goals/${goalId}/milestones/`, {
        method: 'POST',
        body: JSON.stringify({ title: text }),
      });
      setGoals((prev) => prev.map((g) => (g.id === res.goal.id ? res.goal : g)));
      setInlineMilestoneText((prev) => ({ ...prev, [goalId]: '' }));
      showToast({ title: 'Milestone Added' });
    } catch (err: any) {
      showToast({ title: 'Failed to add milestone', description: err.message, variant: 'error' });
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    try {
      const res = await apiRequest<{ goal: Goal }>(`/milestones/${milestoneId}/`, {
        method: 'DELETE',
      });
      setGoals((prev) => prev.map((g) => (g.id === res.goal.id ? res.goal : g)));
    } catch {
      // ignore
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!window.confirm(`Delete goal "${goal.title}"?`)) return;
    try {
      await apiRequest(`/goals/${goal.id}/`, { method: 'DELETE' });
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      showToast({ title: 'Goal Deleted' });
    } catch {
      // ignore
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const validMilestones = milestoneInputs
        .filter((m) => m.title.trim())
        .map((m) => ({
          title: m.title.trim(),
          target_date: m.target_date || null,
        }));

      const created = await apiRequest<Goal>('/goals/', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          goal_type: goalType,
          category,
          start_date: startDate,
          target_date: targetDate,
          color,
          associated_habit_ids: selectedHabitIds,
          initial_milestones: validMilestones,
        }),
      });
      setGoals((prev) => [created, ...prev]);
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setSelectedHabitIds([]);
      setMilestoneInputs([
        { title: '', target_date: '' },
        { title: '', target_date: '' },
      ]);
      showToast({
        title: 'Goal Created',
        description: 'Break it down and execute one day at a time.',
      });
    } catch (err: any) {
      showToast({ title: 'Could not create goal', description: err.message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Direction & Milestones
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            Goals & Personal Growth
          </h1>
          <p className="text-sm text-muted mt-1">
            Connect long-term ambitions to structured milestones and the daily habits that drive them.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface border border-border shadow-apple">
        <div className="flex flex-wrap gap-1.5">
          {GOAL_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                typeFilter === t.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="inline-flex p-1 rounded-xl bg-surface-secondary border border-border">
          {(['all', 'active', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                statusFilter === st
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 shadow-apple">
          <Target className="w-10 h-10 text-accent mx-auto" />
          <p className="text-base font-semibold text-foreground">No goals found</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Set a clear short-term or long-term goal and break it into actionable milestones.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
          >
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const completedMilestones = goal.milestones.filter((m) => m.is_completed).length;
            const totalMilestones = goal.milestones.length;

            return (
              <motion.div
                key={goal.id}
                layout
                className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${goal.color}18`,
                            color: goal.color,
                          }}
                        >
                          {goal.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-secondary text-muted capitalize">
                          {goal.goal_type.replace('_', ' ')}
                        </span>
                        {goal.is_completed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-soft text-success">
                            Completed
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-semibold text-foreground mt-2">
                        {goal.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-muted mt-2 leading-relaxed">{goal.description}</p>
                  )}

                  {/* Progress Visualization */}
                  <div className="mt-5 p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium text-muted">
                        Progress ({completedMilestones} of {totalMilestones} milestones)
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {Math.round(goal.progress_percentage)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress_percentage}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: goal.color || '#0066CC' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted mt-2">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Start: {goal.start_date}
                      </span>
                      <span>Target Deadline: {goal.target_date}</span>
                    </div>
                  </div>

                  {/* Milestones Checklist */}
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Milestones
                    </p>
                    {goal.milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                          m.is_completed
                            ? 'bg-surface-secondary/30 border-border/60'
                            : 'bg-surface-secondary/70 border-border'
                        }`}
                      >
                        <div
                          onClick={() => handleToggleMilestone(m.id, m.is_completed)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                              m.is_completed
                                ? 'bg-success text-white'
                                : 'border-2 border-border-strong'
                            }`}
                          >
                            {m.is_completed && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span
                            className={`text-xs font-medium truncate ${
                              m.is_completed ? 'line-through text-muted' : 'text-foreground'
                            }`}
                          >
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.target_date && (
                            <span className="text-[11px] text-muted font-mono">
                              {m.target_date}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="text-muted hover:text-danger p-1"
                            title="Remove milestone"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Milestone Inline */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={inlineMilestoneText[goal.id] || ''}
                        onChange={(e) =>
                          setInlineMilestoneText((prev) => ({
                            ...prev,
                            [goal.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInlineMilestone(goal.id);
                          }
                        }}
                        placeholder="Add a milestone step..."
                        className="flex-1 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInlineMilestone(goal.id)}
                        className="px-3 py-2 rounded-xl bg-surface-secondary hover:bg-border/60 border border-border text-xs font-semibold text-foreground"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Associated Habits Footer */}
                {goal.associated_habits_details?.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-[11px] font-medium text-muted mb-2">
                      Supporting Daily Habits:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {goal.associated_habits_details.map((h) => (
                        <Link
                          key={h.id}
                          to={`/habits/${h.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs font-medium text-foreground hover:border-accent transition-colors"
                        >
                          <span>{h.name}</span>
                          <span className="inline-flex items-center gap-0.5 text-amber-500 text-[11px]">
                            <Flame className="w-3 h-3" />
                            {h.current_streak}d
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-3xl shadow-apple-lg max-w-xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">Create New Goal</h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Read 24 Philosophy & Systems Books"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why is this goal meaningful?"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-foreground resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Goal Type</label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as Goal['goal_type'])}
                      className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
                    >
                      <option value="short_term">Short-Term Goal</option>
                      <option value="long_term">Long-Term Goal</option>
                      <option value="personal">Personal Growth</option>
                      <option value="fitness">Fitness Goal</option>
                      <option value="learning">Learning Goal</option>
                      <option value="career">Career Goal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Target Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                    />
                  </div>
                </div>

                {/* Associated Habits */}
                {habits.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Link Associated Habits
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {habits.map((h) => {
                        const selected = selectedHabitIds.includes(h.id);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() =>
                              setSelectedHabitIds((prev) =>
                                prev.includes(h.id)
                                  ? prev.filter((id) => id !== h.id)
                                  : [...prev, h.id]
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              selected
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface-secondary text-muted border-border'
                            }`}
                          >
                            {h.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Initial Milestones */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted">Initial Milestones</label>
                    <button
                      type="button"
                      onClick={() =>
                        setMilestoneInputs((prev) => [...prev, { title: '', target_date: '' }])
                      }
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      + Add Step
                    </button>
                  </div>
                  <div className="space-y-2">
                    {milestoneInputs.map((m, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => {
                            const next = [...milestoneInputs];
                            next[idx].title = e.target.value;
                            setMilestoneInputs(next);
                          }}
                          placeholder={`Milestone ${idx + 1}...`}
                          className="flex-1 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                        />
                        <input
                          type="date"
                          value={m.target_date}
                          onChange={(e) => {
                            const next = [...milestoneInputs];
                            next[idx].target_date = e.target.value;
                            setMilestoneInputs(next);
                          }}
                          className="w-36 px-2.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {AVAILABLE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`w-7 h-7 rounded-full ${
                          color === hex ? 'ring-2 ring-offset-2 ring-accent' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
