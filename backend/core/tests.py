import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import (
    Habit,
    HabitCompletion,
    Goal,
    JournalEntry,
    StoicQuote,
)
from .seed_data import seed_global_reference_data


class HabitudeComprehensiveTestSuite(TestCase):
    def setUp(self):
        seed_global_reference_data()
        self.client = APIClient()

        # Register User A
        res_a = self.client.post(
            '/api/auth/register/',
            {
                'full_name': 'Marcus Test',
                'email': 'marcus@test.com',
                'password': 'SecurePassword123!',
                'theme_preference': 'dark',
            },
            format='json',
        )
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        self.token_a = res_a.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a}')

        # Register User B (to verify strict user isolation)
        client_b = APIClient()
        res_b = client_b.post(
            '/api/auth/register/',
            {
                'full_name': 'Seneca Test',
                'email': 'seneca@test.com',
                'password': 'SecurePassword123!',
                'theme_preference': 'light',
            },
            format='json',
        )
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        self.token_b = res_b.data['token']
        self.client_b = client_b
        self.client_b.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b}')

    def test_01_authentication_login_logout_and_password_reset(self):
        # Login
        login_res = self.client.post(
            '/api/auth/login/',
            {'email': 'marcus@test.com', 'password': 'SecurePassword123!'},
            format='json',
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res.data)

        # Forgot password + Reset password flow
        forgot_res = self.client.post(
            '/api/auth/forgot-password/',
            {'email': 'marcus@test.com'},
            format='json',
        )
        self.assertEqual(forgot_res.status_code, status.HTTP_200_OK)
        reset_token = forgot_res.data.get('reset_token')
        self.assertIsNotNone(reset_token)

        reset_res = self.client.post(
            '/api/auth/reset-password/',
            {'token': reset_token, 'password': 'NewPassword456!'},
            format='json',
        )
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # Logout
        new_token = reset_res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {new_token}')
        logout_res = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

    def test_02_theme_preference_and_timezone_persistence(self):
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.data['theme_preference'], 'dark')

        patch_res = self.client.patch(
            '/api/auth/me/',
            {'theme_preference': 'light', 'timezone': 'Asia/Kolkata', 'week_start': 'sunday'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['theme_preference'], 'light')
        self.assertEqual(patch_res.data['timezone'], 'Asia/Kolkata')
        self.assertEqual(patch_res.data['week_start'], 'sunday')

    def test_03_habit_crud_partial_progress_and_streaks(self):
        today = timezone.localdate()
        start_d = (today - datetime.timedelta(days=10)).isoformat()

        # Create Numerical Habit (Read 20 pages)
        create_res = self.client.post(
            '/api/habits/',
            {
                'name': 'Read Stoic Philosophy',
                'description': 'Read 20 pages daily',
                'category_name': 'Learning',
                'tracking_type': 'numerical',
                'target_value': 20,
                'unit': 'pages',
                'frequency': 'daily',
                'start_date': start_d,
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        habit_id = create_res.data['id']

        # Partial progress (10 / 20 pages) -> must NOT count as completed
        partial_res = self.client.post(
            f'/api/habits/{habit_id}/log/',
            {'progress_value': 10},
            format='json',
        )
        self.assertEqual(partial_res.status_code, status.HTTP_200_OK)
        self.assertFalse(partial_res.data['completion']['is_completed'])
        self.assertEqual(partial_res.data['habit']['current_streak'], 0)

        # Increment by +10 pages -> reaches 20/20 -> MUST count as completed!
        full_res = self.client.post(
            f'/api/habits/{habit_id}/log/',
            {'increment_by': 10},
            format='json',
        )
        self.assertTrue(full_res.data['completion']['is_completed'])
        self.assertEqual(full_res.data['habit']['current_streak'], 1)

        # Log yesterday as completed as well -> streak becomes 2
        yesterday = (today - datetime.timedelta(days=1)).isoformat()
        y_res = self.client.post(
            f'/api/habits/{habit_id}/log/',
            {'date': yesterday, 'progress_value': 20},
            format='json',
        )
        self.assertEqual(y_res.data['habit']['current_streak'], 2)
        self.assertEqual(y_res.data['habit']['longest_streak'], 2)

        # Ensure no duplicate completion records for same habit + date
        comp_count = HabitCompletion.objects.filter(habit_id=habit_id, date=today).count()
        self.assertEqual(comp_count, 1)

        # Archive & Restore preserves history
        arch_res = self.client.post(
            f'/api/habits/{habit_id}/archive/',
            {'is_archived': True},
            format='json',
        )
        self.assertTrue(arch_res.data['is_archived'])
        self.assertEqual(HabitCompletion.objects.filter(habit_id=habit_id).count(), 2)

    def test_04_duration_tracking_and_analytics_accuracy(self):
        today = timezone.localdate()
        h_res = self.client.post(
            '/api/habits/',
            {
                'name': 'Morning Meditation',
                'category_name': 'Mindfulness',
                'tracking_type': 'duration',
                'target_value': 20,
                'unit': 'minutes',
                'frequency': 'daily',
                'start_date': today.isoformat(),
            },
            format='json',
        )
        h_id = h_res.data['id']
        self.client.post(
            f'/api/habits/{h_id}/log/',
            {'progress_value': 20},
            format='json',
        )

        analytics_res = self.client.get('/api/analytics/?range=7d')
        self.assertEqual(analytics_res.status_code, status.HTTP_200_OK)
        self.assertEqual(analytics_res.data['metrics']['completion_rate'], 100.0)
        self.assertGreaterEqual(len(analytics_res.data['yearly_heatmap']), 365)

    def test_05_goals_milestones_journal_stoic_and_reviews(self):
        # Create Goal with 2 milestones
        g_res = self.client.post(
            '/api/goals/',
            {
                'title': 'Master Stoic Ethics',
                'category': 'Learning',
                'goal_type': 'learning',
                'start_date': timezone.localdate().isoformat(),
                'target_date': (timezone.localdate() + datetime.timedelta(days=30)).isoformat(),
                'initial_milestones': [
                    {'title': 'Read Meditations'},
                    {'title': 'Read Enchiridion'},
                ],
            },
            format='json',
        )
        self.assertEqual(g_res.status_code, status.HTTP_201_CREATED)
        m1_id = g_res.data['milestones'][0]['id']

        # Complete 1 of 2 milestones -> progress must be 50.0%
        m_patch = self.client.patch(
            f'/api/milestones/{m1_id}/',
            {'is_completed': True},
            format='json',
        )
        self.assertEqual(m_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(m_patch.data['goal']['progress_percentage'], 50.0)

        # Create Journal Entry
        j_res = self.client.post(
            '/api/journal/',
            {
                'title': 'Evening Review',
                'content': 'Practiced calm focus.',
                'mood': 'calm',
                'prompt_went_well': 'Finished meditation.',
            },
            format='json',
        )
        self.assertEqual(j_res.status_code, status.HTTP_201_CREATED)

        # Favorite a Stoic Quote & add personal note
        first_quote = StoicQuote.objects.first()
        fav_res = self.client.post(f'/api/stoic/quotes/{first_quote.id}/favorite/')
        self.assertTrue(fav_res.data['is_favorite'])

        note_res = self.client.post(
            f'/api/stoic/quotes/{first_quote.id}/note/',
            {'note_text': 'Essential morning reminder.'},
            format='json',
        )
        self.assertEqual(note_res.data['personal_note'], 'Essential morning reminder.')

        # Weekly Review generation & reflection persistence
        rev_res = self.client.get('/api/reviews/?type=weekly')
        self.assertEqual(rev_res.status_code, status.HTTP_200_OK)
        rev_id = rev_res.data['current_review']['id']

        rev_patch = self.client.patch(
            f'/api/reviews/{rev_id}/',
            {'prompt_accomplished': 'Hit all reading targets.'},
            format='json',
        )
        self.assertEqual(rev_patch.data['prompt_accomplished'], 'Hit all reading targets.')

    def test_06_strict_user_data_authorization_isolation(self):
        # User A creates a private habit, goal, and journal
        h_a = self.client.post(
            '/api/habits/',
            {'name': 'Private Habit A', 'category_name': 'Health'},
            format='json',
        ).data
        j_a = self.client.post(
            '/api/journal/',
            {'title': 'Private Journal A', 'content': 'Confidential reflection'},
            format='json',
        ).data
        g_a = self.client.post(
            '/api/goals/',
            {
                'title': 'Private Goal A',
                'target_date': (timezone.localdate() + datetime.timedelta(days=10)).isoformat(),
            },
            format='json',
        ).data

        # User B must NOT see User A's records in list endpoints
        self.assertEqual(len(self.client_b.get('/api/habits/').data), 0)
        self.assertEqual(len(self.client_b.get('/api/journal/').data), 0)
        self.assertEqual(len(self.client_b.get('/api/goals/').data), 0)

        # User B must receive 404 when attempting to access or mutate User A's records by ID
        self.assertEqual(
            self.client_b.get(f"/api/habits/{h_a['id']}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client_b.get(f"/api/journal/{j_a['id']}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client_b.delete(f"/api/goals/{g_a['id']}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
