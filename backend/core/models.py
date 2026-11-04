from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class UserProfile(models.Model):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    ]
    WEEK_START_CHOICES = [
        ('monday', 'Monday'),
        ('sunday', 'Sunday'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.CharField(max_length=500, blank=True)
    bio = models.TextField(blank=True)
    personal_motto = models.CharField(
        max_length=250,
        blank=True,
        default='Build a better you, one day at a time.'
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='system'
    )
    week_start = models.CharField(
        max_length=10,
        choices=WEEK_START_CHOICES,
        default='monday'
    )
    timezone = models.CharField(max_length=64, default='UTC')
    daily_focus_goal = models.PositiveSmallIntegerField(default=5)
    habit_reminders_enabled = models.BooleanField(default=True)
    weekly_review_reminders = models.BooleanField(default=True)
    browser_notifications = models.BooleanField(default=False)
    default_reminder_time = models.TimeField(default='08:00:00')
    password_reset_token = models.CharField(max_length=128, blank=True, null=True)
    password_reset_expires = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"


class HabitCategory(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_categories'
    )
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90)
    icon = models.CharField(max_length=50, default='Activity')
    color = models.CharField(max_length=25, default='#0066CC')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['is_default', 'name']
        indexes = [
            models.Index(fields=['user', 'slug']),
        ]

    def __str__(self):
        return self.name


class Habit(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    TRACKING_TYPE_CHOICES = [
        ('boolean', 'Boolean (Complete / Incomplete)'),
        ('numerical', 'Numerical (e.g. Pages, Reps)'),
        ('duration', 'Duration (e.g. Minutes, Hours)'),
        ('quantity', 'Quantity (e.g. Litres, Cups)'),
    ]
    FREQUENCY_CHOICES = [
        ('daily', 'Every Day'),
        ('weekdays', 'Selected Weekdays'),
        ('weekly_target', 'Weekly Target'),
        ('custom', 'Custom Recurring'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        HabitCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='habits'
    )
    category_name = models.CharField(max_length=80, default='Health')
    icon = models.CharField(max_length=50, default='CheckCircle2')
    color = models.CharField(max_length=25, default='#0066CC')
    priority = models.CharField(max_length=12, choices=PRIORITY_CHOICES, default='medium')
    difficulty = models.CharField(max_length=12, choices=DIFFICULTY_CHOICES, default='medium')
    tracking_type = models.CharField(
        max_length=16,
        choices=TRACKING_TYPE_CHOICES,
        default='boolean'
    )
    target_value = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.1)]
    )
    unit = models.CharField(max_length=32, blank=True, default='')
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='daily'
    )
    # 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    selected_weekdays = models.JSONField(default=list)
    weekly_target_days = models.PositiveSmallIntegerField(
        default=7,
        validators=[MinValueValidator(1), MaxValueValidator(7)]
    )
    custom_interval_days = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(365)]
    )
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    reminder_enabled = models.BooleanField(default=False)
    reminder_time = models.TimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    total_completions = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['is_archived', '-priority', 'name']
        indexes = [
            models.Index(fields=['user', 'is_archived']),
            models.Index(fields=['user', 'category_name']),
        ]

    def save(self, *args, **kwargs):
        if self.tracking_type == 'boolean':
            self.target_value = 1.0
        if not self.selected_weekdays and self.frequency == 'daily':
            self.selected_weekdays = [0, 1, 2, 3, 4, 5, 6]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class HabitSchedule(models.Model):
    TIME_OF_DAY_CHOICES = [
        ('morning', 'Morning'),
        ('afternoon', 'Afternoon'),
        ('evening', 'Evening'),
        ('anytime', 'Anytime'),
    ]

    habit = models.OneToOneField(
        Habit,
        on_delete=models.CASCADE,
        related_name='schedule_config'
    )
    frequency_type = models.CharField(max_length=20, default='daily')
    days_of_week = models.JSONField(default=list)
    times_per_week = models.PositiveSmallIntegerField(default=7)
    custom_interval_days = models.PositiveSmallIntegerField(default=1)
    preferred_time_of_day = models.CharField(
        max_length=20,
        choices=TIME_OF_DAY_CHOICES,
        default='anytime'
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule({self.habit.name})"


class HabitCompletion(models.Model):
    habit = models.ForeignKey(
        Habit,
        on_delete=models.CASCADE,
        related_name='completions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='habit_completions'
    )
    date = models.DateField(db_index=True)
    progress_value = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)]
    )
    target_snapshot = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.1)]
    )
    is_completed = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-completed_at']
        constraints = [
            models.UniqueConstraint(
                fields=['habit', 'date'],
                name='unique_habit_completion_per_date'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['habit', 'date', 'is_completed']),
        ]

    def save(self, *args, **kwargs):
        if self.target_snapshot <= 0:
            self.target_snapshot = max(self.habit.target_value, 1.0)
        self.is_completed = self.progress_value >= self.target_snapshot
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.habit.name} on {self.date}: {self.progress_value}/{self.target_snapshot}"


class Goal(models.Model):
    GOAL_TYPE_CHOICES = [
        ('short_term', 'Short-Term Goal'),
        ('long_term', 'Long-Term Goal'),
        ('personal', 'Personal Growth'),
        ('fitness', 'Health & Fitness'),
        ('learning', 'Learning & Mastery'),
        ('career', 'Career & Craft'),
    ]
    STATUS_CHOICES = [
        ('active', 'In Progress'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=80, default='Personal development')
    goal_type = models.CharField(
        max_length=24,
        choices=GOAL_TYPE_CHOICES,
        default='personal'
    )
    start_date = models.DateField(default=timezone.localdate)
    target_date = models.DateField()
    progress_percentage = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    associated_habits = models.ManyToManyField(
        Habit,
        blank=True,
        related_name='linked_goals'
    )
    color = models.CharField(max_length=25, default='#0066CC')
    priority = models.CharField(max_length=16, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['is_completed', 'target_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_completed']),
        ]

    def __str__(self):
        return f"Goal({self.title})"


