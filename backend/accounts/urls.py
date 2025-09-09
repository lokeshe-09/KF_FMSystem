from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('profile/', views.user_profile, name='user_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('create-farm-user/', views.create_farm_user, name='create_farm_user'),
    path('farm-users/', views.get_farm_users, name='get_farm_users'),
    path('farm-users/<int:user_id>/', views.manage_farm_user, name='manage_farm_user'),
    
    # Superuser-only endpoints
    path('reset-password/<int:user_id>/', views.reset_user_password, name='reset_user_password'),
    path('all-users/', views.get_all_users, name='get_all_users'),
    path('admins/', views.get_admins, name='get_admins'),
    path('create-admin/', views.create_admin, name='create_admin'),
]