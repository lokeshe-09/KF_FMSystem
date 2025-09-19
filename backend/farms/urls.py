from django.urls import path
from . import views

urlpatterns = [
    # General farm management (for admins)
    path('', views.get_farms, name='get_farms'),
    path('create/', views.create_farm, name='create_farm'),
    path('<int:farm_id>/', views.farm_detail, name='farm_detail'),
    
    # Farm User Dashboard
    path('my-farms/', views.my_farms, name='my_farms'),
    path('debug-assignments/', views.debug_farm_assignments, name='debug_farm_assignments'),
    path('dashboard/', views.farm_user_dashboard, name='farm_user_dashboard'),
    path('my-notifications/', views.farm_user_notifications, name='farm_user_notifications'),
    
    # Admin Notification Management
    path('admin/notifications/', views.admin_notifications, name='admin_notifications'),
    
    # Farm-specific URLs (for farm users working within a specific farm context)
    path('<int:farm_id>/dashboard/', views.farm_specific_dashboard, name='farm_specific_dashboard'),
    path('<int:farm_id>/daily-tasks/', views.farm_daily_tasks, name='farm_daily_tasks'),
    path('<int:farm_id>/crop-stages/', views.farm_crop_stages, name='farm_crop_stages'),
    path('<int:farm_id>/crop-stages/<int:stage_id>/', views.farm_crop_stage_detail, name='farm_crop_stage_detail'),
    path('<int:farm_id>/notifications/', views.farm_notifications, name='farm_notifications'),
    path('<int:farm_id>/sales/', views.farm_sales, name='farm_sales'),
    # TODO: Add remaining farm-specific endpoints as needed
    # path('<int:farm_id>/spray-irrigation-logs/', views.farm_spray_irrigation_logs, name='farm_spray_irrigation_logs'),
    # path('<int:farm_id>/fertigations/', views.farm_fertigations, name='farm_fertigations'),
    # path('<int:farm_id>/fertigations/<int:pk>/', views.farm_fertigation_detail, name='farm_fertigation_detail'),
    # path('<int:farm_id>/spray-schedules/', views.farm_spray_schedules, name='farm_spray_schedules'),
    # path('<int:farm_id>/spray-schedules/<int:schedule_id>/', views.farm_spray_schedule_detail, name='farm_spray_schedule_detail'),
    # path('<int:farm_id>/workers/', views.farm_workers, name='farm_workers'),
    # path('<int:farm_id>/workers/<int:worker_id>/', views.farm_worker_detail, name='farm_worker_detail'),
    # path('<int:farm_id>/worker-tasks/', views.farm_worker_tasks, name='farm_worker_tasks'),
    # path('<int:farm_id>/worker-tasks/<int:task_id>/', views.farm_worker_task_detail, name='farm_worker_task_detail'),
    # path('<int:farm_id>/issue-reports/', views.farm_issue_reports, name='farm_issue_reports'),
    # path('<int:farm_id>/issue-reports/<int:issue_id>/', views.farm_issue_report_detail, name='farm_issue_report_detail'),
    # path('<int:farm_id>/expenditures/', views.farm_expenditures, name='farm_expenditures'),
    # path('<int:farm_id>/expenditures/<int:expenditure_id>/', views.farm_expenditure_detail, name='farm_expenditure_detail'),
    # path('<int:farm_id>/sales/', views.farm_sales, name='farm_sales'),
    # path('<int:farm_id>/sales/<int:sale_id>/', views.farm_sale_detail, name='farm_sale_detail'),
    
    # Legacy URLs (for admin/superuser backward compatibility)
    path('daily-tasks/', views.daily_tasks, name='daily_tasks'),
    path('notifications/', views.notifications, name='notifications'),
    path('spray-irrigation-logs/', views.spray_irrigation_logs, name='spray_irrigation_logs'),
    path('crop-stages/', views.crop_stages, name='crop_stages'),
    path('crop-stages/<int:stage_id>/', views.crop_stage_detail, name='crop_stage_detail'),
    path('crop-stages/import/', views.import_crop_stages, name='import_crop_stages'),
    path('crop-stages/export/', views.export_crop_stages, name='export_crop_stages'),
    path('fertigations/', views.fertigations, name='fertigations'),
    path('fertigations/<int:pk>/', views.fertigation_detail, name='fertigation_detail'),
    path('fertigations/analytics/', views.fertigation_analytics, name='fertigation_analytics'),
    path('fertigations/schedule/', views.fertigation_schedule, name='fertigation_schedule'),
    path('workers/', views.workers, name='workers'),
    path('workers/<int:worker_id>/', views.worker_detail, name='worker_detail'),
    path('worker-tasks/', views.worker_tasks, name='worker_tasks'),
    path('worker-tasks/<int:task_id>/', views.worker_task_detail, name='worker_task_detail'),
    path('worker-dashboard/', views.worker_dashboard_summary, name='worker_dashboard_summary'),
    path('issue-reports/', views.issue_reports, name='issue_reports'),
    path('issue-reports/<int:issue_id>/', views.issue_report_detail, name='issue_report_detail'),
    path('spray-schedules/', views.spray_schedules, name='spray_schedules'),
    path('spray-schedules/<int:schedule_id>/', views.spray_schedule_detail, name='spray_schedule_detail'),
    path('spray-schedules/analytics/', views.spray_schedule_analytics, name='spray_schedule_analytics'),
    path('expenditures/', views.expenditures, name='expenditures'),
    path('expenditures/<int:expenditure_id>/', views.expenditure_detail, name='expenditure_detail'),
    path('expenditures/analytics/', views.expenditure_analytics, name='expenditure_analytics'),
    path('sales/', views.sales, name='sales'),
    path('sales/<int:sale_id>/', views.sale_detail, name='sale_detail'),
    path('sales/analytics/', views.sale_analytics, name='sale_analytics'),
]