class GoalMilestone(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=180)
    target_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"Milestone({self.title})"


class JournalEntry(models.Model):
    MOOD_CHOICES = [
        ('exceptional', 'Exceptional'),
        ('good', 'Good'),
        ('calm', 'Calm & Focused'),
        ('reflective', 'Reflective'),
        ('challenging', 'Challenging'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    date = models.DateField(default=timezone.localdate, db_index=True)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES, default='calm')
    energy_level = models.PositiveSmallIntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    prompt_went_well = models.TextField(blank=True)
    prompt_could_improve = models.TextField(blank=True)
    prompt_learned = models.TextField(blank=True)
    prompt_grateful = models.TextField(blank=True)
    prompt_tomorrow_focus = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"Journal({self.title} - {self.date})"


class DailyIntention(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_intentions')
    date = models.DateField(default=timezone.localdate, db_index=True)
    intention_text = models.CharField(max_length=300)
    focus_category = models.CharField(max_length=60, default='Deep Focus', blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    reflection_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                name='unique_user_daily_intention_per_date'
            )
        ]

    def __str__(self):
        return f"Intention({self.user.username} - {self.date})"


class StoicQuote(models.Model):
    PHILOSOPHER_CHOICES = [
        ('Marcus Aurelius', 'Marcus Aurelius'),
        ('Seneca', 'Seneca'),
        ('Epictetus', 'Epictetus'),
    ]
    CATEGORY_CHOICES = [
        ('Discipline', 'Discipline'),
        ('Focus', 'Focus'),
        ('Courage', 'Courage'),
        ('Patience', 'Patience'),
        ('Resilience', 'Resilience'),
        ('Self-control', 'Self-control'),
        ('Wisdom', 'Wisdom'),
        ('Acceptance', 'Acceptance'),
        ('Perspective', 'Perspective'),
    ]

    text = models.TextField()
    philosopher = models.CharField(max_length=60, choices=PHILOSOPHER_CHOICES, db_index=True)
    philosopher_title = models.CharField(max_length=120, blank=True)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, db_index=True)
    source_reference = models.CharField(max_length=180)
    is_direct_quote = models.BooleanField(default=True)
    editorial_commentary = models.TextField(blank=True)
    day_index = models.PositiveSmallIntegerField(default=1, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day_index', 'id']

    def __str__(self):
        return f"{self.philosopher} — {self.source_reference}"


class FavoriteQuote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_quotes')
    quote = models.ForeignKey(StoicQuote, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'quote'],
                name='unique_user_favorite_quote'
            )
        ]


class QuoteNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quote_notes')
    quote = models.ForeignKey(StoicQuote, on_delete=models.CASCADE, related_name='user_notes')
    note_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'quote'],
                name='unique_user_quote_note'
            )
        ]


class Achievement(models.Model):
    code = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=120)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='Award')
    category = models.CharField(max_length=40, default='consistency')
    threshold_value = models.PositiveIntegerField(default=1)
    badge_color = models.CharField(max_length=25, default='#0066CC')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.title


class UserAchievement(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='unlocked_achievements'
    )
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.CASCADE,
        related_name='user_unlocks'
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)
    is_seen = models.BooleanField(default=False)

    class Meta:
        ordering = ['-unlocked_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'achievement'],
                name='unique_user_achievement_unlock'
            )
        ]


class Notification(models.Model):
    TYPE_CHOICES = [
        ('reminder', 'Habit Reminder'),
        ('achievement', 'Achievement Unlocked'),
        ('review', 'Review Summary'),
        ('system', 'System Insight'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=160)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=24,
        choices=TYPE_CHOICES,
        default='system'
    )
    action_url = models.CharField(max_length=200, blank=True, default='/dashboard')
    is_read = models.BooleanField(default=False, db_index=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class WeeklyReview(models.Model):
    REVIEW_TYPE_CHOICES = [
        ('weekly', 'Weekly Review'),
        ('monthly', 'Monthly Review'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    review_type = models.CharField(
        max_length=16,
        choices=REVIEW_TYPE_CHOICES,
        default='weekly'
    )
    period_start = models.DateField(db_index=True)
    period_end = models.DateField()
    total_scheduled = models.PositiveIntegerField(default=0)
    total_completed = models.PositiveIntegerField(default=0)
    completion_percentage = models.FloatField(default=0.0)
    best_habit_name = models.CharField(max_length=140, blank=True)
    lowest_habit_name = models.CharField(max_length=140, blank=True)
    best_day_name = models.CharField(max_length=40, blank=True)
    streak_snapshot = models.PositiveIntegerField(default=0)
    prompt_accomplished = models.TextField(blank=True)
    prompt_challenged = models.TextField(blank=True)
    prompt_improve = models.TextField(blank=True)
    prompt_prioritize_next = models.TextField(blank=True)
    metrics_payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-period_start']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'review_type', 'period_start'],
                name='unique_user_review_period'
            )
        ]

    def __str__(self):
        return f"{self.get_review_type_display()} ({self.period_start} to {self.period_end})"
