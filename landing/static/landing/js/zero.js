/*!
 * zero.js — движок «zero-блоков» лендинга.
 *
 * Каждый блок <section class="zb" data-artboard='{...}'> — это холст фиксированной
 * высоты, на котором элементы .zb-el абсолютно позиционированы. Для каждого
 * брейкпоинта (1200 / 960 / 640 / 480 / 320) в data-layout элемента записаны:
 *   t, l, w, h  — top / left / width / height (px или %)
 *   ax, ay      — ось привязки: left|center|right и top|center|bottom
 *   c           — контейнер: "grid" (сетка шириной = брейкпоинт, по центру) или "window" (всё окно)
 *
 * Анимации (работают только на ширине >= 1200, как в оригинале):
 *   data-sbs  — пошаговая анимация по скроллу (сдвиг, масштаб, прозрачность, «залипание»);
 *   data-fix  — элемент «залипает» на экране на заданную дистанцию скролла.
 */
(function () {
  'use strict';

  var SCREENS = [1200, 960, 640, 480, 320];
  var DESKTOP = 1200;
  var blocks = [];
  var lastScroll = null;
  var currentRes = null;

  /* --------------------------------------------------------------- utils */

  function viewportWidth() { return document.documentElement.clientWidth; }

  function resolveRes() {
    var w = viewportWidth();
    for (var i = 0; i < SCREENS.length; i++) {
      if (w >= SCREENS[i]) return SCREENS[i];
    }
    return SCREENS[SCREENS.length - 1];
  }

  function json(el, attr) {
    var raw = el.getAttribute(attr);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('zero.js: некорректный ' + attr + ' у', el, e);
      return null;
    }
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function pageTop(el) {
    return el.getBoundingClientRect().top + window.pageYOffset;
  }

  function isShown(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  /* ----------------------------------------------------- scroll: steps */

  function SbsAnimation(item, cfg) {
    this.item = item;
    this.cfg = cfg;
    this.wrapper = null;
  }

  SbsAnimation.prototype.setup = function (block) {
    var el = this.item.el;
    var cfg = this.cfg;
    var winH = window.innerHeight;

    this.wrapper = wrapAtom(this.item, 'zb-anim');
    this.zIndex = getComputedStyle(el).zIndex;

    var section = block.section;
    this.topOffset = pageTop(section) + num(getComputedStyle(section).paddingTop, 0) + num(el.style.top, 0);

    var trigger = cfg.trigger;
    var offset = cfg.offset || 0;
    if (trigger === 0.5 || trigger === 1) {
      offset += winH * trigger;
      // элемент виден сразу при загрузке — анимация стартует с его текущей позиции
      if (offset > this.topOffset && offset <= winH * trigger) offset = this.topOffset;
    }
    this.triggerOffset = offset;

    var steps = [];
    var unfixedDist = 0;
    var prev = null;
    cfg.steps.forEach(function (raw, i) {
      var st = {
        state: 'idle',
        dist: num(raw.di, 0),
        prevUnfixedDist: unfixedDist,
        styles: {
          moveX: parseInt(raw.mx, 10) || 0,
          moveY: parseInt(raw.my, 10) || 0,
          scaleX: num(raw.sx, 1),
          scaleY: num(raw.sy, 1),
          opacity: num(raw.op, 1),
          rotate: parseInt(raw.ro, 10) || 0,
          blur: parseInt(raw.bl, 10) || 0,
          fix: raw.fi === 'fixed'
        }
      };
      if (!st.styles.fix) unfixedDist += st.dist;
      st.start = i === 0 ? this.topOffset : prev.end;
      st.end = st.start + st.dist;
      steps.push(st);
      prev = st;
    }, this);

    // сдвиг и поворот в шагах заданы абсолютно — переводим в приращения
    var mx = steps[0].styles.moveX, my = steps[0].styles.moveY, ro = steps[0].styles.rotate;
    steps.forEach(function (st) {
      var s = st.styles;
      s.moveX -= mx; mx += s.moveX;
      s.moveY -= my; my += s.moveY;
      s.rotate -= ro; ro += s.rotate;
    });

    this.steps = steps;
  };

  SbsAnimation.prototype.applyStep = function (state, step, progress, index) {
    var s = step.styles;
    if (s.fix) {
      if (step.state === 'started') { state.fix = true; state.fixedShiftY = 0; }
      else if (step.state === 'finished') { state.fix = false; state.fixedShiftY += step.dist; }
      else if (step.state === 'idle') {
        if (index > 0 && state.fix) return;
        state.fix = false;
      }
    }
    state.opacity += progress * (s.opacity - state.opacity);
    state.blur += progress * (s.blur - state.blur);
    state.translateX += progress * s.moveX;
    state.translateY += progress * s.moveY;
    state.scaleX += progress * (s.scaleX - state.scaleX);
    state.scaleY += progress * (s.scaleY - state.scaleY);
    state.rotate += progress * s.rotate;
  };

  SbsAnimation.prototype.update = function (scrollTop) {
    var self = this;
    var pos = scrollTop + this.triggerOffset;
    var state = {
      opacity: 1, blur: 0, fix: false, fixedShiftY: 0, prevUnfixedDist: 0,
      translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0
    };

    this.steps.forEach(function (step, i) {
      if (pos >= step.start && pos < step.end) {
        step.state = 'started';
        state.prevUnfixedDist = step.prevUnfixedDist;
        self.applyStep(state, step, step.dist === 0 ? 1 : (pos - step.start) / step.dist, i);
      }
      if (step.end <= pos) {
        step.state = 'finished';
        self.applyStep(state, step, 1, i);
      }
      if (pos < step.start && (step.state === 'started' || step.state === 'finished')) {
        step.state = 'idle';
        self.applyStep(state, step, 0, i);
      }
    });

    this.item.el.classList.remove('is-anim-hidden');
    var second = this.steps[1];
    if (second && second.dist === 0 && second.styles.opacity === 0 && second.state === 'idle') {
      state.opacity = 0;
    }
    this.render(state);
  };

  SbsAnimation.prototype.render = function (state) {
    var w = this.wrapper.style;
    if (state.fix && w.position !== 'fixed') {
      w.top = (this.triggerOffset - state.prevUnfixedDist) + 'px';
      w.position = 'fixed';
      if (this.zIndex && this.zIndex !== 'auto') w.zIndex = this.zIndex;
    } else if (!state.fix && w.position === 'fixed') {
      w.position = '';
      w.top = '';
      w.zIndex = '';
    }
    w.opacity = String(state.opacity);
    var t = '';
    if (state.translateX) t += 'translateX(' + state.translateX.toFixed(2) + 'px)';
    var ty = state.translateY + state.fixedShiftY;
    if (ty) t += 'translateY(' + ty.toFixed(2) + 'px)';
    if (state.scaleX !== 1 || state.scaleY !== 1) t += 'scale(' + state.scaleX + ',' + state.scaleY + ')';
    if (state.rotate) t += 'rotate(' + state.rotate + 'deg)';
    w.transform = t || 'scale(1)';
    w.filter = state.blur ? 'blur(' + state.blur + 'px)' : '';
  };

  /* ------------------------------------------------------ scroll: sticky */

  function FixAnimation(item, cfg) {
    this.item = item;
    this.cfg = cfg;
    this.wrapper = null;
  }

  FixAnimation.prototype.setup = function (block) {
    var el = this.item.el;
    var winH = window.innerHeight;
    var section = block.section;

    this.wrapper = wrapAtom(this.item, 'zb-sticky');
    this.topOffset = pageTop(section) + num(getComputedStyle(section).paddingTop, 0) + num(el.style.top, 0);
    this.distance = this.cfg.dist || 0;
    this.end = this.topOffset + this.distance;

    var leader = this.cfg.with ? block.fixLeader(this.cfg.with) : null;
    if (this.cfg.top != null) {
      // «top»: элемент залипает, когда его верх доходит до cfg.top px от верха окна
      this.triggerOffset = this.cfg.top;
    } else if (leader) {
      // «with»: залипаем в тот же момент скролла, что и ведущий элемент, — остаёмся на своём месте рядом с ним
      this.triggerOffset = this.topOffset - leader.startScroll();
    } else {
      var trigger = this.cfg.trigger || 0;
      var offset = this.cfg.offset || 0;
      if (trigger === 0.5 || trigger === 1) {
        offset += winH * trigger - el.offsetHeight * trigger;
        if (offset > this.topOffset && offset <= winH * trigger) offset = this.topOffset;
      }
      this.triggerOffset = offset;
    }
    this.going = false;
    this.ended = false;
  };

  // Позиция скролла, при которой элемент начинает «залипать»
  FixAnimation.prototype.startScroll = function () {
    return this.topOffset - this.triggerOffset;
  };

  FixAnimation.prototype.update = function (scrollTop) {
    if (!this.distance) return;
    var el = this.item.el;
    var w = this.wrapper.style;
    var pos = scrollTop + this.triggerOffset;
    var reached = pos >= this.topOffset;
    var before = pos < this.topOffset;
    var inside = pos < this.end;
    var after = pos >= this.end;

    if ((reached && inside && !this.going) || (inside && this.ended)) {
      el.style.transform = '';
      w.position = 'fixed';
      w.top = this.triggerOffset + 'px';
      this.going = true;
      this.ended = false;
    }
    if (after && !this.ended) {
      el.style.transform = 'translateY(' + this.distance + 'px)';
      w.position = '';
      w.top = '';
      this.going = false;
      this.ended = true;
    }
    if (before && this.going) {
      w.position = '';
      w.top = '';
      this.going = false;
    }
  };

  /* ------------------------------------------------------------- blocks */

  // Оборачиваем .zb-atom в обёртку, которую двигают анимации (сам .zb-el остаётся на месте)
  function wrapAtom(item, cls) {
    var el = item.el;
    var wrapper = el.querySelector('.' + cls); // обёртки могут быть вложены друг в друга (sbs + fix)
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = cls;
      var inner = el.querySelector(':scope > .zb-anim, :scope > .zb-sticky, :scope > .zb-atom');
      el.insertBefore(wrapper, inner);
      wrapper.appendChild(inner);
    }
    // размеры — в px: при position:fixed проценты считались бы от окна
    wrapper.style.width = el.style.width;
    wrapper.style.height = el.style.height || (el.offsetHeight + 'px');
    return wrapper;
  }

  function resetAnimationStyles(item) {
    var el = item.el;
    el.style.transform = '';
    [].forEach.call(el.querySelectorAll('.zb-anim, .zb-sticky'), function (w) {
      w.removeAttribute('style');
    });
  }

  function Block(section) {
    this.section = section;
    this.artboard = section.querySelector('.zb-ab');
    this.layout = json(section, 'data-artboard');
    this.items = [].map.call(section.querySelectorAll('.zb-el'), function (el) {
      var item = { el: el, layout: json(el, 'data-layout'), animations: [] };
      var sbs = json(el, 'data-sbs');
      var fix = json(el, 'data-fix');
      if (sbs) item.animations.push(new SbsAnimation(item, sbs));
      if (fix) item.animations.push(new FixAnimation(item, fix));
      return item;
    });
    this.animated = false;
  }

  Block.prototype.render = function (res) {
    if (!isShown(this.section)) return false;

    var ab = this.layout[res];
    var W = viewportWidth();
    var zoom = ab.upscale === 'window' ? W / res : 1;
    var gridH = ab.h;
    var H = gridH * zoom;
    if (ab.vh) H = Math.max(H, window.innerHeight * ab.vh / 100);
    this.artboard.style.height = H + 'px';

    var Wu = W / zoom;           // ширина холста в «немасштабированных» px
    var Hu = H / zoom;
    var gridLeft = (Wu - res) / 2;
    var gridTop = 0;
    if (Hu > gridH) {
      if (ab.valign === 'center') gridTop = (Hu - gridH) / 2;
      else if (ab.valign === 'bottom') gridTop = Hu - gridH;
    }

    // 1) размеры (до замеров высоты текста)
    this.items.forEach(function (item) {
      var L = item.layout[res];
      var el = item.el;
      var cw = L.c === 'grid' ? res : Wu;
      var ch = L.c === 'grid' ? gridH : Hu;
      item.box = L;
      item.cw = cw;
      item.ch = ch;
      item.w = L.wu === '%' ? cw * L.w / 100 : L.w;
      el.style.zoom = zoom === 1 ? '' : String(zoom);
      el.style.width = item.w + 'px';
      if (L.h != null) {
        item.h = L.hu === '%' ? ch * L.h / 100 : L.h;
        el.style.height = item.h + 'px';
      } else {
        item.h = null;
        el.style.height = '';
      }
    });

    // 2) замеры авто-высот
    this.items.forEach(function (item) {
      if (item.h == null) item.h = item.el.getBoundingClientRect().height / zoom;
    });

    // 3) позиции
    this.items.forEach(function (item) {
      var L = item.box;
      var left = L.lu === '%' ? item.cw * L.l / 100 : L.l;
      if (L.ax === 'center') left = item.cw / 2 - item.w / 2 + left;
      else if (L.ax === 'right') left = item.cw - item.w + left;
      if (L.c === 'grid') left += gridLeft;

      var top = L.tu === '%' ? item.ch * L.t / 100 : L.t;
      if (L.ay === 'center') top = item.ch / 2 - item.h / 2 + top;
      else if (L.ay === 'bottom') top = item.ch - item.h + top;
      if (L.c === 'grid') top += gridTop;

      item.el.style.left = left.toFixed(1) + 'px';
      item.el.style.top = top.toFixed(1) + 'px';
    });
    return true;
  };

  Block.prototype.setupAnimations = function (enabled) {
    var self = this;
    this.animated = enabled;
    var withLeader = function (a) { return a instanceof FixAnimation && a.cfg.with; };
    this.items.forEach(function (item) {
      if (!item.animations.length) return;
      resetAnimationStyles(item);
      if (!enabled) item.el.classList.remove('is-anim-hidden');
    });
    if (!enabled) return;
    // сначала независимые анимации, потом те, что привязаны к ведущему элементу
    [false, true].forEach(function (followers) {
      self.items.forEach(function (item) {
        item.animations.forEach(function (a) {
          if (!!withLeader(a) === followers) a.setup(self);
        });
      });
    });
  };

  // Ведущий элемент для data-fix "with": имя элемента внутри этого же блока (класс z-<имя>)
  Block.prototype.fixLeader = function (name) {
    for (var i = 0; i < this.items.length; i++) {
      if (!this.items[i].el.classList.contains('z-' + name)) continue;
      var anims = this.items[i].animations;
      for (var j = 0; j < anims.length; j++) {
        if (anims[j] instanceof FixAnimation && !anims[j].cfg.with) return anims[j];
      }
    }
    return null;
  };

  Block.prototype.updateAnimations = function (scrollTop) {
    if (!this.animated) return;
    this.items.forEach(function (item) {
      item.animations.forEach(function (a) { a.update(scrollTop); });
    });
  };

  /* -------------------------------------------------------------- engine */

  function layoutAll() {
    currentRes = resolveRes();
    var animate = currentRes >= DESKTOP && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    blocks.forEach(function (b) {
      b.items.forEach(resetAnimationStyles);
      if (b.render(currentRes)) b.setupAnimations(animate && !b.section.closest('.popup'));
    });
    lastScroll = null;
    tick();
  }

  function tick() {
    var y = Math.max(window.pageYOffset, 0);
    if (y === lastScroll) return;
    lastScroll = y;
    blocks.forEach(function (b) { b.updateAnimations(y); });
  }

  function loop() {
    tick();
    window.requestAnimationFrame(loop);
  }

  var resizeTimer = null;
  var lastSize = '';
  function onResize() {
    var size = viewportWidth() + 'x' + window.innerHeight;
    if (size === lastSize) return;
    lastSize = size;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutAll, 60);
  }

  function init() {
    blocks = [].map.call(document.querySelectorAll('.zb'), function (s) { return new Block(s); });
    lastSize = viewportWidth() + 'x' + window.innerHeight;
    layoutAll();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(layoutAll, 300); });
    // шрифты/картинки могут поменять высоту текста — пересчитываем после загрузки
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);
    window.addEventListener('load', layoutAll);
    window.requestAnimationFrame(loop);
  }

  // Публичный API (используется попапами: блок внутри попапа надо разложить при открытии)
  window.Zero = {
    relayout: layoutAll,
    renderBlock: function (section) {
      var block = blocks.filter(function (b) { return b.section === section; })[0];
      if (block) block.render(currentRes || resolveRes());
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
