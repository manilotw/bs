from django.conf import settings


def site_meta(request):
    """SEO-адрес сайта и ID счётчиков — доступны во всех шаблонах."""
    return {
        "SITE_URL": settings.SITE_URL,
        "ANALYTICS_ENABLED": settings.ANALYTICS_ENABLED,
        "YANDEX_METRIKA_ID": settings.YANDEX_METRIKA_ID,
        "FACEBOOK_PIXEL_ID": settings.FACEBOOK_PIXEL_ID,
    }
