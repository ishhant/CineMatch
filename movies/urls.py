from django.urls import path
from movies import views

urlpatterns = [
    path('status/', views.api_system_status, name='api_system_status'),
    path('movies/', views.api_movies_list, name='api_movies_list'),
    path('movies/add/', views.api_add_movie, name='api_add_movie'),
    path('movies/<str:movie_id>/update/', views.api_update_movie, name='api_update_movie'),
    path('movies/<str:movie_id>/delete/', views.api_delete_movie, name='api_delete_movie'),
    path('movies/<str:movie_id>/', views.api_movie_detail, name='api_movie_detail'),
    path('movies/<str:movie_id>/review/', views.api_add_review, name='api_add_review'),
    path('reviews/<str:review_id>/delete/', views.api_delete_review, name='api_delete_review'),
    path('watchlist/', views.api_get_watchlist, name='api_get_watchlist'),
    path('watchlist/toggle/', views.api_toggle_watchlist, name='api_toggle_watchlist'),
    path('auth/register/', views.api_register, name='api_register'),
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/logout/', views.api_logout, name='api_logout'),
    path('auth/status/', views.api_auth_status, name='api_auth_status'),
]
