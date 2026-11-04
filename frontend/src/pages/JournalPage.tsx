import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  BookText,
  Calendar,
  Heart,
  Trash2,
  Edit3,
  Check,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { JournalEntry, UnlockedAchievementItem } from '../types';
import { useAuth } from '../context/AuthContext';

const MOOD_OPTIONS: Array<{ value: JournalEntry['mood']; label: string }> = [
  { value: 'exceptional', label: 'Exceptional' },
  { value: 'good', label: 'Good' },
  { value: 'calm', label: 'Calm & Focused' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'challenging', label: 'Challenging' },
];

export const JournalPage: React.FC = () => {
  const { showToast, celebrateAchievements } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Editor state (Distraction-Free Editor + 5 Daily Reflection Prompts)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('calm');
  const [energyLevel, setEnergyLevel] = useState<number>(4);
  const [promptWentWell, setPromptWentWell] = useState('');
  const [promptCouldImprove, setPromptCouldImprove] = useState('');
  const [promptLearned, setPromptLearned] = useState('');
  const [promptGrateful, setPromptGrateful] = useState('');
  const [promptTomorrowFocus, setPromptTomorrowFocus] = useState('');
  const [tagsInput, setTagsInput] = useState('Stoicism, Reflection');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (moodFilter !== 'all') params.set('mood', moodFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (favoritesOnly) params.set('favorites', 'true');

      const res = await apiRequest<JournalEntry[]>(`/journal/?${params.toString()}`);
      setEntries(res);
      if (res.length > 0 && !selectedEntry && !isEditing) {
        setSelectedEntry(res[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchQuery, moodFilter, dateFilter, favoritesOnly, selectedEntry, isEditing]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const startNewEntry = () => {
    setSelectedEntry(null);
    setIsEditing(true);
    setDate(new Date().toISOString().slice(0, 10));
    setTitle('');
    setContent('');
    setMood('calm');
    setEnergyLevel(4);
    setPromptWentWell('');
    setPromptCouldImprove('');
    setPromptLearned('');
    setPromptGrateful('');
    setPromptTomorrowFocus('');
    setTagsInput('Reflection');
    setIsFavorite(false);
  };

  const startEditEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsEditing(true);
    setDate(entry.date);
    setTitle(entry.title);
    setContent(entry.content || '');
    setMood(entry.mood || 'calm');
    setEnergyLevel(entry.energy_level || 4);
    setPromptWentWell(entry.prompt_went_well || '');
    setPromptCouldImprove(entry.prompt_could_improve || '');
    setPromptLearned(entry.prompt_learned || '');
    setPromptGrateful(entry.prompt_grateful || '');
    setPromptTomorrowFocus(entry.prompt_tomorrow_focus || '');
    setTagsInput((entry.tags || []).join(', '));
    setIsFavorite(Boolean(entry.is_favorite));
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && !promptWentWell.trim()) {
      showToast({ title: 'Please add a title or reflection', variant: 'error' });
      return;
    }
    setSaving(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      date,
      title: title.trim() || `Daily Reflection · ${date}`,
      content: content.trim(),
      mood,
      energy_level: energyLevel,
      prompt_went_well: promptWentWell.trim(),
      prompt_could_improve: promptCouldImprove.trim(),
      prompt_learned: promptLearned.trim(),
      prompt_grateful: promptGrateful.trim(),
      prompt_tomorrow_focus: promptTomorrowFocus.trim(),
      tags,
      is_favorite: isFavorite,
    };

    try {
      if (selectedEntry && isEditing) {
        const updated = await apiRequest<JournalEntry>(`/journal/${selectedEntry.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedEntry(updated);
        setIsEditing(false);
        showToast({ title: 'Journal Entry Updated' });
      } else {
        const created = await apiRequest<
          JournalEntry & { newly_unlocked_achievements?: UnlockedAchievementItem[] }
        >('/journal/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setEntries((prev) => [created, ...prev]);
        setSelectedEntry(created);
        setIsEditing(false);
        showToast({ title: 'Reflection Saved to Journal' });
        if (created.newly_unlocked_achievements?.length) {
          celebrateAchievements(created.newly_unlocked_achievements);
        }
      }
    } catch (err: any) {
      showToast({ title: 'Save failed', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: JournalEntry) => {
    if (!window.confirm(`Delete journal entry "${entry.title}"?`)) return;
    try {
      await apiRequest(`/journal/${entry.id}/`, { method: 'DELETE' });
      const remaining = entries.filter((item) => item.id !== entry.id);
      setEntries(remaining);
      setSelectedEntry(remaining[0] || null);
      setIsEditing(false);
      showToast({ title: 'Entry Deleted' });
    } catch {
      // ignore
    }
  };

  const handleToggleFavorite = async (entry: JournalEntry) => {
    try {
      const updated = await apiRequest<JournalEntry>(`/journal/${entry.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite: !entry.is_favorite }),
      });
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (selectedEntry?.id === updated.id) {
        setSelectedEntry(updated);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Private Self-Examination
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            Journal & Self-Reflection
          </h1>
          <p className="text-sm text-muted mt-1">
            A calm, distraction-free space for daily examination, gratitude, and structured clarity.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewEntry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection Entry</span>
        </button>
      </div>

      {/* Main Split View: Timeline Sidebar + Distraction-Free Reader/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search, Calendar Navigation & Timeline */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journal entries..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            >
              <option value="all">All Moods</option>
              {MOOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3 py-1 rounded-lg font-medium border transition-colors ${
                favoritesOnly
                  ? 'bg-danger-soft text-danger border-danger/30'
                  : 'bg-surface-secondary text-muted border-border'
              }`}
            >
              ♥ Favorites Only
            </button>
            {(dateFilter || moodFilter !== 'all' || searchQuery || favoritesOnly) && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('');
                  setMoodFilter('all');
                  setSearchQuery('');
                  setFavoritesOnly(false);
                }}
                className="text-accent hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1 pt-2 border-t border-border">
            {loading ? (
              <p className="text-xs text-muted py-6 text-center">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted py-8 text-center">
                No journal entries match your filter.
              </p>
            ) : (
              entries.map((entry) => {
                const active = selectedEntry?.id === entry.id && !isEditing;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      active
                        ? 'bg-accent-soft/60 border-accent/40'
                        : 'bg-surface-secondary/50 border-border hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span className="font-mono">{entry.date}</span>
                      <span className="capitalize px-2 py-0.5 rounded-md bg-surface border border-border">
                        {entry.mood}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-1.5 truncate">
                      {entry.title}
                    </h3>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {entry.content || entry.prompt_went_well}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Distraction-Free Editor or Reader */}
        <div className="lg:col-span-8 p-6 sm:p-9 rounded-3xl bg-surface border border-border shadow-apple">
          {isEditing || !selectedEntry ? (
            <form onSubmit={handleSaveEntry} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedEntry ? 'Edit Reflection' : 'New Daily Reflection'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                  />
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value as JournalEntry['mood'])}
                    className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                  >
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        Mood: {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title your reflection..."
                  className="w-full text-xl sm:text-2xl font-semibold bg-transparent border-b border-border pb-3 text-foreground placeholder:text-subtle focus:outline-none focus:border-accent"
                />
              </div>

              {/* 5 Structured Daily Reflection Prompts (Requirement 11) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    1. What went well today?
                  </label>
                  <textarea
                    rows={2}
                    value={promptWentWell}
                    onChange={(e) => setPromptWentWell(e.target.value)}
                    placeholder="Wins, discipline moments, or meaningful progress..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    2. What could I have done better?
                  </label>
                  <textarea
                    rows={2}
                    value={promptCouldImprove}
                    onChange={(e) => setPromptCouldImprove(e.target.value)}
                    placeholder="Honest self-examination without harsh judgment..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    3. What did I learn today?
                  </label>
                  <textarea
                    rows={2}
                    value={promptLearned}
                    onChange={(e) => setPromptLearned(e.target.value)}
                    placeholder="Insights, Stoic principles, or craft takeaways..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    4. What am I grateful for?
                  </label>
                  <textarea
                    rows={2}
                    value={promptGrateful}
                    onChange={(e) => setPromptGrateful(e.target.value)}
                    placeholder="People, health, or quiet moments of appreciation..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                <label className="block text-xs font-semibold text-accent mb-1.5">
                  5. What should I focus on tomorrow?
                </label>
                <input
                  type="text"
                  value={promptTomorrowFocus}
                  onChange={(e) => setPromptTomorrowFocus(e.target.value)}
                  placeholder="Define tomorrow’s primary intention..."
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-subtle focus:outline-none"
                />
              </div>

              {/* Free-form Distraction-Free Narrative */}
              <div>
                <label className="block text-xs font-medium text-muted mb-2">
                  Extended Journal Narrative (Markdown supported)
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write freely without distraction..."
                  className="w-full p-4 rounded-2xl bg-surface-secondary/50 border border-border text-sm text-foreground leading-relaxed placeholder:text-subtle focus:outline-none focus:border-accent resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  {selectedEntry && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Reflection'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span className="font-mono">{selectedEntry.date}</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-foreground">
                      Mood: {selectedEntry.mood}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mt-2">
                    {selectedEntry.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(selectedEntry)}
                    className={`p-2 rounded-xl border transition-colors ${
                      selectedEntry.is_favorite
                        ? 'bg-danger-soft border-danger/30 text-danger'
                        : 'bg-surface-secondary border-border text-muted hover:text-foreground'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${selectedEntry.is_favorite ? 'fill-current' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditEntry(selectedEntry)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-foreground"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(selectedEntry)}
                    className="p-2 rounded-xl bg-danger-soft text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedEntry.content && (
                <div className="prose max-w-none text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {selectedEntry.content}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {selectedEntry.prompt_went_well && (
                  <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                    <p className="text-xs font-semibold text-accent">What went well today?</p>
                    <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                      {selectedEntry.prompt_went_well}
                    </p>
                  </div>
                )}
                {selectedEntry.prompt_could_improve && (
                  <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                    <p className="text-xs font-semibold text-accent">
                      What could I have done better?
                    </p>
                    <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                      {selectedEntry.prompt_could_improve}
                    </p>
                  </div>
                )}
                {selectedEntry.prompt_learned && (
                  <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                    <p className="text-xs font-semibold text-accent">What did I learn today?</p>
                    <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                      {selectedEntry.prompt_learned}
                    </p>
                  </div>
                )}
                {selectedEntry.prompt_grateful && (
                  <div className="p-4 rounded-2xl bg-surface-secondary/60 border border-border">
                    <p className="text-xs font-semibold text-accent">What am I grateful for?</p>
                    <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                      {selectedEntry.prompt_grateful}
                    </p>
                  </div>
                )}
              </div>

              {selectedEntry.prompt_tomorrow_focus && (
                <div className="p-4 rounded-2xl bg-accent-soft/50 border border-accent/25">
                  <p className="text-xs font-semibold text-accent">
                    Tomorrow’s Priority Focus
                  </p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {selectedEntry.prompt_tomorrow_focus}
                  </p>
                </div>
              )}

              {selectedEntry.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                  {selectedEntry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-surface-secondary text-xs text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
