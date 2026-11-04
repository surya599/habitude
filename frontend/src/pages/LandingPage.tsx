import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Landmark,
  BookText,
  Target,
  Flame,
  Sparkles,
  ShieldCheck,
  CalendarRange,
  Compass,
  Play,
} from 'lucide-react';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { UserProfile } from '../types';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  // Interactive preview state on landing hero
  const [previewCompleted, setPreviewCompleted] = useState<number[]>([1, 2, 3]);

  const previewHabits = [
    { id: 1, name: 'Morning Mindfulness Meditation', meta: '20 / 20 mins · Mindfulness', streak: 14 },
    { id: 2, name: 'Deep Philosophical Reading', meta: '25 / 25 pages · Learning', streak: 21 },
    { id: 3, name: 'Strength & Zone 2 Conditioning', meta: '45 / 45 mins · Fitness', streak: 9 },
    { id: 4, name: '90-Minute Uninterrupted Deep Work', meta: '1 session · Productivity', streak: 12 },
  ];

  const togglePreviewHabit = (id: number) => {
    setPreviewCompleted((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const previewPct = Math.round((previewCompleted.length / previewHabits.length) * 100);

  const handleInstantDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/demo-login/', {
        method: 'POST',
      });
      loginWithToken(res.token, res.user);
      navigate('/dashboard');
    } catch {
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Sticky Minimal Navigation */}
      <header className="sticky top-0 z-40 h-16 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-sm">
              H
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-sm text-foreground leading-none">
                HABITUDE
              </span>
              <span className="text-[10px] text-muted tracking-wider uppercase mt-0.5 hidden sm:inline">
                Build a better you, one day at a time.
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted">
            <a href="#features" className="hover:text-foreground transition-colors">
              Habits
            </a>
            <a href="#analytics" className="hover:text-foreground transition-colors">
              Analytics
            </a>
            <a href="#stoic" className="hover:text-foreground transition-colors">
              Stoic Library
            </a>
            <a href="#journaling" className="hover:text-foreground transition-colors">
              Journal & Goals
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeSwitcher compact />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 sm:pt-24 sm:pb-20 px-4 sm:px-8 max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface border border-border shadow-apple text-muted mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>HABITUDE · Build a better you, one day at a time.</span>
          </span>

          <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-semibold tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
            Small actions. Remarkable transformation.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-muted max-w-2xl mx-auto font-normal leading-relaxed">
            Build better habits, understand your progress, and create a life of consistency.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-medium shadow-sm transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface hover:bg-surface-secondary text-foreground border border-border text-sm font-medium shadow-apple transition-all"
            >
              <span>Sign In</span>
            </Link>

            <button
              type="button"
              onClick={handleInstantDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-surface-secondary hover:bg-border/60 text-foreground text-sm font-medium transition-all"
            >
              <Play className="w-3.5 h-3.5 text-accent fill-accent" />
              <span>{demoLoading ? 'Loading Demo...' : 'Interactive Demo Account'}</span>
            </button>
          </div>
        </motion.div>

        {/* 2. ANIMATED INTERACTIVE PRODUCT PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-14 sm:mt-16 rounded-3xl bg-surface border border-border shadow-apple-lg p-6 sm:p-8 text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-border-strong" />
                <span className="w-3 h-3 rounded-full bg-border-strong" />
                <span className="w-3 h-3 rounded-full bg-border-strong" />
              </div>
              <span className="text-xs font-medium text-muted ml-2">
                Interactive Live Preview — Click any habit below to test the progress ring
              </span>
            </div>
            <span className="text-xs font-medium text-accent">
              {previewCompleted.length} of {previewHabits.length} Completed Today
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-secondary/60 border border-border/70">
              <ProgressRing
                percentage={previewPct}
                size={180}
                strokeWidth={14}
                label="Daily Ring"
                sublabel="14-day active streak"
              />
              <div className="grid grid-cols-2 gap-3 w-full mt-6">
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted">Consistency</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">91.4%</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted">Best Streak</p>
                  <p className="text-lg font-semibold text-foreground mt-0.5">28 Days</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-3">
              <div className="p-4 rounded-2xl bg-surface-secondary/50 border border-border mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Today’s Intention
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  “Execute 90 minutes of deep architectural focus with calm, undivided presence.”
                </p>
              </div>

              {previewHabits.map((h) => {
                const done = previewCompleted.includes(h.id);
                return (
                  <div
                    key={h.id}
                    onClick={() => togglePreviewHabit(h.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      done
                        ? 'bg-surface border-accent/40 shadow-sm'
                        : 'bg-surface-secondary/40 border-border hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          done
                            ? 'bg-success text-white'
                            : 'border-2 border-border-strong text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            done ? 'text-foreground' : 'text-foreground/90'
                          }`}
                        >
                          {h.name}
                        </p>
                        <p className="text-xs text-muted">{h.meta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{h.streak}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. HABIT TRACKING FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-8 border-t border-border/70">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Precision Habit Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-2">
              Designed for how real discipline works.
            </h2>
            <p className="text-muted mt-3 text-base leading-relaxed">
              Move beyond rigid binary checkboxes. Track pages read, minutes meditated, litres of hydration, and custom weekday cadences with effortless clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: CheckCircle2,
                title: 'Four Tracking Formats',
                desc: 'Boolean completions, numerical targets (pages, reps), duration timers (minutes), and quantity logs (litres) with full partial-progress support.',
              },
              {
                icon: CalendarRange,
                title: 'Intelligent Scheduling',
                desc: 'Configure daily habits, specific weekday routines, weekly frequency targets, or custom recurring intervals that protect your streak on rest days.',
              },
              {
                icon: ShieldCheck,
                title: 'Zero-Guilt Continuity',
                desc: 'Archive seasonal habits without losing historical analytics, set gentle timezone-aware reminders, and focus on long-term trajectory over perfection.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-7 rounded-3xl bg-surface border border-border shadow-apple"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feat.title}</h3>
                  <p className="text-sm text-muted mt-2.5 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ADVANCED ANALYTICS SHOWCASE */}
      <section id="analytics" className="py-20 px-4 sm:px-8 bg-surface-secondary/50 border-t border-border/70">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Behavioral Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-2">
              Understand your rhythm with transparent metrics.
            </h2>
            <p className="text-sm sm:text-base text-muted mt-4 leading-relaxed">
              HABITUDE separates raw completion rate from multi-day consistency score, maps your 365-day consistency heatmap, and surfaces data-backed insights from your actual completion records.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-accent" />
                <span>365-day GitHub-style habit consistency heatmap</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-accent" />
                <span>Weekday vs. weekend performance diagnostics</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Automated Weekly & Monthly executive reviews</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-apple">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium text-muted">Consistency Intelligence</p>
                <h3 className="text-lg font-semibold text-foreground">
                  30-Day Performance Breakdown
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success-soft text-success">
                +6.4% vs last month
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-surface-secondary">
                <p className="text-xs text-muted">Consistency Score</p>
                <p className="text-2xl font-semibold text-foreground mt-1">89.2%</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-secondary">
                <p className="text-xs text-muted">Completion Rate</p>
                <p className="text-2xl font-semibold text-foreground mt-1">86.5%</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-secondary">
                <p className="text-xs text-muted">Strongest Day</p>
                <p className="text-2xl font-semibold text-foreground mt-1">Tuesday</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-accent-soft/60 border border-accent/20">
              <p className="text-xs font-semibold text-accent">Verified Insight</p>
              <p className="text-xs text-foreground mt-1 leading-relaxed">
                Your weekday completion rate (91%) outperforms weekends (78%). Simplifying Saturday targets to a minimum viable duration preserves your streak momentum.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. STOIC PHILOSOPHY SECTION */}
      <section id="stoic" className="py-20 px-4 sm:px-8 border-t border-border/70">
        <div className="max-w-5xl mx-auto text-center">
          <Landmark className="w-8 h-8 text-accent mx-auto mb-4" />
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Timeless Inner Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-2">
            Curated Stoic Library for daily composure.
          </h2>
          <p className="text-muted mt-3 max-w-2xl mx-auto text-base">
            Study verified primary-source passages from Marcus Aurelius, Seneca, and Epictetus—complete with exact textual citations, direct-quote verification badges, and private marginalia notes.
          </p>

          <div className="mt-10 p-8 sm:p-10 rounded-3xl bg-surface border border-border shadow-apple max-w-3xl mx-auto text-left">
            <div className="flex items-center justify-between text-xs text-muted mb-4">
              <span className="font-semibold uppercase tracking-wider text-accent">
                Daily Stoic Passage · Discipline
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-success-soft text-success font-medium">
                Verified Direct Quotation
              </span>
            </div>
            <blockquote className="font-editorial text-xl sm:text-2xl text-foreground leading-relaxed italic">
              “Every habit and faculty is maintained and increased by the corresponding actions: the habit of walking by walking, the habit of running by running. If you would be a good reader, read; if a writer, write.”
            </blockquote>
            <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">Epictetus</span>
              <span className="text-muted">Discourses, Book II, Chapter 18.1–2</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. JOURNALING & 7. GOALS AND PERSONAL GROWTH */}
      <section id="journaling" className="py-20 px-4 sm:px-8 bg-surface-secondary/50 border-t border-border/70">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-surface border border-border shadow-apple">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-5">
              <BookText className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">
              Distraction-Free Evening Reflection
            </h3>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Examine your day with structured Stoic reflection prompts: what went well, what could be improved, lessons learned, gratitude, and tomorrow’s core priority.
            </p>
            <div className="mt-6 space-y-2.5 text-xs text-muted border-t border-border pt-5">
              <div className="p-3 rounded-xl bg-surface-secondary text-foreground font-medium">
                1. What went well today?
              </div>
              <div className="p-3 rounded-xl bg-surface-secondary text-foreground font-medium">
                2. What could I have done better?
              </div>
              <div className="p-3 rounded-xl bg-surface-secondary text-foreground font-medium">
                3. What should I focus on tomorrow?
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-surface border border-border shadow-apple">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-5">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">
              Goals Connected to Daily Habits
            </h3>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Break long-term ambitions into concrete milestones and link them directly to the daily habits that make them inevitable.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-surface-secondary border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Read 24 Foundational Philosophy Books
                </span>
                <span className="font-semibold text-accent">75%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: '75%' }} />
              </div>
              <p className="text-[11px] text-muted">
                3 of 4 Milestones Completed · Linked to: Deep Philosophical Reading
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS (Clearly identified sample perspectives per requirement 5.8) */}
      <section className="py-20 px-4 sm:px-8 border-t border-border/70">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                Reader & Practitioner Scenarios
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground mt-1">
                Built for calm, enduring productivity.
              </h2>
            </div>
            <span className="text-xs text-muted px-3 py-1 rounded-full bg-surface-secondary border border-border">
              Illustrative Sample Practitioner Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'Combining numerical habit targets with Seneca’s letters and a distraction-free evening review replaced three separate apps in my workflow.',
                author: 'Elena R.',
                role: 'Principal Systems Architect (Sample Profile)',
              },
              {
                quote:
                  'The distinction between raw completion rate and consistency score helped me stop abandoning habits after a single busy travel day.',
                author: 'Marcus V.',
                role: 'Clinical Researcher (Sample Profile)',
              },
              {
                quote:
                  'Both the warm ivory Light Mode and the graphite Dark Mode feel calm and effortless to use first thing in the morning and late at night.',
                author: 'David K.',
                role: 'Product Designer (Sample Profile)',
              },
            ].map((item) => (
              <div
                key={item.author}
                className="p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between"
              >
                <p className="text-sm text-foreground leading-relaxed">“{item.quote}”</p>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-foreground">{item.author}</p>
                  <p className="text-[11px] text-muted">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-8 border-t border-border/70 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Begin your next chapter of discipline.
          </h2>
          <p className="text-base sm:text-lg text-muted mt-4 max-w-xl mx-auto">
            Build a better you, one day at a time. Start with a fresh account or explore our pre-populated 45-day demo workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-medium shadow-sm transition-colors"
            >
              Create Your Account
            </Link>
            <button
              type="button"
              onClick={handleInstantDemo}
              className="px-7 py-3.5 rounded-2xl bg-surface-secondary hover:bg-border/60 text-foreground text-sm font-medium border border-border transition-colors"
            >
              Launch Demo Workspace
            </button>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="py-10 px-4 sm:px-8 border-t border-border bg-background text-xs text-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-xs">
              H
            </div>
            <span className="font-semibold text-foreground">HABITUDE</span>
            <span>— Build a better you, one day at a time.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-foreground transition-colors">
              Register
            </Link>
            <Link to="/forgot-password" className="hover:text-foreground transition-colors">
              Reset Password
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
