from django.contrib import admin
from django.utils.html import format_html

from .models import Lead

admin.site.site_header = "Buh-Service.kz — администрирование"
admin.site.site_title = "Buh-Service.kz"
admin.site.index_title = "Управление сайтом"


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "phone_link", "email_link", "form", "status")
    list_display_links = ("created_at", "name")
    list_editable = ("status",)
    list_filter = ("status", "form", "created_at")
    search_fields = ("name", "phone", "email", "comment")
    date_hierarchy = "created_at"
    list_per_page = 50
    actions = ("mark_in_progress", "mark_done", "mark_spam")

    fieldsets = (
        ("Заявка", {"fields": ("name", "phone", "email", "form")}),
        ("Обработка", {"fields": ("status", "comment")}),
        ("Служебное", {"fields": ("created_at", "updated_at", "page_url", "ip"), "classes": ("collapse",)}),
    )
    readonly_fields = ("created_at", "updated_at", "page_url", "ip")

    @admin.display(description="Телефон", ordering="phone")
    def phone_link(self, obj):
        if not obj.phone:
            return "—"
        digits = "".join(ch for ch in obj.phone if ch.isdigit() or ch == "+")
        return format_html('<a href="tel:{}">{}</a>', digits, obj.phone)

    @admin.display(description="E-mail", ordering="email")
    def email_link(self, obj):
        return format_html('<a href="mailto:{0}">{0}</a>', obj.email) if obj.email else "—"

    def _set_status(self, request, queryset, status):
        updated = queryset.update(status=status)
        self.message_user(request, f"Обновлено заявок: {updated}")

    @admin.action(description="Отметить «В работе»")
    def mark_in_progress(self, request, queryset):
        self._set_status(request, queryset, Lead.Status.IN_PROGRESS)

    @admin.action(description="Отметить «Обработана»")
    def mark_done(self, request, queryset):
        self._set_status(request, queryset, Lead.Status.DONE)

    @admin.action(description="Отметить «Спам»")
    def mark_spam(self, request, queryset):
        self._set_status(request, queryset, Lead.Status.SPAM)
