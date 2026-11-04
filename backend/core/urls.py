from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    DemoLoginView,
    LogoutView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    MeProfileView,
    DataExportView,
    DashboardView,
    CategoryListCreateView,
    HabitListCreateView,
    HabitDetailView,
    HabitLogProgressView,
    HabitArchiveRestoreView,
    AnalyticsReportView,
    GoalListCreateView,
    GoalDetailView,
    GoalMilestoneCreateView,
    GoalMilestoneDetailView,
    JournalListCreateView,
    JournalDetailView,
    StoicLibraryView,
    StoicQuoteFavoriteToggleView,
    StoicQuoteNoteView,
    DailyIntentionListCreateView,
    DailyIntentionDetailView,
    ReviewView,
    ReviewDetailView,
    AchievementsView,
    NotificationsView,
)

urlpatterns = [
    # Authentication & User Profile
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/demo-login/', DemoLoginView.as_view(), name='auth-demo-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/me/', MeProfileView.as_view(), name='auth-me'),
    path('auth/export/', DataExportView.as_view(), name='auth-export'),

    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # Categories & Habits
    path('categories/', CategoryListCreateView.as_view(), name='category-list-create'),
    path('habits/', HabitListCreateView.as_view(), name='habit-list-create'),
    path('habits/<int:pk>/', HabitDetailView.as_view(), name='habit-detail'),
    path('habits/<int:pk>/log/', HabitLogProgressView.as_view(), name='habit-log-progress'),
    path('habits/<int:pk>/archive/', HabitArchiveRestoreView.as_view(), name='habit-archive-restore'),

    # Advanced Analytics
    path('analytics/', AnalyticsReportView.as_view(), name='analytics-report'),

    # Goals & Milestones
    path('goals/', GoalListCreateView.as_view(), name='goal-list-create'),
    path('goals/<int:pk>/', GoalDetailView.as_view(), name='goal-detail'),
    path('goals/<int:goal_id>/milestones/', GoalMilestoneCreateView.as_view(), name='goal-milestone-create'),
    path('milestones/<int:pk>/', GoalMilestoneDetailView.as_view(), name='milestone-detail'),

    # Journal & Self-Reflection
    path('journal/', JournalListCreateView.as_view(), name='journal-list-create'),
    path('journal/<int:pk>/', JournalDetailView.as_view(), name='journal-detail'),

    # Stoic Philosophy Library
    path('stoic/quotes/', StoicLibraryView.as_view(), name='stoic-quotes'),
    path('stoic/quotes/<int:pk>/favorite/', StoicQuoteFavoriteToggleView.as_view(), name='stoic-quote-favorite'),
    path('stoic/quotes/<int:pk>/note/', StoicQuoteNoteView.as_view(), name='stoic-quote-note'),

    # Daily Intentions
    path('intentions/', DailyIntentionListCreateView.as_view(), name='intention-list-create'),
    path('intentions/<int:pk>/', DailyIntentionDetailView.as_view(), name='intention-detail'),

    # Weekly & Monthly Reviews
    path('reviews/', ReviewView.as_view(), name='review-list'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),

    # Achievements & Notifications
    path('achievements/', AchievementsView.as_view(), name='achievements'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),
]
