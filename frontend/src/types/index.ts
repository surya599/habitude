export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  personal_motto: string;
  theme_preference: ThemePreference;
  week_start: 'monday' | 'sunday';
  timezone: string;
  daily_focus_goal: number;
  habit_reminders_enabled: boolean;
  weekly_review_reminders: boolean;
  browser_notifications: boolean;
  default_reminder_time: string;
  created_at: string;
  updated_at: string;
}

export interface HabitCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_default: boolean;
}

export type TrackingType = 'boolean' | 'numerical' | 'duration' | 'quantity';
export type HabitPriority = 'low' | 'medium' | 'high';
export type HabitDifficulty = 'easy' | 'medium' | 'hard';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekly_target' | 'custom';

export interface Habit {
  id: number;
  name: string;
  description: string;
  category: number | null;
  category_name: string;
  icon: string;
  color: string;
  priority: HabitPriority;
  difficulty: HabitDifficulty;
  tracking_type: TrackingType;
  target_value: number;
  unit: string;
  frequency: HabitFrequency;
  selected_weekdays: number[];
  weekly_target_days: number;
  custom_interval_days: number;
  start_date: string;
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  is_archived: boolean;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  today_progress: number;
  today_completed: boolean;
  is_scheduled_today: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: number;
  habit: number;
  date: string;
  progress_value: number;
  target_snapshot: number;
  is_completed: boolean;
  notes: string;
  completed_at: string;
}

export interface HabitDetail extends Habit {
  completion_percentage: number;
  scheduled_occurrences_90d: number;
  completed_occurrences_90d: number;
  historical_calendar: Array<{
    date: string;
    label: string;
    weekday: number;
    is_scheduled: boolean;
    is_completed: boolean;
    progress_value: number;
    target_value: number;
    notes: string;
  }>;
  monthly_performance: Array<{
    month: string;
    short_month: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
  }>;
  progress_trends: Array<{
    date: string;
    label: string;
    weekday: number;
    is_scheduled: boolean;
    is_completed: boolean;
    progress_value: number;
    target_value: number;
    notes: string;
  }>;
  recent_completions: HabitCompletion[];
}

export interface DashboardHabitItem {
  id: number;
  name: string;
  description: string;
  category_name: string;
  icon: string;
  color: string;
  priority: HabitPriority;
  difficulty: HabitDifficulty;
  tracking_type: TrackingType;
  target_value: number;
  unit: string;
  frequency: HabitFrequency;
  current_streak: number;
  longest_streak: number;
  is_scheduled_today: boolean;
  progress_value: number;
  progress_percentage: number;
  is_completed: boolean;
  notes: string;
}

export interface StoicQuote {
  id: number;
  day_index?: number;
  text: string;
  philosopher: 'Marcus Aurelius' | 'Seneca' | 'Epictetus';
  philosopher_title: string;
  category: string;
  source_reference: string;
  is_direct_quote: boolean;
  editorial_commentary: string;
  is_favorite: boolean;
  personal_note?: string;
}

export interface DailyIntention {
  id: number;
  date: string;
  intention_text: string;
  focus_category: string;
  is_completed: boolean;
  completed_at?: string | null;
  reflection_note: string;
}

export interface UnlockedAchievementItem {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  badge_color: string;
  unlocked_at: string;
}

export interface DashboardData {
  date: string;
  overview: {
    daily_completion_percentage: number;
    total_scheduled_habits: number;
    completed_habits: number;
    remaining_habits: number;
    current_streak: number;
    longest_streak: number;
    weekly_consistency_score: number;
    week_completed_total: number;
    week_scheduled_total: number;
  };
  todays_habits: DashboardHabitItem[];
  weekly_activity: Array<{
    date: string;
    day: string;
    full_day: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
  }>;
  daily_quote: StoicQuote | null;
  daily_intention: DailyIntention | null;
  upcoming_goals: Array<{
    id: number;
    title: string;
    category: string;
    goal_type: string;
    target_date: string;
    progress_percentage: number;
    color: string;
    completed_milestones: number;
    total_milestones: number;
  }>;
  recent_achievements: UnlockedAchievementItem[];
  has_journal_today: boolean;
}

