/*
 * DepthCarousel — перенос компонента <DepthCarousel /> из React Bits (вариант JS-CSS) в обычный JavaScript.
 * Источник: https://reactbits.dev/components/depth-carousel — раскладка, анимация GSAP, свайп с инерцией,
 * колесо, клавиатура, стрелки и точки сохранены без изменений.
 * Требует GSAP 3. Использование: DepthCarousel.mount(element, { items, ...параметры, onChange, onOpen })
 */
(function () {
  'use strict';

  var clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };
  var normalizeItem = function (it) { return typeof it === 'string' ? { image: it, alt: '' } : it; };

  var DEFAULTS = {
    items: [],
    cardWidth: 300,
    cardHeight: 380,
    radius: 18,
    tint: '#05060a',
    depth: 220,
    spread: 90,
    tilt: 22,
    tiltDirection: 'right',
    perspective: 1400,
    visibleCards: 4,
    falloff: 0.2,
    blur: 6,
    duration: 700,
    ease: 'power3.out',
    autoplay: false,
    autoplayDelay: 3200,
    loop: true,
    showControls: true,
    showIndicators: true,
    label: 'Карусель',
    onChange: null,
    onOpen: null, // сайт: нажатие на уже выбранную карточку
    fitPadding: 120 // сайт: запас по ширине при подгонке масштаба (в оригинале 120)
  };

  function mount(root, options) {
    var gsap = window.gsap;
    if (!root || !gsap) return null;
    var cfg = Object.assign({}, DEFAULTS, options || {});
    var data = (Array.isArray(cfg.items) ? cfg.items : []).map(normalizeItem);
    var count = data.length;
    cfg.count = count;

    var pos = 0, focus = 0, tween = null, scale = 1, drag = null, wheelTimer = null, autoTimer = null;
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cards = [], overlays = [], dots = [];

    /* ---------- разметка ---------- */
    root.classList.add('depth-carousel');
    root.style.setProperty('--dc-perspective', cfg.perspective + 'px');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', cfg.label);
    root.tabIndex = 0;
    root.innerHTML = '';

    var stage = document.createElement('div');
    stage.className = 'depth-carousel__stage';
    root.appendChild(stage);
    data.forEach(function (item, i) {
      var card = document.createElement('div');
      card.className = 'depth-carousel__card';
      card.style.width = cfg.cardWidth + 'px';
      card.style.height = cfg.cardHeight + 'px';
      card.style.borderRadius = cfg.radius + 'px';
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', (i + 1) + ' из ' + count + (item.alt ? ': ' + item.alt : ''));
      var img = document.createElement('img');
      img.className = 'depth-carousel__img';
      img.src = item.image; img.alt = item.alt || ''; img.draggable = false; img.decoding = 'async';
      if (i > 2) img.loading = 'lazy';
      var tint = document.createElement('span');
      tint.className = 'depth-carousel__tint';
      tint.style.background = cfg.tint;
      card.appendChild(img); card.appendChild(tint);
      if (item.caption) { var cap = document.createElement('span'); cap.className = 'depth-carousel__caption'; cap.textContent = item.caption; card.appendChild(cap); }
      card.addEventListener('click', function () { onCardClick(i); });
      stage.appendChild(card);
      cards.push(card); overlays.push(tint);
    });

    if (cfg.showControls && count > 1) {
      [['prev', 'Предыдущее событие', 'M15 5l-7 7 7 7', -1], ['next', 'Следующее событие', 'M9 5l7 7-7 7', 1]].forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'depth-carousel__arrow depth-carousel__arrow--' + a[0];
        b.setAttribute('aria-label', a[1]);
        b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="' + a[2] + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        b.addEventListener('click', function () { navigateBy(a[3]); });
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        root.appendChild(b);
      });
    }
    if (cfg.showIndicators && count > 1) {
      var dotsBox = document.createElement('div');
      dotsBox.className = 'depth-carousel__dots';
      dotsBox.setAttribute('role', 'tablist');
      dotsBox.setAttribute('aria-label', 'Слайды');
      data.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Перейти к слайду ' + (i + 1));
        d.className = 'depth-carousel__dot';
        d.addEventListener('click', function () { setFocus(i, true); });
        d.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        dotsBox.appendChild(d); dots.push(d);
      });
      root.appendChild(dotsBox);
    }

    /* ---------- раскладка ---------- */
    function layout(p) {
      var n = cfg.count;
      if (!n) return;
      var dir = cfg.tiltDirection === 'left' ? -1 : 1;
      var sc = scale;
      for (var i = 0; i < n; i++) {
        var el = cards[i];
        if (!el) continue;
        var d = i - p;
        if (cfg.loop && n > 1) {
          d = ((d % n) + n) % n;
          if (d > n / 2) d -= n;
        }
        var back = Math.max(0, d);
        var az = Math.abs(d);
        var shown = az <= cfg.visibleCards + 0.5;
        var tz = -cfg.depth * d;
        var tx = dir * cfg.spread * d;
        var ry = dir * cfg.tilt * clamp(d, 0, 1);
        var opacity = d < 0 ? Math.max(0, 1 + d) : 1;
        if (!shown) opacity = 0;
        var brightness = Math.max(0.15, 1 - back * cfg.falloff);
        var blurPx = cfg.blur > 0 ? Math.min(cfg.blur, (back / Math.max(1, cfg.visibleCards)) * cfg.blur) : 0;
        var zi = Math.round(2000 - d * 20);

        el.style.transform = 'translate(-50%, -50%) scale(' + sc + ') translateX(' + tx.toFixed(2) + 'px) translateZ(' + tz.toFixed(2) + 'px) rotateY(' + ry.toFixed(3) + 'deg)';
        el.style.opacity = opacity.toFixed(3);
        el.style.filter = 'brightness(' + brightness.toFixed(3) + ') blur(' + blurPx.toFixed(2) + 'px)';
        el.style.zIndex = String(zi);
        el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

        var ov = overlays[i];
        if (ov) ov.style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
      }
    }

    function notify(idx) {
      cards.forEach(function (c, k) { c.setAttribute('aria-hidden', String(k !== idx)); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === idx); d.setAttribute('aria-selected', String(k === idx)); });
      if (cfg.onChange) cfg.onChange(idx, data[idx]);
    }

    function tweenTo(target, animate) {
      if (tween) tween.kill();
      var proxy = { p: pos };
      var dur = animate && !reduced ? cfg.duration / 1000 : 0;
      tween = gsap.to(proxy, {
        p: target, duration: dur, ease: cfg.ease,
        onUpdate: function () { pos = proxy.p; layout(proxy.p); },
        onComplete: function () {
          var n = cfg.count;
          if (n > 0) pos = ((pos % n) + n) % n;
          layout(pos);
        }
      });
    }

    function setFocus(rawIndex, animate) {
      if (animate === undefined) animate = true;
      var n = cfg.count;
      if (!n) return;
      var idx = cfg.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
      var delta = idx - pos;
      if (cfg.loop && n > 1) {
        delta = ((delta % n) + n) % n;
        if (delta > n / 2) delta -= n;
      }
      tweenTo(pos + delta, animate);
      if (idx !== focus) { focus = idx; notify(idx); }
    }

    function navigateBy(step) { setFocus(focus + step, true); }

    /* ---------- размер ---------- */
    var ro = new ResizeObserver(function (entries) {
      var w = entries[0].contentRect.width;
      var needed = cfg.cardWidth + Math.abs(cfg.spread) * 2 + cfg.fitPadding;
      scale = clamp(w / needed, 0.4, 1);
      layout(pos);
    });
    ro.observe(root);

    /* ---------- колесо ---------- */
    root.addEventListener('wheel', function (e) {
      if (cfg.count < 2) return;
      e.preventDefault();
      if (tween) tween.kill();
      var raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      var delta = e.deltaMode === 1 ? raw * 24 : raw;
      var step = clamp(delta / (cfg.cardWidth * 0.9), -0.6, 0.6);
      pos += step;
      layout(pos);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { setFocus(Math.round(pos), true); }, 130);
    }, { passive: false });

    /* ---------- перетаскивание и свайп ---------- */
    root.addEventListener('pointerdown', function (e) {
      if (cfg.count < 2) return;
      if (tween) tween.kill();
      drag = { x: e.clientX, startPos: pos, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, id: e.pointerId };
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var stepPx = Math.max(cfg.cardWidth * 0.55 * scale, 40);
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) {
        drag.moved = true;
        try { root.setPointerCapture(drag.id); } catch (err) {}
      }
      if (!drag.moved) return;
      var now = performance.now();
      var dt = Math.max(now - drag.lastT, 1);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = now;
      pos = drag.startPos - dx / stepPx;
      layout(pos);
    });
    var lastDragMoved = false;
    function onPointerEnd() {
      if (!drag) return;
      var d = drag;
      drag = null;
      lastDragMoved = d.moved;
      setTimeout(function () { lastDragMoved = false; }, 0);
      if (!d.moved) return;
      var stepPx = Math.max(cfg.cardWidth * 0.55 * scale, 40);
      var projected = pos - (d.v * 180) / stepPx;
      setFocus(Math.round(projected), true);
    }
    root.addEventListener('pointerup', onPointerEnd);
    root.addEventListener('pointercancel', onPointerEnd);

    /* ---------- клавиатура ---------- */
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateBy(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateBy(1); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target === root && cfg.onOpen) { e.preventDefault(); cfg.onOpen(focus, data[focus]); }
    });

    function onCardClick(index) {
      if (lastDragMoved) return;
      // сайт: нажатие на переднюю карточку открывает её, на остальные — выводит вперёд
      if (index === focus && cfg.onOpen) { cfg.onOpen(index, data[index]); return; }
      setFocus(index, true);
    }

    /* ---------- автопрокрутка ---------- */
    if (cfg.autoplay && !reduced && count > 1) {
      var hovered = false, focused = false;
      root.addEventListener('mouseenter', function () { hovered = true; });
      root.addEventListener('mouseleave', function () { hovered = false; });
      root.addEventListener('focusin', function () { focused = true; });
      root.addEventListener('focusout', function () { focused = false; });
      autoTimer = window.setInterval(function () { if (!hovered && !focused) navigateBy(1); }, Math.max(cfg.autoplayDelay, 600));
    }

    layout(pos);
    notify(0);

    return {
      next: function () { navigateBy(1); },
      prev: function () { navigateBy(-1); },
      goTo: function (i) { setFocus(i, true); },
      get index() { return focus; },
      destroy: function () {
        if (tween) tween.kill();
        if (wheelTimer) clearTimeout(wheelTimer);
        if (autoTimer) clearInterval(autoTimer);
        ro.disconnect();
        root.innerHTML = '';
      }
    };
  }

  window.DepthCarousel = { mount: mount };
})();
