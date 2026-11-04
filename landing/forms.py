import re

from django import forms

from .models import Lead

# Какие поля обязательны в каждой форме (как в оригинале на Tilda)
REQUIRED_FIELDS = {
    "signup": {"name", "phone", "email"},
    "myform": {"name", "phone", "email"},
    "trial": {"phone"},
}


class LeadForm(forms.ModelForm):
    class Meta:
        model = Lead
        fields = ["form", "name", "phone", "email"]

    def clean_phone(self):
        phone = self.cleaned_data.get("phone", "")
        if not phone:
            return phone
        digits = re.sub(r"\D", "", phone)
        if len(digits) != 11 or digits[0] not in "78":
            raise forms.ValidationError("Укажите, пожалуйста, корректный номер телефона")
        return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"

    def clean(self):
        data = super().clean()
        for field in REQUIRED_FIELDS.get(data.get("form"), ()):
            if not data.get(field) and field not in self.errors:
                self.add_error(field, "Обязательное поле")
        return data
