import datetime
from collections import defaultdict
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

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

WEEKDAY_NAMES = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]
SHORT_WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


def ensure_user_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
        }
    )
    return profile


def get_user_local_date(user, explicit_date: datetime.date | None = None) -> datetime.date:
    if explicit_date is not None:
        return explicit_date
    profile = ensure_user_profile(user)
    tz_name = profile.timezone or 'UTC'
    try:
        tz = ZoneInfo(tz_name)
        return datetime.datetime.now(tz).date()
    except (ZoneInfoNotFoundError, Exception):
        return timezone.localdate()


def is_habit_scheduled_on_date(habit: Habit, target_date: datetime.date) -> bool:
    """Determine if a habit is scheduled on a specific date."""
    if target_date < habit.start_date:
        return False
    if habit.end_date and target_date > habit.end_date:
        return False

    freq = habit.frequency
    weekday = target_date.weekday()  # 0=Monday .. 6=Sunday

    if freq == 'daily':
        return True
    elif freq == 'weekdays':
        days = habit.selected_weekdays or [0, 1, 2, 3, 4]
        return weekday in days
    elif freq == 'weekly_target':
        days = habit.selected_weekdays
        if days and len(days) > 0:
            return weekday in days
        return True
    elif freq == 'custom':
        interval = max(1, habit.custom_interval_days or 1)
        delta_days = (target_date - habit.start_date).days
        return (delta_days % interval) == 0
    return True


def recalculate_habit_streaks(habit: Habit, reference_date: datetime.date | None = None) -> Habit:
    """
    Recalculate a habit's current_streak, longest_streak, and total_completions
    from actual completion records and scheduled dates.
    """
    if reference_date is None:
        reference_date = get_user_local_date(habit.user)

    completions = list(
        HabitCompletion.objects.filter(
            habit=habit,
            is_completed=True,
            date__lte=reference_date
        ).order_by('date').values_list('date', flat=True)
    )
    completed_dates_set = set(completions)
    total_completions = len(completed_dates_set)

    if total_completions == 0:
        habit.current_streak = 0
        habit.longest_streak = 0
        habit.total_completions = 0
        habit.save(update_fields=['current_streak', 'longest_streak', 'total_completions', 'updated_at'])
        return habit

    earliest_date = min(habit.start_date, completions[0])
    total_days = (reference_date - earliest_date).days

    # Cap scan window to 730 days for performance
    if total_days > 730:
        earliest_date = reference_date - datetime.timedelta(days=730)

    longest_streak = 0
    running_streak = 0
    cursor = earliest_date

    while cursor <= reference_date:
        scheduled = is_habit_scheduled_on_date(habit, cursor)
        completed = cursor in completed_dates_set

        if completed:
            running_streak += 1
            if running_streak > longest_streak:
                longest_streak = running_streak
        elif scheduled:
            # If cursor is today and not yet completed, don't break current streak yet
            if cursor < reference_date:
                running_streak = 0
        cursor += datetime.timedelta(days=1)

    habit.current_streak = running_streak
    habit.longest_streak = max(longest_streak, running_streak)
    habit.total_completions = total_completions
    habit.save(update_fields=['current_streak', 'longest_streak', 'total_completions', 'updated_at'])
    return habit


def calculate_user_overall_streaks(user, reference_date: datetime.date | None = None) -> dict:
    """
    Calculate the user's overall daily discipline streak (days where at least 1 scheduled
    habit was completed) and longest streak across active + historical habits.
    """
    if reference_date is None:
        reference_date = get_user_local_date(user)

    completed_dates = sorted(
        set(
            HabitCompletion.objects.filter(
                user=user,
                is_completed=True,
                date__lte=reference_date
            ).values_list('date', flat=True)
        )
    )

    if not completed_dates:
        return {'current_streak': 0, 'longest_streak': 0}

    longest = 0
    current = 0
    prev_date = None

    for d in completed_dates:
        if prev_date is None or (d - prev_date).days == 1:
            current += 1
        elif (d - prev_date).days > 1:
            current = 1
        if current > longest:
            longest = current
        prev_date = d

    # Determine active current streak relative to today / yesterday
    completed_set = set(completed_dates)
    active_streak = 0
    cursor = reference_date
    if cursor not in completed_set:
        cursor = reference_date - datetime.timedelta(days=1)

    while cursor in completed_set:
        active_streak += 1
        cursor -= datetime.timedelta(days=1)

    return {
        'current_streak': active_streak,
        'longest_streak': max(longest, active_streak),
    }


