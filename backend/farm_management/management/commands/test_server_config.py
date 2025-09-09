from django.core.management.base import BaseCommand
from django.conf import settings
from django.test import Client
import requests
import sys

class Command(BaseCommand):
    help = 'Test server configuration for both HTTP and HTTPS support'

    def add_arguments(self, parser):
        parser.add_argument(
            '--port',
            type=int,
            default=8000,
            help='Port to test (default: 8000)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Verbose output'
        )

    def handle(self, *args, **options):
        port = options['port']
        verbose = options['verbose']
        
        self.stdout.write('='*60)
        self.stdout.write(self.style.SUCCESS('Farm Management System - Server Configuration Test'))
        self.stdout.write('='*60)
        
        # Display current configuration
        self.stdout.write('\n📋 Current Configuration:')
        self.stdout.write(f'   DEBUG: {settings.DEBUG}')
        self.stdout.write(f'   ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}')
        
        use_https = getattr(settings, 'USE_HTTPS', False)
        self.stdout.write(f'   USE_HTTPS: {use_https}')
        self.stdout.write(f'   SECURE_SSL_REDIRECT: {getattr(settings, "SECURE_SSL_REDIRECT", False)}')
        self.stdout.write(f'   SESSION_COOKIE_SECURE: {getattr(settings, "SESSION_COOKIE_SECURE", False)}')
        self.stdout.write(f'   CSRF_COOKIE_SECURE: {getattr(settings, "CSRF_COOKIE_SECURE", False)}')
        
        # Test HTTP connection
        self.stdout.write('\n🔗 Testing HTTP Connection:')
        http_url = f'http://127.0.0.1:{port}/health/'
        
        try:
            response = requests.get(http_url, timeout=5)
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS(f'   ✅ HTTP connection successful: {http_url}'))
                if verbose:
                    self.stdout.write(f'   Response: {response.json()}')
            else:
                self.stdout.write(self.style.WARNING(f'   ⚠️ HTTP connection returned status {response.status_code}'))
        except requests.ConnectionError:
            self.stdout.write(self.style.ERROR(f'   ❌ HTTP connection failed: Server not running on {http_url}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ❌ HTTP connection error: {str(e)}'))
        
        # Test HTTPS connection (this will likely fail on development server)
        self.stdout.write('\n🔒 Testing HTTPS Connection:')
        https_url = f'https://127.0.0.1:{port}/health/'
        
        try:
            # Disable SSL verification for testing
            response = requests.get(https_url, timeout=5, verify=False)
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS(f'   ✅ HTTPS connection successful: {https_url}'))
                if verbose:
                    self.stdout.write(f'   Response: {response.json()}')
            else:
                self.stdout.write(self.style.WARNING(f'   ⚠️ HTTPS connection returned status {response.status_code}'))
        except requests.ConnectionError as e:
            if 'SSL' in str(e) or 'certificate' in str(e).lower():
                self.stdout.write(self.style.WARNING(f'   ⚠️ HTTPS not supported (expected for development server)'))
                self.stdout.write(f'   This is normal - Django development server only supports HTTP')
            else:
                self.stdout.write(self.style.ERROR(f'   ❌ HTTPS connection failed: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ❌ HTTPS connection error: {str(e)}'))
        
        # CORS Configuration Test
        self.stdout.write('\n🌐 CORS Configuration:')
        cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        cors_allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        
        if cors_allow_all:
            self.stdout.write(self.style.SUCCESS('   ✅ CORS allows all origins (development mode)'))
        elif cors_origins:
            self.stdout.write(f'   📝 CORS allowed origins: {len(cors_origins)} configured')
            if verbose:
                for origin in cors_origins:
                    self.stdout.write(f'     - {origin}')
        else:
            self.stdout.write(self.style.WARNING('   ⚠️ No CORS origins configured'))
        
        # Recommendations
        self.stdout.write('\n💡 Recommendations:')
        
        if settings.DEBUG:
            self.stdout.write('   🔧 Development Mode Detected:')
            self.stdout.write('     - Use HTTP: http://127.0.0.1:8000/')
            self.stdout.write('     - Frontend should connect to: http://127.0.0.1:8000/api')
            self.stdout.write('     - WebSocket connection: ws://127.0.0.1:8000/ws/notifications/')
        else:
            self.stdout.write('   🏭 Production Mode Detected:')
            self.stdout.write('     - Ensure HTTPS is properly configured')
            self.stdout.write('     - Use a proper web server (nginx, Apache)')
            self.stdout.write('     - Configure SSL certificates')
        
        # Environment Variables
        self.stdout.write('\n🔧 Environment Setup:')
        self.stdout.write('   Create a .env file with:')
        self.stdout.write('   DEBUG=True')
        self.stdout.write('   USE_HTTPS=False  # Set to True for HTTPS development')
        self.stdout.write('   CORS_ALLOW_ALL_ORIGINS=True')
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Configuration test completed!'))
        
        if not settings.DEBUG and not use_https:
            self.stdout.write(self.style.WARNING('⚠️ Warning: Production mode without HTTPS enabled'))
            
        self.stdout.write('='*60)