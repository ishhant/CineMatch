from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root_overview(request):
    return JsonResponse({
        "project": "CineMatch - Movie Recommendation & Watchlist System",
        "status": "Django Backend API is Running!",
        "frontend_ui": "http://localhost:5173",
        "notice": "This is the Backend REST API. Please open http://localhost:5173 in your browser to view and use the CineMatch website.",
        "endpoints": {
            "system_status": "/api/status/",
            "movies_list": "/api/movies/",
            "add_movie": "/api/movies/add/",
            "django_admin": "/admin/"
        }
    })

urlpatterns = [
    path('', api_root_overview, name='api_root_overview'),
    path('admin/', admin.site.urls),
    path('api/', include('movies.urls')),
]
