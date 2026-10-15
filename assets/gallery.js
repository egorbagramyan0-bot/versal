/* Галерея событий: лента карточек и окно с фотографиями события. Данные — assets/gallery-data.js */
(function () {
  'use strict';

  var DATA = window.VERSAL_GALLERY || { events: [] };
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var section = $('#gallery');
  var track = $('#ev-track');
  var events = (DATA.events || []).filter(function (e) { return e && e.photos && e.photos.length; });
  if (!section || !track) return;
  if (!events.length) { section.hidden = true; return; }

  /* ---------- карточки ---------- */
  track.innerHTML = events.map(function (e, i) {
    var cover = e.cover || e.photos[0].src;
    return '<li class="ev-card"><button class="ev-card__btn" type="button" data-i="' + i + '" aria-haspopup="dialog">' +
      '<span class="ev-card__img"><img src="' + esc(cover) + '" alt="" loading="lazy" decoding="async"><span class="ev-card__more" aria-hidden="true">Смотреть фото</span></span>' +
      '<span class="ev-card__cap"><span class="ev-card__title">' + esc(e.title) + '</span>' +
      '<span class="ev-card__meta">' + (e.date ? '<time>' + esc(e.date) + '</time> · ' : '') + e.photos.length + ' фото' + '</span></span>' +
      '</button></li>';
  }).join('');

  /* ---------- телефон: DepthCarousel вместо ленты ---------- */
  var depthBox = document.createElement('div');
  depthBox.className = 'ev-depth';
  depthBox.id = 'ev-depth';
  var depthCap = document.createElement('div');
  depthCap.className = 'ev-depth-cap';
  depthCap.innerHTML = '<p class="ev-depth-cap__title"></p><p class="ev-depth-cap__meta"></p>';
  track.parentNode.insertBefore(depthBox, track.nextSibling);
  depthBox.parentNode.insertBefore(depthCap, depthBox.nextSibling);
  var depthIndex = 0;
  function showCap(i) {
    var e = events[i];
    depthIndex = i;
    $('.ev-depth-cap__title', depthCap).textContent = e.title;
    $('.ev-depth-cap__meta', depthCap).textContent = (e.date ? e.date + ' · ' : '') + e.photos.length + ' фото';
  }
  showCap(0);
  if (window.DepthCarousel) {
    window.DepthCarousel.mount(depthBox, {
      items: events.map(function (e) { return { image: e.cover || e.photos[0].src, alt: e.title + (e.date ? ', ' + e.date : '') }; }),
      cardWidth: 300, cardHeight: 400, radius: 6, fitPadding: 40,
      tint: '#cfd4da', depth: 200, spread: 28, tilt: 18,
      perspective: 1200, visibleCards: 3, falloff: 0.14, blur: 4,
      duration: 700, ease: 'power3.out', loop: true, showControls: false,
      label: 'Праздники в «Версале»',
      onChange: function (i) { showCap(i); },
      onOpen: function (i) { open(i, depthBox); }
    });
  } else {
    depthBox.hidden = true;
    depthCap.hidden = true;
    section.classList.add('ev-no-depth');
  }

  /* ---------- листание ленты ---------- */
  var arrows = $$('.ev-arrow', section);
  var cardStep = function () { var c = $('.ev-card', track); return c ? c.getBoundingClientRect().width + 20 : track.clientWidth * 0.8; };
  var syncArrows = function () {
    var max = track.scrollWidth - track.clientWidth - 2;
    arrows.forEach(function (b) { b.disabled = b.dataset.dir === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max; });
  };
  arrows.forEach(function (b) {
    b.addEventListener('click', function () { track.scrollBy({ left: Number(b.dataset.dir) * cardStep(), behavior: REDUCED ? 'auto' : 'smooth' }); });
  });
  track.addEventListener('scroll', function () { requestAnimationFrame(syncArrows); }, { passive: true });
  window.addEventListener('resize', syncArrows);
  syncArrows();

  // перетаскивание ленты мышью
  var drag = { on: false, moved: false, x: 0, left: 0 };
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.on = true; drag.moved = false; drag.x = e.clientX; drag.left = track.scrollLeft;
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; track.classList.add('is-dragging'); }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', function () {
    if (!drag.on) return;
    drag.on = false;
    if (drag.moved) {
      track.classList.remove('is-dragging');
      var w = cardStep();
      track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: REDUCED ? 'auto' : 'smooth' });
    }
  });

  /* ---------- окно с галереей события ---------- */
  var dlg = $('#ev-modal');
  var img = $('.ev-modal__img', dlg), title = $('.ev-modal__title', dlg), date = $('.ev-modal__date', dlg);
  var count = $('.ev-modal__count', dlg), thumbs = $('.ev-modal__thumbs', dlg), stage = $('.ev-modal__stage', dlg);
  var cur = { e: 0, p: 0 }, opener = null;

  function show(p) {
    var ev = events[cur.e];
    cur.p = (p + ev.photos.length) % ev.photos.length;
    var ph = ev.photos[cur.p];
    img.classList.remove('is-in'); void img.offsetWidth;
    img.src = ph.src;
    img.alt = ph.alt || ev.title;
    img.classList.add('is-in');
    count.textContent = (cur.p + 1) + ' / ' + ev.photos.length;
    $$('button', thumbs).forEach(function (t, k) {
      var on = k === cur.p;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
    });
    var next = ev.photos[(cur.p + 1) % ev.photos.length];
    if (next) { var pre = new Image(); pre.src = next.src; }
  }

  function open(i, btn) {
    cur.e = i; opener = btn;
    var ev = events[i];
    title.textContent = ev.title;
    date.textContent = ev.date || '';
    thumbs.innerHTML = ev.photos.map(function (ph, k) {
      return '<button type="button" data-p="' + k + '" aria-label="Фото ' + (k + 1) + ' из ' + ev.photos.length + '"><img src="' + esc(ph.src) + '" alt="" loading="lazy"></button>';
    }).join('');
    var single = ev.photos.length < 2;
    $$('.ev-modal__nav', dlg).forEach(function (b) { b.hidden = single; });
    thumbs.hidden = single;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.classList.add('is-locked');
    show(0);
  }

  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', function () {
    document.documentElement.classList.remove('is-locked');
    if (opener) opener.focus();
  });

  track.addEventListener('click', function (e) {
    var b = e.target.closest('.ev-card__btn');
    if (!b) return;
    if (drag.moved) { e.preventDefault(); return; }
    open(Number(b.dataset.i), b);
  });
  $('.ev-modal__close', dlg).addEventListener('click', close);
  $('.ev-modal__prev', dlg).addEventListener('click', function () { show(cur.p - 1); });
  $('.ev-modal__next', dlg).addEventListener('click', function () { show(cur.p + 1); });
  thumbs.addEventListener('click', function (e) { var t = e.target.closest('button'); if (t) show(Number(t.dataset.p)); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target === stage) close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur.p - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur.p + 1); }
  });
  var sx = null;
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) show(cur.p + (dx < 0 ? 1 : -1));
    sx = null;
  });
})();