@transaction.atomic
def log_habit_progress(
    user,
    habit: Habit,
    target_date: datetime.date | None = None,
    progress_value: float | None = None,
    increment_by: float | None = None,
    toggle: bool = False,
    notes: str | None = None,
) -> tuple[HabitCompletion, list[dict]]:
    """
    Record or update a habit completion for a given date.
    Supports boolean toggle, partial numerical/duration/quantity progress,
    recalculates streaks, updates linked goals, and evaluates achievements.
    """
    if target_date is None:
        target_date = get_user_local_date(user)

    existing = HabitCompletion.objects.filter(habit=habit, date=target_date).first()
    target_val = max(float(habit.target_value or 1.0), 0.1)

    if toggle:
        if existing and existing.is_completed:
            new_value = 0.0
        else:
            new_value = target_val
    elif increment_by is not None:
        base_val = existing.progress_value if existing else 0.0
        new_value = max(0.0, round(base_val + float(increment_by), 2))
    elif progress_value is not None:
        new_value = max(0.0, round(float(progress_value), 2))
    else:
        new_value = target_val

    completion, _ = HabitCompletion.objects.update_or_create(
        habit=habit,
        date=target_date,
        defaults={
            'user': user,
            'progress_value': new_value,
            'target_snapshot': target_val,
            'is_completed': new_value >= target_val,
            'notes': notes if notes is not None else (existing.notes if existing else ''),
        }
    )

    recalculate_habit_streaks(habit, get_user_local_date(user))

    # Update any linked goals
    for goal in habit.linked_goals.all():
        recalculate_goal_progress(goal)

    newly_unlocked = evaluate_user_achievements(user)
    return completion, newly_unlocked


def recalculate_goal_progress(goal: Goal) -> Goal:
    """Recalculate a goal's progress percentage from its milestones (and linked habits if no milestones)."""
    milestones = list(goal.milestones.all())
    if milestones:
        completed_count = sum(1 for m in milestones if m.is_completed)
        pct = round((completed_count / len(milestones)) * 100.0, 1)
        goal.progress_percentage = pct
        if pct >= 100.0 and not goal.is_completed:
            goal.is_completed = True
            goal.status = 'completed'
            goal.completed_at = timezone.now()
        elif pct < 100.0 and goal.is_completed:
            goal.is_completed = False
            goal.status = 'active'
            goal.completed_at = None
        goal.save(update_fields=['progress_percentage', 'is_completed', 'status', 'completed_at', 'updated_at'])
    return goal


def evaluate_user_achievements(user) -> list[dict]:
    """
    Check all Achievement definitions against the user's real progress and unlock
    any newly earned achievements. Returns list of newly unlocked achievement dicts.
    """
    total_completed = HabitCompletion.objects.filter(user=user, is_completed=True).count()
    streaks = calculate_user_overall_streaks(user)
    max_habit_streak = (
        Habit.objects.filter(user=user).order_by('-longest_streak').values_list('longest_streak', flat=True).first()
        or 0
    )
    best_streak = max(streaks['longest_streak'], max_habit_streak)

    today = get_user_local_date(user)
    month_start = today.replace(day=1)
    monthly_completed = HabitCompletion.objects.filter(
        user=user,
        is_completed=True,
        date__gte=month_start,
        date__lte=today
    ).count()

    journal_count = JournalEntry.objects.filter(user=user).count()
    fav_quotes_count = FavoriteQuote.objects.filter(user=user).count()

    existing_codes = set(
        UserAchievement.objects.filter(user=user).values_list('achievement__code', flat=True)
    )
    all_achievements = Achievement.objects.all()
    newly_unlocked = []

    for ach in all_achievements:
        if ach.code in existing_codes:
            continue

        should_unlock = False
        if ach.code == 'first_habit' and total_completed >= 1:
            should_unlock = True
        elif ach.code == 'seven_day_consistency' and best_streak >= 7:
            should_unlock = True
        elif ach.code == 'thirty_day_consistency' and best_streak >= 30:
            should_unlock = True
        elif ach.code == 'hundred_completions' and total_completed >= 100:
            should_unlock = True
        elif ach.code == 'monthly_discipline' and monthly_completed >= 25:
            should_unlock = True
        elif ach.code == 'personal_best' and best_streak >= 14:
            should_unlock = True
        elif ach.code == 'mindful_scribe' and journal_count >= 5:
            should_unlock = True
        elif ach.code == 'stoic_student' and fav_quotes_count >= 3:
            should_unlock = True

        if should_unlock:
            ua = UserAchievement.objects.create(user=user, achievement=ach)
            Notification.objects.create(
                user=user,
                title=f"Achievement Unlocked: {ach.title}",
                message=ach.description,
                notification_type='achievement',
                action_url='/dashboard',
            )
            newly_unlocked.append({
                'id': ua.id,
                'code': ach.code,
                'title': ach.title,
                'description': ach.description,
                'icon': ach.icon,
                'badge_color': ach.badge_color,
                'unlocked_at': ua.unlocked_at.isoformat(),
            })

    return newly_unlocked


