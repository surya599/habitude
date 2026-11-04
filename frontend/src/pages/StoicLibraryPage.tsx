import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Search,
  Heart,
  Share2,
  BookOpen,
  MessageSquare,
  Check,
  History,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { StoicQuote, UnlockedAchievementItem } from '../types';
import { useAuth } from '../context/AuthContext';

const PHILOSOPHERS = ['all', 'Marcus Aurelius', 'Seneca', 'Epictetus'];
const STOIC_CATEGORIES = [
  'all',
  'Discipline',
  'Focus',
  'Courage',
  'Patience',
  'Resilience',
  'Self-control',
  'Wisdom',
  'Acceptance',
  'Perspective',
];

export const StoicLibraryPage: React.FC = () => {
  const { showToast, celebrateAchievements } = useAuth();
  const [dailyQuote, setDailyQuote] = useState<StoicQuote | null>(null);
  const [quotes, setQuotes] = useState<StoicQuote[]>([]);
  const [quoteHistory, setQuoteHistory] = useState<Array<{ date: string; quote: StoicQuote }>>([]);
  const [loading, setLoading] = useState(true);

  const [philosopherFilter, setPhilosopherFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const [activeNoteQuoteId, setActiveNoteQuoteId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (philosopherFilter !== 'all') params.set('philosopher', philosopherFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (favoritesOnly) params.set('favorites', 'true');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiRequest<{
        daily_quote: StoicQuote | null;
        quotes: StoicQuote[];
        quote_history: Array<{ date: string; quote: StoicQuote }>;
      }>(`/stoic/quotes/?${params.toString()}`);

      setDailyQuote(res.daily_quote);
      setQuotes(res.quotes);
      setQuoteHistory(res.quote_history || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [philosopherFilter, categoryFilter, favoritesOnly, searchQuery]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleToggleFavorite = async (quoteId: number) => {
    try {
      const res = await apiRequest<{
        quote_id: number;
        is_favorite: boolean;
        newly_unlocked_achievements: UnlockedAchievementItem[];
      }>(`/stoic/quotes/${quoteId}/favorite/`, {
        method: 'POST',
      });
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, is_favorite: res.is_favorite } : q))
      );
      if (dailyQuote?.id === quoteId) {
        setDailyQuote((prev) => (prev ? { ...prev, is_favorite: res.is_favorite } : null));
      }
      if (res.newly_unlocked_achievements?.length) {
        celebrateAchievements(res.newly_unlocked_achievements);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveNote = async (quoteId: number) => {
    try {
      const res = await apiRequest<{ quote_id: number; personal_note: string }>(
        `/stoic/quotes/${quoteId}/note/`,
        {
          method: 'POST',
          body: JSON.stringify({ note_text: noteInput }),
        }
      );
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId ? { ...q, personal_note: res.personal_note } : q
        )
      );
      setActiveNoteQuoteId(null);
      showToast({
        title: 'Marginalia Note Saved',
        description: 'Your personal reflection has been attached to this passage.',
      });
    } catch {
      // ignore
    }
  };

  const handleShareQuote = async (quote: StoicQuote) => {
    const shareText = `“${quote.text}” — ${quote.philosopher} (${quote.source_reference}) · via HABITUDE`;
    try {
      await navigator.clipboard.writeText(shareText);
      showToast({
        title: 'Passage Copied to Clipboard',
        description: `${quote.philosopher} — ${quote.source_reference}`,
      });
    } catch {
      showToast({ title: 'Ready to share', description: shareText });
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Editorial Philosophy Collection
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            Stoic Philosophy Library
          </h1>
          <p className="text-sm text-muted mt-1">
            Verified primary-source passages from Marcus Aurelius, Seneca, and Epictetus for daily discipline and perspective.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors self-start sm:self-auto"
        >
          <History className="w-4 h-4 text-accent" />
          <span>{showHistory ? 'Hide Quote History' : '7-Day Quote History'}</span>
        </button>
      </div>

      {/* Daily Stoic Featured Passage */}
      {dailyQuote && (
        <div className="p-7 sm:p-10 rounded-3xl bg-surface border border-border shadow-apple-lg relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-4">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-accent">
              <Landmark className="w-4 h-4" />
              Daily Featured Stoic Meditation · {dailyQuote.category}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                dailyQuote.is_direct_quote
                  ? 'bg-success-soft text-success'
                  : 'bg-warning-soft text-warning'
              }`}
            >
              {dailyQuote.is_direct_quote
                ? 'Verified Direct Quotation'
                : 'Classical Synthesis / Paraphrase'}
            </span>
          </div>

          <blockquote className="font-editorial text-xl sm:text-3xl text-foreground leading-relaxed italic max-w-4xl">
            “{dailyQuote.text}”
          </blockquote>

          {dailyQuote.editorial_commentary && (
            <p className="mt-4 text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
              <strong className="text-foreground font-medium">Practical Application:</strong>{' '}
              {dailyQuote.editorial_commentary}
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{dailyQuote.philosopher}</p>
              <p className="text-xs text-muted">
                {dailyQuote.source_reference} · {dailyQuote.philosopher_title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleFavorite(dailyQuote.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  dailyQuote.is_favorite
                    ? 'bg-danger-soft text-danger border-danger/30'
                    : 'bg-surface-secondary text-foreground border-border'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${dailyQuote.is_favorite ? 'fill-current' : ''}`} />
                <span>{dailyQuote.is_favorite ? 'Saved' : 'Save Passage'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareQuote(dailyQuote)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-foreground hover:bg-border/60"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Quote History Drawer */}
      {showHistory && quoteHistory.length > 0 && (
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Daily Stoic Passages (Last 7 Days)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quoteHistory.map((item) => (
              <div
                key={item.date}
                className="p-3.5 rounded-2xl bg-surface-secondary/60 border border-border text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-muted">
                  <span className="font-mono">{item.date}</span>
                  <span className="font-semibold text-accent">{item.quote.philosopher}</span>
                </div>
                <p className="font-editorial italic text-foreground line-clamp-2 text-sm">
                  “{item.quote.text}”
                </p>
                <p className="text-[11px] text-muted">{item.quote.source_reference}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters: Philosopher, Topic Category, Search & Favorites */}
      <div className="p-5 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PHILOSOPHERS.map((phil) => (
              <button
                key={phil}
                type="button"
                onClick={() => setPhilosopherFilter(phil)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  philosopherFilter === phil
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface-secondary text-muted hover:text-foreground'
                }`}
              >
                {phil === 'all' ? 'All Philosophers' : phil}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passages or sources..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                favoritesOnly
                  ? 'bg-danger-soft text-danger border-danger/30'
                  : 'bg-surface-secondary text-muted border-border hover:text-foreground'
              }`}
            >
              ♥ Favorites
            </button>
          </div>
        </div>

        {/* Topic Categories */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
          {STOIC_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-foreground text-background'
                  : 'text-muted hover:text-foreground hover:bg-surface-secondary'
              }`}
            >
              {cat === 'all' ? 'All Topics' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Editorial Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-2">
          <BookOpen className="w-8 h-8 text-muted mx-auto" />
          <p className="text-sm font-semibold text-foreground">No matching passages found</p>
          <p className="text-xs text-muted">Try clearing your philosopher or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs mb-3">
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-accent-soft text-accent">
                    {quote.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                      quote.is_direct_quote
                        ? 'bg-success-soft text-success'
                        : 'bg-warning-soft text-warning'
                    }`}
                  >
                    {quote.is_direct_quote ? 'Direct Quotation' : 'Paraphrase / Synthesis'}
                  </span>
                </div>

                <blockquote className="font-editorial text-lg sm:text-xl text-foreground leading-relaxed italic">
                  “{quote.text}”
                </blockquote>

                {quote.editorial_commentary && (
                  <p className="text-xs text-muted mt-3 leading-relaxed">
                    {quote.editorial_commentary}
                  </p>
                )}

                {/* Personal Note Display or Editor */}
                {activeNoteQuoteId === quote.id ? (
                  <div className="mt-4 p-3.5 rounded-2xl bg-surface-secondary border border-border space-y-2">
                    <textarea
                      rows={2}
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Write your personal note on how to apply this passage..."
                      className="w-full bg-transparent text-xs text-foreground focus:outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveNoteQuoteId(null)}
                        className="px-2.5 py-1 rounded-lg text-xs text-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(quote.id)}
                        className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Save Note
                      </button>
                    </div>
                  </div>
                ) : (
                  quote.personal_note && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-accent-soft/40 border border-accent/20 text-xs">
                      <p className="font-semibold text-accent mb-0.5">Your Marginalia Note:</p>
                      <p className="text-foreground leading-relaxed">{quote.personal_note}</p>
                    </div>
                  )
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">{quote.philosopher}</p>
                  <p className="text-[11px] text-muted">{quote.source_reference}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNoteQuoteId(quote.id);
                      setNoteInput(quote.personal_note || '');
                    }}
                    className="p-2 rounded-xl bg-surface-secondary hover:bg-border/60 text-muted hover:text-foreground transition-colors"
                    title="Add or edit personal note"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareQuote(quote)}
                    className="p-2 rounded-xl bg-surface-secondary hover:bg-border/60 text-muted hover:text-foreground transition-colors"
                    title="Copy citation to clipboard"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(quote.id)}
                    className={`p-2 rounded-xl transition-colors ${
                      quote.is_favorite
                        ? 'bg-danger-soft text-danger'
                        : 'bg-surface-secondary text-muted hover:text-foreground'
                    }`}
                    title="Favorite passage"
                  >
                    <Heart className={`w-3.5 h-3.5 ${quote.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
