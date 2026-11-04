from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers

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


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', required=False)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'avatar_url',
            'bio',
            'personal_motto',
            'theme_preference',
            'week_start',
            'timezone',
            'daily_focus_goal',
            'habit_reminders_enabled',
            'weekly_review_reminders',
            'browser_notifications',
            'default_reminder_time',
            'created_at',
            'updated_at',
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        email = user_data.get('email')
        if email:
            instance.user.email = email
            instance.user.save(update_fields=['email'])
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    theme_preference = serializers.ChoiceField(
        choices=['light', 'dark', 'system'],
        default='system',
        required=False
    )

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists() or User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized


class HabitCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitCategory
        fields = ['id', 'name', 'slug', 'icon', 'color', 'is_default']
        read_only_fields = ['id', 'slug', 'is_default']

    def create(self, validated_data):
        name = validated_data['name'].strip()
        validated_data['slug'] = slugify(name)
        return super().create(validated_data)


class HabitCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitCompletion
        fields = [
            'id',
            'habit',
            'date',
            'progress_value',
            'target_snapshot',
            'is_completed',
            'notes',
            'completed_at',
        ]
        read_only_fields = ['id', 'habit', 'is_completed', 'completed_at']


class HabitSerializer(serializers.ModelSerializer):
    today_progress = serializers.SerializerMethodField()
    today_completed = serializers.SerializerMethodField()
    is_scheduled_today = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = [
            'id',
            'name',
            'description',
            'category',
            'category_name',
            'icon',
            'color',
            'priority',
            'difficulty',
            'tracking_type',
            'target_value',
            'unit',
            'frequency',
            'selected_weekdays',
            'weekly_target_days',
            'custom_interval_days',
            'start_date',
            'end_date',
            'reminder_enabled',
            'reminder_time',
            'is_archived',
            'current_streak',
            'longest_streak',
            'total_completions',
            'today_progress',
            'today_completed',
            'is_scheduled_today',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'current_streak',
            'longest_streak',
            'total_completions',
            'created_at',
            'updated_at',
        ]

    def get_today_progress(self, obj):
        today_map = self.context.get('today_completions_map', {})
        comp = today_map.get(obj.id)
        return comp.progress_value if comp else 0.0

    def get_today_completed(self, obj):
        today_map = self.context.get('today_completions_map', {})
        comp = today_map.get(obj.id)
        return comp.is_completed if comp else False

    def get_is_scheduled_today(self, obj):
        from .services import is_habit_scheduled_on_date, get_user_local_date
        today = self.context.get('today_date') or get_user_local_date(obj.user)
        return is_habit_scheduled_on_date(obj, today)


class GoalMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalMilestone
        fields = [
            'id',
            'goal',
            'title',
            'target_date',
            'is_completed',
            'completed_at',
            'order',
            'created_at',
        ]
        read_only_fields = ['id', 'goal', 'completed_at', 'created_at']


class GoalSerializer(serializers.ModelSerializer):
    milestones = GoalMilestoneSerializer(many=True, read_only=True)
    associated_habit_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Habit.objects.all(),
        source='associated_habits',
        required=False
    )
    associated_habits_details = serializers.SerializerMethodField()
    initial_milestones = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Goal
        fields = [
            'id',
            'title',
            'description',
            'category',
            'goal_type',
            'start_date',
            'target_date',
            'progress_percentage',
            'status',
            'is_completed',
            'completed_at',
            'color',
            'priority',
            'associated_habit_ids',
            'associated_habits_details',
            'milestones',
            'initial_milestones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def get_associated_habits_details(self, obj):
        return [
            {
                'id': h.id,
                'name': h.name,
                'icon': h.icon,
                'color': h.color,
                'current_streak': h.current_streak,
            }
            for h in obj.associated_habits.all()
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'date',
            'title',
            'content',
            'mood',
            'energy_level',
            'prompt_went_well',
            'prompt_could_improve',
            'prompt_learned',
            'prompt_grateful',
            'prompt_tomorrow_focus',
            'tags',
            'is_favorite',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyIntentionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyIntention
        fields = [
            'id',
            'date',
            'intention_text',
            'focus_category',
            'is_completed',
            'completed_at',
            'reflection_note',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']


class StoicQuoteSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()
    personal_note = serializers.SerializerMethodField()

    class Meta:
        model = StoicQuote
        fields = [
            'id',
            'day_index',
            'text',
            'philosopher',
            'philosopher_title',
            'category',
            'source_reference',
            'is_direct_quote',
            'editorial_commentary',
            'is_favorite',
            'personal_note',
        ]

    def get_is_favorite(self, obj):
        fav_ids = self.context.get('favorite_quote_ids', set())
        return obj.id in fav_ids

    def get_personal_note(self, obj):
        notes_map = self.context.get('quote_notes_map', {})
        return notes_map.get(obj.id, '')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'action_url',
            'is_read',
            'scheduled_for',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class WeeklyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReview
        fields = [
            'id',
            'review_type',
            'period_start',
            'period_end',
            'total_scheduled',
            'total_completed',
            'completion_percentage',
            'best_habit_name',
            'lowest_habit_name',
            'best_day_name',
            'streak_snapshot',
            'prompt_accomplished',
            'prompt_challenged',
            'prompt_improve',
            'prompt_prioritize_next',
            'metrics_payload',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'review_type',
            'period_start',
            'period_end',
            'total_scheduled',
            'total_completed',
            'completion_percentage',
            'best_habit_name',
            'lowest_habit_name',
            'best_day_name',
            'streak_snapshot',
            'metrics_payload',
            'created_at',
            'updated_at',
        ]
