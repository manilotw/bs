from django.db import models


class Lead(models.Model):
    """Заявка, оставленная через одну из форм на лендинге."""

    FORM_CHOICES = [
        ("signup", "Попап «Для подключения сервиса» (ФИО / телефон / e-mail)"),
        ("myform", "Попап с формой (мобильная кнопка «Подключить сервис»)"),
        ("trial", "Попап «30 дней бесплатного использования»"),
    ]

    class Status(models.TextChoices):
        NEW = "new", "Новая"
        IN_PROGRESS = "in_progress", "В работе"
        DONE = "done", "Обработана"
        SPAM = "spam", "Спам"

    form = models.CharField("Форма", max_length=32, choices=FORM_CHOICES)
    name = models.CharField("Имя", max_length=255, blank=True)
    phone = models.CharField("Телефон", max_length=32, blank=True)
    email = models.EmailField("E-mail", blank=True)
    page_url = models.CharField("Страница", max_length=500, blank=True)
    ip = models.GenericIPAddressField("IP", null=True, blank=True)
    status = models.CharField("Статус", max_length=16, choices=Status.choices, default=Status.NEW, db_index=True)
    comment = models.TextField("Комментарий менеджера", blank=True)
    created_at = models.DateTimeField("Создана", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("Изменена", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Заявка"
        verbose_name_plural = "Заявки"

    def __str__(self):
        return f"{self.name or 'Без имени'} — {self.phone or self.email} ({self.created_at:%d.%m.%Y %H:%M})"
