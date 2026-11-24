from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creates or updates a superuser/admin account for CineMatch'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Admin username')
        parser.add_argument('--password', type=str, default='admin123', help='Admin password')
        parser.add_argument('--email', type=str, default='admin@cinematch.com', help='Admin email')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        user, created = User.objects.get_or_create(username=username)
        user.email = email
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Successfully created admin user: '{username}' (Password: '{password}')"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated existing user '{username}' to superuser/admin (Password: '{password}')"))
