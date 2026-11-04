import datetime
import random
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify

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
    Notification,
)
from .services import (
    ensure_user_profile,
    recalculate_habit_streaks,
    recalculate_goal_progress,
    evaluate_user_achievements,
    generate_or_get_review,
)

DEFAULT_CATEGORIES = [
    {'name': 'Health', 'icon': 'Heart', 'color': '#28A745'},
    {'name': 'Fitness', 'icon': 'Dumbbell', 'color': '#0066CC'},
    {'name': 'Learning', 'icon': 'BookOpen', 'color': '#5856D6'},
    {'name': 'Career', 'icon': 'Briefcase', 'color': '#007AFF'},
    {'name': 'Mindfulness', 'icon': 'Sparkles', 'color': '#AF52DE'},
    {'name': 'Productivity', 'icon': 'Zap', 'color': '#FF9500'},
    {'name': 'Personal development', 'icon': 'Compass', 'color': '#34C759'},
    {'name': 'Finance', 'icon': 'Wallet', 'color': '#30B0C7'},
    {'name': 'Other', 'icon': 'Layers', 'color': '#8E8E93'},
]

DEFAULT_ACHIEVEMENTS = [
    {
        'code': 'first_habit',
        'title': 'First Step Taken',
        'description': 'Completed your first scheduled habit. Every lasting transformation begins with a single intentional action.',
        'icon': 'CheckCircle2',
        'category': 'milestone',
        'threshold_value': 1,
        'badge_color': '#28A745',
        'order': 1,
    },
    {
        'code': 'seven_day_consistency',
        'title': 'Seven-Day Consistency',
        'description': 'Maintained a seven-day streak of disciplined daily execution.',
        'icon': 'Flame',
        'category': 'streak',
        'threshold_value': 7,
        'badge_color': '#FF9500',
        'order': 2,
    },
    {
        'code': 'personal_best',
        'title': 'Personal Best Standard',
        'description': 'Reached a 14-day uninterrupted habit streak, establishing a new personal benchmark.',
        'icon': 'Trophy',
        'category': 'streak',
        'threshold_value': 14,
        'badge_color': '#0066CC',
        'order': 3,
    },
    {
        'code': 'thirty_day_consistency',
        'title': 'Thirty-Day Architect',
        'description': 'Sustained thirty consecutive days of habit consistency. What was once effort is now character.',
        'icon': 'Award',
        'category': 'streak',
        'threshold_value': 30,
        'badge_color': '#5856D6',
        'order': 4,
    },
    {
        'code': 'monthly_discipline',
        'title': 'Monthly Discipline',
        'description': 'Logged at least 25 completed habit sessions within a single calendar month.',
        'icon': 'CalendarCheck',
        'category': 'consistency',
        'threshold_value': 25,
        'badge_color': '#30B0C7',
        'order': 5,
    },
    {
        'code': 'hundred_completions',
        'title': 'Centurion of Habit',
        'description': 'Accumulated 100 verified habit completions across your personal growth system.',
        'icon': 'ShieldCheck',
        'category': 'milestone',
        'threshold_value': 100,
        'badge_color': '#AF52DE',
        'order': 6,
    },
    {
        'code': 'mindful_scribe',
        'title': 'Reflective Mind',
        'description': 'Authored 5 self-reflection entries in your private journal.',
        'icon': 'Feather',
        'category': 'reflection',
        'threshold_value': 5,
        'badge_color': '#34C759',
        'order': 7,
    },
    {
        'code': 'stoic_student',
        'title': 'Curator of Wisdom',
        'description': 'Saved at least 3 Stoic passages to your personal philosophy collection.',
        'icon': 'BookMarked',
        'category': 'wisdom',
        'threshold_value': 3,
        'badge_color': '#D97706',
        'order': 8,
    },
]

