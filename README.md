# buh-service.kz на Django

Копия лендинга https://buh-service.kz (был на Tilda), переписанная на Django без зависимостей от Tilda.

## Запуск

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver        # → http://127.0.0.1:8001
```

`runserver` по умолчанию слушает порт **8001** (8000 не занимается). Другой порт: `RUNSERVER_PORT=9000` или `runserver 9000`.

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

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev-ключ | обязательно задать в продакшене |
| `DJANGO_DEBUG` | `1` | `0` в продакшене |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | домены через запятую |
| `LEAD_NOTIFY_EMAILS` | — | куда дублировать заявки письмом |
| `EMAIL_BACKEND` | console | бэкенд почты Django |
| `YANDEX_MAPS_API_KEY` | — | ключ JS API Яндекс.Карт (для продакшена) |
| `SITE_URL` | `https://buh-service.kz` | адрес сайта для canonical, og-тегов, robots.txt, sitemap.xml |
| `YANDEX_METRIKA_ID` | `72061132` | Яндекс.Метрика (та же, что была на Tilda) |
| `FACEBOOK_PIXEL_ID` | `1121663565484331` | Meta Pixel (тот же, что был на Tilda) |
| `ANALYTICS_ENABLED` | `0` при DEBUG, иначе `1` | включает счётчики; локально выключены |

## SEO
Мета-теги (title, description, keywords, og:*, canonical, иконки) перенесены с Tilda без изменений.
`/robots.txt` и `/sitemap.xml` отдаются Django (`landing/views.py`); админка и `/lead/` закрыты от индексации.

## Видео
YouTube-ролики вставляются шаблоном `landing/templates/landing/partials/youtube.html`:
`{% include "landing/partials/youtube.html" with video_id="klmTykVfZCM" title="..." %}`.
Сейчас: `klmTykVfZCM` — под первым экраном (`partials/video_section.html`),
`wgREiCZlQw8` — в блоке «Как это выглядит на деле?» (`blocks/pricing.html`).
