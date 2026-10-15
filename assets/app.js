(function () {
  'use strict';

  var CFG = window.VERSAL || {};
  var root = document.documentElement;
  var Scene = window.VersalScene;
  var REDUCED = Scene ? Scene.reduced : false;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function store(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) {} }
    };
  }
  // интро первого экрана стартует после прелоадера (или сразу, если его нет)
  function whenReady(fn) {
    var R = window.VersalReady;
    if (R && !R.done) R.then(fn); else fn();
  }
  var local = store('localStorage');
  var session = store('sessionStorage');
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ================= Данные из config.js ================= */
  var contacts = CFG.contacts || {};
  $$('[data-link]').forEach(function (a) {
    var url = contacts[a.getAttribute('data-link')];
    if (url) a.href = url;
  });

  function renderFacts() {
    var dl = $('#facts');
    if (!dl) return;
    dl.innerHTML = (CFG.facts || []).filter(function (f) { return f.value != null && f.value !== ''; }).map(function (f) {
      return '<div class="fact"><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>';
    }).join('');
  }

  function renderContacts() {
    var msg = [];
    if (contacts.whatsapp) msg.push('<a class="link" href="' + esc(contacts.whatsapp) + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (contacts.telegram) msg.push('<a class="link" href="' + esc(contacts.telegram) + '" target="_blank" rel="noopener">Telegram</a>');
    var m = $('#messengers');
    if (m && msg.length) { m.hidden = false; $('dd', m).innerHTML = msg.join(''); }
    var h = $('#hours');
    if (h && contacts.hours) { h.hidden = false; $('dd', h).textContent = contacts.hours; }
  }

  function renderPhotos() {
    var photos = CFG.photos || {};
    $$('[data-photo-slot]').forEach(function (slot) {
      var key = slot.getAttribute('data-photo-slot');
      var src = photos[key];
      if (key === 'hero') {
        if (src) { slot.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")'; slot.closest('.hero').classList.add('has-photo'); }
        return;
      }
      var art = $('.plate__art', slot);
      if (!art) return;
      if (src) {
        var img = new Image();
        img.src = src; img.alt = slot.getAttribute('data-photo-need') || ''; img.loading = 'lazy'; img.decoding = 'async';
        art.appendChild(img);
      }
    });
  }

  renderFacts(); renderContacts(); renderPhotos();

  /* ================= Шапка и меню ================= */
  var header = $('[data-header]');

  // подсветка текущего раздела
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach(function (s) { secObs.observe(s); });
  }

  /* ================= Первый экран ================= */
  var hero = $('.hero');
  var stage = $('.hero__stage');
  var heroContent = $('.hero__content');
  var hall = $('#hall-scene');
  var shine = $('[data-shine]');

  if (hall && Scene) {
    var lastAspect = 0;
    var build = function (animate) {
      var r = hall.getBoundingClientRect();
      lastAspect = r.width / Math.max(1, r.height);
      Scene.buildHall(hall, animate);
    };
    hall.addEventListener('lit', function () { hero.classList.add('is-lit'); });
    build(true); // анимация сцены сама ждёт окончания прелоадера
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var r = hall.getBoundingClientRect();
        var a = r.width / Math.max(1, r.height);
        if (Math.abs(a - lastAspect) / lastAspect > 0.12) build(false);
      }, 200);
    });
  }
  whenReady(function () {
    requestAnimationFrame(function () {
      hero.classList.add('is-ready');
      if (shine && !REDUCED) setTimeout(function () { shine.classList.add('is-shining'); }, 900);
    });
  });

  // за пределами экрана сцена не рисуется и не мерцает
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      hero.classList.toggle('is-away', !en[0].isIntersecting);
    }).observe(hero);
  }

  // свет за курсором
  if (hero && !REDUCED && window.matchMedia('(hover: hover)').matches) {
    var light = $('.hero__light'), lx = 0, ly = 0, lightQueued = false;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      lx = e.clientX - r.left; ly = e.clientY - r.top;
      if (lightQueued || !light) return;
      lightQueued = true;
      requestAnimationFrame(function () {
        lightQueued = false;
        light.style.transform = 'translate3d(' + lx.toFixed(0) + 'px,' + ly.toFixed(0) + 'px,0)';
      });
    }, { passive: true });
  }

  // вход в зал при прокрутке + состояние шапки
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    if (!REDUCED && hero) {
      var h = hero.offsetHeight;
      if (y < h * 1.1) {
        var p = Math.min(1, y / h);
        stage.style.transform = 'scale(' + (1 + p * 0.16).toFixed(4) + ') translateY(' + (p * 3).toFixed(2) + '%)';
        heroContent.style.transform = 'translateY(' + (-p * 60).toFixed(1) + 'px)';
        heroContent.style.opacity = String(Math.max(0, 1 - p * 1.6).toFixed(3));
      }
    }
    updateSteps();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ================= Появление при прокрутке ================= */
  function drawVignettesIn(node) {
    if (!Scene) return;
    $$('svg[data-vignette]', node).forEach(Scene.drawVignette);
  }
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        drawVignettesIn(en.target);
        en.target.classList.add('is-in');
        revObs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    $$('.reveal').forEach(function (n) { revObs.observe(n); });
  } else {
    $$('.reveal').forEach(function (n) { drawVignettesIn(n); n.classList.add('is-in'); });
  }
  // на случай, если виньетка вне .reveal
  $$('svg[data-vignette]').forEach(function (s) { if (!s.closest('.reveal')) Scene && Scene.drawVignette(s); });

  /* ================= Зал: фото на весь экран ================= */
  (function hallSlides() {
    var sec = $('.hall-full');
    if (!sec) return;
    var slides = $$('.hall-full__slide', sec), dots = $$('.hall-dot', sec);
    var i = 0, timer = null, visible = false;
    var delay = 6500;
    var load = function (img) { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    var show = function (n) {
      i = (n + slides.length) % slides.length;
      load(slides[i]); load(slides[(i + 1) % slides.length]);
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-pressed', String(k === i));
        if (k === i) { d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; }
      });
    };
    var stop = function () { clearInterval(timer); timer = null; sec.classList.remove('is-playing'); };
    var play = function () {
      if (REDUCED || timer || !visible) return;
      sec.classList.add('is-playing');
      timer = setInterval(function () { show(i + 1); }, delay);
    };
    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { stop(); show(k); play(); });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { load(slides[1]); play(); } else stop();
      }, { threshold: 0.2 }).observe(sec);
    } else { slides.forEach(load); visible = true; play(); }
  })();

  /* ================= Поводы ================= */
  var occ = $('[data-occ]');
  if (occ) {
    var tabs = $$('.oc__tab', occ);
    var panels = $$('.oc__panel', occ);
    var media = $('[data-oc-media]', occ);
    var phIco = $('[data-oc-ph-ico]', occ);
    var card = $('#occ-card');
    var occPhotos = (CFG.photos && CFG.photos.occasions) || {};

    // иконка повода — в заголовок карточки
    panels.forEach(function (p) {
      var tab = $('#tab-' + p.dataset.key);
      var slot = $('[data-oc-ico]', p);
      if (tab && slot) slot.innerHTML = $('.oc__ico', tab).outerHTML;
    });

    var setMedia = function (key) {
      var tab = $('#tab-' + key), panel = $('#occ-' + key);
      var img = $('img', media);
      var src = occPhotos[key];
      if (src) {
        if (!img) { img = new Image(); img.decoding = 'async'; media.appendChild(img); }
        img.src = src; img.alt = panel ? 'Фото: ' + panel.dataset.photoNeed : '';
      } else if (img) img.remove();
      phIco.innerHTML = tab ? $('.oc__ico', tab).outerHTML : '';
    };

    var selectTab = function (key, focus, user) {
      tabs.forEach(function (t) {
        var on = t.dataset.key === key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach(function (p) {
        var on = p.dataset.key === key;
        if (on && p.hidden && !REDUCED) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
        p.hidden = !on;
      });
      setMedia(key);
      // на узком экране карточка под списком — подводим к ней
      if (user && card && window.matchMedia('(max-width: 1024px)').matches) {
        var r = card.getBoundingClientRect();
        var headerH = header ? header.offsetHeight : 0;
        if (r.top > window.innerHeight * 0.6 || r.top < headerH) {
          window.scrollTo({ top: window.scrollY + r.top - headerH - 12, behavior: REDUCED ? 'auto' : 'smooth' });
        }
      }
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t.dataset.key, false, true); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); selectTab(n.dataset.key, true); }
      });
    });
    var saved = session.get('versal-occasion');
    selectTab(saved && tabs.some(function (t) { return t.dataset.key === saved; }) ? saved : 'wedding');
  }

  /* ================= Шаги подготовки ================= */
  var stepsEl = $('[data-steps]');
  var stepItems = stepsEl ? $$('.step', stepsEl) : [];
  function updateSteps() {
    if (!stepsEl) return;
    var r = stepsEl.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    stepsEl.style.setProperty('--p', p.toFixed(3));
    stepItems.forEach(function (s, i) {
      var sr = s.getBoundingClientRect();
      s.classList.toggle('is-on', sr.top < vh * 0.8);
    });
  }
  updateSteps();

  /* ================= Форма-приглашение ================= */
  var form = $('#lead-form');
  var OCC = {
    wedding: { card: 'Свадьба', text: 'Свадьба' },
    matchmaking: { card: 'Сватовство', text: 'Сватовство' },
    birthday: { card: 'Юбилей', text: 'Юбилей или день рождения' },
    family: { card: 'Семейный праздник', text: 'Семейное торжество' },
    corporate: { card: 'Корпоратив', text: 'Корпоратив' },
    memorial: { card: 'Поминальный обед', text: 'Поминки', quiet: true },
    other: { card: 'Ваш праздник', text: 'Другое' }
  };
  var GOALS = { date: 'условия на дату', menu: 'меню и расчёт', visit: 'просмотр зала' };
  var CONTACT = { call: 'звонок', whatsapp: 'WhatsApp', telegram: 'Telegram' };

  function plural(n, f) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return f[2];
    if (b > 1 && b < 5) return f[1];
    if (b === 1) return f[0];
    return f[2];
  }
  function todayISO() {
    var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    try {
      var s = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/\s?г\.$/, '');
      var w = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(d);
      return s + ', ' + w;
    } catch (e) { return iso; }
  }
  function digits(s) { return (s || '').replace(/\D/g, ''); }
  function formatPhone(v) {
    var d = digits(v);
    if (!d) return v.trim() === '+' ? '+' : '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] === '9') d = '7' + d;
    if (d[0] !== '7') return '+' + d.slice(0, 15);
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  function phoneValid(v) {
    var d = digits(v);
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] === '7') return d.length === 11;
    return d.length >= 10 && d.length <= 15;
  }

  if (form) {
    var F = form.elements;
    var dateInput = $('#f-date'), dateUnknown = $('#f-date-unknown');
    var phoneInput = $('#f-phone');
    var statusBox = $('#form-status'), errorsBox = $('#form-errors'), doneBox = $('#form-done');
    var submitBtn = $('.btn--submit', form);
    var invite = $('#invite');
    var lastPayload = null;
    var sending = false;

    dateInput.min = todayISO();

    function getData() {
      var goals = $$('input[name="goal"]:checked', form).map(function (i) { return i.value; });
      var occR = $('#f-occasion', form);
      var via = $('input[name="contactVia"]:checked', form);
      var guests = F.guests.value.trim();
      return {
        goals: goals,
        occasion: occR ? occR.value : '',
        date: dateUnknown.checked ? '' : dateInput.value,
        dateUnknown: dateUnknown.checked,
        guests: guests ? Number(guests) : null,
        name: F.name.value.trim(),
        phone: phoneInput.value.trim(),
        contactVia: via ? via.value : 'call',
        comment: F.comment.value.trim(),
        consent: F.consent.checked,
        website: F.website.value
      };
    }

    /* приглашение */
    var lastOcc = null;
    function updateCard() {
      if (!invite) return;
      var d = getData();
      var occEl = $('[data-card="occasion"]', invite);
      var occText = d.occasion ? OCC[d.occasion].card : 'Ваш праздник';
      if (occEl.textContent !== occText) {
        occEl.textContent = occText;
        if (lastOcc !== null && !REDUCED && !(d.occasion && OCC[d.occasion].quiet)) { occEl.classList.remove('is-swap'); void occEl.offsetWidth; occEl.classList.add('is-swap'); }
      }
      lastOcc = d.occasion;
      var dateEl = $('[data-card="date"]', invite);
      dateEl.textContent = d.dateUnknown ? 'Дату выберем вместе' : (d.date ? fmtDate(d.date) : 'Дата — на ваш выбор');
      dateEl.classList.toggle('is-filled', !!d.date);
      var gEl = $('[data-card="guests"]', invite);
      var gOk = d.guests && d.guests > 0 && d.guests < 2001 && Math.floor(d.guests) === d.guests;
      gEl.textContent = gOk ? 'около ' + d.guests + ' ' + plural(d.guests, ['гостя', 'гостей', 'гостей']) : 'Число гостей уточним вместе';
      var goalsEl = $('[data-card="goals"]', invite);
      var names = d.name ? 'Организатор — ' + d.name.split(' ')[0] + ' · ' : '';
      goalsEl.textContent = d.goals.length ? names + d.goals.map(function (g) { return GOALS[g]; }).join(' · ') : (d.name ? 'Организатор — ' + d.name.split(' ')[0] : '');
    }
    form.addEventListener('input', updateCard);
    form.addEventListener('change', updateCard);

    // наклон и блик карточки
    if (invite && !REDUCED && window.matchMedia('(hover: hover)').matches) {
      var wrap = invite.parentElement;
      wrap.addEventListener('pointermove', function (e) {
        var r = invite.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        invite.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
        invite.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        invite.style.setProperty('--sx', (x * 100).toFixed(1) + '%');
        invite.style.setProperty('--sy', (y * 100).toFixed(1) + '%');
      });
      wrap.addEventListener('pointerleave', function () {
        invite.style.setProperty('--rx', '0deg'); invite.style.setProperty('--ry', '0deg');
      });
    }

    /* дата «пока не определились» */
    dateUnknown.addEventListener('change', function () {
      dateInput.disabled = dateUnknown.checked;
      if (dateUnknown.checked) clearError(dateInput);
    });

    /* телефон */
    phoneInput.addEventListener('input', function (e) {
      if (e.inputType && e.inputType.indexOf('delete') === 0) return;
      var pos = phoneInput.value.length === phoneInput.selectionStart;
      var f = formatPhone(phoneInput.value);
      if (f !== phoneInput.value) { phoneInput.value = f; if (pos) phoneInput.setSelectionRange(f.length, f.length); }
    });
    phoneInput.addEventListener('focus', function () { if (!phoneInput.value) phoneInput.value = '+7 '; });
    phoneInput.addEventListener('blur', function () {
      if (digits(phoneInput.value).length <= 1) phoneInput.value = '';
      else phoneInput.value = formatPhone(phoneInput.value);
      if (form.dataset.tried) validateField('phone');
    });

    /* повод и цель из кнопок на странице */
    function setOccasion(key) {
      var sel = $('#f-occasion', form);
      if (sel && OCC[key]) {
        sel.value = key; session.set('versal-occasion', key);
        if (!REDUCED) { sel.classList.remove('is-flash'); void sel.offsetWidth; sel.classList.add('is-flash'); }
      }
    }
    function setGoal(key) {
      var c = $('input[name="goal"][value="' + key + '"]', form);
      if (c) { c.checked = true; pulse(c); }
    }
    function pulse(input) {
      var chip = input.closest('.chip');
      if (!chip || REDUCED) return;
      chip.classList.remove('is-pulse'); void chip.offsetWidth; chip.classList.add('is-pulse');
    }
    $('#f-occasion', form).addEventListener('change', function () { if (this.value) session.set('versal-occasion', this.value); });
    var savedOcc = session.get('versal-occasion');
    if (savedOcc && OCC[savedOcc]) { $('#f-occasion', form).value = savedOcc; }

    // переход с других страниц: index.html?goal=menu&occasion=wedding#request
    try {
      var qp = new URLSearchParams(location.search);
      if (qp.get('occasion') && OCC[qp.get('occasion')]) setOccasion(qp.get('occasion'));
      if (qp.get('goal')) setGoal(qp.get('goal'));
    } catch (e) {}

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href="#request"]');
      if (!a) return;
      if (a.dataset.occasion) setOccasion(a.dataset.occasion);
      if (a.dataset.goal) setGoal(a.dataset.goal);
      updateCard();
      if (!doneBox.hidden) return;
      setTimeout(function () {
        var t = $('#request-title');
        if (t) t.focus({ preventScroll: true });
      }, REDUCED ? 0 : 600);
    });

    /* проверка полей */
    var errText = {};
    function setError(input, msg) {
      input.setAttribute('aria-invalid', 'true');
      var box = document.getElementById(input.id + '-err');
      if (box) box.textContent = msg;
      errText[input.id] = msg;
    }
    function clearError(input) {
      if (!errText[input.id] && !input.getAttribute('aria-invalid')) return;
      input.removeAttribute('aria-invalid');
      var box = document.getElementById(input.id + '-err');
      if (box) box.textContent = '';
      delete errText[input.id];
      if (!errorsBox.hidden) renderSummary();
    }
    function validateField(name) {
      var d = getData();
      switch (name) {
        case 'name':
          if (d.name.length < 2) setError(F.name, 'Напишите, как к вам обращаться.');
          else clearError(F.name);
          break;
        case 'phone':
          if (!d.phone || digits(d.phone).length <= 1) setError(phoneInput, 'Укажите телефон — по нему администратор свяжется с вами.');
          else if (!phoneValid(d.phone)) setError(phoneInput, 'Похоже, в номере не хватает цифр. Пример: +7 (900) 123-45-67.');
          else clearError(phoneInput);
          break;
        case 'date':
          if (!d.dateUnknown && dateInput.value && dateInput.value < todayISO()) setError(dateInput, 'Эта дата уже прошла. Выберите другую или отметьте «Пока не определились».');
          else if (!d.dateUnknown && dateInput.validity && dateInput.validity.badInput) setError(dateInput, 'Не получилось распознать дату.');
          else clearError(dateInput);
          break;
        case 'guests':
          var g = F.guests.value.trim();
          if (g && (!/^\d+$/.test(g) || +g < 1 || +g > 2000)) setError(F.guests, 'Укажите примерное число гостей цифрами, например 60.');
          else if (F.guests.validity && F.guests.validity.badInput) setError(F.guests, 'Укажите число гостей цифрами.');
          else clearError(F.guests);
          break;
        case 'consent':
          if (!d.consent) setError(F.consent, 'Без согласия мы не можем передать заявку администратору.');
          else clearError(F.consent);
          break;
      }
    }
    var ORDER = ['date', 'guests', 'name', 'phone', 'consent'];
    var LABEL = { 'f-date': 'Желаемая дата', 'f-guests': 'Число гостей', 'f-name': 'Имя', 'f-phone': 'Телефон', 'f-consent': 'Согласие на обработку данных' };
    ['name', 'guests', 'date', 'consent'].forEach(function (n) {
      var inp = n === 'date' ? dateInput : F[n];
      inp.addEventListener(n === 'consent' ? 'change' : 'blur', function () { if (form.dataset.tried) validateField(n); });
      inp.addEventListener('input', function () { if (inp.getAttribute('aria-invalid')) validateField(n); });
    });
    phoneInput.addEventListener('input', function () { if (phoneInput.getAttribute('aria-invalid') && phoneValid(phoneInput.value)) clearError(phoneInput); });

    function renderSummary() {
      var ids = ['f-date', 'f-guests', 'f-name', 'f-phone', 'f-consent'].filter(function (id) { return errText[id]; });
      if (!ids.length) { errorsBox.hidden = true; errorsBox.innerHTML = ''; return ids; }
      errorsBox.innerHTML = '<p>Проверьте, пожалуйста:</p><ul>' + ids.map(function (id) {
        return '<li><a href="#' + id + '">' + LABEL[id] + '</a> — ' + esc(errText[id]) + '</li>';
      }).join('') + '</ul>';
      errorsBox.hidden = false;
      return ids;
    }
    function validateAll() {
      ORDER.forEach(validateField);
      var ids = renderSummary();
      if (!ids.length) return true;
      var first = document.getElementById(ids[0]);
      first.focus({ preventScroll: true });
      first.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      return false;
    }
    errorsBox.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      var t = document.getElementById(a.getAttribute('href').slice(1));
      t.focus(); t.scrollIntoView({ block: 'center' });
    });

    /* отправка */
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function channel() {
      return (CFG.lead && CFG.lead.endpoint) ? 'endpoint' : 'none';
    }
    function send(payload) {
      var ch = channel();
      if (ch === 'none') return wait(400).then(function () { return { notConnected: true }; });
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, (CFG.lead && CFG.lead.timeoutMs) || 15000);
      return fetch(CFG.lead.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        clearTimeout(to);
        // функция не настроена (нет токена Telegram) или её нет вовсе (локальный просмотр без Vercel)
        if (res.status === 503 || res.status === 404 || res.status === 405 || res.status === 501) return { notConnected: true };
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return { ok: true };
      }, function (err) { clearTimeout(to); throw err; });
    }

    function leadText(d) {
      var lines = ['Заявка с сайта «Версаль»'];
      if (d.occasion) lines.push('Повод: ' + OCC[d.occasion].text);
      lines.push('Дата: ' + (d.dateUnknown ? 'пока не определились' : (d.date ? fmtDate(d.date) : 'не указана')));
      if (d.guests) lines.push('Гостей: около ' + d.guests);
      if (d.goals.length) lines.push('Интересует: ' + d.goals.map(function (g) { return GOALS[g]; }).join(', '));
      lines.push('Имя: ' + d.name);
      lines.push('Телефон: ' + d.phone + ' (удобнее: ' + CONTACT[d.contactVia] + ')');
      if (d.comment) lines.push('Комментарий: ' + d.comment);
      return lines.join('\n');
    }

    function setSending(on) {
      sending = on;
      form.classList.toggle('is-sending', on);
      submitBtn.setAttribute('aria-busy', String(on));
      $('.btn__label', submitBtn).textContent = on ? 'Отправляем…' : (form.dataset.failed ? 'Отправить ещё раз' : 'Отправить заявку администратору');
    }

    function showStatus(kind, html) {
      statusBox.className = 'form-status' + (kind ? ' form-status--' + kind : '');
      statusBox.innerHTML = html;
      statusBox.hidden = false;
      statusBox.focus({ preventScroll: true });
      statusBox.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
    }

    var phoneLink = '<a class="link" href="tel:' + esc(contacts.phoneHref || '') + '">' + esc(contacts.phone || '') + '</a>';

    function onSuccess(d) {
      form.hidden = true;
      statusBox.hidden = true;
      var dateLine = d.date ? ', свободна ли дата <b>' + esc(fmtDate(d.date)) + '</b>,' : '';
      doneBox.innerHTML =
        '<div class="form-done__mark" aria-hidden="true"><svg viewBox="0 0 30 30"><path d="M6 15.5l6 6L24 9"/></svg></div>' +
        '<h3>Заявка отправлена</h3>' +
        '<p>Спасибо, ' + esc(d.name.split(' ')[0]) + '! Администратор проверит' + dateLine + ' и&nbsp;свяжется с&nbsp;вами по&nbsp;номеру <b>' + esc(d.phone) + '</b>' +
        (d.contactVia !== 'call' ? ' — можно и&nbsp;в&nbsp;' + CONTACT[d.contactVia] : '') + '.</p>' +
        '<p>Это ещё не бронь: дату, меню и&nbsp;условия вы согласуете с&nbsp;администратором. Если хотите обсудить раньше — позвоните: ' + phoneLink + '.</p>' +
        '<div class="btns"><button type="button" class="btn btn--line" data-again>Отправить ещё одну заявку</button></div>';
      doneBox.hidden = false;
      doneBox.focus({ preventScroll: true });
      doneBox.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      $('[data-again]', doneBox).addEventListener('click', function () {
        doneBox.hidden = true; form.hidden = false;
        F.comment.value = '';
        delete form.dataset.failed;
        setSending(false);
        $('#request-title').focus();
      });
    }

    function onError(err) {
      form.dataset.failed = '1';
      showStatus('error',
        '<h3>Заявка не отправилась</h3>' +
        '<p>Похоже, проблема со связью. Всё, что вы ввели, сохранилось — попробуйте отправить ещё раз или позвоните: ' + phoneLink + '.</p>' +
        '<div class="btns"><button type="button" class="btn btn--dark btn--sm" data-retry>Отправить ещё раз</button></div>');
      $('[data-retry]', statusBox).addEventListener('click', function () { form.requestSubmit ? form.requestSubmit() : submit(); });
    }

    function onNotConnected(d) {
      var text = leadText(d);
      showStatus('',
        '<h3>Онлайн-заявки пока не подключены</h3>' +
        '<p>Мы не хотим, чтобы ваша заявка потерялась, поэтому не делаем вид, что она отправлена. Позвоните администратору: ' + phoneLink + ' — или скопируйте текст заявки, чтобы отправить его в мессенджере.</p>' +
        '<div class="btns"><a class="btn btn--dark btn--sm" href="tel:' + esc(contacts.phoneHref || '') + '">Позвонить</a>' +
        '<button type="button" class="btn btn--line btn--sm" data-copy>Скопировать текст заявки</button></div>');
      var b = $('[data-copy]', statusBox);
      b.addEventListener('click', function () {
        var done = function () { b.textContent = 'Скопировано'; };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
        function fallback() {
          var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) { b.textContent = 'Не удалось скопировать'; }
          document.body.removeChild(ta);
        }
      });
    }

    function submit() {
      if (sending) return;
      form.dataset.tried = '1';
      statusBox.hidden = true;
      if (!validateAll()) return;
      var d = getData();
      if (d.website) { onSuccess(d, false); return; } // бот
      var payload = {
        source: 'versal-site',
        createdAt: new Date().toISOString(),
        page: location.href.split('#')[0],
        goals: d.goals,
        occasion: d.occasion || null,
        occasionLabel: d.occasion ? OCC[d.occasion].text : null,
        date: d.date || null,
        dateUnknown: d.dateUnknown,
        guests: d.guests,
        name: d.name,
        phone: d.phone,
        contactVia: d.contactVia,
        comment: d.comment || null,
        consent: true,
        text: leadText(d)
      };
      lastPayload = payload;
      setSending(true);
      send(payload).then(function (res) {
        setSending(false);
        if (res && res.notConnected) onNotConnected(d);
        else { delete form.dataset.failed; onSuccess(d); }
      }, function (err) {
        onError(err);
        setSending(false);
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    updateCard();
  }

  /* ================= Мобильная панель ================= */
  var dock = $('[data-dock]');
  if (dock && 'IntersectionObserver' in window) {
    var vis = { hero: true, request: false, footer: false };
    var setDock = function () {
      var on = !vis.hero && !vis.request && !vis.footer;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', String(!on));
      $$('a', dock).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    };
    var dObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vis[en.target.dataset.dockWatch] = en.isIntersecting; });
      setDock();
    }, { threshold: 0 });
    [[hero, 'hero'], [$('#request'), 'request'], [$('.site-footer'), 'footer']].forEach(function (p) {
      if (p[0]) { p[0].dataset.dockWatch = p[1]; dObs.observe(p[0]); }
    });
  }

  /* ================= Карта: загружается по нажатию ================= */
  var map = $('#map'), mapBtn = $('#map-load');
  if (map && mapBtn) {
    mapBtn.addEventListener('click', function () {
      map.src = contacts.mapWidget || map.getAttribute('data-src');
      map.hidden = false;
      $('#map-facade').hidden = true;
      map.focus();
    });
  }

  onScroll();
})();
