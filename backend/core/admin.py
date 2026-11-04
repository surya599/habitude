from django.contrib import admin
from .models import (
    UserProfile,
    HabitCategory,
    Habit,
    HabitSchedule,
    HabitCompletion,
    Goal,
    GoalMilestone,
    JournalEntry,
    DailyIntention,
    StoicQuote,
    FavoriteQuote,
    QuoteNote,
    Achievement,
    UserAchievement,
    Notification,
    WeeklyReview,
)

admin.site.register(UserProfile)
admin.site.register(HabitCategory)
admin.site.register(Habit)
admin.site.register(HabitSchedule)
admin.site.register(HabitCompletion)
admin.site.register(Goal)
admin.site.register(GoalMilestone)
admin.site.register(JournalEntry)
admin.site.register(DailyIntention)
admin.site.register(StoicQuote)
admin.site.register(FavoriteQuote)
admin.site.register(QuoteNote)
admin.site.register(Achievement)
admin.site.register(UserAchievement)
admin.site.register(Notification)
admin.site.register(WeeklyReview)