def get_daily_stoic_quote(target_date: datetime.date | None = None) -> StoicQuote | None:
    if target_date is None:
        target_date = timezone.localdate()
    quotes = list(StoicQuote.objects.all().order_by('day_index', 'id'))
    if not quotes:
        return None
    day_of_year = target_date.timetuple().tm_yday
    idx = (day_of_year - 1) % len(quotes)
    return quotes[idx]


def build_dashboard_summary(user, target_date: datetime.date | None = None) -> dict:
    """
    Build the complete dashboard payload from real database records.
    """
    today = get_user_local_date(user, target_date)
    active_habits = list(Habit.objects.filter(user=user, is_archived=False).select_related('category'))

    todays_Completions_map = {
        c.habit_id: c
        for c in HabitCompletion.objects.filter(user=user, date=today)
    }

    todays_habits_payload = []
    scheduled_today_count = 0
    completed_today_count = 0
    partial_progress_ratio_sum = 0.0

    for habit in active_habits:
        scheduled = is_habit_scheduled_on_date(habit, today)
        comp = todays_Completions_map.get(habit.id)
        progress_val = comp.progress_value if comp else 0.0
        target_val = max(habit.target_value, 0.1)
        is_done = comp.is_completed if comp else False
        pct = min(100.0, round((progress_val / target_val) * 100.0, 1))

        if scheduled:
            scheduled_today_count += 1
            if is_done:
                completed_today_count += 1
                partial_progress_ratio_sum += 1.0
            else:
                partial_progress_ratio_sum += min(1.0, progress_val / target_val)

        if scheduled or is_done or progress_val > 0:
            todays_habits_payload.append({
                'id': habit.id,
                'name': habit.name,
                'description': habit.description,
                'category_name': habit.category_name,
                'icon': habit.icon,
                'color': habit.color,
                'priority': habit.priority,
                'difficulty': habit.difficulty,
                'tracking_type': habit.tracking_type,
                'target_value': habit.target_value,
                'unit': habit.unit,
                'frequency': habit.frequency,
                'current_streak': habit.current_streak,
                'longest_streak': habit.longest_streak,
                'is_scheduled_today': scheduled,
                'progress_value': progress_val,
                'progress_percentage': pct,
                'is_completed': is_done,
                'notes': comp.notes if comp else '',
            })

    daily_completion_pct = (
        round((completed_today_count / scheduled_today_count) * 100.0, 1)
        if scheduled_today_count > 0
        else 0.0
    )
    remaining_today_count = max(0, scheduled_today_count - completed_today_count)

    # Weekly activity (last 7 days ending today)
    weekly_activity = []
    week_scheduled_total = 0
    week_completed_total = 0

    week_start_date = today - datetime.timedelta(days=6)
    week_completions = HabitCompletion.objects.filter(
        user=user,
        date__gte=week_start_date,
        date__lte=today
    )
    completions_by_date_habit = {(c.date, c.habit_id): c for c in week_completions}

    for i in range(7):
        d = week_start_date + datetime.timedelta(days=i)
        day_sched = 0
        day_comp = 0
        for h in active_habits:
            if is_habit_scheduled_on_date(h, d):
                day_sched += 1
                c = completions_by_date_habit.get((d, h.id))
                if c and c.is_completed:
                    day_comp += 1
        week_scheduled_total += day_sched
        week_completed_total += day_comp
        rate = round((day_comp / day_sched) * 100.0, 1) if day_sched > 0 else 0.0
        weekly_activity.append({
            'date': d.isoformat(),
            'day': SHORT_WEEKDAY_NAMES[d.weekday()],
            'full_day': WEEKDAY_NAMES[d.weekday()],
            'scheduled': day_sched,
            'completed': day_comp,
            'completion_rate': rate,
        })

    weekly_consistency_score = (
        round((week_completed_total / week_scheduled_total) * 100.0, 1)
        if week_scheduled_total > 0
        else 0.0
    )

    overall_streaks = calculate_user_overall_streaks(user, today)
    max_habit_longest = max((h.longest_streak for h in active_habits), default=0)

    # Daily intention
    intention = DailyIntention.objects.filter(user=user, date=today).first()
    intention_data = None
    if intention:
        intention_data = {
            'id': intention.id,
            'date': intention.date.isoformat(),
            'intention_text': intention.intention_text,
            'focus_category': intention.focus_category,
            'is_completed': intention.is_completed,
            'reflection_note': intention.reflection_note,
        }

    # Daily Stoic Quote
    quote = get_daily_stoic_quote(today)
    quote_data = None
    if quote:
        is_fav = FavoriteQuote.objects.filter(user=user, quote=quote).exists()
        quote_data = {
            'id': quote.id,
            'text': quote.text,
            'philosopher': quote.philosopher,
            'philosopher_title': quote.philosopher_title,
            'category': quote.category,
            'source_reference': quote.source_reference,
            'is_direct_quote': quote.is_direct_quote,
            'editorial_commentary': quote.editorial_commentary,
            'is_favorite': is_fav,
        }

    # Upcoming goals
    goals_qs = Goal.objects.filter(user=user, is_completed=False).prefetch_related('milestones')[:4]
    upcoming_goals = []
    for g in goals_qs:
        milestones = list(g.milestones.all())
        upcoming_goals.append({
            'id': g.id,
            'title': g.title,
            'category': g.category,
            'goal_type': g.goal_type,
            'target_date': g.target_date.isoformat(),
            'progress_percentage': g.progress_percentage,
            'color': g.color,
            'completed_milestones': sum(1 for m in milestones if m.is_completed),
            'total_milestones': len(milestones),
        })

    # Recent achievements
    recent_achievements = []
    for ua in UserAchievement.objects.filter(user=user).select_related('achievement')[:4]:
        recent_achievements.append({
            'id': ua.id,
            'code': ua.achievement.code,
            'title': ua.achievement.title,
            'description': ua.achievement.description,
            'icon': ua.achievement.icon,
            'badge_color': ua.achievement.badge_color,
            'unlocked_at': ua.unlocked_at.isoformat(),
        })

    # Today's journal entry if any
    todays_journal = JournalEntry.objects.filter(user=user, date=today).first()

    return {
        'date': today.isoformat(),
        'overview': {
            'daily_completion_percentage': daily_completion_pct,
            'total_scheduled_habits': scheduled_today_count,
            'completed_habits': completed_today_count,
            'remaining_habits': remaining_today_count,
            'current_streak': overall_streaks['current_streak'],
            'longest_streak': max(overall_streaks['longest_streak'], max_habit_longest),
            'weekly_consistency_score': weekly_consistency_score,
            'week_completed_total': week_completed_total,
            'week_scheduled_total': week_scheduled_total,
        },
        'todays_habits': todays_habits_payload,
        'weekly_activity': weekly_activity,
        'daily_quote': quote_data,
        'daily_intention': intention_data,
        'upcoming_goals': upcoming_goals,
        'recent_achievements': recent_achievements,
        'has_journal_today': todays_journal is not None,
    }


