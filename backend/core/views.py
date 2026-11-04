import datetime
import secrets
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
from .serializers import (
    UserProfileSerializer,
    RegisterSerializer,
    HabitCategorySerializer,
    HabitSerializer,
    HabitCompletionSerializer,
    GoalSerializer,
    GoalMilestoneSerializer,
    JournalEntrySerializer,
    DailyIntentionSerializer,
    StoicQuoteSerializer,
    NotificationSerializer,
    WeeklyReviewSerializer,
)
from .services import (
    ensure_user_profile,
    get_user_local_date,
    is_habit_scheduled_on_date,
    recalculate_habit_streaks,
    calculate_user_overall_streaks,
    log_habit_progress,
    recalculate_goal_progress,
    evaluate_user_achievements,
    get_daily_stoic_quote,
    build_dashboard_summary,
    build_analytics_report,
    generate_or_get_review,
)
from .seed_data import seed_global_reference_data, seed_demo_account


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        seed_global_reference_data()
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        full_name = serializer.validated_data['full_name'].strip()
        password = serializer.validated_data['password']
        theme_pref = serializer.validated_data.get('theme_preference', 'system')

        parts = full_name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        profile = ensure_user_profile(user)
        profile.full_name = full_name
        profile.theme_preference = theme_pref
        profile.save()

        Notification.objects.create(
            user=user,
            title='Welcome to HABITUDE',
            message='Build a better you, one day at a time. Start by creating your first habit or setting today’s daily intention.',
            notification_type='system',
            action_url='/habits',
        )

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'token': token.key,
                'user': UserProfileSerializer(profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        seed_global_reference_data()
        identifier = (request.data.get('email') or request.data.get('username') or '').strip()
        password = request.data.get('password') or ''

        if not identifier or not password:
            return Response(
                {'error': 'Please provide both email and password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj = (
            User.objects.filter(email__iexact=identifier).first()
            or User.objects.filter(username__iexact=identifier).first()
        )
        username = user_obj.username if user_obj else identifier
        user = authenticate(request, username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        profile = ensure_user_profile(user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserProfileSerializer(profile).data,
        })


class DemoLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = seed_demo_account()
        profile = ensure_user_profile(user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserProfileSerializer(profile).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response({'detail': 'Successfully signed out.'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'error': 'Please enter your account email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
        reset_token = None
        if user:
            profile = ensure_user_profile(user)
            reset_token = secrets.token_urlsafe(24)
            profile.password_reset_token = reset_token
            profile.password_reset_expires = timezone.now() + datetime.timedelta(hours=2)
            profile.save(update_fields=['password_reset_token', 'password_reset_expires'])

        return Response({
            'detail': 'If an account matches that email, a password reset link has been generated.',
            'reset_token': reset_token,
        })


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = (request.data.get('token') or '').strip()
        new_password = request.data.get('password') or ''

        if not token_str or len(new_password) < 8:
            return Response(
                {'error': 'A valid reset token and a password of at least 8 characters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = UserProfile.objects.filter(
            password_reset_token=token_str,
            password_reset_expires__gte=timezone.now(),
        ).select_related('user').first()

        if not profile:
            return Response(
                {'error': 'This password reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = profile.user
        user.set_password(new_password)
        user.save()

        profile.password_reset_token = None
        profile.password_reset_expires = None
        profile.save(update_fields=['password_reset_token', 'password_reset_expires'])

        auth_token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'detail': 'Your password has been reset successfully.',
            'token': auth_token.key,
            'user': UserProfileSerializer(profile).data,
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''

        if not request.user.check_password(current_password):
            return Response(
                {'error': 'Your current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters long.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save()
        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)
        return Response({
            'detail': 'Password updated successfully.',
            'token': token.key,
        })


class MeProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = ensure_user_profile(request.user)
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile = ensure_user_profile(request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = ensure_user_profile(user)
        habits = Habit.objects.filter(user=user)
        completions = HabitCompletion.objects.filter(user=user)
        goals = Goal.objects.filter(user=user).prefetch_related('milestones', 'associated_habits')
        journals = JournalEntry.objects.filter(user=user)
        intentions = DailyIntention.objects.filter(user=user)
        reviews = WeeklyReview.objects.filter(user=user)

        return Response({
            'exported_at': timezone.now().isoformat(),
            'platform': 'HABITUDE',
            'profile': UserProfileSerializer(profile).data,
            'habits': HabitSerializer(habits, many=True).data,
            'completions': HabitCompletionSerializer(completions, many=True).data,
            'goals': GoalSerializer(goals, many=True).data,
            'journal_entries': JournalEntrySerializer(journals, many=True).data,
            'daily_intentions': DailyIntentionSerializer(intentions, many=True).data,
            'reviews': WeeklyReviewSerializer(reviews, many=True).data,
        })


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        target_date = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                target_date = None
        data = build_dashboard_summary(request.user, target_date)
        return Response(data)


class CategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seed_global_reference_data()
        categories = HabitCategory.objects.filter(
            Q(is_default=True) | Q(user=request.user)
        ).order_by('-is_default', 'name')
        return Response(HabitCategorySerializer(categories, many=True).data)

    def post(self, request):
        serializer = HabitCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save(user=request.user, is_default=False)
        return Response(
            HabitCategorySerializer(category).data,
            status=status.HTTP_201_CREATED,
        )


class HabitListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status', 'active')
        category_filter = request.query_params.get('category')
        priority_filter = request.query_params.get('priority')
        tracking_filter = request.query_params.get('tracking_type')
        search_q = (request.query_params.get('search') or '').strip()

        qs = Habit.objects.filter(user=request.user)
        if status_filter == 'active':
            qs = qs.filter(is_archived=False)
        elif status_filter == 'archived':
            qs = qs.filter(is_archived=True)

        if category_filter and category_filter != 'All':
            qs = qs.filter(category_name__iexact=category_filter)
        if priority_filter and priority_filter != 'all':
            qs = qs.filter(priority=priority_filter)
        if tracking_filter and tracking_filter != 'all':
            qs = qs.filter(tracking_type=tracking_filter)
        if search_q:
            qs = qs.filter(
                Q(name__icontains=search_q)
                | Q(description__icontains=search_q)
                | Q(category_name__icontains=search_q)
            )

        today = get_user_local_date(request.user)
        today_completions_map = {
            c.habit_id: c
            for c in HabitCompletion.objects.filter(user=request.user, date=today)
        }

        serializer = HabitSerializer(
            qs,
            many=True,
            context={
                'today_completions_map': today_completions_map,
                'today_date': today,
            }
        )
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        data = request.data.copy()
        cat_name = data.get('category_name') or 'Health'
        cat = HabitCategory.objects.filter(
            Q(is_default=True) | Q(user=request.user),
            name__iexact=cat_name
        ).first()

        serializer = HabitSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        habit = serializer.save(user=request.user, category=cat, category_name=cat.name if cat else cat_name)

        HabitSchedule.objects.update_or_create(
            habit=habit,
            defaults={
                'frequency_type': habit.frequency,
                'days_of_week': habit.selected_weekdays,
                'times_per_week': habit.weekly_target_days,
                'custom_interval_days': habit.custom_interval_days,
            }
        )

        today = get_user_local_date(request.user)
        return Response(
            HabitSerializer(
                habit,
                context={'today_completions_map': {}, 'today_date': today}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class HabitDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(Habit, pk=pk, user=request.user)

    def get(self, request, pk):
        habit = self.get_object(request, pk)
        today = get_user_local_date(request.user)
        recalculate_habit_streaks(habit, today)

        today_comp = HabitCompletion.objects.filter(habit=habit, date=today).first()
        today_map = {habit.id: today_comp} if today_comp else {}

        # Build 90-day historical calendar
        start_90 = today - datetime.timedelta(days=89)
        comps_90 = {
            c.date: c
            for c in HabitCompletion.objects.filter(
                habit=habit,
                date__gte=start_90,
                date__lte=today
            )
        }

        calendar_history = []
        scheduled_count = 0
        completed_count = 0
        cursor = start_90
        while cursor <= today:
            sched = is_habit_scheduled_on_date(habit, cursor)
            comp = comps_90.get(cursor)
            done = comp.is_completed if comp else False
            val = comp.progress_value if comp else 0.0
            if cursor >= habit.start_date and sched:
                scheduled_count += 1
                if done:
                    completed_count += 1
            calendar_history.append({
                'date': cursor.isoformat(),
                'label': cursor.strftime('%b %d'),
                'weekday': cursor.weekday(),
                'is_scheduled': sched,
                'is_completed': done,
                'progress_value': val,
                'target_value': habit.target_value,
                'notes': comp.notes if comp else '',
            })
            cursor += datetime.timedelta(days=1)

        completion_pct = (
            round((completed_count / scheduled_count) * 100.0, 1)
            if scheduled_count > 0
            else 0.0
        )

        # Monthly performance (last 6 months)
        monthly_performance = []
        for m_offset in range(5, -1, -1):
            year = today.year
            month = today.month - m_offset
            while month <= 0:
                month += 12
                year -= 1
            m_start = datetime.date(year, month, 1)
            if month == 12:
                m_end = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
            else:
                m_end = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
            if m_end > today:
                m_end = today

            m_comps = HabitCompletion.objects.filter(
                habit=habit,
                is_completed=True,
                date__gte=m_start,
                date__lte=m_end
            ).count()

            m_sched = 0
            d_cur = max(m_start, habit.start_date)
            while d_cur <= m_end:
                if is_habit_scheduled_on_date(habit, d_cur):
                    m_sched += 1
                d_cur += datetime.timedelta(days=1)

            m_rate = round((m_comps / m_sched) * 100.0, 1) if m_sched > 0 else 0.0
            monthly_performance.append({
                'month': m_start.strftime('%b %Y'),
                'short_month': m_start.strftime('%b'),
                'scheduled': m_sched,
                'completed': m_comps,
                'completion_rate': m_rate,
            })

        # Last 30 days progress trends
        progress_trends = calendar_history[-30:]
        recent_logs = HabitCompletion.objects.filter(habit=habit).order_by('-date')[:20]

        habit_data = HabitSerializer(
            habit,
            context={'today_completions_map': today_map, 'today_date': today}
        ).data

        return Response({
            **habit_data,
            'completion_percentage': completion_pct,
            'scheduled_occurrences_90d': scheduled_count,
            'completed_occurrences_90d': completed_count,
            'historical_calendar': calendar_history,
            'monthly_performance': monthly_performance,
            'progress_trends': progress_trends,
            'recent_completions': HabitCompletionSerializer(recent_logs, many=True).data,
        })

    @transaction.atomic
    def patch(self, request, pk):
        habit = self.get_object(request, pk)
        serializer = HabitSerializer(habit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        habit = serializer.save()

        HabitSchedule.objects.update_or_create(
            habit=habit,
            defaults={
                'frequency_type': habit.frequency,
                'days_of_week': habit.selected_weekdays,
                'times_per_week': habit.weekly_target_days,
                'custom_interval_days': habit.custom_interval_days,
            }
        )
        recalculate_habit_streaks(habit)
        today = get_user_local_date(request.user)
        today_comp = HabitCompletion.objects.filter(habit=habit, date=today).first()
        return Response(
            HabitSerializer(
                habit,
                context={
                    'today_completions_map': {habit.id: today_comp} if today_comp else {},
                    'today_date': today,
                }
            ).data
        )

    def delete(self, request, pk):
        habit = self.get_object(request, pk)
        habit.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HabitLogProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        habit = get_object_or_404(Habit, pk=pk, user=request.user)
        date_str = request.data.get('date')
        target_date = None
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                target_date = None

        toggle = bool(request.data.get('toggle', False))
        progress_value = request.data.get('progress_value')
        increment_by = request.data.get('increment_by')
        notes = request.data.get('notes')

        completion, newly_unlocked = log_habit_progress(
            user=request.user,
            habit=habit,
            target_date=target_date,
            progress_value=progress_value,
            increment_by=increment_by,
            toggle=toggle,
            notes=notes,
        )

        today = get_user_local_date(request.user)
        today_comp = HabitCompletion.objects.filter(habit=habit, date=today).first()
        return Response({
            'completion': HabitCompletionSerializer(completion).data,
            'habit': HabitSerializer(
                habit,
                context={
                    'today_completions_map': {habit.id: today_comp} if today_comp else {},
                    'today_date': today,
                }
            ).data,
            'newly_unlocked_achievements': newly_unlocked,
        })


class HabitArchiveRestoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        habit = get_object_or_404(Habit, pk=pk, user=request.user)
        explicit_state = request.data.get('is_archived')
        if explicit_state is not None:
            habit.is_archived = bool(explicit_state)
        else:
            habit.is_archived = not habit.is_archived
        habit.save(update_fields=['is_archived', 'updated_at'])

        today = get_user_local_date(request.user)
        today_comp = HabitCompletion.objects.filter(habit=habit, date=today).first()
        return Response(
            HabitSerializer(
                habit,
                context={
                    'today_completions_map': {habit.id: today_comp} if today_comp else {},
                    'today_date': today,
                }
            ).data
        )


class AnalyticsReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_key = request.query_params.get('range', '30d')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        report = build_analytics_report(
            user=request.user,
            range_key=range_key,
            start_date_str=start_date,
            end_date_str=end_date,
        )
        return Response(report)


class GoalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        goal_type = request.query_params.get('goal_type')
        status_filter = request.query_params.get('status')
        qs = Goal.objects.filter(user=request.user).prefetch_related('milestones', 'associated_habits')
        if goal_type and goal_type != 'all':
            qs = qs.filter(goal_type=goal_type)
        if status_filter == 'completed':
            qs = qs.filter(is_completed=True)
        elif status_filter == 'active':
            qs = qs.filter(is_completed=False)
        return Response(GoalSerializer(qs, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = GoalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        initial_milestones = serializer.validated_data.pop('initial_milestones', [])
        associated_habits = serializer.validated_data.pop('associated_habits', [])

        goal = Goal.objects.create(user=request.user, **serializer.validated_data)
        # Ensure user only links their own habits
        user_habits = [h for h in associated_habits if h.user_id == request.user.id]
        if user_habits:
            goal.associated_habits.set(user_habits)

        for idx, m_data in enumerate(initial_milestones):
            title = (m_data.get('title') or '').strip()
            if title:
                t_date = m_data.get('target_date') or None
                GoalMilestone.objects.create(
                    goal=goal,
                    title=title,
                    target_date=t_date,
                    order=idx,
                )

        recalculate_goal_progress(goal)
        return Response(
            GoalSerializer(goal).data,
            status=status.HTTP_201_CREATED,
        )


class GoalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(Goal, pk=pk, user=request.user)

    def get(self, request, pk):
        goal = self.get_object(request, pk)
        return Response(GoalSerializer(goal).data)

    @transaction.atomic
    def patch(self, request, pk):
        goal = self.get_object(request, pk)
        serializer = GoalSerializer(goal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        associated_habits = serializer.validated_data.pop('associated_habits', None)
        serializer.validated_data.pop('initial_milestones', None)

        for attr, val in serializer.validated_data.items():
            setattr(goal, attr, val)

        if goal.is_completed and not goal.completed_at:
            goal.completed_at = timezone.now()
            goal.progress_percentage = 100.0
            goal.status = 'completed'
        elif not goal.is_completed and goal.status == 'completed':
            goal.status = 'active'
            goal.completed_at = None

        goal.save()
        if associated_habits is not None:
            user_habits = [h for h in associated_habits if h.user_id == request.user.id]
            goal.associated_habits.set(user_habits)

        return Response(GoalSerializer(goal).data)

    def delete(self, request, pk):
        goal = self.get_object(request, pk)
        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GoalMilestoneCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, goal_id):
        goal = get_object_or_404(Goal, pk=goal_id, user=request.user)
        serializer = GoalMilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = goal.milestones.count()
        milestone = serializer.save(goal=goal, order=order)
        recalculate_goal_progress(goal)
        return Response(
            {
                'milestone': GoalMilestoneSerializer(milestone).data,
                'goal': GoalSerializer(goal).data,
            },
            status=status.HTTP_201_CREATED,
        )


class GoalMilestoneDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(GoalMilestone, pk=pk, goal__user=request.user)

    @transaction.atomic
    def patch(self, request, pk):
        milestone = self.get_object(request, pk)
        serializer = GoalMilestoneSerializer(milestone, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        milestone = serializer.save()
        if milestone.is_completed and not milestone.completed_at:
            milestone.completed_at = timezone.now()
            milestone.save(update_fields=['completed_at'])
        elif not milestone.is_completed and milestone.completed_at:
            milestone.completed_at = None
            milestone.save(update_fields=['completed_at'])

        goal = recalculate_goal_progress(milestone.goal)
        return Response({
            'milestone': GoalMilestoneSerializer(milestone).data,
            'goal': GoalSerializer(goal).data,
        })

    @transaction.atomic
    def delete(self, request, pk):
        milestone = self.get_object(request, pk)
        goal = milestone.goal
        milestone.delete()
        recalculate_goal_progress(goal)
        return Response({'goal': GoalSerializer(goal).data})


class JournalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_q = (request.query_params.get('search') or '').strip()
        mood_filter = request.query_params.get('mood')
        date_filter = request.query_params.get('date')
        favorites_only = request.query_params.get('favorites') == 'true'

        qs = JournalEntry.objects.filter(user=request.user)
        if search_q:
            qs = qs.filter(
                Q(title__icontains=search_q)
                | Q(content__icontains=search_q)
                | Q(prompt_went_well__icontains=search_q)
                | Q(prompt_learned__icontains=search_q)
                | Q(prompt_grateful__icontains=search_q)
            )
        if mood_filter and mood_filter != 'all':
            qs = qs.filter(mood=mood_filter)
        if date_filter:
            qs = qs.filter(date=date_filter)
        if favorites_only:
            qs = qs.filter(is_favorite=True)

        return Response(JournalEntrySerializer(qs, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = JournalEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(user=request.user)
        newly_unlocked = evaluate_user_achievements(request.user)
        return Response(
            {
                **JournalEntrySerializer(entry).data,
                'newly_unlocked_achievements': newly_unlocked,
            },
            status=status.HTTP_201_CREATED,
        )


class JournalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(JournalEntry, pk=pk, user=request.user)

    def get(self, request, pk):
        entry = self.get_object(request, pk)
        return Response(JournalEntrySerializer(entry).data)

    def patch(self, request, pk):
        entry = self.get_object(request, pk)
        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        entry = self.get_object(request, pk)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StoicLibraryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seed_global_reference_data()
        philosopher = request.query_params.get('philosopher')
        category = request.query_params.get('category')
        favorites_only = request.query_params.get('favorites') == 'true'
        search_q = (request.query_params.get('search') or '').strip()

        qs = StoicQuote.objects.all()
        if philosopher and philosopher != 'all':
            qs = qs.filter(philosopher__iexact=philosopher)
        if category and category != 'all':
            qs = qs.filter(category__iexact=category)
        if search_q:
            qs = qs.filter(
                Q(text__icontains=search_q)
                | Q(philosopher__icontains=search_q)
                | Q(category__icontains=search_q)
                | Q(source_reference__icontains=search_q)
                | Q(editorial_commentary__icontains=search_q)
            )

        fav_ids = set(
            FavoriteQuote.objects.filter(user=request.user).values_list('quote_id', flat=True)
        )
        if favorites_only:
            qs = qs.filter(id__in=fav_ids)

        notes_map = {
            qn.quote_id: qn.note_text
            for qn in QuoteNote.objects.filter(user=request.user)
        }

        today = get_user_local_date(request.user)
        daily_quote = get_daily_stoic_quote(today)
        context = {
            'favorite_quote_ids': fav_ids,
            'quote_notes_map': notes_map,
        }

        # Recent 7 days quote history
        quote_history = []
        for offset in range(7):
            d = today - datetime.timedelta(days=offset)
            q = get_daily_stoic_quote(d)
            if q:
                quote_history.append({
                    'date': d.isoformat(),
                    'quote': StoicQuoteSerializer(q, context=context).data,
                })

        return Response({
            'daily_quote': StoicQuoteSerializer(daily_quote, context=context).data if daily_quote else None,
            'quotes': StoicQuoteSerializer(qs, many=True, context=context).data,
            'quote_history': quote_history,
            'favorites_count': len(fav_ids),
            'notes_count': len(notes_map),
        })


class StoicQuoteFavoriteToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        quote = get_object_or_404(StoicQuote, pk=pk)
        fav = FavoriteQuote.objects.filter(user=request.user, quote=quote).first()
        if fav:
            fav.delete()
            is_favorite = False
        else:
            FavoriteQuote.objects.create(user=request.user, quote=quote)
            is_favorite = True

        newly_unlocked = evaluate_user_achievements(request.user)
        return Response({
            'quote_id': quote.id,
            'is_favorite': is_favorite,
            'newly_unlocked_achievements': newly_unlocked,
        })


class StoicQuoteNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        quote = get_object_or_404(StoicQuote, pk=pk)
        note_text = (request.data.get('note_text') or '').strip()
        if not note_text:
            QuoteNote.objects.filter(user=request.user, quote=quote).delete()
            return Response({'quote_id': quote.id, 'personal_note': ''})

        note, _ = QuoteNote.objects.update_or_create(
            user=request.user,
            quote=quote,
            defaults={'note_text': note_text}
        )
        return Response({
            'quote_id': quote.id,
            'personal_note': note.note_text,
        })


class DailyIntentionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = get_user_local_date(request.user)
        todays_intention = DailyIntention.objects.filter(user=request.user, date=today).first()
        history = DailyIntention.objects.filter(user=request.user).order_by('-date')[:30]
        return Response({
            'today': DailyIntentionSerializer(todays_intention).data if todays_intention else None,
            'history': DailyIntentionSerializer(history, many=True).data,
        })

    def post(self, request):
        today = get_user_local_date(request.user)
        date_val = request.data.get('date') or today
        if isinstance(date_val, str):
            try:
                date_val = datetime.date.fromisoformat(date_val)
            except ValueError:
                date_val = today

        intention_text = (request.data.get('intention_text') or '').strip()
        if not intention_text:
            return Response(
                {'error': 'Please enter your daily intention.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        focus_category = (request.data.get('focus_category') or 'Deep Focus').strip()
        intention, _ = DailyIntention.objects.update_or_create(
            user=request.user,
            date=date_val,
            defaults={
                'intention_text': intention_text,
                'focus_category': focus_category,
            }
        )
        return Response(DailyIntentionSerializer(intention).data)


class DailyIntentionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        intention = get_object_or_404(DailyIntention, pk=pk, user=request.user)
        if 'is_completed' in request.data:
            intention.is_completed = bool(request.data['is_completed'])
            intention.completed_at = timezone.now() if intention.is_completed else None
        if 'intention_text' in request.data:
            intention.intention_text = request.data['intention_text'].strip()
        if 'focus_category' in request.data:
            intention.focus_category = request.data['focus_category'].strip()
        if 'reflection_note' in request.data:
            intention.reflection_note = request.data['reflection_note']
        intention.save()
        return Response(DailyIntentionSerializer(intention).data)


class ReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        review_type = request.query_params.get('type', 'weekly')
        if review_type not in ('weekly', 'monthly'):
            review_type = 'weekly'
        period_start = request.query_params.get('period_start')

        current_review = generate_or_get_review(
            user=request.user,
            review_type=review_type,
            period_start_str=period_start,
        )
        past_reviews = WeeklyReview.objects.filter(
            user=request.user,
            review_type=review_type,
        ).order_by('-period_start')[:12]

        return Response({
            'current_review': WeeklyReviewSerializer(current_review).data,
            'past_reviews': WeeklyReviewSerializer(past_reviews, many=True).data,
        })


class ReviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        review = get_object_or_404(WeeklyReview, pk=pk, user=request.user)
        serializer = WeeklyReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AchievementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seed_global_reference_data()
        evaluate_user_achievements(request.user)

        unlocked_map = {
            ua.achievement_id: ua
            for ua in UserAchievement.objects.filter(user=request.user)
        }
        all_achievements = Achievement.objects.all()

        result = []
        for ach in all_achievements:
            ua = unlocked_map.get(ach.id)
            result.append({
                'id': ach.id,
                'code': ach.code,
                'title': ach.title,
                'description': ach.description,
                'icon': ach.icon,
                'category': ach.category,
                'threshold_value': ach.threshold_value,
                'badge_color': ach.badge_color,
                'is_unlocked': ua is not None,
                'unlocked_at': ua.unlocked_at.isoformat() if ua else None,
            })

        return Response({
            'achievements': result,
            'unlocked_count': len(unlocked_map),
            'total_count': len(result),
        })


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)[:30]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        # Upcoming habit reminders configured by the user
        reminder_habits = Habit.objects.filter(
            user=request.user,
            is_archived=False,
            reminder_enabled=True,
        ).order_by('reminder_time')

        upcoming_reminders = [
            {
                'habit_id': h.id,
                'habit_name': h.name,
                'category_name': h.category_name,
                'icon': h.icon,
                'color': h.color,
                'reminder_time': h.reminder_time.strftime('%H:%M') if h.reminder_time else '08:00',
            }
            for h in reminder_habits
        ]

        return Response({
            'notifications': NotificationSerializer(notifications, many=True).data,
            'unread_count': unread_count,
            'upcoming_reminders': upcoming_reminders,
        })

    def post(self, request):
        notification_id = request.data.get('notification_id')
        if notification_id:
            Notification.objects.filter(user=request.user, pk=notification_id).update(is_read=True)
        else:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'Notifications marked as read.'})
