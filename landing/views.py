import logging
import os

from django.conf import settings
from django.core.mail import send_mail
from datetime import datetime, timezone
from pathlib import Path

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from .forms import LeadForm

logger = logging.getLogger(__name__)

SITE = {
    "phone_main": "+7 727 352 71 71",
    "phone_main_href": "+77273527171",
    "phone_mobile": "+7 707 352 71 71",
    "phone_mobile_href": "+77073527171",
    "phone_header_href": "77773527171",
    "email": "info@integracia.kz",
    "whatsapp_url": (
        "https://wa.me/+77773527171?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!"
        "%20%D0%9C%D0%B5%D0%BD%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D0%B5%D1%82%20"
        "%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B4%D0%BE%D0%B1"
        "%D0%BD%D1%8B%D1%85%20%D0%BE%D1%82%D1%87%D0%B5%D1%82%D0%BE%D0%B2"
    ),
    # Координаты офиса (Алматы, пр. Сейфуллина, 531) — как метка на карте оригинала
    "map_lat": "43.256194",
    "map_lng": "76.932206",
    "map_zoom": 14,
    # Ключ Яндекс.Карт (необязателен для разработки; для продакшена получите в кабинете разработчика)
    "yandex_maps_api_key": os.environ.get("YANDEX_MAPS_API_KEY", ""),
}

# Карточки блока «Какие отчёты доступны в нашем сервисе?» (url — карточка-ссылка)
REPORTS = [
    "Стат. отчет 1-ТС (заполняется при импорте или экспорте в ЕАЭС)",
    "Стат. отчет 2-МП Квартальная (заполняется малым бизнесом)",
    "Загрузка \"ГТД по импорту\" с портала и обработка",
    "Удобная загрузка выписки банка, автозаполнение, определение счета на оплату",
    "Отчет по дебиторской и кредиторской задолженности",
    "Исправление зависших остатков по задолженности и авансам",
    "Удобная групповая обработка входящих ЭСФ, создание накладных.",
    "Проверка подвязки документов ЭСФ, счета-фактур и накладных.",
    "Отчет по остаткам отпусков сотрудников",
    "Табель учета рабочего времени сотрудников",
    {"text": "Отчет по приобретенным товарам, услугам, РБП, ОС и НМА,",
     "url": "https://www.youtube.com/watch?v=H3yf841lCTU"},
]


def index(request):
    cards = [r if isinstance(r, dict) else {"text": r} for r in REPORTS]
    # По 4 карточки в ряд; в последний ряд добавляется карточка-призыв «И другие отчеты…»
    rows = [cards[i:i + 4] for i in range(0, len(cards), 4)]
    return render(request, "landing/index.html", {"site": SITE, "report_rows": rows})


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) or None


@require_POST
def lead_create(request):
    form = LeadForm(request.POST)
    if not form.is_valid():
        errors = {field: [str(e) for e in errs] for field, errs in form.errors.items()}
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    lead = form.save(commit=False)
    lead.ip = _client_ip(request)
    lead.page_url = request.META.get("HTTP_REFERER", "")[:500]
    lead.save()
    logger.info("New lead #%s: %s", lead.pk, lead)

    if settings.LEAD_NOTIFY_EMAILS:
        try:
            send_mail(
                subject=f"Новая заявка с buh-service.kz: {lead.name or lead.phone}",
                message=(
                    f"Форма: {lead.get_form_display()}\nИмя: {lead.name}\n"
                    f"Телефон: {lead.phone}\nE-mail: {lead.email}\nСтраница: {lead.page_url}"
                ),
                from_email=None,
                recipient_list=settings.LEAD_NOTIFY_EMAILS,
            )
        except Exception:  # письмо не должно ломать отправку формы
            logger.exception("Failed to send lead notification")

    return JsonResponse({"ok": True})


def robots_txt(request):
    lines = [
        "User-Agent: *",
        "Disallow: /admin/",
        "Disallow: /lead/",
        "Disallow: /*_escaped_fragment_*",
        "",
        f"Sitemap: {settings.SITE_URL}/sitemap.xml",
        f"Host: {settings.SITE_URL}",
        "",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain; charset=utf-8")


def sitemap_xml(request):
    # lastmod — дата последнего изменения шаблонов главной страницы
    templates = Path(__file__).resolve().parent / "templates" / "landing"
    mtime = max(f.stat().st_mtime for f in templates.rglob("*.html"))
    lastmod = datetime.fromtimestamp(mtime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "\t<url>\n"
        f"\t\t<loc>{settings.SITE_URL}/</loc>\n"
        f"\t\t<lastmod>{lastmod}</lastmod>\n"
        "\t</url>\n"
        "</urlset>\n"
    )
    return HttpResponse(xml, content_type="application/xml; charset=utf-8")
