"""
Настройки Django для buh-service.kz.

Все значения, которые отличаются между компьютером разработчика и боевым сервером,
читаются из файла .env в корне проекта (шаблон с описанием — .env.example).
Переменные, заданные в окружении системы, имеют приоритет над .env.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def env(name, default=None, required=False):
    value = os.environ.get(name)
    if value is None or value == '':
        if required:
            raise ImproperlyConfigured(f'Не задана переменная окружения {name} (см. .env.example)')
        return default
    return value


def env_bool(name, default=False):
    value = env(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def env_int(name, default):
    value = env(name)
    return int(value) if value is not None else default


def env_list(name, default=''):
    return [item.strip() for item in env(name, default).split(',') if item.strip()]


# --- Основное ---------------------------------------------------------------
SECRET_KEY = env('DJANGO_SECRET_KEY', required=True)
DEBUG = env_bool('DJANGO_DEBUG', False)
ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')
CSRF_TRUSTED_ORIGINS = env_list('DJANGO_CSRF_TRUSTED_ORIGINS')

# Порт по умолчанию для `python manage.py runserver` (8000 оставляем свободным)
RUNSERVER_DEFAULT_PORT = env('RUNSERVER_PORT', '8001')


# --- Приложения -------------------------------------------------------------
INSTALLED_APPS = [
    # landing стоит выше staticfiles, чтобы его команда runserver (порт из RUNSERVER_PORT)
    # перекрывала стандартную — Django берёт команду из первого приложения в списке
    'landing',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'landing.context_processors.site_meta',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# --- База данных ------------------------------------------------------------
# По умолчанию SQLite (файл db.sqlite3). Для PostgreSQL:
#   DB_ENGINE=django.db.backends.postgresql + DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT
DB_ENGINE = env('DB_ENGINE', 'django.db.backends.sqlite3')
if DB_ENGINE == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': BASE_DIR / env('DB_NAME', 'db.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': env('DB_NAME', required=True),
            'USER': env('DB_USER', ''),
            'PASSWORD': env('DB_PASSWORD', ''),
            'HOST': env('DB_HOST', 'localhost'),
            'PORT': env('DB_PORT', ''),
            'CONN_MAX_AGE': env_int('DB_CONN_MAX_AGE', 60),
        }
    }


# --- Пароли -----------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# --- Язык и время -----------------------------------------------------------
LANGUAGE_CODE = 'ru'
TIME_ZONE = env('TIME_ZONE', 'Asia/Almaty')
USE_I18N = True
USE_TZ = True


# --- Статика ----------------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / env('STATIC_ROOT', 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- Безопасность (для боевого сервера за HTTPS) ----------------------------
# Разрешаем встраивать страницы сайта только в iframe с того же домена
X_FRAME_OPTIONS = 'SAMEORIGIN'
SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', False)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', False)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', False)
SECURE_HSTS_SECONDS = env_int('SECURE_HSTS_SECONDS', 0)
if env_bool('USE_X_FORWARDED_PROTO', False):  # сайт за nginx/прокси, который передаёт схему запроса
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# --- Почта и заявки ---------------------------------------------------------
# Куда дублировать заявки с сайта письмом (через запятую). Пусто — только сохранение в БД.
LEAD_NOTIFY_EMAILS = env_list('LEAD_NOTIFY_EMAILS')
EMAIL_BACKEND = env('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', 'localhost')
EMAIL_PORT = env_int('EMAIL_PORT', 25)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', False)
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', False)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', 'webmaster@localhost')


# --- SEO, аналитика, карты --------------------------------------------------
# Основной адрес сайта: canonical, og:url, og:image, sitemap.xml, robots.txt
SITE_URL = env('SITE_URL', 'https://buh-service.kz').rstrip('/')

# Счётчики — те же, что стояли на Tilda
YANDEX_METRIKA_ID = env('YANDEX_METRIKA_ID', '')
FACEBOOK_PIXEL_ID = env('FACEBOOK_PIXEL_ID', '')
# По умолчанию счётчики работают только при DEBUG=0, чтобы не засорять статистику своими визитами
ANALYTICS_ENABLED = env_bool('ANALYTICS_ENABLED', not DEBUG)

# Ключ JS API Яндекс.Карт (для разработки не обязателен)
YANDEX_MAPS_API_KEY = env('YANDEX_MAPS_API_KEY', '')
