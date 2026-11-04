import React, { useState } from 'react';
import {
  User,
  Palette,
  Clock,
  Bell,
  Download,
  Lock,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { apiRequest, setAuthToken } from '../lib/api';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, showToast } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [personalMotto, setPersonalMotto] = useState(
    user?.personal_motto || 'Build a better you, one day at a time.'
  );
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>(user?.week_start || 'monday');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [dailyFocusGoal, setDailyFocusGoal] = useState(user?.daily_focus_goal || 5);
  const [habitReminders, setHabitReminders] = useState(
    user?.habit_reminders_enabled ?? true
  );
  const [weeklyReviewReminders, setWeeklyReviewReminders] = useState(
    user?.weekly_review_reminders ?? true
  );
  const [browserNotifications, setBrowserNotifications] = useState(
    user?.browser_notifications ?? false
  );
  const [defaultReminderTime, setDefaultReminderTime] = useState(
    user?.default_reminder_time ? user.default_reminder_time.slice(0, 5) : '08:00'
  );

  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName,
        email,
        bio,
        personal_motto: personalMotto,
        week_start: weekStart,
        timezone,
        daily_focus_goal: dailyFocusGoal,
        habit_reminders_enabled: habitReminders,
        weekly_review_reminders: weeklyReviewReminders,
        browser_notifications: browserNotifications,
        default_reminder_time: `${defaultReminderTime}:00`,
      });
      showToast({
        title: 'Settings Saved',
        description: 'Your profile, appearance, and productivity preferences are updated.',
      });
    } catch (err: any) {
      showToast({ title: 'Could not save settings', description: err.message, variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEnableBrowserNotifications = async (checked: boolean) => {
    setBrowserNotifications(checked);
    if (checked && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('HABITUDE Notifications Enabled', {
          body: 'You will receive gentle daily habit reminders on schedule.',
        });
      }
    }
  };

  const handleExportData = async () => {
    try {
      const data = await apiRequest<any>('/auth/export/');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habitude-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({
        title: 'Personal Data Exported',
        description: 'Downloaded complete JSON archive of your habits, journals, and goals.',
      });
    } catch (err: any) {
      showToast({ title: 'Export failed', description: err.message, variant: 'error' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast({
        title: 'New password must be at least 8 characters',
        variant: 'error',
      });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await apiRequest<{ token: string; detail: string }>(
        '/auth/change-password/',
        {
          method: 'POST',
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );
      if (res.token) setAuthToken(res.token);
      setCurrentPassword('');
      setNewPassword('');
      showToast({ title: 'Password Updated Successfully' });
    } catch (err: any) {
      showToast({ title: 'Password update failed', description: err.message, variant: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          Personalization & Preferences
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
          Settings
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage your profile, dual-theme appearance, productivity schedule, reminders, and personal data.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. APPEARANCE (Section 3 & 17) */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Appearance & Color Theme
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Choose between Apple-inspired Light Mode, multi-surface Dark Mode, or automatic System sync.
                </p>
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </div>

        {/* 2. PROFILE */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <User className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Personal Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Personal Motto (Displayed on Dashboard)
            </label>
            <input
              type="text"
              value={personalMotto}
              onChange={(e) => setPersonalMotto(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-foreground resize-none"
            />
          </div>
        </div>

        {/* 3. PRODUCTIVITY & TIMEZONE */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              Productivity & Regional Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Week Starts On
              </label>
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value as 'monday' | 'sunday')}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Daily Core Habit Target
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={dailyFocusGoal}
                onChange={(e) => setDailyFocusGoal(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-secondary border border-border text-sm text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 4. REMINDERS & NOTIFICATIONS */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-apple space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <Bell className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-foreground">
              Reminders & Notifications
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary/60 border border-border cursor-pointer">
              <div>
                <p className="font-medium text-foreground text-xs">Enable Habit Reminders</p>
                <p className="text-[11px] text-muted">
                  Show scheduled habit reminders in the notification center
                </p>
              </div>
              <input
                type="checkbox"
                checked={habitReminders}
                onChange={(e) => setHabitReminders(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary/60 border border-border cursor-pointer">
              <div>
                <p className="font-medium text-foreground text-xs">
                  Weekly & Monthly Review Prompts
                </p>
                <p className="text-[11px] text-muted">
                  Receive end-of-week executive review summaries
                </p>
              </div>
              <input
                type="checkbox"
                checked={weeklyReviewReminders}
                onChange={(e) => setWeeklyReviewReminders(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary/60 border border-border cursor-pointer">
              <div>
                <p className="font-medium text-foreground text-xs">Browser Notifications</p>
                <p className="text-[11px] text-muted">
                  Trigger native desktop browser notifications when supported
                </p>
              </div>
              <input
                type="checkbox"
                checked={browserNotifications}
                onChange={(e) => handleEnableBrowserNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
            </label>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary/60 border border-border">
              <div>
                <p className="font-medium text-foreground text-xs">Default Reminder Time</p>
                <p className="text-[11px] text-muted">
                  Default morning check-in time for new habits
                </p>
              </div>
              <input
                type="time"
                value={defaultReminderTime}
                onChange={(e) => setDefaultReminderTime(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
            >
              <Check className="w-4 h-4" />
              <span>{savingProfile ? 'Saving Changes...' : 'Save All Preferences'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 5. DATA MANAGEMENT & SECURITY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-apple flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Download className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Export Personal Data</h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Download a complete, portable JSON archive of your profile, habits, historical completions, goals, journal entries, and reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-surface-secondary hover:bg-border/60 border border-border text-xs font-semibold text-foreground inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>Export Complete JSON Archive</span>
          </button>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="p-6 rounded-3xl bg-surface border border-border shadow-apple space-y-3"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <Lock className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          </div>
          <div>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            />
          </div>
          <div>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
