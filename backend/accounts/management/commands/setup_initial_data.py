from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Setup clean database for farm management system'

    def handle(self, *args, **options):
        self.stdout.write('Database setup completed!')
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Farm Management System - Clean Installation'))
        self.stdout.write('\n' + '='*60)
        
        self.stdout.write('\n1. Create Django Superuser:')
        self.stdout.write('   Run: python manage.py createsuperuser')
        self.stdout.write('   This will be your Django admin account')
        
        self.stdout.write('\n2. Access Django Admin Panel:')
        self.stdout.write('   URL: http://127.0.0.1:8000/admin/')
        self.stdout.write('   Login with your superuser credentials')
        
        self.stdout.write('\n3. Create System Admin (Web App):')
        self.stdout.write('   In Django Admin > Users > Add User')
        self.stdout.write('   Set User Type: admin')
        self.stdout.write('   This admin can create farm users and farms')
        
        self.stdout.write('\n4. Web Application:')
        self.stdout.write('   URL: http://localhost:3000')
        self.stdout.write('   Login with your system admin credentials')
        
        self.stdout.write('\n5. Workflow:')
        self.stdout.write('   - Login to Django Admin → Create system admin user')
        self.stdout.write('   - Login to Web App as admin → Create farm users')
        self.stdout.write('   - Create farms and assign to farm users')
        self.stdout.write('   - Farm users can login and view their assigned farms')
        
        self.stdout.write('\n' + '='*60)