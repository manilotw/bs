"""{% asset 'landing/js/zero.js' %} — URL статического файла с версией (?v=<время изменения>).

Браузер кэширует CSS/JS; версия в URL меняется при каждом изменении файла,
поэтому после правок не нужно чистить кэш вручную.
"""
import os

from django import template
from django.conf import settings
from django.contrib.staticfiles import finders
from django.contrib.staticfiles.storage import staticfiles_storage
from django.templatetags.static import static

register = template.Library()
_cache = {}


def _version(path):
    if not settings.DEBUG and path in _cache:
        return _cache[path]
    full = finders.find(path)
    if not full:
        try:
            full = staticfiles_storage.path(path)
        except Exception:
            full = None
    version = str(int(os.path.getmtime(full))) if full and os.path.exists(full) else ""
    _cache[path] = version
    return version


@register.simple_tag
def asset(path):
    url = static(path)
    version = _version(path)
    return f"{url}?v={version}" if version else url
