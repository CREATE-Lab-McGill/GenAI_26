"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from api.views import (
    health_check, get_sets, generate_set,
    edit_question, edit_set, save_set, delete_set, delete_question, submit_feedback, update_question_manual, question_alternative,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path("api/sets/", get_sets),
    path("api/generate/", generate_set),
    path("api/questions/<str:pk>/edit/", edit_question),
    path("api/questions/<str:pk>/", delete_question),
    path("api/sets/<str:pk>/edit/", edit_set),
    path("api/sets/<str:pk>/save/", save_set),
    path("api/sets/<str:pk>/", delete_set),
    path("api/feedback/", submit_feedback),
    path("api/questions/<str:pk>/manual/", update_question_manual),
    path("api/questions/<str:pk>/alternative/", question_alternative),
]