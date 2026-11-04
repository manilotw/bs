# buh-service.kz на Django

Копия лендинга https://buh-service.kz (был на Tilda), переписанная на Django без зависимостей от Tilda.

## Запуск

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env                        # и впишите DJANGO_SECRET_KEY (команда для генерации — в файле)
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver        # → http://127.0.0.1:8001
```

`runserver` по умолчанию слушает порт **8001** (8000 не занимается). Другой порт: `RUNSERVER_PORT` в `.env` или `runserver 9000`.

Заявки с форм сохраняются в модель `Lead` — смотреть в админке `/admin/` (`manage.py createsuperuser`).

## Структура

| Путь | Что там |
|---|---|
| `landing/templates/landing/index.html` | порядок блоков страницы |
| `landing/templates/landing/blocks/*.html` | «zero-блоки» (свободная вёрстка): hero, pricing, steps, whatsapp, signup, mobile-strip |
| `landing/templates/landing/partials/*.html` | шапка, видео, карточки отчётов, контакты с картой, попапы, формы |
| `landing/static/landing/css/site.css` | базовые стили, обычные блоки, попапы, формы |
| `landing/static/landing/css/zero.css` | типографика и оформление элементов zero-блоков по брейкпоинтам |
| `landing/static/landing/js/zero.js` | раскладка zero-блоков (1200/960/640/480/320) + анимации при скролле |
| `landing/static/landing/js/site.js` | попапы, валидация и отправка форм, маска телефона, Яндекс.Карта |
| `landing/views.py` | контакты (`SITE`), список отчётов, приём заявок |

### Как устроены zero-блоки
У каждого элемента `.zb-el` в `data-layout` записана геометрия для каждого брейкпоинта:
`t/l/w/h` — top/left/width/height, `ax/ay` — ось привязки, `c` — контейнер (`grid` — сетка шириной
брейкпоинта по центру, `window` — всё окно). Анимации — `data-sbs` (пошаговая по скроллу) и `data-fix`
(«залипание»); как и в оригинале, работают только на ширине от 1200px.

## Настройки (.env)

Все настройки — в файле `.env` в корне проекта (читается `config/settings.py` через python-dotenv).
`.env` не коммитится; полный список переменных с пояснениями — в `.env.example`.
Переменная, заданная в окружении системы, важнее значения из `.env`.

| Группа | Переменные |
|---|---|
| Django | `DJANGO_SECRET_KEY` (обязательна), `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `RUNSERVER_PORT`, `TIME_ZONE`, `STATIC_ROOT` |
| База данных | `DB_ENGINE` (SQLite по умолчанию), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_CONN_MAX_AGE` |
| Безопасность (HTTPS) | `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`, `USE_X_FORWARDED_PROTO` |
| Почта и заявки | `LEAD_NOTIFY_EMAILS`, `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`, `DEFAULT_FROM_EMAIL` |
| SEO, аналитика, карты | `SITE_URL`, `YANDEX_METRIKA_ID`, `FACEBOOK_PIXEL_ID`, `ANALYTICS_ENABLED`, `YANDEX_MAPS_API_KEY` |

Для боевого сервера минимум: новый `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`,
`DJANGO_ALLOWED_HOSTS=buh-service.kz,www.buh-service.kz`, `DJANGO_CSRF_TRUSTED_ORIGINS=https://buh-service.kz,https://www.buh-service.kz`.

## SEO
Мета-теги (title, description, keywords, og:*, canonical, иконки) перенесены с Tilda без изменений.
`/robots.txt` и `/sitemap.xml` отдаются Django (`landing/views.py`); админка и `/lead/` закрыты от индексации.

## Видео
YouTube-ролики вставляются шаблоном `landing/templates/landing/partials/youtube.html`:
`{% include "landing/partials/youtube.html" with video_id="klmTykVfZCM" title="..." %}`.
Сейчас: `klmTykVfZCM` — под первым экраном (`partials/video_section.html`),
`wgREiCZlQw8` — в блоке «Как это выглядит на деле?» (`blocks/pricing.html`).
