from django.core.management.base import BaseCommand
from django.utils import timezone
from farms.utils import generate_harvest_notifications, check_and_update_crop_stages, get_harvest_summary_for_user
from farms.models import CropStage
from accounts.models import CustomUser

class Command(BaseCommand):
    help = 'Generate harvest notifications for due, overdue, and upcoming harvest dates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Display detailed output',
        )
        parser.add_argument(
            '--update-stages',
            action='store_true',
            help='Also update crop stages based on growth duration',
        )
        parser.add_argument(
            '--user-summary',
            action='store_true',
            help='Display harvest summary for each user',
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting harvest notification generation at {start_time.strftime("%Y-%m-%d %H:%M:%S")}'
            )
        )
        
        try:
            # Generate harvest notifications
            notifications_created = generate_harvest_notifications()
            
            self.stdout.write(
                self.style.SUCCESS(f'Created {notifications_created} harvest notifications')
            )
            
            # Update crop stages if requested
            if options['update_stages']:
                updated_crops = check_and_update_crop_stages()
                self.stdout.write(
                    self.style.SUCCESS(f'Updated {updated_crops} crop stages')
                )
            
            # Display user summaries if requested
            if options['user_summary']:
                self.display_user_summaries(options['verbose'])
            
            # Display verbose information if requested
            if options['verbose']:
                self.display_detailed_info()
            
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Harvest notification generation completed in {duration:.2f} seconds'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during harvest notification generation: {str(e)}')
            )
            raise

    def display_user_summaries(self, verbose):
        """Display harvest summaries for all users with crops"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('HARVEST SUMMARIES BY USER'))
        self.stdout.write('='*60)
        
        # Get all users with crop stages
        users_with_crops = CustomUser.objects.filter(
            cropstage__isnull=False
        ).distinct()
        
        if not users_with_crops.exists():
            self.stdout.write(self.style.WARNING('No users have crop stages configured.'))
            return
        
        for user in users_with_crops:
            summary = get_harvest_summary_for_user(user)
            user_display = f"{user.get_full_name() or user.username} ({user.user_type})"
            
            self.stdout.write(f'\nUser: {user_display}:')
            self.stdout.write(f'   Total Crops: {summary["total_crops"]}')
            
            if summary['due_today'] > 0:
                self.stdout.write(
                    self.style.ERROR(f'   Due Today: {summary["due_today"]}')
                )
            
            if summary['overdue'] > 0:
                self.stdout.write(
                    self.style.ERROR(f'   Overdue: {summary["overdue"]}')
                )
            
            if summary['due_this_week'] > 0:
                self.stdout.write(
                    self.style.WARNING(f'   Due This Week: {summary["due_this_week"]}')
                )
            
            if summary['upcoming'] > 0:
                self.stdout.write(f'   Upcoming: {summary["upcoming"]}')

    def display_detailed_info(self):
        """Display detailed information about current crop stages"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('CURRENT CROP STAGES OVERVIEW'))
        self.stdout.write('='*60)
        
        today = timezone.now().date()
        
        # Get crop stages with harvest dates
        crop_stages = CropStage.objects.filter(
            expected_harvest_date__isnull=False
        ).select_related('user', 'farm').order_by('expected_harvest_date')
        
        if not crop_stages.exists():
            self.stdout.write(self.style.WARNING('No crop stages with harvest dates found.'))
            return
        
        categories = {
            'overdue': [],
            'due_today': [],
            'due_soon': [],
            'upcoming': []
        }
        
        for crop in crop_stages:
            days_until_harvest = (crop.expected_harvest_date - today).days
            crop_info = {
                'crop': crop,
                'days': days_until_harvest,
                'user': crop.user.username,
                'farm': crop.farm.name if crop.farm else 'No Farm'
            }
            
            if days_until_harvest < 0:
                categories['overdue'].append(crop_info)
            elif days_until_harvest == 0:
                categories['due_today'].append(crop_info)
            elif days_until_harvest <= 7:
                categories['due_soon'].append(crop_info)
            else:
                categories['upcoming'].append(crop_info)
        
        # Display each category
        if categories['overdue']:
            self.stdout.write(f'\nOVERDUE HARVESTS ({len(categories["overdue"])}):')
            for info in categories['overdue'][:10]:  # Limit to 10
                self.stdout.write(
                    self.style.ERROR(
                        f'   * {info["crop"].crop_name} ({info["crop"].batch_code}) - '
                        f'{abs(info["days"])} days overdue - {info["user"]} @ {info["farm"]}'
                    )
                )
        
        if categories['due_today']:
            self.stdout.write(f'\nDUE TODAY ({len(categories["due_today"])}):')
            for info in categories['due_today']:
                self.stdout.write(
                    self.style.WARNING(
                        f'   * {info["crop"].crop_name} ({info["crop"].batch_code}) - '
                        f'{info["user"]} @ {info["farm"]}'
                    )
                )
        
        if categories['due_soon']:
            self.stdout.write(f'\nDUE THIS WEEK ({len(categories["due_soon"])}):')
            for info in categories['due_soon']:
                self.stdout.write(
                    f'   * {info["crop"].crop_name} ({info["crop"].batch_code}) - '
                    f'in {info["days"]} days - {info["user"]} @ {info["farm"]}'
                )
        
        self.stdout.write(f'\nTotal upcoming harvests: {len(categories["upcoming"])}')
        
        # Stage distribution
        self.stdout.write('\nCurrent Stage Distribution:')
        stage_counts = {}
        for crop in CropStage.objects.all():
            stage = crop.get_current_stage_display()
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
        
        for stage, count in sorted(stage_counts.items()):
            self.stdout.write(f'   {stage}: {count} crops')