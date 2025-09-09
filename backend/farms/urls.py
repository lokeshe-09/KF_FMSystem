from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_farms, name='get_farms'),
    path('create/', views.create_farm, name='create_farm'),
    path('<int:farm_id>/', views.farm_detail, name='farm_detail'),
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
    
    # Worker Management URLs
    path('workers/', views.workers, name='workers'),
    path('workers/<int:worker_id>/', views.worker_detail, name='worker_detail'),
    
    # Worker Task Management URLs
    path('worker-tasks/', views.worker_tasks, name='worker_tasks'),
    path('worker-tasks/<int:task_id>/', views.worker_task_detail, name='worker_task_detail'),
    
    # Worker Dashboard Summary
    path('worker-dashboard/', views.worker_dashboard_summary, name='worker_dashboard_summary'),
    
    # Issue Report Management URLs
    path('issue-reports/', views.issue_reports, name='issue_reports'),
    path('issue-reports/<int:issue_id>/', views.issue_report_detail, name='issue_report_detail'),
    
    # Spray Schedule Management URLs
    path('spray-schedules/', views.spray_schedules, name='spray_schedules'),
    path('spray-schedules/<int:schedule_id>/', views.spray_schedule_detail, name='spray_schedule_detail'),
    path('spray-schedules/analytics/', views.spray_schedule_analytics, name='spray_schedule_analytics'),
    
    # Expenditure Management URLs
    path('expenditures/', views.expenditures, name='expenditures'),
    path('expenditures/<int:expenditure_id>/', views.expenditure_detail, name='expenditure_detail'),
    path('expenditures/analytics/', views.expenditure_analytics, name='expenditure_analytics'),
    
    # Sale Management URLs
    path('sales/', views.sales, name='sales'),
    path('sales/<int:sale_id>/', views.sale_detail, name='sale_detail'),
    path('sales/analytics/', views.sale_analytics, name='sale_analytics'),
    
]