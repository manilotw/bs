from django.urls import path

from . import views

app_name = "landing"

urlpatterns = [
    path("", views.index, name="index"),
    path("lead/", views.lead_create, name="lead"),
    path("robots.txt", views.robots_txt, name="robots"),
    path("sitemap.xml", views.sitemap_xml, name="sitemap"),
]