VERIFIED_STOIC_QUOTES = [
    {
        'day_index': 1,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Discipline',
        'text': 'At dawn, when you have trouble getting out of bed, tell yourself: "I have to go to work — as a human being. What do I have to complain of, if I’m going to do what I was born for — the things I was brought into the world to do?"',
        'source_reference': 'Meditations, Book V, Section 1 (tr. Gregory Hays)',
        'is_direct_quote': True,
        'editorial_commentary': 'Morning resistance is universal. Aurelius reminds himself that purposeful action is not an imposition on human nature, but its highest expression.',
    },
    {
        'day_index': 2,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Discipline',
        'text': 'How long are you going to wait before you demand the best for yourself and in no instance bypass the discriminations of reason?',
        'source_reference': 'Enchiridion (Manual), Chapter 51',
        'is_direct_quote': True,
        'editorial_commentary': 'Self-mastery cannot be indefinitely postponed to a hypothetical future; character is forged only in today’s decisions.',
    },
    {
        'day_index': 3,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Focus',
        'text': 'It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a sufficiently generous amount has been given to us for the highest achievements if it were all well invested.',
        'source_reference': 'On the Shortness of Life (De Brevitate Vitae), Chapter 1',
        'is_direct_quote': True,
        'editorial_commentary': 'Time is rarely our true bottleneck; scattered attention is. Protecting daily focus expands a lifetime.',
    },
    {
        'day_index': 4,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Focus',
        'text': 'Concentrate every minute like a Roman — like a man — on doing what’s in front of you with precise and genuine seriousness, tenderly, willingly, with justice.',
        'source_reference': 'Meditations, Book II, Section 5',
        'is_direct_quote': True,
        'editorial_commentary': 'Treat the current task as if it were the sole object of your attention, free from hurry and distraction.',
    },
    {
        'day_index': 5,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Courage',
        'text': 'It is not because things are difficult that we do not dare; it is because we do not dare that things are difficult.',
        'source_reference': 'Moral Letters to Lucilius, Letter 104, Section 26',
        'is_direct_quote': True,
        'editorial_commentary': 'Hesitation magnifies obstacles in the imagination. Action immediately reduces them to their true proportions.',
    },
    {
        'day_index': 6,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Self-control',
        'text': 'No man is free who is not master of himself.',
        'source_reference': 'Fragments, Fragment 35 (Attributed via Stobaeus)',
        'is_direct_quote': True,
        'editorial_commentary': 'External liberty means little if our impulses, distractions, and moods dictate our every action.',
    },
    {
        'day_index': 7,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Resilience',
        'text': 'The mind adapts and converts to its own purposes the obstacle to our acting. The impediment to action advances action. What stands in the way becomes the way.',
        'source_reference': 'Meditations, Book V, Section 20',
        'is_direct_quote': True,
        'editorial_commentary': 'Every setback contains raw material for practicing patience, adaptability, or resolve.',
    },
    {
        'day_index': 8,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Acceptance',
        'text': 'Make the best use of what is in your power, and take the rest as it happens.',
        'source_reference': 'Discourses, Book I, Chapter 1.17',
        'is_direct_quote': True,
        'editorial_commentary': 'The foundational dichotomy of control: invest 100% of your energy into your own choices, and release anxiety over external outcomes.',
    },
    {
        'day_index': 9,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Wisdom',
        'text': 'If a man knows not to which port he sails, no wind is favorable.',
        'source_reference': 'Moral Letters to Lucilius, Letter 71, Section 3',
        'is_direct_quote': True,
        'editorial_commentary': 'Habits without clear goals and daily intentions are merely motion without direction.',
    },
    {
        'day_index': 10,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Perspective',
        'text': 'You have power over your mind — not outside events. Realize this, and you will find strength.',
        'source_reference': 'Meditations, Book IV (Classical Synthesis / Paraphrase of IV.3 & VI.8)',
        'is_direct_quote': False,
        'editorial_commentary': 'Widely cited modern distillation of Aurelius’s core teaching in Meditations IV.3 and VI.8 on the sovereignty of the ruling center (hegemonikon).',
    },
    {
        'day_index': 11,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Patience',
        'text': 'Nothing great is created suddenly, any more than a bunch of grapes or a fig. If you tell me that you desire a fig, I answer you that there must be time. Let it first blossom, then bear fruit, then ripen.',
        'source_reference': 'Discourses, Book I, Chapter 15.7',
        'is_direct_quote': True,
        'editorial_commentary': 'Personal transformation obeys organic laws. Trust the daily compounding of small habits.',
    },
    {
        'day_index': 12,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Self-control',
        'text': 'We suffer more often in imagination than in reality.',
        'source_reference': 'Moral Letters to Lucilius, Letter 13, Section 4',
        'is_direct_quote': True,
        'editorial_commentary': 'Pre-emptive worry drains the energy required for present execution. Meet reality as it actually arrives.',
    },
    {
        'day_index': 13,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Discipline',
        'text': 'Waste no more time arguing about what a good man should be. Be one.',
        'source_reference': 'Meditations, Book X, Section 16',
        'is_direct_quote': True,
        'editorial_commentary': 'Philosophy is proved in quiet daily conduct, not theoretical debate.',
    },
    {
        'day_index': 14,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Discipline',
        'text': 'Every habit and faculty is maintained and increased by the corresponding actions: the habit of walking by walking, the habit of running by running. If you would be a good reader, read; if a writer, write.',
        'source_reference': 'Discourses, Book II, Chapter 18.1–2',
        'is_direct_quote': True,
        'editorial_commentary': 'Epictetus articulated the science of neuroplasticity two millennia ago: identity is the direct sum of repeated actions.',
    },
    {
        'day_index': 15,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Wisdom',
        'text': 'When the light has been removed and my wife has fallen silent, aware of this habit that’s now mine, I examine my entire day and go back over what I’ve done and said, hiding nothing from myself, passing nothing by.',
        'source_reference': 'On Anger (De Ira), Book III, Chapter 36.3',
        'is_direct_quote': True,
        'editorial_commentary': 'Evening journaling was a cornerstone of Stoic practice—reviewing the day with honest, non-judgmental clarity.',
    },
    {
        'day_index': 16,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Resilience',
        'text': 'Be like the headland against which the waves continually break; it stands firm and tames the fury of the water around it.',
        'source_reference': 'Meditations, Book IV, Section 49',
        'is_direct_quote': True,
        'editorial_commentary': 'Anchor yourself in steady routines so turbulent days break around your composure.',
    },
    {
        'day_index': 17,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Perspective',
        'text': 'Men are disturbed not by things, but by the views which they take of things.',
        'source_reference': 'Enchiridion (Manual), Chapter 5',
        'is_direct_quote': True,
        'editorial_commentary': 'Reframing an event transforms our emotional response and preserves our agency.',
    },
    {
        'day_index': 18,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Focus',
        'text': 'To be everywhere is to be nowhere. People who spend their whole life traveling abroad end up having plenty of places where they can find hospitality, but no real friendships.',
        'source_reference': 'Moral Letters to Lucilius, Letter 2, Section 2',
        'is_direct_quote': True,
        'editorial_commentary': 'Depth beats breadth—whether in reading, craft, or selecting the core habits you commit to mastering.',
    },
    {
        'day_index': 19,
        'philosopher': 'Marcus Aurelius',
        'philosopher_title': 'Roman Emperor & Stoic Philosopher (121–180 AD)',
        'category': 'Patience',
        'text': 'Do not be distressed, do not despond or give up in despair, if now and again practice falls short of precept. Return to the attack after each failure.',
        'source_reference': 'Meditations, Book V, Section 9',
        'is_direct_quote': True,
        'editorial_commentary': 'Missing a single day is human; returning immediately the next morning with self-respect is mastery.',
    },
    {
        'day_index': 20,
        'philosopher': 'Seneca',
        'philosopher_title': 'Roman Stoic Statesman & Dramatist (c. 4 BC–65 AD)',
        'category': 'Courage',
        'text': 'Difficulties strengthen the mind, as labor does the body.',
        'source_reference': 'Moral Letters to Lucilius, Letter 106 / De Providentia IV',
        'is_direct_quote': True,
        'editorial_commentary': 'Voluntary challenge—whether physical training or deep intellectual effort—builds psychological antifragility.',
    },
    {
        'day_index': 21,
        'philosopher': 'Epictetus',
        'philosopher_title': 'Greek Stoic Philosopher (c. 50–c. 135 AD)',
        'category': 'Acceptance',
        'text': 'Do not seek for things to happen the way you want them to; rather, wish that what happens happen the way it happens: then you will be happy.',
        'source_reference': 'Enchiridion (Manual), Chapter 8',
        'is_direct_quote': True,
        'editorial_commentary': 'Amor fati—welcoming present conditions without resentment frees our full energy for constructive response.',
    },
]


