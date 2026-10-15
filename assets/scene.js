/*
 * Линейная графика «Версаля»: перспектива зала на первом экране и виньетки.
 * Всё рисуется в SVG по простой перспективной проекции: светлые стены с панелями и молдингами,
 * люстры, белая мебель, светлый отражающий пол — то, что видно на фото зала (июнь 2026).
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  function pts(list) { return list.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join(' L'); }
  function open(list) { return 'M' + pts(list); }
  function closed(list) { return 'M' + pts(list) + ' Z'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Псевдослучайность с фиксированным зерном — картинка одинакова при каждой отрисовке.
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* ------------------------------------------------------------------ */
  /* Люстра: координаты в метрах, ось y вниз, начало — точка подвеса.     */
  /* ------------------------------------------------------------------ */
  function chandelier(g, opt) {
    opt = opt || {};
    var draw = opt.cls || 'ln';
    var P = function (d, extra) {
      var a = { d: d, 'class': draw + (extra ? ' ' + extra : ''), 'vector-effect': 'non-scaling-stroke', pathLength: 1 };
      return el('path', a, g);
    };
    var E = function (cx, cy, rx, ry, extra) {
      return el('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, 'class': draw + (extra ? ' ' + extra : ''), 'vector-effect': 'non-scaling-stroke', pathLength: 1 }, g);
    };
    var glints = [];

    P('M0 0 V0.56');
    P('M-0.14 0.01 Q0 0.13 0.14 0.01');
    E(0, 0.62, 0.17, 0.05);
    P('M0 0.62 C0.09 0.8 0.09 1.02 0 1.22');
    P('M0 0.62 C-0.09 0.8 -0.09 1.02 0 1.22');
    E(0, 0.95, 0.5, 0.085);
    E(0, 1.22, 0.82, 0.13);
    P('M0 1.22 C0.13 1.36 0.06 1.52 0 1.62 C-0.06 1.52 -0.13 1.36 0 1.22', 'fillw');

    var i, t, x, y;
    // рожки и свечи нижнего яруса
    for (i = 0; i < 8; i++) {
      t = (i + 0.5) * Math.PI / 4;
      x = 0.82 * Math.cos(t); y = 1.22 + 0.13 * Math.sin(t);
      P('M0 1.32 C' + r1(x * 0.35) + ' 1.48 ' + r1(x * 0.92) + ' 1.44 ' + x.toFixed(3) + ' ' + y.toFixed(3), 'thin');
      P('M' + x.toFixed(3) + ' ' + y.toFixed(3) + ' V' + (y - 0.2).toFixed(3));
      el('ellipse', { cx: x.toFixed(3), cy: (y - 0.25).toFixed(3), rx: 0.028, ry: 0.05, 'class': 'flame' }, g);
    }
    // верхний ярус
    for (i = 0; i < 6; i++) {
      t = (i + 0.5) * Math.PI / 3;
      x = 0.5 * Math.cos(t); y = 0.95 + 0.085 * Math.sin(t);
      P('M' + x.toFixed(3) + ' ' + y.toFixed(3) + ' V' + (y - 0.15).toFixed(3));
      el('ellipse', { cx: x.toFixed(3), cy: (y - 0.19).toFixed(3), rx: 0.022, ry: 0.04, 'class': 'flame' }, g);
    }
    // подвески-кристаллы и фестоны
    for (i = 0; i < 18; i++) {
      t = i * Math.PI * 2 / 18;
      x = 0.82 * Math.cos(t); y = 1.22 + 0.13 * Math.sin(t);
      var len = 0.14 + 0.06 * ((i % 3) / 2);
      P('M' + x.toFixed(3) + ' ' + y.toFixed(3) + ' v' + len.toFixed(3), 'thin');
      el('circle', { cx: x.toFixed(3), cy: (y + len + 0.025).toFixed(3), r: 0.024, 'class': draw + ' thin fillw', 'vector-effect': 'non-scaling-stroke' }, g);
      if (Math.sin(t) > 0.2 && i % 2 === 0) glints.push([x, y + len + 0.025]);
      var t2 = (i + 1) * Math.PI * 2 / 18;
      var x2 = 0.82 * Math.cos(t2), y2 = 1.22 + 0.13 * Math.sin(t2);
      if (Math.sin(t) > -0.3) P('M' + x.toFixed(3) + ' ' + y.toFixed(3) + ' Q' + ((x + x2) / 2).toFixed(3) + ' ' + ((y + y2) / 2 + 0.12).toFixed(3) + ' ' + x2.toFixed(3) + ' ' + y2.toFixed(3), 'thin');
    }
    for (i = 0; i < 12; i++) {
      t = i * Math.PI * 2 / 12;
      x = 0.5 * Math.cos(t); y = 0.95 + 0.085 * Math.sin(t);
      P('M' + x.toFixed(3) + ' ' + y.toFixed(3) + ' v0.1', 'thin');
    }
    glints.push([0, 1.62]);
    return glints;
  }

  // Бра: подвес в точке стены, метры
  function sconce(g, cls) {
    var a = { 'class': cls || 'ln', 'vector-effect': 'non-scaling-stroke', pathLength: 1 };
    el('ellipse', Object.assign({ cx: 0, cy: 0, rx: 0.07, ry: 0.13 }, a), g);
    el('path', Object.assign({ d: 'M0 0.05 C0.12 0.12 0.24 0.06 0.26 -0.08 M0 0.05 C-0.12 0.12 -0.24 0.06 -0.26 -0.08' }, a), g);
    el('path', Object.assign({ d: 'M0.26 -0.08 V-0.24 M-0.26 -0.08 V-0.24' }, a), g);
    el('ellipse', { cx: 0.26, cy: -0.29, rx: 0.025, ry: 0.045, 'class': 'flame' }, g);
    el('ellipse', { cx: -0.26, cy: -0.29, rx: 0.025, ry: 0.045, 'class': 'flame' }, g);
  }

  function glint(parent, x, y, size, delay) {
    var p = el('path', {
      d: 'M0 -1 L0.16 -0.16 L1 0 L0.16 0.16 L0 1 L-0.16 0.16 L-1 0 L-0.16 -0.16 Z',
      'class': 'glint',
      transform: 'translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(size * 10) / 10 + ')'
    }, parent);
    p.style.setProperty('--gd', delay.toFixed(2) + 's');
    return p;
  }

  // Общие градиенты — один раз на документ, чтобы не дублировать id.
  function defs() {
    if (document.getElementById('vg-glow')) return;
    var holder = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false', style: 'position:absolute;width:0;height:0;overflow:hidden' }, document.body);
    var d = el('defs', null, holder);
    var rg = el('radialGradient', { id: 'vg-glow' }, d);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }, rg);
    el('stop', { offset: '.35', 'stop-color': '#fff', 'stop-opacity': '.55' }, rg);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, rg);
    var rs = el('radialGradient', { id: 'vg-streak' }, d);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.9' }, rs);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, rs);
    var lf = el('linearGradient', { id: 'vg-fade', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.9' }, lf);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, lf);
    var m = el('mask', { id: 'vg-reflect-mask', maskContentUnits: 'objectBoundingBox' }, d);
    el('rect', { x: 0, y: 0, width: 1, height: 1, fill: 'url(#vg-fade)' }, m);
  }

  /* ------------------------------------------------------------------ */
  /* Перспектива зала                                                    */
  /* ------------------------------------------------------------------ */
  function buildHall(svg, animate) {
    var box = svg.getBoundingClientRect();
    var aspect = clamp((box.width || 1600) / (box.height || 900), 0.42, 2.6);
    var H = 1000, W = Math.round(H * aspect);
    var portrait = aspect < 1;
    var C = {
      cx: W / 2,
      cy: H * (portrait ? 0.33 : 0.39),
      f: portrait ? Math.max(W * 1.18, 470) : Math.max(W * 0.56, 640),
      camY: 2.7
    };
    seed = 7;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.classList.toggle('is-static', !animate);
    defs(svg);

    function P(x, y, z) { return [C.cx + C.f * x / z, C.cy - C.f * (y - C.camY) / z]; }
    function sw(z) { return clamp(10 / z, 0.55, 1.5).toFixed(2); }

    var X = 8.6, HC = 6.3, ZN = 1.1, ZF = 21.5;
    var gFloor = el('g', { 'class': 'g-floor' }, svg);
    var gReflect = el('g', { 'class': 'g-reflect', mask: 'url(#vg-reflect-mask)' }, svg);
    var gArch = el('g', { 'class': 'g-arch' }, svg);
    var gGlow = el('g', { 'class': 'g-glow' }, svg);
    var gFurn = el('g', { 'class': 'g-furn' }, svg);
    var gChand = el('g', { 'class': 'g-chand' }, svg);
    var gGlint = el('g', { 'class': 'g-glint' }, svg);

    function delayFor(z) { return (0.05 + (ZF - z) / ZF * 1.1 + rnd() * 0.15).toFixed(2) + 's'; }
    function stroke(parent, d, z, cls) {
      var p = el('path', { d: d, 'class': 'ln ' + (cls || ''), pathLength: 1 }, parent);
      p.style.setProperty('--d', delayFor(z));
      p.style.strokeWidth = sw(z);
      return p;
    }
    function seg(parent, a, b, z, cls) { return stroke(parent, open([a, b]), z, cls); }

    /* пол: швы плит, сходящиеся к центру */
    var x, z, i;
    for (x = -7.5; x <= 7.51; x += 1.5) {
      var a = P(x, 0, ZN + 0.3), b = P(x, 0, ZF);
      el('path', { d: open([a, b]), 'class': 'floorln' }, gFloor);
    }
    for (z = 1.5; z < ZF; z += 1.5) {
      el('path', { d: open([P(-X, 0, z), P(X, 0, z)]), 'class': 'floorln' }, gFloor);
    }

    /* стены */
    [-1, 1].forEach(function (side) {
      var sx = side * X;
      function H(y, cls) { stroke(gArch, open([P(sx, y, ZN), P(sx, y, ZF)]), 6, cls); }
      H(0); H(HC); H(HC - 0.32, 'thin'); H(HC - 0.5); H(0.95, 'thin'); H(1.05, 'thin'); H(0.16, 'thin');
      var pil = [2.6, 5.7, 8.8, 11.9, 15.0, 18.1, ZF];
      pil.forEach(function (pz, k) {
        if (pz >= ZF) return;
        [-0.24, 0.24].forEach(function (o) {
          seg(gArch, P(sx, 0.16, pz + o), P(sx, HC - 0.5, pz + o), pz);
        });
        stroke(gArch, closed([P(sx, HC - 0.9, pz - 0.32), P(sx, HC - 0.9, pz + 0.32), P(sx, HC - 0.62, pz + 0.32), P(sx, HC - 0.62, pz - 0.32)]), pz, 'thin');
        stroke(gArch, closed([P(sx, 0.16, pz - 0.3), P(sx, 0.16, pz + 0.3), P(sx, 0.46, pz + 0.3), P(sx, 0.46, pz - 0.3)]), pz, 'thin');
        // бра на пилястре
        var sp = P(sx - side * 0.12, 3.7, pz), ss = C.f / pz;
        var gs = el('g', { transform: 'translate(' + r1(sp[0]) + ' ' + r1(sp[1]) + ') scale(' + r1(ss * 10) / 10 + ')' }, gChand);
        sconce(gs);
        Array.prototype.forEach.call(gs.children, function (c) { c.setAttribute('vector-effect', 'non-scaling-stroke'); c.style.setProperty('--d', delayFor(pz)); });
        el('circle', { cx: r1(sp[0]), cy: r1(sp[1] - ss * 0.2), r: r1(ss * 0.75), fill: 'url(#vg-glow)', 'class': 'glow glow--sm' }, gGlow);
        // панели между пилястрами
        var nz = pil[k + 1]; if (!nz) return;
        var za = pz + 0.6, zb = nz - 0.6;
        if (zb - za < 0.6) return;
        [[1.35, HC - 1.1, 0.14], [0.32, 0.8, 0.07]].forEach(function (r) {
          stroke(gArch, closed([P(sx, r[0], za), P(sx, r[0], zb), P(sx, r[1], zb), P(sx, r[1], za)]), (za + zb) / 2);
          var ins = r[2];
          stroke(gArch, closed([P(sx, r[0] + ins, za + ins), P(sx, r[0] + ins, zb - ins), P(sx, r[1] - ins, zb - ins), P(sx, r[1] - ins, za + ins)]), (za + zb) / 2, 'thin');
        });
      });
    });

    /* задняя стена */
    function BR(x1, x2, y1, y2, cls) { stroke(gArch, closed([P(x1, y1, ZF), P(x2, y1, ZF), P(x2, y2, ZF), P(x1, y2, ZF)]), ZF, cls); }
    function BL(x1, y1, x2, y2, cls) { seg(gArch, P(x1, y1, ZF), P(x2, y2, ZF), ZF, cls); }
    BR(-X, X, 0, HC);
    BL(-X, HC - 0.32, X, HC - 0.32, 'thin'); BL(-X, HC - 0.5, X, HC - 0.5);
    BL(-X, 0.95, -1.9, 0.95, 'thin'); BL(1.9, 0.95, X, 0.95, 'thin');
    BL(-X, 0.16, -1.9, 0.16, 'thin'); BL(1.9, 0.16, X, 0.16, 'thin');
    // арка с двустворчатой дверью
    function arch(rw, ry0) {
      var list = [P(-rw, 0, ZF), P(-rw, ry0, ZF)];
      for (var a = 180; a >= 0; a -= 10) {
        var rad = a * Math.PI / 180;
        list.push(P(rw * Math.cos(rad), ry0 + rw * Math.sin(rad), ZF));
      }
      list.push(P(rw, 0, ZF));
      return open(list);
    }
    stroke(gArch, arch(1.62, 3.0), ZF);
    stroke(gArch, arch(1.34, 3.0), ZF, 'thin');
    BL(-1.34, 3.0, 1.34, 3.0, 'thin');
    BL(0, 0, 0, 3.0, 'thin');
    [-1, 1].forEach(function (s) {
      BR(s * 0.14, s * 1.18, 0.3, 1.45, 'thin');
      BR(s * 0.14, s * 1.18, 1.7, 2.8, 'thin');
    });
    for (var ang = 30; ang <= 150; ang += 30) {
      var rr = ang * Math.PI / 180;
      BL(0, 3.0, 1.34 * Math.cos(rr), 3.0 + 1.34 * Math.sin(rr), 'thin');
    }
    stroke(gArch, closed([P(-0.18, 4.68, ZF), P(0.18, 4.68, ZF), P(0.12, 4.36, ZF), P(-0.12, 4.36, ZF)]), ZF, 'thin');
    // пилястры и панели задней стены
    [-1, 1].forEach(function (s) {
      [2.15, 5.3, 8.25].forEach(function (px) {
        BL(s * (px - 0.18), 0.16, s * (px - 0.18), HC - 0.5);
        BL(s * (px + 0.18), 0.16, s * (px + 0.18), HC - 0.5);
      });
      [[2.6, 4.85], [5.75, 7.8]].forEach(function (r) {
        var x1 = s * r[0], x2 = s * r[1];
        BR(Math.min(x1, x2), Math.max(x1, x2), 1.35, HC - 1.1);
        BR(Math.min(x1, x2) + 0.14, Math.max(x1, x2) - 0.14, 1.49, HC - 1.24, 'thin');
        BR(Math.min(x1, x2), Math.max(x1, x2), 0.32, 0.8, 'thin');
      });
      var sp = P(s * 5.3, 3.7, ZF - 0.1), ss = C.f / ZF;
      var gs = el('g', { transform: 'translate(' + r1(sp[0]) + ' ' + r1(sp[1]) + ') scale(' + r1(ss * 10) / 10 + ')' }, gChand);
      sconce(gs);
      Array.prototype.forEach.call(gs.children, function (c) { c.setAttribute('vector-effect', 'non-scaling-stroke'); c.style.setProperty('--d', '0.3s'); });
      el('circle', { cx: r1(sp[0]), cy: r1(sp[1] - ss * 0.2), r: r1(ss * 0.75), fill: 'url(#vg-glow)', 'class': 'glow glow--sm' }, gGlow);
    });

    /* потолок: кессон и балки */
    var TX = 5.6;
    [-1, 1].forEach(function (s) {
      stroke(gArch, open([P(s * TX, HC, 2.0), P(s * TX, HC, 19.8)]), 8, 'thin');
      stroke(gArch, open([P(s * (TX - 0.3), HC, 2.3), P(s * (TX - 0.3), HC, 19.5)]), 8, 'thin');
    });
    [2.0, 19.8].forEach(function (bz) { seg(gArch, P(-TX, HC, bz), P(TX, HC, bz), bz, 'thin'); });
    [4.6, 8.6, 12.6, 16.6].forEach(function (bz) {
      seg(gArch, P(-TX + 0.3, HC, bz - 0.12), P(TX - 0.3, HC, bz - 0.12), bz, 'thin');
      seg(gArch, P(-TX + 0.3, HC, bz + 0.12), P(TX - 0.3, HC, bz + 0.12), bz, 'thin');
    });

    /* люстры, розетки, отражения */
    var chandZ = [6.6, 10.6, 14.6, 18.2];
    chandZ.forEach(function (cz, k) {
      var s = C.f / cz;
      var anchor = P(0, HC, cz);
      // потолочная розетка
      var ros = [];
      for (var a = 0; a <= 360; a += 15) {
        var ra = a * Math.PI / 180;
        ros.push(P(0.5 * Math.cos(ra), HC, cz + 0.5 * Math.sin(ra)));
      }
      stroke(gArch, open(ros), cz, 'thin');

      var g = el('g', { transform: 'translate(' + r1(anchor[0]) + ' ' + r1(anchor[1]) + ') scale(' + r1(s * 10) / 10 + ')', 'class': 'chand' }, gChand);
      var gl = chandelier(g);
      Array.prototype.forEach.call(g.children, function (c) { c.style.setProperty('--d', (0.5 + (ZF - cz) / ZF * 0.9).toFixed(2) + 's'); });
      var body = P(0, HC - 1.15, cz);
      el('circle', { cx: r1(body[0]), cy: r1(body[1]), r: r1(s * 1.9), fill: 'url(#vg-glow)', 'class': 'glow' }, gGlow);
      gl.forEach(function (p, j) {
        if (j % 2 && j !== gl.length - 1) return;
        glint(gGlint, anchor[0] + p[0] * s, anchor[1] + p[1] * s, clamp(s * 0.09, 3, 12), 1.8 + rnd() * 4);
      });

      // отражение в полу
      var ra2 = P(0, -HC, cz);
      var gr = el('g', { transform: 'translate(' + r1(ra2[0]) + ' ' + r1(ra2[1]) + ') scale(' + r1(s * 10) / 10 + ' ' + -r1(s * 10) / 10 + ')' }, gReflect);
      chandelier(gr, { cls: 'ln-r' });
      var st = P(0, -(HC - 1.15), cz);
      el('ellipse', { cx: r1(st[0]), cy: r1(st[1]), rx: r1(s * 0.9), ry: r1(s * 2.4), fill: 'url(#vg-streak)', 'class': 'glow glow--streak' }, gGlow);
    });

    /* мебель: стол президиума и круглые столы, порядок отрисовки — от дальних к ближним */
    var items = [];
    function chairAt(cx, cz, t, R) {
      var ux = Math.cos(t), uz = Math.sin(t), vx = -uz, vz = ux;
      var mx = cx + ux * R, mz = cz + uz * R;
      var w = 0.21, d = 0.2;
      function C3(a, b, y) { return P(mx + ux * a + vx * b, y, mz + uz * a + vz * b); }
      var depth = mz;
      items.push({
        z: depth, draw: function (g) {
          var gz = depth;
          var legs = [[-d, -w], [-d, w], [d, -w], [d, w]].map(function (c) { return open([C3(c[0], c[1], 0.46), C3(c[0], c[1], 0)]); }).join(' ');
          var back = closed([C3(d, -w, 0.46), C3(d, w, 0.46), C3(d, w, 1.02), C3(d, -w, 1.02)]);
          var rails = open([C3(d, -w, 0.86), C3(d, w, 0.86)]) + ' ' + open([C3(d, -w, 0.66), C3(d, w, 0.66)]) +
            ' ' + open([C3(d, -0.07, 0.66), C3(d, -0.07, 0.86)]) + ' ' + open([C3(d, 0.07, 0.66), C3(d, 0.07, 0.86)]);
          var seat = closed([C3(-d, -w, 0.46), C3(-d, w, 0.46), C3(d, w, 0.46), C3(d, -w, 0.46)]);
          var backFar = (mz + uz * d) > (mz - uz * d);
          var gg = el('g', { 'class': 'piece' }, g);
          gg.style.setProperty('--d', (1.3 + (ZF - gz) / ZF * 0.8).toFixed(2) + 's');
          el('path', { d: legs, 'class': 'ln-f', style: 'stroke-width:' + sw(gz) }, gg);
          if (backFar) {
            el('path', { d: back, 'class': 'ln-f fillw', style: 'stroke-width:' + sw(gz) }, gg);
            el('path', { d: rails, 'class': 'ln-f thin', style: 'stroke-width:' + sw(gz) }, gg);
            el('path', { d: seat, 'class': 'ln-f fillw', style: 'stroke-width:' + sw(gz) }, gg);
          } else {
            el('path', { d: seat, 'class': 'ln-f fillw', style: 'stroke-width:' + sw(gz) }, gg);
            el('path', { d: back, 'class': 'ln-f fillw', style: 'stroke-width:' + sw(gz) }, gg);
            el('path', { d: rails, 'class': 'ln-f thin', style: 'stroke-width:' + sw(gz) }, gg);
          }
        }
      });
    }
    function roundTable(cx, cz) {
      var R = 0.86, top = [], floor = [], k;
      for (k = 0; k <= 48; k++) {
        var t = k / 48 * Math.PI * 2;
        top.push(P(cx + R * Math.cos(t), 0.76, cz + R * Math.sin(t)));
        floor.push(P(cx + (R + 0.04) * Math.cos(t), 0, cz + (R + 0.04) * Math.sin(t)));
      }
      items.push({
        z: cz, draw: function (g) {
          var gg = el('g', { 'class': 'piece' }, g);
          gg.style.setProperty('--d', (1.2 + (ZF - cz) / ZF * 0.8).toFixed(2) + 's');
          var w = sw(cz);
          var frontTop = top.slice(24, 49), frontFloor = floor.slice(24, 49).reverse();
          el('path', { d: closed(frontTop.concat(frontFloor)), 'class': 'ln-f fillw', style: 'stroke-width:' + w }, gg);
          var folds = '';
          for (k = 27; k < 48; k += 3) folds += open([top[k], floor[k]]) + ' ';
          el('path', { d: folds, 'class': 'ln-f thin faint', style: 'stroke-width:' + w }, gg);
          el('path', { d: closed(top), 'class': 'ln-f fillw', style: 'stroke-width:' + w }, gg);
          // цветочная композиция в центре
          var c0 = P(cx, 0.95, cz), s = C.f / cz;
          for (k = 0; k < 6; k++) {
            var a = k / 6 * Math.PI * 2;
            el('circle', { cx: r1(c0[0] + Math.cos(a) * s * 0.11), cy: r1(c0[1] + Math.sin(a) * s * 0.05), r: r1(s * 0.07), 'class': 'ln-f thin fillw', style: 'stroke-width:' + w }, gg);
          }
          el('circle', { cx: r1(c0[0]), cy: r1(c0[1] - s * 0.04), r: r1(s * 0.08), 'class': 'ln-f thin fillw', style: 'stroke-width:' + w }, gg);
        }
      });
      for (k = 0; k < 8; k++) chairAt(cx, cz, (k + 0.5) / 8 * Math.PI * 2, R + 0.48);
    }
    function headTable(z1, z2, x1, x2) {
      var y = 0.76;
      for (var cxh = x1 + 0.45; cxh < x2; cxh += 0.85) chairAt(cxh, z2 + 0.45, -Math.PI / 2, 0.0001);
      items.push({
        z: (z1 + z2) / 2, draw: function (g) {
          var gg = el('g', { 'class': 'piece' }, g);
          gg.style.setProperty('--d', '1.2s');
          var w = sw(z1);
          el('path', { d: closed([P(x1, y, z1), P(x2, y, z1), P(x2, y, z2), P(x1, y, z2)]), 'class': 'ln-f fillw', style: 'stroke-width:' + w }, gg);
          el('path', { d: closed([P(x1, y, z1), P(x2, y, z1), P(x2, 0, z1 - 0.03), P(x1, 0, z1 - 0.03)]), 'class': 'ln-f fillw', style: 'stroke-width:' + w }, gg);
          var sw2 = '', step = (x2 - x1) / 8;
          for (var k = 0; k < 8; k++) {
            var a = P(x1 + k * step, y - 0.04, z1 - 0.01), b = P(x1 + (k + 1) * step, y - 0.04, z1 - 0.01), m = P(x1 + (k + 0.5) * step, y - 0.34, z1 - 0.01);
            sw2 += 'M' + r1(a[0]) + ' ' + r1(a[1]) + ' Q' + r1(m[0]) + ' ' + r1(m[1]) + ' ' + r1(b[0]) + ' ' + r1(b[1]) + ' ';
          }
          el('path', { d: sw2, 'class': 'ln-f thin', style: 'stroke-width:' + w }, gg);
          var c0 = P(0, 0.95, (z1 + z2) / 2), s = C.f / z1;
          for (k = -3; k <= 3; k++) el('circle', { cx: r1(c0[0] + k * s * 0.12), cy: r1(c0[1] - (3 - Math.abs(k)) * s * 0.03), r: r1(s * 0.08), 'class': 'ln-f thin fillw', style: 'stroke-width:' + w }, gg);
        }
      });
    }

    headTable(18.9, 19.7, -3.3, 3.3);
    [8.2, 11.7, 15.2].forEach(function (tz) {
      [-5.4, -2.5, 2.5, 5.4].forEach(function (tx) { roundTable(tx, tz); });
    });
    items.sort(function (a, b) { return b.z - a.z; }).forEach(function (it) { it.draw(gFurn); });

    if (animate && !REDUCED) {
      svg.classList.remove('is-lit');
      void svg.getBoundingClientRect();
      svg.classList.add('is-drawing');
      setTimeout(function () { svg.classList.add('is-lit'); svg.dispatchEvent(new CustomEvent('lit', { bubbles: true })); }, 1900);
    } else {
      svg.classList.add('is-lit');
      svg.dispatchEvent(new CustomEvent('lit', { bubbles: true }));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Виньетки                                                            */
  /* ------------------------------------------------------------------ */
  function vAttrs(cls) { return { 'class': 'ln ' + (cls || ''), pathLength: 1 }; }
  function vp(g, d, cls) { return el('path', Object.assign({ d: d }, vAttrs(cls)), g); }

  var vignettes = {
    chandelier: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 400, height: 520, 'class': 'v-bg' }, svg);
      vp(svg, 'M0 40 H400', 'thin');
      vp(svg, 'M0 48 H400', 'thin');
      var ros = el('ellipse', Object.assign({ cx: 200, cy: 44, rx: 70, ry: 6 }, vAttrs('thin')), svg);
      el('circle', { cx: 200, cy: 290, r: 230, fill: 'url(#vg-glow)', 'class': 'glow' }, svg);
      var g = el('g', { transform: 'translate(200 44) scale(205)' }, svg);
      var gl = chandelier(g);
      Array.prototype.forEach.call(g.querySelectorAll('[class*="ln"]'), function (c) { c.setAttribute('vector-effect', 'non-scaling-stroke'); });
      gl.forEach(function (p, i) { glint(svg, 200 + p[0] * 205, 44 + p[1] * 205, 7, i * 0.7); });
      return ros;
    },
    walls: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 400, height: 400, 'class': 'v-bg' }, svg);
      vp(svg, 'M0 34 H400 M0 44 H400 M0 52 H400', 'thin');
      vp(svg, 'M0 300 H400 M0 308 H400', 'thin');
      vp(svg, 'M0 384 H400', 'thin');
      // пилястра
      vp(svg, 'M52 52 V384 M86 52 V384');
      vp(svg, 'M44 52 H94 V70 H44 Z M46 366 H92 V384 H46 Z', 'thin');
      vp(svg, 'M60 80 V356 M78 80 V356', 'thin');
      // панели
      vp(svg, 'M120 74 H372 V282 H120 Z');
      vp(svg, 'M134 88 H358 V268 H134 Z', 'thin');
      vp(svg, 'M246 88 q0 18 -14 22 q14 4 14 22 q0 -18 14 -22 q-14 -4 -14 -22z', 'thin');
      vp(svg, 'M120 318 H372 V372 H120 Z M130 326 H362 V364 H130 Z', 'thin');
      // бра
      el('circle', { cx: 69, cy: 150, r: 60, fill: 'url(#vg-glow)', 'class': 'glow' }, svg);
      var g = el('g', { transform: 'translate(69 168) scale(110)' }, svg);
      sconce(g);
      Array.prototype.forEach.call(g.children, function (c) { c.setAttribute('vector-effect', 'non-scaling-stroke'); });
    },
    chair: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 400, height: 460, 'class': 'v-bg' }, svg);
      el('ellipse', { cx: 200, cy: 418, rx: 140, ry: 10, 'class': 'v-shadow' }, svg);
      vp(svg, 'M138 76 Q200 64 262 76');
      vp(svg, 'M140 76 L148 236 M260 76 L252 236');
      vp(svg, 'M146 112 Q200 104 254 112 M150 196 Q200 190 250 196', 'thin');
      vp(svg, 'M172 112 L176 196 M200 110 V194 M228 112 L224 196', 'thin');
      vp(svg, 'M130 236 H270 L276 256 H124 Z', 'fillw');
      vp(svg, 'M134 256 L120 416 M266 256 L280 416 M158 256 L154 400 M242 256 L246 400');
      vp(svg, 'M126 330 H274 M124 352 H276', 'thin');
      vp(svg, 'M138 286 Q200 296 262 286', 'thin');
    },
    table: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 400, height: 400, 'class': 'v-bg' }, svg);
      // вид сверху: тарелки, приборы, бокалы
      el('circle', { cx: 200, cy: 210, r: 150, fill: 'url(#vg-glow)', 'class': 'glow' }, svg);
      el('circle', Object.assign({ cx: 196, cy: 222, r: 98 }, vAttrs()), svg);
      el('circle', Object.assign({ cx: 196, cy: 222, r: 88 }, vAttrs('thin')), svg);
      el('circle', Object.assign({ cx: 196, cy: 222, r: 64 }, vAttrs('fillw')), svg);
      el('circle', Object.assign({ cx: 196, cy: 222, r: 46 }, vAttrs('thin')), svg);
      vp(svg, 'M170 206 L196 240 L222 206 Q196 196 170 206 Z', 'thin');
      // вилки
      vp(svg, 'M70 150 V300 M62 150 V176 Q70 186 78 176 V150 M66 150 V172 M74 150 V172');
      vp(svg, 'M86 160 V300 M80 160 V178 Q86 186 92 178 V160', 'thin');
      // нож и ложка
      vp(svg, 'M318 150 Q330 180 322 210 V300 M318 150 V300');
      vp(svg, 'M342 300 V190 M342 190 q-10 -6 -10 -22 q0 -16 10 -16 q10 0 10 16 q0 16 -10 22', 'thin');
      // бокалы
      el('circle', Object.assign({ cx: 300, cy: 92, r: 22 }, vAttrs()), svg);
      el('circle', Object.assign({ cx: 300, cy: 92, r: 15 }, vAttrs('thin')), svg);
      el('circle', Object.assign({ cx: 344, cy: 112, r: 18 }, vAttrs()), svg);
      el('circle', Object.assign({ cx: 344, cy: 112, r: 12 }, vAttrs('thin')), svg);
      el('circle', Object.assign({ cx: 254, cy: 86, r: 16 }, vAttrs('thin')), svg);
      glint(svg, 292, 84, 6, 0.4);
      glint(svg, 338, 104, 5, 1.6);
      // салфетка
      vp(svg, 'M100 70 L150 70 L126 116 Z M112 70 L126 100', 'thin');
    },
    floor: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 400, height: 520, 'class': 'v-bg' }, svg);
      var hz = 300;
      vp(svg, 'M0 ' + hz + ' H400');
      for (var i = -6; i <= 6; i++) vp(svg, 'M' + (200 + i * 10) + ' ' + hz + ' L' + (200 + i * 90) + ' 520', 'thin faint');
      [314, 334, 364, 410, 480].forEach(function (y) { vp(svg, 'M0 ' + y + ' H400', 'thin faint'); });
      el('circle', { cx: 200, cy: 170, r: 150, fill: 'url(#vg-glow)', 'class': 'glow' }, svg);
      var g = el('g', { transform: 'translate(200 20) scale(130)' }, svg);
      var gl = chandelier(g);
      Array.prototype.forEach.call(g.querySelectorAll('[class*="ln"]'), function (c) { c.setAttribute('vector-effect', 'non-scaling-stroke'); });
      var gr = el('g', { transform: 'translate(200 580) scale(130 -130)', mask: 'url(#vg-reflect-mask)', 'class': 'v-reflect' }, svg);
      chandelier(gr, { cls: 'ln-r' });
      el('ellipse', { cx: 200, cy: 420, rx: 70, ry: 120, fill: 'url(#vg-streak)', 'class': 'glow glow--streak' }, svg);
      gl.forEach(function (p, i) { if (i % 2) glint(svg, 200 + p[0] * 130, 20 + p[1] * 130, 6, i * 0.9); });
    },
    setting: function (svg) {
      defs(svg);
      el('rect', { x: 0, y: 0, width: 520, height: 380, 'class': 'v-bg' }, svg);
      el('circle', { cx: 260, cy: 190, r: 220, fill: 'url(#vg-glow)', 'class': 'glow' }, svg);
      // праздничный стол: скатерть, блюда, бокалы — фронтальный вид
      vp(svg, 'M30 250 H490');
      vp(svg, 'M30 250 Q40 300 36 360 M490 250 Q480 300 484 360', 'thin');
      vp(svg, 'M30 262 q30 26 60 0 q30 26 60 0 q30 26 60 0 q30 26 60 0 q30 26 60 0 q30 26 60 0 q30 26 60 0 q20 18 40 0', 'thin');
      // блюдо под клошем
      vp(svg, 'M150 240 H290 M162 240 Q164 168 220 160 Q276 168 278 240', 'fillw');
      vp(svg, 'M220 160 V150 M212 150 H228', '');
      vp(svg, 'M178 228 Q186 190 214 176', 'thin');
      vp(svg, 'M144 250 Q146 240 150 240 M290 240 Q294 240 296 250', 'thin');
      // фрукты на ножке
      vp(svg, 'M70 250 H126 M98 250 V214 M66 214 H130 Q126 200 98 198 Q70 200 66 214', '');
      ['M78 198 a10 10 0 1 1 20 0', 'M94 194 a11 11 0 1 1 22 0', 'M84 184 a9 9 0 1 1 18 0'].forEach(function (d) { vp(svg, d, 'thin'); });
      vp(svg, 'M98 172 q4 -12 14 -14', 'thin');
      // бокалы
      [[340, 0], [372, 1], [404, 0]].forEach(function (b) {
        var x = b[0];
        vp(svg, 'M' + (x - 13) + ' 150 Q' + (x - 15) + ' 192 ' + x + ' 196 Q' + (x + 15) + ' 192 ' + (x + 13) + ' 150 Z', 'fillw');
        vp(svg, 'M' + x + ' 196 V240 M' + (x - 13) + ' 246 Q' + x + ' 236 ' + (x + 13) + ' 246 Z');
        vp(svg, 'M' + (x - 12) + ' 166 H' + (x + 12), 'thin');
      });
      vp(svg, 'M446 246 V170 Q446 150 456 140 V116 H468 V140 Q478 150 478 170 V246 Z', 'fillw');
      vp(svg, 'M446 196 H478', 'thin');
      glint(svg, 348, 160, 6, 0.3); glint(svg, 410, 162, 5, 1.5); glint(svg, 220, 172, 7, 2.6);
      // свечи
      vp(svg, 'M310 246 V206 M318 246 V196', 'thin');
      el('ellipse', { cx: 310, cy: 199, rx: 3, ry: 6, 'class': 'flame' }, svg);
      el('ellipse', { cx: 318, cy: 189, rx: 3, ry: 6, 'class': 'flame' }, svg);
    }
  };

  function drawVignette(svg) {
    var kind = svg.getAttribute('data-vignette');
    if (!vignettes[kind] || svg.dataset.drawn) return;
    svg.dataset.drawn = '1';
    seed = 11;
    vignettes[kind](svg);
    svg.querySelectorAll('.ln').forEach(function (p, i) { p.style.setProperty('--d', (0.02 * i).toFixed(2) + 's'); });
    svg.classList.add('is-lit');
  }

  window.VersalScene = { buildHall: buildHall, drawVignette: drawVignette, reduced: REDUCED };
})();