export interface AnalyticsReport {
  range: {
    key: string;
    start_date: string;
    end_date: string;
  };
  metrics: {
    consistency_score: number;
    completion_rate: number;
    total_scheduled: number;
    total_completed_in_range: number;
    total_all_time_completions: number;
    daily_completion_rate: number;
    weekly_completion_rate: number;
    monthly_completion_rate: number;
    current_streak: number;
    longest_streak: number;
    best_performing_habit: string;
    best_performing_habit_rate: number;
    lowest_performing_habit: string;
    lowest_performing_habit_rate: number;
    most_productive_weekday: string;
    most_consistent_category: string;
  };
  daily_series: Array<{
    date: string;
    label: string;
    scheduled: number;
    completed: number;
    partial: number;
    completion_rate: number;
  }>;
  weekday_performance: Array<{
    weekday: string;
    full_weekday: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
  }>;
  monthly_progress: Array<{
    month: string;
    short_month: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
  }>;
  category_performance: Array<{
    category: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
    color: string;
  }>;
  habit_performance: Array<{
    id: number;
    name: string;
    category: string;
    color: string;
    icon: string;
    scheduled: number;
    completed: number;
    completion_rate: number;
    current_streak: number;
    longest_streak: number;
  }>;
  completion_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  streak_history: Array<{
    habit_id: number;
    name: string;
    current_streak: number;
    longest_streak: number;
    color: string;
  }>;
  progress_timeline: Array<{
    date: string;
    label: string;
    cumulative_completions: number;
    daily_completed: number;
  }>;
  yearly_heatmap: Array<{
    date: string;
    count: number;
    level: number;
    weekday: number;
  }>;
  insights: Array<{
    type: string;
    title: string;
    message: string;
  }>;
}

export interface GoalMilestone {
  id: number;
  goal: number;
  title: string;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  order: number;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  category: string;
  goal_type: 'short_term' | 'long_term' | 'personal' | 'fitness' | 'learning' | 'career';
  start_date: string;
  target_date: string;
  progress_percentage: number;
  status: 'active' | 'completed' | 'paused';
  is_completed: boolean;
  completed_at: string | null;
  color: string;
  priority: string;
  associated_habit_ids?: number[];
  associated_habits_details: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    current_streak: number;
  }>;
  milestones: GoalMilestone[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  title: string;
  content: string;
  mood: 'exceptional' | 'good' | 'calm' | 'reflective' | 'challenging';
  energy_level: number;
  prompt_went_well: string;
  prompt_could_improve: string;
  prompt_learned: string;
  prompt_grateful: string;
  prompt_tomorrow_focus: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReviewData {
  id: number;
  review_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_scheduled: number;
  total_completed: number;
  completion_percentage: number;
  best_habit_name: string;
  lowest_habit_name: string;
  best_day_name: string;
  streak_snapshot: number;
  prompt_accomplished: string;
  prompt_challenged: string;
  prompt_improve: string;
  prompt_prioritize_next: string;
  metrics_payload: {
    previous_period_rate: number;
    previous_period_completed: number;
    rate_delta: number;
    consistency_score: number;
    journals_written: number;
    intentions_completed: number;
    habit_breakdown: AnalyticsReport['habit_performance'];
    category_breakdown: AnalyticsReport['category_performance'];
    daily_series: AnalyticsReport['daily_series'];
    goals_summary: Array<{
      id: number;
      title: string;
      category: string;
      progress_percentage: number;
      is_completed: boolean;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface AchievementItem {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold_value: number;
  badge_color: string;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: 'reminder' | 'achievement' | 'review' | 'system';
  action_url: string;
  is_read: boolean;
  scheduled_for: string | null;
  created_at: string;
}
