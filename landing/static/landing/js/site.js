/*!
 * site.js — попапы, формы заявок, маска телефона, ленивая загрузка Яндекс.Карты.
 */
(function () {
  'use strict';

  /* ================================================================ Попапы */

  var openedPopup = null;
  var lastFocus = null;

  function findPopup(hash) {
    if (!hash) return null;
    return document.querySelector('.popup[data-popup-hook="' + hash.replace(/"/g, '') + '"]');
  }

  function openPopup(popup) {
    if (!popup || popup === openedPopup) return;
    if (openedPopup) closePopup(openedPopup, true);
    lastFocus = document.activeElement;
    popup.classList.add('is-visible');
    document.body.classList.add('is-popup-open');

    // zero-блок внутри попапа можно разложить, только когда попап видим
    [].forEach.call(popup.querySelectorAll('.zb'), function (s) {
      if (window.Zero) window.Zero.renderBlock(s);
    });

    void popup.offsetWidth; // перезапуск transition
    popup.classList.add('is-open');
    openedPopup = popup;
    popup.focus({ preventScroll: true });
  }

  function closePopup(popup, instant) {
    popup = popup || openedPopup;
    if (!popup) return;
    popup.classList.remove('is-open');
    document.body.classList.remove('is-popup-open');
    openedPopup = null;
    var hide = function () { popup.classList.remove('is-visible'); };
    if (instant) hide(); else setTimeout(hide, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#popup"]');
    if (link) {
      var popup = findPopup(link.getAttribute('href'));
      if (popup) {
        e.preventDefault();
        openPopup(popup);
        return;
      }
    }

    if (!openedPopup) return;
    if (e.target.closest('.js-popup-close') || e.target.closest('a[href="#close"]')) {
      e.preventDefault();
      closePopup();
      return;
    }
    // клик по затемнению (или по пустому месту холста zero-блока) — закрыть
    if (e.target === openedPopup || e.target.classList.contains('zb-ab') ||
        e.target.classList.contains('popup__container--full')) {
      closePopup();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openedPopup) closePopup();
  });

  // Карточка «И другие отчеты…» целиком ведёт в попап — ссылка уже на <a class="card">.

  // Открытие попапа по якорю в адресе: buh-service.kz/#popup:myform
  function openFromHash() {
    var popup = findPopup(decodeURIComponent(window.location.hash));
    if (popup) openPopup(popup);
  }

  /* ========================================================= Маска телефона */

  function formatPhone(digits) {
    // digits — до 10 цифр после +7
    var d = digits.slice(0, 10);
    var out = '';
    if (d.length > 0) out += '(' + d.slice(0, 3);
    if (d.length >= 3) out += ') ';
    if (d.length > 3) out += d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }

  function phoneDigits(value) {
    var d = String(value || '').replace(/\D/g, '');
    // вставили номер целиком: +7 / 8 / 7 в начале — убираем код страны
    if (d.length > 10 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d.slice(0, 10);
  }

  function initPhone(input) {
    input.addEventListener('input', function () {
      var digits = phoneDigits(input.value);
      input.value = formatPhone(digits);
    });
    input.addEventListener('keydown', function (e) {
      // Backspace сразу после «) » или «-» удаляет цифру, а не разделитель
      if (e.key !== 'Backspace' || input.selectionStart !== input.selectionEnd) return;
      var pos = input.selectionStart;
      if (pos !== input.value.length) return;
      var digits = phoneDigits(input.value);
      if (!digits.length) return;
      e.preventDefault();
      input.value = formatPhone(digits.slice(0, -1));
    });
  }

  /* =================================================================== Формы */

  var MESSAGES = {
    required: 'Обязательное поле',
    email: 'Укажите, пожалуйста, корректный email',
    phone: 'Укажите, пожалуйста, корректный номер телефона',
    name: 'Укажите, пожалуйста, имя',
    all: 'Пожалуйста, заполните все обязательные поля',
    server: 'Не удалось отправить форму. Попробуйте ещё раз или позвоните нам.'
  };

  function fieldValue(input) {
    return input.value.trim();
  }

  function validateField(input) {
    var value = fieldValue(input);
    var rule = input.getAttribute('data-rule');
    var required = input.hasAttribute('data-required');
    if (!value) return required ? 'required' : null;
    if (rule === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'email';
    if (rule === 'phone' && phoneDigits(value).length !== 10) return 'phone';
    if (rule === 'name' && !/[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(value)) return 'name';
    return null;
  }

  function groupOf(input) {
    return input.closest('.lead-form__group, .zform__group');
  }

  function setFieldError(input, code) {
    var group = groupOf(input);
    if (!group) return;
    var box = group.querySelector('.lead-form__error, .zform__error');
    group.classList.toggle('is-error', !!code);
    if (box) box.textContent = code ? (MESSAGES[code] || code) : '';
  }

  function showErrorBox(form, text) {
    var box = form.querySelector('.js-form-errorbox');
    if (!box) return;
    if (!text) { box.hidden = true; box.textContent = ''; return; }
    box.textContent = text;
    box.hidden = false;
    if (form.classList.contains('zform')) {
      clearTimeout(box._timer);
      box._timer = setTimeout(function () { box.hidden = true; }, 5000);
    }
  }

  function initForm(form) {
    var inputs = [].slice.call(form.querySelectorAll('input[data-rule], input[data-required]'));

    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        if (groupOf(input) && groupOf(input).classList.contains('is-error')) setFieldError(input, validateField(input));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      var errors = [];
      inputs.forEach(function (input) {
        var code = validateField(input);
        setFieldError(input, code);
        if (code) {
          errors.push(code);
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (firstInvalid) {
        var summary = errors.indexOf('required') !== -1 ? MESSAGES.all : MESSAGES[errors[0]];
        showErrorBox(form, summary);
        firstInvalid.focus();
        return;
      }
      showErrorBox(form, '');
      submit(form);
    });
  }

  function submit(form) {
    var button = form.querySelector('button[type="submit"]');
    var data = new FormData(form);
    var phone = form.querySelector('.js-phone');
    if (phone && phone.value) data.set('phone', '+7 ' + phone.value);

    button.disabled = true;
    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin'
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (res.ok) return onSuccess(form);
        if (res.errors) {
          Object.keys(res.errors).forEach(function (name) {
            var input = form.querySelector('[name="' + name + '"]');
            if (input) setFieldError(input, res.errors[name][0]);
          });
        }
        showErrorBox(form, MESSAGES.server);
      })
      .catch(function () { showErrorBox(form, MESSAGES.server); })
      .then(function () { button.disabled = false; });
  }

  function onSuccess(form) {
    var inputsBox = form.querySelector('.js-form-inputs');
    var success = form.querySelector('.js-form-success');
    form.reset();
    if (inputsBox) inputsBox.hidden = true;
    if (success) success.hidden = false;

    if (window.ym && window.mainMetrikaId) window.ym(window.mainMetrikaId, 'reachGoal', 'lead');

    var popup = form.closest('.popup');
    var restore = function () {
      if (inputsBox) inputsBox.hidden = false;
      if (success) success.hidden = true;
    };
    if (popup && form.hasAttribute('data-close-on-success')) {
      setTimeout(function () { closePopup(popup); setTimeout(restore, 400); }, 1500);
    } else {
      setTimeout(restore, 8000);
    }
  }

  /* ============================================================ Карта (Яндекс) */

  function initMap() {
    var box = document.getElementById('contacts-map');
    if (!box) return;
    var requested = false;
    var isTouch = window.matchMedia('(hover: none)').matches;

    function draw() {
      var point = [parseFloat(box.getAttribute('data-lat')), parseFloat(box.getAttribute('data-lng'))];
      var map = new window.ymaps.Map(box, {
        center: point,
        zoom: parseInt(box.getAttribute('data-zoom'), 10) || 14,
        controls: ['typeSelector', 'zoomControl']
      });
      map.behaviors.disable('scrollZoom');       // колесо мыши крутит страницу, а не карту
      if (isTouch) map.behaviors.disable('drag'); // на телефоне карта не мешает скроллу
      map.geoObjects.add(new window.ymaps.Placemark(point, {
        hintContent: box.getAttribute('data-title'),
        balloonContent: box.getAttribute('data-balloon')
      }, { preset: 'islands#blueIcon' }));
    }

    function load() {
      if (requested) return;
      if (box.getBoundingClientRect().top - window.innerHeight > 700) return; // за 700px до появления
      requested = true;
      window.removeEventListener('scroll', load);
      var key = box.getAttribute('data-apikey');
      var script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU' + (key ? '&apikey=' + encodeURIComponent(key) : '');
      script.async = true;
      script.onload = function () { window.ymaps.ready(draw); };
      document.head.appendChild(script);
    }

    window.addEventListener('scroll', load, { passive: true });
    load();
  }

  /* ==================================================================== init */

  function init() {
    [].forEach.call(document.querySelectorAll('.js-phone'), initPhone);
    [].forEach.call(document.querySelectorAll('.js-lead-form'), initForm);
    initMap();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
