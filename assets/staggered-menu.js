/*
 * StaggeredMenu — перенос компонента <StaggeredMenu /> из React Bits (вариант JS-CSS) в обычный JavaScript.
 * Источник: https://reactbits.dev/components/staggered-menu — таймлайны GSAP и тайминги сохранены без изменений;
 * разметка меню лежит в HTML (для поисковиков), скрипт только анимирует её.
 * Требует GSAP 3 (подключается с cdnjs перед этим файлом).
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var wrapper = document.querySelector('.staggered-menu-wrapper');
  var toggleBtn = document.querySelector('.sm-toggle');
  if (!wrapper || !toggleBtn) return;

  // запасной вариант без анимации, если GSAP не загрузился
  if (!gsap) {
    var fbPanel = wrapper.querySelector('.staggered-menu-panel');
    var fbSet = function (on) {
      wrapper.toggleAttribute('data-open', on);
      wrapper.classList.toggle('sm-static-open', on);
      toggleBtn.setAttribute('aria-expanded', String(on));
      fbPanel.setAttribute('aria-hidden', String(!on));
      if ('inert' in fbPanel) fbPanel.inert = !on;
      var inner = toggleBtn.querySelector('.sm-toggle-textInner');
      if (inner) inner.innerHTML = '<span class="sm-toggle-line">' + (on ? 'Закрыть' : 'Меню') + '</span>';
    };
    wrapper.classList.add('sm-fallback');
    fbSet(false);
    toggleBtn.addEventListener('click', function () { fbSet(!wrapper.hasAttribute('data-open')); });
    fbPanel.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(function () { fbSet(false); }, 0); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fbSet(false); });
    return;
  }

  // при «уменьшении движения» анимации меню проходят почти мгновенно
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.globalTimeline.timeScale(20);

  var position = wrapper.getAttribute('data-position') || 'right';
  var menuButtonColor = wrapper.getAttribute('data-button-color') || '#17191c';
  var openMenuButtonColor = wrapper.getAttribute('data-open-button-color') || menuButtonColor;
  var changeMenuColorOnOpen = true;
  var closeOnClickAway = true;
  var LABELS = { menu: toggleBtn.getAttribute('data-label-menu') || 'Меню', close: toggleBtn.getAttribute('data-label-close') || 'Закрыть' };

  var panel = wrapper.querySelector('.staggered-menu-panel');
  var preContainer = wrapper.querySelector('.sm-prelayers');
  var plusH = toggleBtn.querySelector('.sm-icon-line:not(.sm-icon-line-v)');
  var plusV = toggleBtn.querySelector('.sm-icon-line-v');
  var icon = toggleBtn.querySelector('.sm-icon');
  var textInner = toggleBtn.querySelector('.sm-toggle-textInner');

  var open = false;
  var openTl = null, closeTween = null, spinTween = null, textCycleAnim = null, colorTween = null, itemEntranceTween = null;
  var busy = false;
  var preLayers = preContainer ? Array.prototype.slice.call(preContainer.querySelectorAll('.sm-prelayer')) : [];

  /* ---------- начальное состояние (useLayoutEffect) ---------- */
  var offscreen = position === 'left' ? -100 : 100;
  gsap.set([panel].concat(preLayers), { xPercent: offscreen, opacity: 1 });
  if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });
  gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
  gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
  gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
  gsap.set(textInner, { yPercent: 0 });
  gsap.set(toggleBtn, { color: menuButtonColor });

  function setTextLines(lines) {
    textInner.innerHTML = lines.map(function (l) { return '<span class="sm-toggle-line">' + l + '</span>'; }).join('');
  }
  setTextLines([LABELS.menu, LABELS.close]);

  // ширина надписи — по самому длинному слову, чтобы кнопка не прыгала (пересчёт после загрузки шрифтов)
  function measure() {
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit';
    toggleBtn.appendChild(probe);
    var w = 0;
    [LABELS.menu, LABELS.close].forEach(function (t) { probe.textContent = t; w = Math.max(w, probe.getBoundingClientRect().width); });
    toggleBtn.removeChild(probe);
    toggleBtn.style.setProperty('--sm-toggle-width', Math.ceil(w) + 2 + 'px');
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function setPanelHidden(hidden) {
    panel.setAttribute('aria-hidden', String(hidden));
    if ('inert' in panel) panel.inert = hidden;
    wrapper.toggleAttribute('data-open', !hidden);
    document.documentElement.classList.toggle('sm-is-open', !hidden);
  }
  setPanelHidden(true);

  /* ---------- открытие ---------- */
  function buildOpenTimeline() {
    if (openTl) openTl.kill();
    if (closeTween) { closeTween.kill(); closeTween = null; }
    if (itemEntranceTween) itemEntranceTween.kill();

    var itemEls = Array.prototype.slice.call(panel.querySelectorAll('.sm-panel-itemLabel'));
    var numberEls = Array.prototype.slice.call(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    var socialTitle = panel.querySelector('.sm-socials-title');
    var socialLinks = Array.prototype.slice.call(panel.querySelectorAll('.sm-socials-link'));

    var layerStates = preLayers.map(function (el) { return { el: el, start: offscreen }; });
    var panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    var tl = gsap.timeline({ paused: true });

    layerStates.forEach(function (ls, i) {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    var lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    var panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    var panelDuration = 0.65;
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      var itemsStartRatio = 0.15;
      var itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(itemEls, {
        yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out',
        stagger: { each: 0.1, from: 'start' }
      }, itemsStart);
      if (numberEls.length) {
        tl.to(numberEls, {
          duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1,
          stagger: { each: 0.08, from: 'start' }
        }, itemsStart + 0.1);
      }
    }

    if (socialTitle || socialLinks.length) {
      var socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(socialLinks, {
          y: 0, opacity: 1, duration: 0.55, ease: 'power3.out',
          stagger: { each: 0.08, from: 'start' },
          onComplete: function () { gsap.set(socialLinks, { clearProps: 'opacity' }); }
        }, socialsStart + 0.04);
      }
    }

    openTl = tl;
    return tl;
  }

  function playOpen() {
    if (busy) return;
    busy = true;
    var tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', function () { busy = false; });
      tl.play(0);
    } else {
      busy = false;
    }
  }

  /* ---------- закрытие ---------- */
  function playClose() {
    if (openTl) openTl.kill();
    openTl = null;
    if (itemEntranceTween) itemEntranceTween.kill();

    var all = preLayers.concat([panel]);
    if (closeTween) closeTween.kill();
    closeTween = gsap.to(all, {
      xPercent: offscreen, duration: 0.32, ease: 'power3.in', overwrite: 'auto',
      onComplete: function () {
        var itemEls = Array.prototype.slice.call(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        var numberEls = Array.prototype.slice.call(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        var socialTitle = panel.querySelector('.sm-socials-title');
        var socialLinks = Array.prototype.slice.call(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busy = false;
      }
    });
  }

  /* ---------- иконка, цвет, надпись ---------- */
  function animateIcon(opening) {
    if (spinTween) spinTween.kill();
    spinTween = opening
      ? gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' })
      : gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
  }

  function animateColor(opening) {
    if (colorTween) colorTween.kill();
    if (changeMenuColorOnOpen) {
      colorTween = gsap.to(toggleBtn, { color: opening ? openMenuButtonColor : menuButtonColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.set(toggleBtn, { color: menuButtonColor });
    }
  }

  function animateText(opening) {
    if (textCycleAnim) textCycleAnim.kill();
    var currentLabel = opening ? LABELS.menu : LABELS.close;
    var targetLabel = opening ? LABELS.close : LABELS.menu;
    var cycles = 3;
    var seq = [currentLabel];
    var last = currentLabel;
    for (var i = 0; i < cycles; i++) {
      last = last === LABELS.menu ? LABELS.close : LABELS.menu;
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(textInner, { yPercent: 0 });
    var lineCount = seq.length;
    var finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnim = gsap.to(textInner, { yPercent: -finalShift, duration: 0.5 + lineCount * 0.07, ease: 'power4.out' });
  }

  /* ---------- переключение ---------- */
  function setOpenState(target) {
    open = target;
    toggleBtn.setAttribute('aria-expanded', String(target));
    toggleBtn.setAttribute('aria-label', target ? 'Закрыть меню' : 'Открыть меню');
    setPanelHidden(!target);
  }

  function toggleMenu() {
    var target = !open;
    setOpenState(target);
    if (target) playOpen(); else playClose();
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }

  function closeMenu(returnFocus) {
    if (!open) return;
    setOpenState(false);
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
    if (returnFocus) toggleBtn.focus();
  }

  toggleBtn.addEventListener('click', toggleMenu);

  document.addEventListener('mousedown', function (event) {
    if (!closeOnClickAway || !open) return;
    if (!panel.contains(event.target) && !toggleBtn.contains(event.target)) closeMenu(false);
  });

  // сайт: Esc, переход по пункту меню
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) closeMenu(true); });
  // закрываем после перехода по ссылке: панель становится inert, и браузер иначе отменил бы переход
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(function () { closeMenu(false); }, 0); });

  window.StaggeredMenu = { close: function () { closeMenu(false); }, isOpen: function () { return open; } };
})();
