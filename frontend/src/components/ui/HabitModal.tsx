import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import {
  Habit,
  HabitCategory,
  HabitDifficulty,
  HabitFrequency,
  HabitPriority,
  TrackingType,
} from '../../types';
import { AVAILABLE_COLORS, AVAILABLE_HABIT_ICONS, DynamicIcon } from './IconMap';
import { apiRequest } from '../../lib/api';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (habit: Habit) => void;
  initialHabit?: Habit | null;
}

const WEEKDAYS = [
  { index: 0, short: 'M', full: 'Mon' },
  { index: 1, short: 'T', full: 'Tue' },
  { index: 2, short: 'W', full: 'Wed' },
  { index: 3, short: 'T', full: 'Thu' },
  { index: 4, short: 'F', full: 'Fri' },
  { index: 5, short: 'S', full: 'Sat' },
  { index: 6, short: 'S', full: 'Sun' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialHabit,
}) => {
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('Health');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [icon, setIcon] = useState('Sparkles');
  const [color, setColor] = useState('#0066CC');
  const [priority, setPriority] = useState<HabitPriority>('medium');
  const [difficulty, setDifficulty] = useState<HabitDifficulty>('medium');
  const [trackingType, setTrackingType] = useState<TrackingType>('boolean');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(2);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiRequest<HabitCategory[]>('/categories/')
        .then(setCategories)
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name);
      setDescription(initialHabit.description || '');
      setCategoryName(initialHabit.category_name || 'Health');
      setIcon(initialHabit.icon || 'Sparkles');
      setColor(initialHabit.color || '#0066CC');
      setPriority(initialHabit.priority || 'medium');
      setDifficulty(initialHabit.difficulty || 'medium');
      setTrackingType(initialHabit.tracking_type || 'boolean');
      setTargetValue(initialHabit.target_value || 1);
      setUnit(initialHabit.unit || '');
      setFrequency(initialHabit.frequency || 'daily');
      setSelectedWeekdays(
        initialHabit.selected_weekdays?.length
          ? initialHabit.selected_weekdays
          : [0, 1, 2, 3, 4, 5, 6]
      );
      setCustomIntervalDays(initialHabit.custom_interval_days || 2);
      setStartDate(initialHabit.start_date || new Date().toISOString().slice(0, 10));
      setEndDate(initialHabit.end_date || '');
      setReminderEnabled(Boolean(initialHabit.reminder_enabled));
      setReminderTime(
        initialHabit.reminder_time ? initialHabit.reminder_time.slice(0, 5) : '08:00'
      );
    } else {
      setName('');
      setDescription('');
      setCategoryName('Health');
      setIcon('Sparkles');
      setColor('#0066CC');
      setPriority('medium');
      setDifficulty('medium');
      setTrackingType('boolean');
      setTargetValue(1);
      setUnit('');
      setFrequency('daily');
      setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6]);
      setCustomIntervalDays(2);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setReminderEnabled(false);
      setReminderTime('08:00');
    }
    setError('');
  }, [initialHabit, isOpen]);

  const handleTrackingTypeChange = (type: TrackingType) => {
    setTrackingType(type);
    if (type === 'boolean') {
      setTargetValue(1);
      setUnit('completion');
    } else if (type === 'numerical') {
      setTargetValue(10);
      setUnit('pages');
    } else if (type === 'duration') {
      setTargetValue(20);
      setUnit('minutes');
    } else if (type === 'quantity') {
      setTargetValue(3);
      setUnit('litres');
    }
  };

  const toggleWeekday = (idx: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  };

  const handleAddCustomCategory = async () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    try {
      const created = await apiRequest<HabitCategory>('/categories/', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, icon, color }),
      });
      setCategories((prev) => [...prev, created]);
      setCategoryName(created.name);
      setCustomCategoryInput('');
      setShowCustomCategory(false);
    } catch {
      setCategoryName(trimmed);
      setShowCustomCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a habit name.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category_name: categoryName,
      icon,
      color,
      priority,
      difficulty,
      tracking_type: trackingType,
      target_value: trackingType === 'boolean' ? 1 : Math.max(0.1, Number(targetValue)),
      unit: trackingType === 'boolean' ? 'session' : unit.trim(),
      frequency,
      selected_weekdays:
        frequency === 'daily'
          ? [0, 1, 2, 3, 4, 5, 6]
          : selectedWeekdays.length > 0
          ? selectedWeekdays
          : [0, 1, 2, 3, 4],
      weekly_target_days:
        frequency === 'daily' ? 7 : Math.max(1, selectedWeekdays.length),
      custom_interval_days: frequency === 'custom' ? Math.max(1, customIntervalDays) : 1,
      start_date: startDate,
      end_date: endDate ? endDate : null,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? `${reminderTime}:00` : null,
    };

    try {
      const saved = await apiRequest<Habit>(
        initialHabit ? `/habits/${initialHabit.id}/` : '/habits/',
        {
          method: initialHabit ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save habit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-3xl shadow-apple-lg max-w-2xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {initialHabit ? 'Edit Habit' : 'Create New Habit'}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Configure tracking format, cadence, and targets.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 mt-5">
              {error && (
                <div className="p-3 rounded-xl bg-danger-soft text-danger text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Name & Description */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Habit Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning Mindfulness Meditation, Read 20 Pages"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Description & Why It Matters
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Define the cue, protocol, or personal standard..."
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>

              {/* Category, Priority & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(!showCustomCategory)}
                      className="text-[11px] font-medium text-accent hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Custom
                    </button>
                  </div>
                  {showCustomCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Category name"
                        className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      {(categories.length > 0
                        ? categories.map((c) => c.name)
                        : [
                            'Health',
                            'Fitness',
                            'Learning',
                            'Career',
                            'Mindfulness',
                            'Productivity',
                            'Personal development',
                            'Finance',
                            'Other',
                          ]
                      ).map((catName) => (
                        <option key={catName} value={catName}>
                          {catName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as HabitPriority)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as HabitDifficulty)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Tracking Type & Target Value */}
              <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-border space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">
                    Tracking Format
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'boolean', label: 'Boolean', desc: 'Done / Not Done' },
                        { id: 'numerical', label: 'Numerical', desc: 'e.g. 20 Pages' },
                        { id: 'duration', label: 'Duration', desc: 'e.g. 20 Mins' },
                        { id: 'quantity', label: 'Quantity', desc: 'e.g. 3 Litres' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTrackingTypeChange(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          trackingType === item.id
                            ? 'bg-surface border-accent shadow-sm'
                            : 'bg-transparent border-border hover:bg-surface/50'
                        }`}
                      >
                        <div className="text-xs font-semibold text-foreground">{item.label}</div>
                        <div className="text-[11px] text-muted mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {trackingType !== 'boolean' && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Daily Target Value
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={targetValue}
                        onChange={(e) => setTargetValue(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Unit Label
                      </label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="pages, minutes, litres..."
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scheduling & Weekdays */}
              <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Schedule Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
                    >
                      <option value="daily">Every Day</option>
                      <option value="weekdays">Specific Weekdays</option>
                      <option value="weekly_target">Weekly Target Days</option>
                      <option value="custom">Custom Interval (Every N Days)</option>
                    </select>
                  </div>

                  {frequency === 'custom' ? (
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Repeat Every (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={customIntervalDays}
                        onChange={(e) => setCustomIntervalDays(parseInt(e.target.value, 10) || 2)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Scheduled Days
                      </label>
                      <div className="flex items-center gap-1.5">
                        {WEEKDAYS.map((wd) => {
                          const active =
                            frequency === 'daily' || selectedWeekdays.includes(wd.index);
                          return (
                            <button
                              key={wd.index}
                              type="button"
                              disabled={frequency === 'daily'}
                              onClick={() => toggleWeekday(wd.index)}
                              title={wd.full}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                active
                                  ? 'bg-accent text-white shadow-sm'
                                  : 'bg-surface text-muted border border-border'
                              }`}
                            >
                              {wd.short}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Optional End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-muted mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={(e) => setReminderEnabled(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      Daily Reminder
                    </label>
                    <input
                      type="time"
                      disabled={!reminderEnabled}
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Icon & Accent Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_HABIT_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setIcon(iconName)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                          icon === iconName
                            ? 'bg-accent text-white border-accent'
                            : 'bg-surface-secondary text-muted border-border hover:text-foreground'
                        }`}
                      >
                        <DynamicIcon name={iconName} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-2">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          color === hex ? 'scale-110 ring-2 ring-offset-2 ring-accent' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Color ${hex}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving...' : initialHabit ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
