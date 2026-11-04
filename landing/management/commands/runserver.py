"""`python manage.py runserver` по умолчанию поднимается на 127.0.0.1:8001 (порт 8000 не занимаем).

Порт можно поменять переменной окружения RUNSERVER_PORT или явно: `runserver 0.0.0.0:9000`.
"""
from django.conf import settings
from django.contrib.staticfiles.management.commands.runserver import Command as StaticRunserver


class Command(StaticRunserver):
    default_port = str(getattr(settings, "RUNSERVER_DEFAULT_PORT", "8001"))