def build_analytics_report(
    user,
    range_key: str = '30d',
    start_date_str: str | None = None,
    end_date_str: str | None = None,
) -> dict:
    """
    Comprehensive analytics calculation engine using actual user database records.
    """
    today = get_user_local_date(user)

    if range_key == '7d':
        start_date = today - datetime.timedelta(days=6)
        end_date = today
    elif range_key == '90d':
        start_date = today - datetime.timedelta(days=89)
        end_date = today
    elif range_key == '12m':
        start_date = today - datetime.timedelta(days=364)
        end_date = today
    elif range_key == 'custom' and start_date_str and end_date_str:
        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
            if start_date > end_date:
                start_date, end_date = end_date, start_date
        except ValueError:
            start_date = today - datetime.timedelta(days=29)
            end_date = today
    else:
        start_date = today - datetime.timedelta(days=29)
        end_date = today

    habits = list(Habit.objects.filter(user=user))
    active_habits = [h for h in habits if not h.is_archived]

    completions_in_range = list(
        HabitCompletion.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        )
    )
    comp_map = {(c.date, c.habit_id): c for c in completions_in_range}

    total_scheduled_occurrences = 0
    total_completed_scheduled = 0
    total_partial_occurrences = 0
    total_missed_occurrences = 0

    daily_series = []
    weekday_stats = {i: {'scheduled': 0, 'completed': 0} for i in range(7)}
    category_stats = defaultdict(lambda: {'scheduled': 0, 'completed': 0, 'color': '#0066CC'})
    habit_stats = {
        h.id: {
            'id': h.id,
            'name': h.name,
            'category': h.category_name,
            'color': h.color,
            'icon': h.icon,
            'scheduled': 0,
            'completed': 0,
            'current_streak': h.current_streak,
            'longest_streak': h.longest_streak,
        }
        for h in habits
    }

    active_days_with_completion = 0
    total_scheduled_days = 0

    cursor = start_date
    while cursor <= end_date:
        day_sched = 0
        day_comp = 0
        day_partial = 0
        wd = cursor.weekday()

        for h in habits:
            # Skip archived habits if they had no completions in range and were archived earlier
            if h.is_archived and (cursor, h.id) not in comp_map:
                continue
            if is_habit_scheduled_on_date(h, cursor):
                day_sched += 1
                total_scheduled_occurrences += 1
                weekday_stats[wd]['scheduled'] += 1
                category_stats[h.category_name]['scheduled'] += 1
                category_stats[h.category_name]['color'] = h.color
                habit_stats[h.id]['scheduled'] += 1

                c = comp_map.get((cursor, h.id))
                if c and c.is_completed:
                    day_comp += 1
                    total_completed_scheduled += 1
                    weekday_stats[wd]['completed'] += 1
                    category_stats[h.category_name]['completed'] += 1
                    habit_stats[h.id]['completed'] += 1
                elif c and c.progress_value > 0:
                    day_partial += 1
                    total_partial_occurrences += 1
                else:
                    total_missed_occurrences += 1

        if day_sched > 0:
            total_scheduled_days += 1
            if day_comp > 0:
                active_days_with_completion += 1

        rate = round((day_comp / day_sched) * 100.0, 1) if day_sched > 0 else 0.0
        daily_series.append({
            'date': cursor.isoformat(),
            'label': cursor.strftime('%b %d'),
            'scheduled': day_sched,
            'completed': day_comp,
            'partial': day_partial,
            'completion_rate': rate,
        })
        cursor += datetime.timedelta(days=1)

    raw_completion_rate = (
        round((total_completed_scheduled / total_scheduled_occurrences) * 100.0, 1)
        if total_scheduled_occurrences > 0
        else 0.0
    )

    # Consistency score blends raw completion rate (75% weight) and daily presence stability (25% weight)
    daily_presence_rate = (
        (active_days_with_completion / total_scheduled_days) * 100.0
        if total_scheduled_days > 0
        else 0.0
    )
    consistency_score = round((raw_completion_rate * 0.75) + (daily_presence_rate * 0.25), 1)

    # Today, 7d, and 30d rates for main metrics cards
    today_series_item = next((d for d in reversed(daily_series) if d['date'] == today.isoformat()), None)
    daily_rate_today = today_series_item['completion_rate'] if today_series_item else 0.0

    last_7 = daily_series[-7:] if len(daily_series) >= 7 else daily_series
    sched_7 = sum(d['scheduled'] for d in last_7)
    comp_7 = sum(d['completed'] for d in last_7)
    weekly_rate = round((comp_7 / sched_7) * 100.0, 1) if sched_7 > 0 else 0.0

    last_30 = daily_series[-30:] if len(daily_series) >= 30 else daily_series
    sched_30 = sum(d['scheduled'] for d in last_30)
    comp_30 = sum(d['completed'] for d in last_30)
    monthly_rate = round((comp_30 / sched_30) * 100.0, 1) if sched_30 > 0 else 0.0

    # Habit performance ranking
    habit_performance = []
    for h_id, st in habit_stats.items():
        if st['scheduled'] > 0:
            rate = round((st['completed'] / st['scheduled']) * 100.0, 1)
            habit_performance.append({
                **st,
                'completion_rate': rate,
            })
    habit_performance.sort(key=lambda x: (-x['completion_rate'], -x['completed']))

    best_habit = habit_performance[0] if habit_performance else None
    lowest_habit = habit_performance[-1] if len(habit_performance) > 1 else best_habit

    # Category performance
    category_performance = []
    for cat_name, st in category_stats.items():
        if st['scheduled'] > 0:
            rate = round((st['completed'] / st['scheduled']) * 100.0, 1)
            category_performance.append({
                'category': cat_name,
                'scheduled': st['scheduled'],
                'completed': st['completed'],
                'completion_rate': rate,
                'color': st['color'],
            })
    category_performance.sort(key=lambda x: -x['completion_rate'])
    most_consistent_category = category_performance[0]['category'] if category_performance else 'None'

    # Weekday comparison
    weekday_performance = []
    best_weekday_name = 'Monday'
    best_weekday_rate = -1.0
    for wd_idx in range(7):
        st = weekday_stats[wd_idx]
        rate = round((st['completed'] / st['scheduled']) * 100.0, 1) if st['scheduled'] > 0 else 0.0
        weekday_performance.append({
            'weekday': SHORT_WEEKDAY_NAMES[wd_idx],
            'full_weekday': WEEKDAY_NAMES[wd_idx],
            'scheduled': st['scheduled'],
            'completed': st['completed'],
            'completion_rate': rate,
        })
        if st['scheduled'] > 0 and rate > best_weekday_rate:
            best_weekday_rate = rate
            best_weekday_name = WEEKDAY_NAMES[wd_idx]

    # Monthly progress chart (last 6 months)
    monthly_progress = []
    for m_offset in range(5, -1, -1):
        # Compute month start & end
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
            user=user,
            is_completed=True,
            date__gte=m_start,
            date__lte=m_end
        ).count()

        # Estimate scheduled in month
        m_sched = 0
        d_cur = m_start
        while d_cur <= m_end:
            for h in active_habits:
                if is_habit_scheduled_on_date(h, d_cur):
                    m_sched += 1
            d_cur += datetime.timedelta(days=1)

        m_rate = round((m_comps / m_sched) * 100.0, 1) if m_sched > 0 else 0.0
        monthly_progress.append({
            'month': m_start.strftime('%b %Y'),
            'short_month': m_start.strftime('%b'),
            'scheduled': m_sched,
            'completed': m_comps,
            'completion_rate': m_rate,
        })

    # 365-day GitHub-style yearly heatmap
    heatmap_start = today - datetime.timedelta(days=364)
    yearly_completions = list(
        HabitCompletion.objects.filter(
            user=user,
            is_completed=True,
            date__gte=heatmap_start,
            date__lte=today
        ).values('date').annotate(count=Count('id'))
    )
    yearly_counts_by_date = {item['date']: item['count'] for item in yearly_completions}
    yearly_heatmap = []
    h_cursor = heatmap_start
    while h_cursor <= today:
        cnt = yearly_counts_by_date.get(h_cursor, 0)
        # Level 0..4
        if cnt == 0:
            level = 0
        elif cnt <= 2:
            level = 1
        elif cnt <= 4:
            level = 2
        elif cnt <= 6:
            level = 3
        else:
            level = 4
        yearly_heatmap.append({
            'date': h_cursor.isoformat(),
            'count': cnt,
            'level': level,
            'weekday': h_cursor.weekday(),
        })
        h_cursor += datetime.timedelta(days=1)

    # Completion distribution
    completion_distribution = [
        {'name': 'Completed', 'value': total_completed_scheduled, 'color': '#28A745'},
        {'name': 'Partial Progress', 'value': total_partial_occurrences, 'color': '#D97706'},
        {'name': 'Missed', 'value': total_missed_occurrences, 'color': '#8E8E93'},
    ]

    # Streak history per habit
    streak_history = [
        {
            'habit_id': h.id,
            'name': h.name,
            'current_streak': h.current_streak,
            'longest_streak': h.longest_streak,
            'color': h.color,
        }
        for h in active_habits
    ]

    # Historical cumulative progress timeline
    cumulative = 0
    progress_timeline = []
    for item in daily_series:
        cumulative += item['completed']
        progress_timeline.append({
            'date': item['date'],
            'label': item['label'],
            'cumulative_completions': cumulative,
            'daily_completed': item['completed'],
        })

    # Data-backed Intelligent Insights
    insights = []
    if best_habit and best_habit['scheduled'] >= 3:
        insights.append({
            'type': 'strength',
            'title': 'Top Habit Anchor',
            'message': f"Your most consistent habit is '{best_habit['name']}' with a {best_habit['completion_rate']}% completion rate ({best_habit['completed']}/{best_habit['scheduled']} scheduled sessions).",
        })

    # Weekday vs Weekend comparison
    weekday_sched = sum(weekday_stats[i]['scheduled'] for i in range(5))
    weekday_comp = sum(weekday_stats[i]['completed'] for i in range(5))
    weekend_sched = sum(weekday_stats[i]['scheduled'] for i in (5, 6))
    weekend_comp = sum(weekday_stats[i]['completed'] for i in (5, 6))

    if weekday_sched > 0 and weekend_sched > 0:
        wd_rate = round((weekday_comp / weekday_sched) * 100.0, 1)
        we_rate = round((weekend_comp / weekend_sched) * 100.0, 1)
        if wd_rate >= we_rate + 5:
            insights.append({
                'type': 'pattern',
                'title': 'Weekday vs. Weekend Rhythm',
                'message': f"You perform better on weekdays ({wd_rate}%) than weekends ({we_rate}%). Consider simplifying weekend habit targets to protect your streaks.",
            })
        elif we_rate > wd_rate + 5:
            insights.append({
                'type': 'pattern',
                'title': 'Strong Weekend Momentum',
                'message': f"Your weekend completion rate ({we_rate}%) exceeds your weekday rate ({wd_rate}%).",
            })

    if len(monthly_progress) >= 2:
        curr_m = monthly_progress[-1]
        prev_m = monthly_progress[-2]
        if curr_m['completed'] > prev_m['completed']:
            insights.append({
                'type': 'growth',
                'title': 'Positive Monthly Trajectory',
                'message': f"You have already completed {curr_m['completed']} habits in {curr_m['short_month']}, surpassing {prev_m['short_month']} ({prev_m['completed']}).",
            })
        elif prev_m['completion_rate'] > curr_m['completion_rate'] + 8 and curr_m['scheduled'] >= 5:
            insights.append({
                'type': 'opportunity',
                'title': 'Consistency Opportunity',
                'message': f"Your completion rate this month ({curr_m['completion_rate']}%) is slightly below last month ({prev_m['completion_rate']}%).",
            })

    if category_performance:
        top_cat = category_performance[0]
        insights.append({
            'type': 'category',
            'title': 'Strongest Growth Domain',
            'message': f"Your strongest category is {top_cat['category']} at {top_cat['completion_rate']}% consistency across {top_cat['scheduled']} scheduled occurrences.",
        })

    if lowest_habit and best_habit and lowest_habit['id'] != best_habit['id'] and lowest_habit['completion_rate'] < 75:
        insights.append({
            'type': 'focus',
            'title': 'Friction Point Identified',
            'message': f"'{lowest_habit['name']}' has the lowest completion rate ({lowest_habit['completion_rate']}%). Stacking it immediately after '{best_habit['name']}' can improve follow-through.",
        })

    overall_streaks = calculate_user_overall_streaks(user, today)
    max_habit_longest = max((h.longest_streak for h in habits), default=0)
    total_all_time_completions = HabitCompletion.objects.filter(user=user, is_completed=True).count()

    return {
        'range': {
            'key': range_key,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'metrics': {
            'consistency_score': consistency_score,
            'completion_rate': raw_completion_rate,
            'total_scheduled': total_scheduled_occurrences,
            'total_completed_in_range': total_completed_scheduled,
            'total_all_time_completions': total_all_time_completions,
            'daily_completion_rate': daily_rate_today,
            'weekly_completion_rate': weekly_rate,
            'monthly_completion_rate': monthly_rate,
            'current_streak': overall_streaks['current_streak'],
            'longest_streak': max(overall_streaks['longest_streak'], max_habit_longest),
            'best_performing_habit': best_habit['name'] if best_habit else 'N/A',
            'best_performing_habit_rate': best_habit['completion_rate'] if best_habit else 0.0,
            'lowest_performing_habit': lowest_habit['name'] if lowest_habit else 'N/A',
            'lowest_performing_habit_rate': lowest_habit['completion_rate'] if lowest_habit else 0.0,
            'most_productive_weekday': best_weekday_name,
            'most_consistent_category': most_consistent_category,
        },
        'daily_series': daily_series,
        'weekday_performance': weekday_performance,
        'monthly_progress': monthly_progress,
        'category_performance': category_performance,
        'habit_performance': habit_performance,
        'completion_distribution': completion_distribution,
        'streak_history': streak_history,
        'progress_timeline': progress_timeline,
        'yearly_heatmap': yearly_heatmap,
        'insights': insights,
    }


def generate_or_get_review(
    user,
    review_type: str = 'weekly',
    period_start_str: str | None = None,
) -> WeeklyReview:
    """
    Generate or update a Weekly or Monthly review with real historical data,
    preserving any user reflection answers.
    """
    today = get_user_local_date(user)

    if review_type == 'monthly':
        if period_start_str:
            try:
                parsed = datetime.date.fromisoformat(period_start_str)
                period_start = parsed.replace(day=1)
            except ValueError:
                period_start = today.replace(day=1)
        else:
            period_start = today.replace(day=1)

        if period_start.month == 12:
            period_end = datetime.date(period_start.year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            period_end = datetime.date(period_start.year, period_start.month + 1, 1) - datetime.timedelta(days=1)
        effective_end = min(period_end, today)
    else:
        review_type = 'weekly'
        if period_start_str:
            try:
                parsed = datetime.date.fromisoformat(period_start_str)
                period_start = parsed - datetime.timedelta(days=parsed.weekday())
            except ValueError:
                period_start = today - datetime.timedelta(days=today.weekday())
        else:
            period_start = today - datetime.timedelta(days=today.weekday())
        period_end = period_start + datetime.timedelta(days=6)
        effective_end = min(period_end, today)

    report = build_analytics_report(
        user,
        range_key='custom',
        start_date_str=period_start.isoformat(),
        end_date_str=effective_end.isoformat(),
    )

    # Compute previous period comparison
    span_days = max(1, (effective_end - period_start).days + 1)
    prev_end = period_start - datetime.timedelta(days=1)
    prev_start = prev_end - datetime.timedelta(days=span_days - 1)
    prev_report = build_analytics_report(
        user,
        range_key='custom',
        start_date_str=prev_start.isoformat(),
        end_date_str=prev_end.isoformat(),
    )

    journals_count = JournalEntry.objects.filter(
        user=user,
        date__gte=period_start,
        date__lte=effective_end
    ).count()
    intentions_completed = DailyIntention.objects.filter(
        user=user,
        date__gte=period_start,
        date__lte=effective_end,
        is_completed=True
    ).count()
    goals_list = [
        {
            'id': g.id,
            'title': g.title,
            'category': g.category,
            'progress_percentage': g.progress_percentage,
            'is_completed': g.is_completed,
        }
        for g in Goal.objects.filter(user=user)[:6]
    ]

    metrics = report['metrics']
    prev_metrics = prev_report['metrics']
    rate_delta = round(metrics['completion_rate'] - prev_metrics['completion_rate'], 1)

    payload = {
        'previous_period_rate': prev_metrics['completion_rate'],
        'previous_period_completed': prev_metrics['total_completed_in_range'],
        'rate_delta': rate_delta,
        'consistency_score': metrics['consistency_score'],
        'journals_written': journals_count,
        'intentions_completed': intentions_completed,
        'habit_breakdown': report['habit_performance'],
        'category_breakdown': report['category_performance'],
        'daily_series': report['daily_series'],
        'goals_summary': goals_list,
    }

    review, _ = WeeklyReview.objects.update_or_create(
        user=user,
        review_type=review_type,
        period_start=period_start,
        defaults={
            'period_end': period_end,
            'total_scheduled': metrics['total_scheduled'],
            'total_completed': metrics['total_completed_in_range'],
            'completion_percentage': metrics['completion_rate'],
            'best_habit_name': metrics['best_performing_habit'],
            'lowest_habit_name': metrics['lowest_performing_habit'],
            'best_day_name': metrics['most_productive_weekday'],
            'streak_snapshot': metrics['current_streak'],
            'metrics_payload': payload,
        }
    )
    return review
