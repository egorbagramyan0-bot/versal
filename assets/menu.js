/* Страница меню: вывод блюд из menu-data.js, навигация по разделам, мобильные элементы. */
(function () {
  'use strict';

  var DATA = window.VERSAL_MENU || { sections: [] };
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function price(n) { return typeof n === 'number' ? n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽' : ''; }

  /* ---------- меню ---------- */
  var list = $('#menu-list'), cats = $('#mp-cats');
  var sections = (DATA.sections || []).filter(function (s) { return s.items && s.items.length; });

  if (DATA.sample) $('#mp-sample').hidden = false;
  var note = $('#mp-note');
  note.textContent = [DATA.priceNote, DATA.updated ? 'Меню обновлено ' + DATA.updated + '.' : ''].filter(Boolean).join(' ');
  if (!note.textContent) note.hidden = true;

  if (!sections.length) {
    $('.mp-cats').hidden = true;
    list.innerHTML = '<div class="mp-empty"><p class="mp-empty__title">Меню обновляется</p><p>Актуальное банкетное меню пришлёт администратор — оставьте заявку или позвоните.</p></div>';
  } else {
    cats.innerHTML = sections.map(function (s, i) {
      return '<a class="mp-cat' + (i ? '' : ' is-active') + '" href="#' + esc(s.id) + '">' + esc(s.title) + '</a>';
    }).join('');
    list.innerHTML = sections.map(function (s) {
      return '<section class="mp-sec" id="' + esc(s.id) + '" aria-labelledby="' + esc(s.id) + '-t">' +
        '<header class="mp-sec__head"><h2 class="mp-sec__title" id="' + esc(s.id) + '-t">' + esc(s.title) + '</h2>' +
        (s.note ? '<p class="mp-sec__note">' + esc(s.note) + '</p>' : '') + '</header>' +
        '<ul class="mp-items">' + s.items.map(function (it) {
          var meta = it.weight ? '<span class="mp-item__w">' + esc(it.weight) + '</span>' : '';
          return '<li class="mp-item">' +
            '<div class="mp-item__row"><span class="mp-item__name">' + esc(it.name) + '</span><span class="mp-item__dots" aria-hidden="true"></span>' +
            (it.price != null ? '<span class="mp-item__price">' + price(it.price) + '</span>' : '') + '</div>' +
            ((it.desc || meta) ? '<p class="mp-item__desc">' + (it.desc ? esc(it.desc) : '') + (it.desc && meta ? ' · ' : '') + meta + '</p>' : '') +
            '</li>';
        }).join('') + '</ul></section>';
    }).join('');
  }

  /* ---------- разделы: плавный переход и подсветка ---------- */
  var header = $('[data-header]'), catBar = $('.mp-cats');
  function offset() { return (header ? header.offsetHeight : 0) + (catBar && !catBar.hidden ? catBar.offsetHeight : 0) + 8; }

  // «таблетка», которая переезжает между категориями
  var ind = document.createElement('span');
  ind.className = 'mp-cat-ind';
  ind.setAttribute('aria-hidden', 'true');
  cats.insertBefore(ind, cats.firstChild);
  var activeId = null;
  function placeIndicator(a, instant) {
    if (!a) return;
    if (instant) ind.classList.add('is-instant');
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    ind.classList.add('is-ready');
    if (instant) { void ind.offsetWidth; ind.classList.remove('is-instant'); }
  }
  function setActive(id, instant) {
    if (id === activeId && !instant) return;
    activeId = id;
    $$('.mp-cat', cats).forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        placeIndicator(a, instant);
        var l = a.offsetLeft - 16, r = a.offsetLeft + a.offsetWidth + 16;
        if (l < cats.scrollLeft || r > cats.scrollLeft + cats.clientWidth) cats.scrollTo({ left: l, behavior: REDUCED ? 'auto' : 'smooth' });
      } else a.removeAttribute('aria-current');
    });
  }

  // собственная плавная прокрутка: работает и там, где браузерная отключена
  var scrollAnim = null;
  function cancelScroll() { if (scrollAnim) { cancelAnimationFrame(scrollAnim.raf); scrollAnim = null; } }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function scrollToY(y, done) {
    cancelScroll();
    var max = document.documentElement.scrollHeight - window.innerHeight;
    y = Math.max(0, Math.min(max, y));
    var from = window.scrollY, dist = y - from;
    if (REDUCED || Math.abs(dist) < 2) { window.scrollTo({ top: y, behavior: 'instant' }); if (done) done(); return; }
    var dur = Math.max(450, Math.min(1100, Math.abs(dist) * 0.45)), start = performance.now();
    scrollAnim = { raf: 0 };
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      window.scrollTo({ top: from + dist * ease(t), behavior: 'instant' });
      if (t < 1) scrollAnim.raf = requestAnimationFrame(step);
      else { scrollAnim = null; if (done) done(); }
    })(start);
  }
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, cancelScroll, { passive: true }); });

  function markSection(sec) {
    if (!sec || REDUCED) return;
    sec.classList.remove('is-target'); void sec.offsetWidth; sec.classList.add('is-target');
    setTimeout(function () { sec.classList.remove('is-target'); }, 1600);
  }

  cats.addEventListener('click', function (e) {
    var a = e.target.closest('.mp-cat');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('href').slice(1), t = document.getElementById(id);
    if (!t) return;
    setActive(id);
    spyPaused = true;
    scrollToY(t.getBoundingClientRect().top + window.scrollY - offset(), function () {
      spyPaused = false;
      markSection(t);
      onScroll();
    });
    history.replaceState(null, '', '#' + id);
  });

  var secs = $$('.mp-sec');
  var ticking = false, spyPaused = false;
  function onScroll() {
    ticking = false;
    if (!spyPaused) {
      var y = offset() + 40, current = secs[0];
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= y) current = s; });
      // у самого низа страницы — последний раздел
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && secs.length) {
        var lastVisible = secs.filter(function (s) { return s.getBoundingClientRect().top < window.innerHeight; }).pop();
        if (lastVisible) current = lastVisible;
      }
      if (current) setActive(current.id);
    }
    var dock = $('[data-dock]');
    if (dock) {
      var on = window.scrollY > 300;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', String(!on));
      $$('a', dock).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { var a = $('.mp-cat.is-active', cats); if (a) placeIndicator(a, true); });
  if (secs[0]) setActive(secs[0].id, true);
  onScroll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var a = $('.mp-cat.is-active', cats); if (a) placeIndicator(a, true); });

  if (location.hash && document.getElementById(location.hash.slice(1))) {
    var t0 = document.getElementById(location.hash.slice(1));
    setTimeout(function () { window.scrollTo({ top: t0.getBoundingClientRect().top + window.scrollY - offset(), behavior: 'instant' }); }, 50);
  }
})();
