from django.core.management.base import BaseCommand
from core.seed_data import seed_global_reference_data, seed_demo_account


class Command(BaseCommand):
    help = 'Seed HABITUDE reference data (Categories, Stoic Quotes, Achievements) and Demo Account.'

    def handle(self, *args, **options):
        seed_global_reference_data()
        user = seed_demo_account()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded HABITUDE database and demo user: {user.email}"
            )
        )
