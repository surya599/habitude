from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def root_health_view(request):
    return JsonResponse({
        "status": "online",
        "service": "HABITUDE REST API",
        "tagline": "Build a better you, one day at a time.",
        "endpoints": {
            "api_root": "/api/",
            "admin": "/admin/",
            "categories": "/api/categories/",
            "health": "/"
        }
    })


urlpatterns = [
    path('', root_health_view, name='root-health'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
]