def seed_global_reference_data():
    """Ensure default categories, achievements, and Stoic quotes exist in PostgreSQL."""
    for cat in DEFAULT_CATEGORIES:
        HabitCategory.objects.update_or_create(
            user=None,
            slug=slugify(cat['name']),
            defaults={
                'name': cat['name'],
                'icon': cat['icon'],
                'color': cat['color'],
                'is_default': True,
            }
        )

    for ach in DEFAULT_ACHIEVEMENTS:
        Achievement.objects.update_or_create(
            code=ach['code'],
            defaults={
                'title': ach['title'],
                'description': ach['description'],
                'icon': ach['icon'],
                'category': ach['category'],
                'threshold_value': ach['threshold_value'],
                'badge_color': ach['badge_color'],
                'order': ach['order'],
            }
        )

    for q in VERIFIED_STOIC_QUOTES:
        StoicQuote.objects.update_or_create(
            day_index=q['day_index'],
            philosopher=q['philosopher'],
            source_reference=q['source_reference'],
            defaults={
                'philosopher_title': q['philosopher_title'],
                'category': q['category'],
                'text': q['text'],
                'is_direct_quote': q['is_direct_quote'],
                'editorial_commentary': q['editorial_commentary'],
            }
        )


def seed_demo_account():
    """
    Create or update the demo account (alex@habitude.app / Habitude2026!)
    with 45 days of realistic habit completions, goals, milestones, journals,
    daily intentions, favorite quotes, and reviews.
    """
    seed_global_reference_data()

    user, created = User.objects.get_or_create(
        username='alex@habitude.app',
        defaults={
            'email': 'alex@habitude.app',
            'first_name': 'Alex',
            'last_name': 'Mercer',
        }
    )
    if created:
        user.set_password('Habitude2026!')
        user.save()

    profile = ensure_user_profile(user)
    profile.full_name = 'Alex Mercer'
    profile.bio = 'Product architect & lifelong learner cultivating daily clarity, physical vitality, and Stoic equanimity.'
    profile.personal_motto = 'Small actions. Remarkable transformation.'
    profile.save()

    # Only seed habits if user doesn't have any yet
    if Habit.objects.filter(user=user).exists():
        return user

    today = timezone.localdate()
    start_45 = today - datetime.timedelta(days=45)

    categories = {c.name: c for c in HabitCategory.objects.filter(is_default=True)}

    habits_spec = [
        {
            'name': 'Morning Mindfulness Meditation',
            'description': '20 minutes of quiet breath and awareness practice before checking any screens.',
            'category_name': 'Mindfulness',
            'icon': 'Sparkles',
            'color': '#AF52DE',
            'priority': 'high',
            'difficulty': 'medium',
            'tracking_type': 'duration',
            'target_value': 20.0,
            'unit': 'minutes',
            'frequency': 'daily',
            'selected_weekdays': [0, 1, 2, 3, 4, 5, 6],
            'reminder_enabled': True,
            'reminder_time': datetime.time(7, 0),
            'rate': 0.91,
        },
        {
            'name': 'Deep Philosophical & Non-Fiction Reading',
            'description': 'Read 25 pages of classic philosophy, history, or technical craft.',
            'category_name': 'Learning',
            'icon': 'BookOpen',
            'color': '#5856D6',
            'priority': 'high',
            'difficulty': 'medium',
            'tracking_type': 'numerical',
            'target_value': 25.0,
            'unit': 'pages',
            'frequency': 'daily',
            'selected_weekdays': [0, 1, 2, 3, 4, 5, 6],
            'reminder_enabled': True,
            'reminder_time': datetime.time(21, 0),
            'rate': 0.88,
        },
        {
            'name': 'Strength & Zone 2 Conditioning',
            'description': 'Structured resistance training or aerobic endurance session.',
            'category_name': 'Fitness',
            'icon': 'Dumbbell',
            'color': '#0066CC',
            'priority': 'high',
            'difficulty': 'hard',
            'tracking_type': 'duration',
            'target_value': 45.0,
            'unit': 'minutes',
            'frequency': 'weekdays',
            'selected_weekdays': [0, 1, 3, 4, 5],
            'reminder_enabled': True,
            'reminder_time': datetime.time(17, 30),
            'rate': 0.84,
        },
        {
            'name': 'Optimal Cellular Hydration',
            'description': 'Drink 3.0 litres of pure water and electrolytes throughout the day.',
            'category_name': 'Health',
            'icon': 'Droplets',
            'color': '#30B0C7',
            'priority': 'medium',
            'difficulty': 'easy',
            'tracking_type': 'quantity',
            'target_value': 3.0,
            'unit': 'litres',
            'frequency': 'daily',
            'selected_weekdays': [0, 1, 2, 3, 4, 5, 6],
            'reminder_enabled': False,
            'reminder_time': None,
            'rate': 0.86,
        },
        {
            'name': '90-Minute Uninterrupted Deep Work Block',
            'description': 'Zero notifications, single-task architectural or creative output.',
            'category_name': 'Productivity',
            'icon': 'Zap',
            'color': '#FF9500',
            'priority': 'high',
            'difficulty': 'hard',
            'tracking_type': 'boolean',
            'target_value': 1.0,
            'unit': 'session',
            'frequency': 'weekdays',
            'selected_weekdays': [0, 1, 2, 3, 4],
            'reminder_enabled': True,
            'reminder_time': datetime.time(9, 0),
            'rate': 0.90,
        },
        {
            'name': 'Evening Digital Sunset & Stoic Review',
            'description': 'Disconnect from devices 60 minutes before sleep and review daily actions.',
            'category_name': 'Personal development',
            'icon': 'Moon',
            'color': '#28A745',
            'priority': 'medium',
            'difficulty': 'medium',
            'tracking_type': 'boolean',
            'target_value': 1.0,
            'unit': 'evening',
            'frequency': 'daily',
            'selected_weekdays': [0, 1, 2, 3, 4, 5, 6],
            'reminder_enabled': True,
            'reminder_time': datetime.time(21, 30),
            'rate': 0.78,
        },
    ]

    rng = random.Random(42)
    created_habits = []

    for spec in habits_spec:
        rate = spec.pop('rate')
        cat = categories.get(spec['category_name'])
        habit = Habit.objects.create(
            user=user,
            category=cat,
            start_date=start_45,
            **spec
        )
        HabitSchedule.objects.create(
            habit=habit,
            frequency_type=habit.frequency,
            days_of_week=habit.selected_weekdays,
            times_per_week=len(habit.selected_weekdays),
        )
        created_habits.append((habit, rate))

    # Populate 45 days of historical completions + today's partial/completed state
    for idx, (habit, base_rate) in enumerate(created_habits):
        d = start_45
        while d < today:
            if d.weekday() in habit.selected_weekdays:
                # Guarantee last 9 days completed for top habits so active streak is realistic
                days_ago = (today - d).days
                completed = (days_ago <= 10 and idx < 4) or (rng.random() < base_rate)
                if completed:
                    HabitCompletion.objects.create(
                        habit=habit,
                        user=user,
                        date=d,
                        progress_value=habit.target_value,
                        target_snapshot=habit.target_value,
                        is_completed=True,
                    )
                elif rng.random() < 0.45 and habit.tracking_type != 'boolean':
                    partial = round(habit.target_value * 0.5, 1)
                    HabitCompletion.objects.create(
                        habit=habit,
                        user=user,
                        date=d,
                        progress_value=partial,
                        target_snapshot=habit.target_value,
                        is_completed=False,
                    )
            d += datetime.timedelta(days=1)

        # Today's status: first 3 completed, 4th partial, remaining pending
        if idx < 3:
            HabitCompletion.objects.create(
                habit=habit,
                user=user,
                date=today,
                progress_value=habit.target_value,
                target_snapshot=habit.target_value,
                is_completed=True,
                notes='Completed on schedule with calm focus.',
            )
        elif idx == 3:
            HabitCompletion.objects.create(
                habit=habit,
                user=user,
                date=today,
                progress_value=2.0,
                target_snapshot=habit.target_value,
                is_completed=False,
                notes='2.0L logged by afternoon.',
            )

        recalculate_habit_streaks(habit, today)

    # Create Goals & Milestones
    g1 = Goal.objects.create(
        user=user,
        title='Read 24 Foundational Philosophy & Systems Books This Year',
        description='Build a deep mental latticework across Stoic ethics, cognitive science, and systems architecture.',
        category='Learning',
        goal_type='learning',
        start_date=today - datetime.timedelta(days=60),
        target_date=today + datetime.timedelta(days=90),
        color='#5856D6',
        priority='high',
    )
    g1.associated_habits.add(created_habits[1][0])
    m1_specs = [
        ('Complete Marcus Aurelius — Meditations (Gregory Hays translation)', True, -40),
        ('Complete Seneca — Letters from a Stoic', True, -20),
        ('Complete Epictetus — Discourses and Selected Writings', True, -5),
        ('Complete Thinking in Systems & Synthesize Personal Notes', False, 25),
    ]
    for order_idx, (m_title, m_done, offset) in enumerate(m1_specs):
        GoalMilestone.objects.create(
            goal=g1,
            title=m_title,
            target_date=today + datetime.timedelta(days=offset),
            is_completed=m_done,
            completed_at=timezone.now() if m_done else None,
            order=order_idx,
        )
    recalculate_goal_progress(g1)

    g2 = Goal.objects.create(
        user=user,
        title='Complete 10km Run Under 46 Minutes & Peak Aerobic Base',
        description='Sustained Zone 2 cardiovascular training paired with progressive strength conditioning.',
        category='Fitness',
        goal_type='fitness',
        start_date=today - datetime.timedelta(days=45),
        target_date=today + datetime.timedelta(days=45),
        color='#0066CC',
        priority='high',
    )
    g2.associated_habits.add(created_habits[2][0], created_habits[3][0])
    for order_idx, (m_title, m_done, offset) in enumerate([
        ('Establish 4x weekly Zone 2 cadence for 30 days', True, -15),
        ('Run 5km benchmark time trial under 22:30', True, -3),
        ('Complete 12km endurance progression run', False, 14),
        ('Sub-46 minute 10km race pace execution', False, 40),
    ]):
        GoalMilestone.objects.create(
            goal=g2,
            title=m_title,
            target_date=today + datetime.timedelta(days=offset),
            is_completed=m_done,
            completed_at=timezone.now() if m_done else None,
            order=order_idx,
        )
    recalculate_goal_progress(g2)

    g3 = Goal.objects.create(
        user=user,
        title='100 Hours of Distraction-Free Deep Architecture Craft',
        description='Protect morning cognitive peak for high-leverage engineering and design synthesis.',
        category='Career',
        goal_type='career',
        start_date=today - datetime.timedelta(days=30),
        target_date=today + datetime.timedelta(days=60),
        color='#FF9500',
        priority='medium',
    )
    g3.associated_habits.add(created_habits[4][0])
    for order_idx, (m_title, m_done, offset) in enumerate([
        ('Eliminate morning phone check for 14 consecutive days', True, -10),
        ('Log 30 consecutive 90-minute deep work sessions', False, 15),
        ('Publish comprehensive system architecture monograph', False, 55),
    ]):
        GoalMilestone.objects.create(
            goal=g3,
            title=m_title,
            target_date=today + datetime.timedelta(days=offset),
            is_completed=m_done,
            completed_at=timezone.now() if m_done else None,
            order=order_idx,
        )
    recalculate_goal_progress(g3)

    # Create Journal Entries
    journal_samples = [
        {
            'days_ago': 0,
            'title': 'Clarity in Morning Stillness & Deep Execution',
            'mood': 'exceptional',
            'energy_level': 5,
            'content': 'Started the morning with 20 minutes of quiet stillness before opening the laptop. The difference in cognitive composure throughout the 90-minute architecture block was remarkable.',
            'prompt_went_well': 'Completed both the morning meditation and 25 pages of Seneca before 8:30 AM.',
            'prompt_could_improve': 'Transitioned slightly late from afternoon meetings into the strength workout.',
            'prompt_learned': 'Protecting the first 60 minutes of waking awareness sets the tone for the entire day.',
            'prompt_grateful': 'Good health, quiet morning light, and meaningful creative work.',
            'prompt_tomorrow_focus': 'Complete the core analytics engine and maintain 3.0L hydration.',
            'tags': ['Stoicism', 'Deep Work', 'Mindfulness'],
            'is_favorite': True,
        },
        {
            'days_ago': 1,
            'title': 'Turning Friction into Practice',
            'mood': 'calm',
            'energy_level': 4,
            'content': 'An unexpected schedule change compressed the afternoon, tempting me to skip conditioning. Remembered Aurelius Book V.20—adapted the session to a focused 45-minute circuit.',
            'prompt_went_well': 'Maintained streak continuity despite a compressed calendar.',
            'prompt_could_improve': 'Keep an emergency 30-minute workout protocol ready for travel days.',
            'prompt_learned': 'All-or-nothing perfectionism is the enemy of long-term consistency.',
            'prompt_grateful': 'Resilient energy and supportive colleagues.',
            'prompt_tomorrow_focus': 'Begin with the highest-leverage task before checking messages.',
            'tags': ['Resilience', 'Fitness'],
            'is_favorite': False,
        },
        {
            'days_ago': 3,
            'title': 'Evening Review & Digital Sunset',
            'mood': 'good',
            'energy_level': 4,
            'content': 'Shutting down screens at 9:30 PM made reading Epictetus effortless and improved sleep depth noticeably.',
            'prompt_went_well': 'Hit 100% of scheduled habits and read 30 pages.',
            'prompt_could_improve': 'Drink more water earlier in the morning.',
            'prompt_learned': 'Evening preparation is the true beginning of the next morning.',
            'prompt_grateful': 'Restorative sleep and clear focus.',
            'prompt_tomorrow_focus': 'Sustain the digital sunset ritual.',
            'tags': ['Sleep', 'Reading'],
            'is_favorite': True,
        },
        {
            'days_ago': 5,
            'title': 'Weekend Rhythm & Recovery',
            'mood': 'reflective',
            'energy_level': 4,
            'content': 'Reflected on the past month of habit tracking. The compound effect of small daily pages and minutes is becoming unmistakable.',
            'prompt_went_well': 'Completed weekly review and organized milestones for the month ahead.',
            'prompt_could_improve': 'Keep weekend hydration as structured as weekdays.',
            'prompt_learned': 'Consistency is built on gentle self-command, not harshness.',
            'prompt_grateful': 'Long walks outdoors and unhurried reflection.',
            'prompt_tomorrow_focus': 'Enter Monday with calm preparation.',
            'tags': ['Review', 'Growth'],
            'is_favorite': False,
        },
        {
            'days_ago': 8,
            'title': 'Discipline as Freedom',
            'mood': 'good',
            'energy_level': 5,
            'content': 'Read Epictetus on how every faculty is strengthened by its corresponding action. Applied that immediately to my morning writing.',
            'prompt_went_well': 'Zero distractions during morning deep work.',
            'prompt_could_improve': 'Take a 5-minute mobility break between afternoon blocks.',
            'prompt_learned': 'Structure creates mental space for creativity.',
            'prompt_grateful': 'Books that endure across millennia.',
            'prompt_tomorrow_focus': 'Execute Zone 2 run with steady cadence.',
            'tags': ['Philosophy', 'Craft'],
            'is_favorite': False,
        },
    ]

    for j in journal_samples:
        d = today - datetime.timedelta(days=j.pop('days_ago'))
        JournalEntry.objects.create(user=user, date=d, **j)

    # Create Daily Intentions (today + past 4 days)
    intentions_samples = [
        (0, 'Execute 90 minutes of deep architectural focus with calm, undivided presence.', 'Deep Focus', False),
        (1, 'Complete Zone 2 conditioning and honor the 9:30 PM digital sunset.', 'Vitality', True),
        (2, 'Read 25 pages of Seneca with marginalia notes before sleep.', 'Wisdom', True),
        (3, 'Ship the milestone review with zero context-switching.', 'Craft', True),
    ]
    for days_ago, text, cat, done in intentions_samples:
        d = today - datetime.timedelta(days=days_ago)
        DailyIntention.objects.update_or_create(
            user=user,
            date=d,
            defaults={
                'intention_text': text,
                'focus_category': cat,
                'is_completed': done,
                'completed_at': timezone.now() if done else None,
            }
        )

    # Favorite 3 Stoic Quotes & add personal notes
    quotes = list(StoicQuote.objects.all()[:4])
    for q in quotes[:3]:
        FavoriteQuote.objects.get_or_create(user=user, quote=q)
    if quotes:
        QuoteNote.objects.update_or_create(
            user=user,
            quote=quotes[0],
            defaults={
                'note_text': 'Read this every morning when the alarm rings at 6:30 AM. Purpose precedes mood.'
            }
        )

    evaluate_user_achievements(user)

    # Pre-generate Weekly and Monthly review with thoughtful reflections
    weekly_rev = generate_or_get_review(user, 'weekly')
    weekly_rev.prompt_accomplished = 'Sustained morning meditation and reading streaks while advancing the core architecture milestone.'
    weekly_rev.prompt_challenged = 'Mid-week calendar compression tested afternoon workout timing.'
    weekly_rev.prompt_improve = 'Prepare hydration and training gear the night before.'
    weekly_rev.prompt_prioritize_next = 'Protect the 90-minute morning deep work block and complete the 12km endurance run.'
    weekly_rev.save()

    monthly_rev = generate_or_get_review(user, 'monthly')
    monthly_rev.prompt_accomplished = 'Established an 88%+ overall consistency score across 6 foundational habits and finished 3 Stoic texts.'
    monthly_rev.prompt_challenged = 'Weekend hydration and evening digital sunset occasionally slipped during social evenings.'
    monthly_rev.prompt_improve = 'Set a gentle 9:15 PM wind-down reminder on Fridays and Saturdays.'
    monthly_rev.prompt_prioritize_next = 'Maintain 14+ day streaks across all high-priority habits.'
    monthly_rev.save()

    return user
