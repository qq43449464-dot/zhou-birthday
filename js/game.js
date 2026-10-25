(function () {
  const { rand, pick, clamp, dist, $, wait } = BD;
  const fx = BD.fx, A = BD.audio;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ 舞台
  const stage = $('#stage');
  const G = (BD.G = { scene: 'boot', tok: 0, t: 0, rect: { x: 0, y: 0 }, scale: 1, ptr: { x: 270, y: 480, down: false, vx: 0, vy: 0, lx: 0, ly: 0, lt: 0 }, last: performance.now() });

  // 固定 540×960 舞台，按窗口等比缩放并居中
  const L = (BD.L = { ox: 0, e: 0, cakeX: 150, boyDX: 0, girlBigX: 110, girlSmallX: 360 });
  let onLayout = null;
  function fit() {
    const w = innerWidth, h = innerHeight;
    const s = Math.min(w / 540, h / BD.H);
    BD.W = 540;
    G.scale = s;
    G.rect.x = (w - BD.W * s) / 2;
    G.rect.y = (h - BD.H * s) / 2;
    stage.style.width = BD.W + 'px';
    stage.style.transform = `translate(${G.rect.x}px,${G.rect.y}px) scale(${s})`;
    fx.resize(s);
    bgResize();
    onLayout && onLayout();
  }
  fx.init($('#fx'));
  addEventListener('resize', fit);

  // 全屏背景萤火：宽屏/手机舞台之外也保持同样的暖光氛围
  const bgc = $('#bgfx'), bgx = bgc.getContext('2d');
  const embers = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), r: rand(1.2, 3.4), v: rand(0.008, 0.03), ph: rand(0, 6), a: rand(0.25, 0.8) }));
  function bgResize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    bgc.width = Math.round(innerWidth * d); bgc.height = Math.round(innerHeight * d);
    bgx.setTransform(d, 0, 0, d, 0, 0);
  }
  function bgDraw(dt) {
    const w = innerWidth, h = innerHeight;
    bgx.clearRect(0, 0, w, h);
    bgx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      e.y -= e.v * dt; if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
      const x = e.x * w + Math.sin(G.t * 0.6 + e.ph) * 14, y = e.y * h, r = e.r * 5;
      const a = e.a * (0.6 + 0.4 * Math.sin(G.t * 1.4 + e.ph));
      const g = bgx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,190,100,' + a + ')'); g.addColorStop(1, 'rgba(255,150,60,0)');
      bgx.fillStyle = g; bgx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    bgx.globalCompositeOperation = 'source-over';
  }

  // 背景光斑
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    d.className = 'bk';
    const s = rand(30, 110);
    d.style.cssText = `left:${rand(-20, 540)}px;top:${rand(20, 900)}px;width:${s}px;height:${s}px;animation-delay:${-rand(0, 9)}s;animation-duration:${rand(7, 13)}s`;
    $('#bokeh').appendChild(d);
  }

  // ------------------------------------------------------------------ 精灵
  class Sprite {
    constructor(el, x, y, s, a = 1) { this.el = el; this.x = x; this.y = y; this.s = s; this.a = a; }
    apply() {
      this.el.style.transform = `translate(${this.x}px,${this.y}px) scale(${this.s})`;
      this.el.style.opacity = this.a;
    }
    hit(px, py, pad = 0) {
      const w = this.el.offsetWidth * this.s, h = this.el.offsetHeight * this.s;
      return px >= this.x - pad && px <= this.x + w + pad && py >= this.y - pad && py <= this.y + h + pad;
    }
  }
  const girl = new Sprite($('#girl'), 110, 260, 0.7, 0);
  const boy = new Sprite($('#boy'), 270, 269, 0.5, 0);
  const plank = $('#plank'), cakeEl = $('#cake');
  const cake = { x: 150, a: 0 };
  onLayout = () => {
    boy.x = 270 + L.boyDX;
    $('#fx').style.width = BD.W + 'px';
    if (G.scene === 'girl') { girl.x = L.girlBigX; }
    else if (girl.s < 0.5) girl.x = L.girlSmallX;
    if (G.scene !== 'catch') cake.x = L.cakeX;
    STRIP.x0 = 270 + L.ox; STRIP.x1 = 395 + L.ox; M.home.x = 270 + L.ox;
  };
  const girlTip = () => ({ x: girl.x + 100 * girl.s, y: girl.y + 2 * girl.s });
  const mouth = () => ({ x: boy.x + 8 * boy.s, y: boy.y + 232 * boy.s });
  const bag = () => ({ x: boy.x + 470 * boy.s, y: boy.y + 560 * boy.s });
  const wick = () => ({ x: cake.x, y: 420 });

  function animClass(sprite, cls, ms = 700) {
    const el = sprite.el;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  // ------------------------------------------------------------------ 火焰与光
  const fGirl = fx.addFlame(0, 0, 1, 380);
  const fCake = fx.addFlame(150, 420, 1, 300);
  const fMatch = fx.addFlame(0, 0, 0.5, 240);
  const fSpark = fx.addFlame(0, 0, 0.45, 200);
  const MINI_X = [28, 110, 189, 272];
  const fMini = MINI_X.map(() => fx.addFlame(0, 0, 0.5, 130));
  const miniEls = MINI_X.map((x) => {
    const d = document.createElement('div');
    d.className = 'mc';
    d.style.left = x - 4.5 + 'px';
    $('#miniCandles').appendChild(d);
    return d;
  });

  function syncFlames() {
    const t = girlTip();
    fGirl.x = t.x; fGirl.y = t.y;
    const w = wick();
    fCake.x = w.x; fCake.y = w.y;
    fMini.forEach((f, i) => { f.x = cake.x - 150 + MINI_X[i]; f.y = 700 + 22; });
    boy.apply(); girl.apply();
    cakeEl.style.transform = `translateX(${cake.x - 150}px)`;
  }

  // ------------------------------------------------------------------ UI 助手
  const ui = { title: $('#title'), hint: $('#hint'), wish: $('#wish'), meter: $('#meter'), meterI: $('#meter i'), counter: $('#counter'), lives: $('#lives'), toast: $('#toast'), layer: $('#bubbleLayer'), narr: $('#narr'), chapter: $('#chapter') };
  const hint = (t) => { ui.hint.textContent = t || ''; ui.hint.classList.toggle('show', !!t); };
  let toastTimer;
  function toast(t, ms = 2400) {
    ui.toast.textContent = t;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
  }
  function title(t) {
    ui.title.classList.remove('show');
    setTimeout(() => { ui.title.textContent = t; ui.title.classList.add('show'); }, 250);
  }
  function say(x, y, text, ms = 2200) {
    const b = document.createElement('div');
    b.className = 'sb';
    b.textContent = text;
    b.style.left = clamp(x, 120, BD.W - 120) + 'px';
    b.style.top = y + 'px';
    ui.layer.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, ms);
    return b;
  }
  const sayGirl = (t, ms) => say(girl.x + 130 * girl.s * (girl.s > 0.5 ? 1.2 : 1.4), girl.y + (girl.s > 0.5 ? 20 : -10), t, ms);
  const sayBoy = (t, ms) => say(boy.x + 110, boy.y + 40, t, ms);
  // 旁白字幕 + 章节卡
  let narrT, chapT;
  function narr(t, ms = 3400) {
    ui.narr.textContent = t;
    ui.narr.classList.add('show');
    clearTimeout(narrT);
    if (ms) narrT = setTimeout(() => ui.narr.classList.remove('show'), ms);
  }
  const hideNarr = () => { clearTimeout(narrT); ui.narr.classList.remove('show'); };
  function chapter(k, n, l, ms = 2400) {
    ui.chapter.querySelector('.k').textContent = k;
    ui.chapter.querySelector('.n').textContent = n;
    ui.chapter.querySelector('.l').textContent = l || '';
    ui.chapter.classList.add('show');
    clearTimeout(chapT);
    if (ms) chapT = setTimeout(() => ui.chapter.classList.remove('show'), ms);
  }

  // ------------------------------------------------------------------ 许愿星：一路带着你走完每一幕
  const ST = { x: 270, y: 470, hx: 270, hy: 470, vis: false, lit: 0, litT: 0, s: 1, sT: 1, flying: false, p: 0, sx: 0, sy: 0, cx: 0, cy: 0, ex: 0, ey: 0, light: { x: 0, y: 0, r: 0, a: 0 } };
  fx.lights.push(ST.light);
  ST.show = (x, y, lit = 0) => { ST.x = ST.hx = x; ST.y = ST.hy = y; ST.vis = true; ST.lit = ST.litT = lit; ST.s = ST.sT = 1; };
  ST.ignite = () => { ST.litT = 1; };
  ST.hover = (x, y, s = 0.7) => { ST.hx = x; ST.hy = y; ST.sT = s; };
  ST.fly = (x, y, ms, cb) => {
    ST.flying = true; ST.p = 0;
    ST.sx = ST.x; ST.sy = ST.y; ST.ex = x; ST.ey = y;
    const mx = (ST.sx + x) / 2, my = (ST.sy + y) / 2, dx = x - ST.sx, dy = y - ST.sy, d = Math.hypot(dx, dy) || 1;
    const side = ST.sx > 270 ? -1 : 1;
    ST.cx = mx - (dy / d) * 130 * side; ST.cy = my + (dx / d) * 130 * side - 40;
    ST.sT = 1.25;
    A.whoosh();
    BD.tween(ST, { p: 1 }, ms, 'inout', () => { ST.flying = false; ST.hx = x; ST.hy = y; ST.x = x; ST.y = y; ST.sT = 0.7; fx.stars(x, y, 10, 90); A.ding(2); cb && cb(); });
  };
  ST.update = (dt) => {
    if (!ST.vis) { ST.light.a = 0; return; }
    if (ST.flying) {
      const u = ST.p, v = 1 - u;
      ST.x = v * v * ST.sx + 2 * v * u * ST.cx + u * u * ST.ex;
      ST.y = v * v * ST.sy + 2 * v * u * ST.cy + u * u * ST.ey;
      for (let i = 0; i < 3; i++) fx.emit('spark', ST.x + rand(-5, 5), ST.y + rand(-5, 5), { vx: rand(-30, 30), vy: rand(-30, 30), drag: 1.2, life: rand(0.5, 1.1), size: rand(1.4, 3.2), color: pick(['255,226,150', '255,200,110', '255,255,255']) });
      if (Math.random() < dt * 14) fx.emit('star', ST.x, ST.y, { vx: rand(-40, 40), vy: rand(-10, 50), drag: 1.5, life: rand(0.6, 1.1), size: rand(6, 11), color: '255,236,170', vr: rand(-3, 3) });
    } else {
      const k = Math.min(1, dt * 5);
      ST.x += (ST.hx + Math.sin(G.t * 1.7) * 8 - ST.x) * k;
      ST.y += (ST.hy + Math.sin(G.t * 2.3) * 7 - ST.y) * k;
      if (ST.lit > 0.5 && Math.random() < dt * 5) fx.emit('spark', ST.x + rand(-8, 8), ST.y + rand(-8, 8), { vx: rand(-14, 14), vy: rand(6, 30), life: rand(0.6, 1.2), size: rand(1.2, 2.4), color: '255,226,150' });
    }
    ST.s += (ST.sT - ST.s) * Math.min(1, dt * 5);
    ST.lit += (ST.litT - ST.lit) * Math.min(1, dt * 3.5);
    const L2 = ST.light;
    L2.x = ST.x; L2.y = ST.y;
    L2.r = (70 + 230 * ST.lit) * (0.75 + 0.25 * ST.s) * (0.94 + 0.06 * Math.sin(G.t * 9));
    L2.a = 0.18 + 0.82 * ST.lit;
  };
  fx.hooks = fx.hooks || [];
  fx.hooks.push((ctx) => {
    if (!ST.vis) return;
    const R = 24 * ST.s * (0.7 + 0.3 * ST.lit) * (1 + (ST.lit < 0.5 ? 0.08 * Math.sin(fx.t * 3) : 0.04 * Math.sin(fx.t * 8)));
    ctx.save();
    ctx.translate(ST.x, ST.y);
    ctx.globalCompositeOperation = 'lighter';
    const gr = R * (2.2 + 3.2 * ST.lit);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
    g.addColorStop(0, 'rgba(255,214,120,' + (0.25 + 0.55 * ST.lit) + ')');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g; ctx.fillRect(-gr, -gr, gr * 2, gr * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(Math.sin(fx.t * 1.3) * 0.12);
    const path = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.46 : r, a = -Math.PI / 2 + (i / 10) * TAU; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1 - ST.lit * 0.9;
    ctx.fillStyle = '#8a7f6c'; ctx.strokeStyle = 'rgba(255,230,180,.55)'; ctx.lineWidth = 1.5;
    path(R); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = ST.lit;
    ctx.shadowColor = 'rgba(255,200,90,.95)'; ctx.shadowBlur = 22;
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    sg.addColorStop(0, '#fffbe6'); sg.addColorStop(1, '#ffd25a');
    ctx.fillStyle = sg; path(R); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,240,200,.85)'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    const len = R * (2.1 + 0.5 * Math.sin(fx.t * 5));
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.moveTo(0, -len); ctx.lineTo(0, len); ctx.stroke();
    ctx.restore();
  });

  // 一幕结束 → 星星带路飞往下一幕，同时亮出章节卡
  function journey(next, kicker, name, line, ax, ay, delay = 0) {
    G.scene = 'journey'; G.sceneT = 0; G.tok++;
    hint(''); hideNarr();
    ST.litT = 1;
    setTimeout(() => {
      chapter(kicker, name, line, 0);
      ST.fly(ax, ay, 1700, () => {
        ui.chapter.classList.remove('show');
        go(next);
      });
    }, delay);
  }
  // 只在当前这一幕仍然有效时才执行的定时器（场景一切换就自动作废）
  function at(ms, fn) {
    const t = G.tok;
    setTimeout(() => { if (G.tok === t) fn(); }, ms);
  }
  function show(el, on = true) { el.classList.toggle('show', on); }

  // ------------------------------------------------------------------ 输入
  function toDesign(e) { return { x: (e.clientX - G.rect.x) / G.scale, y: (e.clientY - G.rect.y) / G.scale }; }
  let motionAsked = false;
  function trackPointer(e) {
    const p = toDesign(e), P = G.ptr, now = performance.now();
    const dt = Math.max(1, now - P.lt) / 1000;
    if (P.lt) { P.vx = P.vx * 0.5 + ((p.x - P.x) / dt) * 0.5; P.vy = P.vy * 0.5 + ((p.y - P.y) / dt) * 0.5; }
    P.x = p.x; P.y = p.y; P.lt = now;
  }
  const isUI = (e) => e.target.closest && (e.target.closest('button') || e.target.closest('.wb') || e.target.closest('#final'));
  addEventListener('pointerdown', (e) => {
    A.resume();
    if (!motionAsked) { motionAsked = true; askMotion(); }
    if (isUI(e)) return;
    trackPointer(e); G.ptr.down = true; G.lastInput = G.t;
    if (G.scene !== 'intro') tapFx(G.ptr.x, G.ptr.y);
    S[G.scene] && S[G.scene].down && S[G.scene].down(G.ptr.x, G.ptr.y);
  });
  // 点哪里都有回应：星星会跟着闪一下
  let tapCd = 0;
  function tapFx(x, y) {
    if (G.t < tapCd) return;
    tapCd = G.t + 0.12;
    fx.stars(x, y, 7, 100);
    A.ding(Math.floor(rand(0, 4)));
    ST.s = ST.sT * 1.7;
  }
  addEventListener('pointermove', (e) => {
    trackPointer(e);
    S[G.scene] && S[G.scene].move && S[G.scene].move(G.ptr.x, G.ptr.y);
  });
  const up = () => { if (!G.ptr.down) return; G.ptr.down = false; S[G.scene] && S[G.scene].up && S[G.scene].up(); };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      G.key = true;
      const sc = S[G.scene];
      if (!e.repeat && sc && sc.key) sc.key();
    }
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space') G.key = false; });

  $('#btnSound').onclick = (e) => {
    A.resume();
    const m = !A.muted;
    A.setMuted(m);
    e.target.textContent = m ? '🔇' : '🔊';
  };

  // 彩蛋：摇一摇
  function askMotion() {
    try {
      if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') DeviceMotionEvent.requestPermission().catch(() => {});
    } catch (e) {}
  }
  let shakeCd = 0;
  addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (m > 26 && G.t > shakeCd) {
      shakeCd = G.t + 3.5;
      fx.confettiRain(70);
      fx.stars(BD.W / 2, 400, 14, 200);
      A.sparkle(6);
      toast('🎉 摇出了一场彩带雨！');
    }
  });

  // ------------------------------------------------------------------ 场景
  const S = {};
  const go = (name) => { G.scene = name; G.sceneT = 0; G.tok++; S[name].enter(); };
  S.journey = { update() {} };

  // ===== 序幕：点亮许愿星 =====
  S.intro = {
    enter() {
      fx.setDark(0.97);
      girl.a = 0; boy.a = 0;
      ST.show(270, 470, 0);
      this.phase = 'wait'; this.meteorT = 3;
      title('让我们点亮一颗\n许愿星吧');
      setTimeout(() => { if (this.phase === 'wait') narr('轻点屏幕，点亮它 ✨', 0); }, 1600);
    },
    down() { if (this.phase === 'wait') this.light(); },
    key() { if (this.phase === 'wait') this.light(); },
    update(dt) {
      this.meteorT -= dt;
      if (this.meteorT <= 0) { this.meteorT = rand(4, 7); fx.meteors(1); }
    },
    light() {
      this.phase = 'lit';
      A.resume(); A.ignite(); A.sparkle(6);
      ST.ignite();
      title(''); hideNarr();
      fx.stars(ST.x, ST.y, 26, 220);
      fx.meteors(3);
      setTimeout(() => narr('许愿星亮了～\n跟着它走，今晚有好多惊喜 ✨', 0), 500);
      setTimeout(() => journey('girl', '第一幕', '微光', '有个小女孩，举着一根\n还没点亮的蜡烛……', 255, 200), 2800);
    },
  };

  // ===== 场景 1：划火柴 + 小女孩 =====
  const matchEl = $('#match'), boxEl = $('#matchbox');
  const M = { x: 270, y: 760, home: { x: 270, y: 760 }, lit: false, drag: false, rot: 0, a: 0 };
  const STRIP = { x0: 270, x1: 395, y0: 830, y1: 930 };
  const STRIKE = { x: 300, y: 890, rot: 80 };
  const SWIPE_X1 = 382;
  let tapCount = 0;

  S.girl = {
    enter() {
      girl.x = L.girlBigX; girl.y = 260; girl.s = 0.7; girl.a = 0;
      BD.tween(girl, { a: 1 }, 1400, 'out');
      fx.setDark(0.8, 1200);
      ST.hover(255, 200, 0.7);
      matchEl.style.opacity = 1;
      boxEl.style.opacity = 1;
      this.phase = 'strike';
      this.sk = -2.2; this.strokes = 0;
      M.x = STRIKE.x; M.y = STRIKE.y; M.rot = STRIKE.rot; M.lit = false; M.grab = false;
      title('');
      narr('第一幕 · 星星来帮她点蜡烛', 3200);
      at(2200, () => sayGirl('是火柴！', 1400));
    },

    down() {},
    up() {},
    // 流星滑过火柴盒，擦出火星，擦几下火柴就亮了（全自动，流畅缓动）
    strikeFx(x, y, t) {
      const n = 2 + Math.floor(rand(0, 2));
      fx.burst('spark', x, y, n, () => ({ vx: rand(-120, 120), vy: rand(-220, -80), g: 320, life: rand(0.25, 0.5), size: 1.5, color: '255,190,90' }));
    },
    ignite() {
      M.lit = true; M.dwell = 0; M.grab = false;
      this.phase = 'carry';
      fMatch.ignite(); A.strike();
      fx.burst('spark', M.x, M.y, 18, () => ({ vx: rand(-160, 160), vy: rand(-200, -20), g: 300, life: rand(0.3, 0.7), size: 1.6, color: '255,200,100' }));
      narr('嚓——火柴亮了！拿着它，凑近她手里的蜡烛芯', 0);
    },
    move(x, y) {
      if (this.phase === 'play') {
        fGirl.leanT = clamp((x - fGirl.x) / 280, -1, 1) * 0.6;
        G.lastInput = G.t;
      }
    },
    update(dt) {
      if (this.phase === 'strike' || this.phase === 'carry') this.updateMatch(dt);
      else if (this.phase === 'play') {
        if (G.t - (G.lastInput || 0) > 9 && !this.yawned) {
          this.yawned = true;
          sayGirl('(｡-ω-)zzz 困了…', 2600);
        }
        if (G.t - (G.lastInput || 0) < 2) this.yawned = false;
      }
    },
    updateMatch(dt) {
      if (this.phase === 'strike') this.updateStrike(dt);
      else if (this.phase === 'carry') {
        // 火柴自动平稳地凑到蜡烛芯，到了就点亮
        const t = girlTip();
        const tx = t.x + 6, ty = t.y + 8;
        const k = 1 - Math.exp(-dt * 2.4);
        M.x += (tx - M.x) * k; M.y += (ty - M.y) * k;
        M.rot += (0 - M.rot) * (1 - Math.exp(-dt * 4));
        if (Math.hypot(M.x - tx, M.y - ty) < 4) { M.x = tx; M.y = ty; this.lightCandle(); }
      }
      matchEl.style.transform = `translate(${M.x - 6}px,${M.y}px) rotate(${M.rot}deg)`;
      fMatch.x = M.x; fMatch.y = M.y + 2;
      fMatch.leanT = 0;
      if (this.phase === 'carry') ST.hover(M.x + 62, M.y - 78, 0.8);
    },
    // 时间线：流星先在火柴盒上方停住，然后左右来回滑过盒面，每滑一次擦出火星，擦够四次火柴点亮
    // 一次干脆的划擦：流星停在火柴头上方，一下平滑划过火柴盒擦出火，随即点亮
    updateStrike(dt) {
      this.sk += dt;
      const t = this.sk;
      if (t < 0) return;
      const PRE = 0.25, SWIPE = 0.32, SX0 = STRIKE.x, SX1 = SWIPE_X1, SY = STRIKE.y;
      if (t < PRE) {
        ST.hover(SX0, SY - 26, 0.5);
        return;
      }
      const s = t - PRE;
      if (s < SWIPE) {
        const u = s / SWIPE, e = 1 - Math.pow(1 - u, 3);
        const x = SX0 + (SX1 - SX0) * e;
        ST.hover(x, SY - 26, 0.6);
        M.x = x; M.y = SY;
        M.rot = STRIKE.rot + Math.sin(s * 50) * 0.8;
        if (s - dt < 0) { A.strike(); narr('流星划过火柴盒，擦出火星……', 1600); }
        if (Math.floor(s / 0.05) !== Math.floor((s - dt) / 0.05)) this.strikeFx(M.x + 4, SY - 10, t);
      } else {
        this.ignite();
      }
    },

    lightCandle() {
      this.phase = 'lit';
      M.lit = false; M.grab = false; fMatch.out();
      matchEl.style.opacity = 0;
      boxEl.style.opacity = 0;
      fGirl.ignite();
      A.ignite();
      fx.stars(fGirl.x, fGirl.y - 30, 14, 120);
      fx.setDark(0.55, 2000);
      sayGirl('哇，好暖和～', 2200);
      at(900, () => { title('周总，生日快乐！'); A.sparkle(5); fx.confetti(BD.W / 2, 200, 40); });
      at(2600, () => { ui.wish.classList.add('show'); });
      at(2200, () => {
        this.phase = 'play'; G.lastInput = G.t;
        animClass(girl, 'wobble');
        girl.el.classList.add('bob');
      });
      at(6200, () => {
        narr('火种有了 🔥\n星星说：去把那根大蜡烛也点亮吧', 0);
        ST.hover(girlTip().x + 70, girlTip().y - 60, 0.9);
      });
      at(8800, () => journey('relay', '第二幕', '传火', '把火种，送给等在那里的\n大蜡烛……', wick().x, 330));
    },
    tap(x, y) {
      tapCount++;
      A.boing();
      animClass(girl, 'wobble');
      const hx = girl.x + 280 * girl.s, hy = girl.y + 470 * girl.s;
      fx.hearts(hx, hy, 5);
      fGirl.shake = 1;
      if (tapCount === 5) {
        animClass(girl, 'spin', 1050);
        fx.confetti(girl.x + 150, girl.y + 150, 60);
        A.sparkle(8);
        sayGirl('彩蛋！转圈圈～ 🌀', 2200);
        return;
      }
      sayGirl(pick(['嘿嘿~', '别戳啦，痒~', '周总最棒！', '蜡烛拿稳！', '许个愿吧 ✨', '今天你说了算 👑']), 1500);
    },
  };

  // ===== 场景 2：传火接力 =====
  const R = { auto: false, p: 0, done: false, said: false };
  S.relay = {
    enter() {
      show(ui.counter, false);
      ui.wish.classList.remove('show');
      title('传火接力');
      girl.el.classList.remove('bob');
      BD.tween(girl, { x: L.girlSmallX, y: 700, s: 0.3 }, 1100, 'inout');
      BD.tween(fGirl, { size: 0.55 }, 1100, 'inout');
      BD.tween(fx, { dark: 0.74 }, 1100, 'inout');
      cakeEl.style.opacity = 1; cakeEl.style.transition = 'opacity .9s';
      ST.hover(wick().x + 40, 330, 0.8);
      R.auto = false; R.p = 0; R.done = false; R.said = false;
      fx.obstacles.length = 0;
      [[300, 600, 55, 20, 1.3], [232, 520, 22, 48, 1.1], [172, 468, 48, 16, 1.5]].forEach(([bx, cy, ax, ay, sp], i) => {
        const cx = bx + L.ox + L.e * clamp((bx - 250) / 100, -1, 1);
        fx.obstacles.push({ x: cx, y: cy, cx, cy, ax, ay, sp, ph: i * 2, r: 32, seed: i * 3.1, hit: 0 });
      });
      narr('第二幕 · 星星托起火苗，\n穿过云朵，送给大蜡烛', 3400);
      at(1300, () => sayBoy('我在这儿等你！', 2000));
      at(2400, () => this.carry());
    },
    // 星星托着火苗，沿着一条绕开云朵的弧线飞过去
    carry() {
      const t = girlTip();
      R.t0 = { x: t.x, y: t.y };
      fSpark.x = t.x; fSpark.y = t.y; fSpark.ignite(); fSpark.lit = true;
      A.pop(); A.whoosh();
      sayGirl('火苗，出发！', 1400);
      R.auto = true; R.p = 0;
      BD.tween(R, { p: 1 }, 3400, 'inout', () => this.light());
    },
    move() {},
    update(dt) {
      fx.obstacles.forEach((o) => {
        o.x = o.cx + o.ax * Math.sin(G.t * o.sp + o.ph);
        o.y = o.cy + o.ay * Math.cos(G.t * o.sp * 0.8 + o.ph);
        o.hit = Math.max(0, o.hit - dt);
      });
      if (R.auto && !R.done) {
        const w = wick(), u = R.p, v = 1 - u, p0 = R.t0;
        const p1 = { x: 520, y: 520 }, p2 = { x: 330, y: 330 };
        const x = v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * w.x;
        const y = v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * w.y;
        fSpark.leanT = clamp((fSpark.x - x) / 6, -0.8, 0.8);
        fSpark.x = x; fSpark.y = y;
        ST.hover(x + 34, y - 54, 0.85);
        if (Math.random() < 0.8) fx.emit('spark', x, y, { vx: rand(-20, 20), vy: rand(10, 50), life: rand(0.4, 0.9), size: rand(1, 2.2), color: '255,190,80' });
        for (const o of fx.obstacles) {
          if (o.hit <= 0 && dist(x, y, o.x, o.y) < o.r + 46) { o.hit = 0.6; fx.stars(o.x, o.y, 5, 60); A.ding(Math.floor(rand(0, 4))); }
        }
        if (u > 0.6 && !R.said) { R.said = true; sayBoy('快到啦快到啦！', 1500); }
      }
    },
    light() {
      R.done = true; R.auto = false;
      fSpark.out();
      fCake.ignite();
      A.ignite(); A.sparkle(6);
      fx.stars(fCake.x, fCake.y - 20, 18, 140);
      fx.confetti(fCake.x, fCake.y, 40, 0.6);
      fx.obstacles.length = 0;
      title('点亮啦！');
      sayBoy('亮了亮了！！', 1800);
      BD.tween(fx, { dark: 0.7 }, 800);
      journey('protect', '第三幕', '守护', '他已经等不及要吹了，\n可是，风先来了……', 70, 340, 1800);
    },
  };

  // ===== 场景 3：护火苗（星星替你挡风）=====
  const PR = { gust: 0, state: 'wait', t: 0, life: 1, shield: false, out: false, done: false };
  const shieldEl = $('#shield');
  S.protect = {
    enter() {
      PR.gust = 0; PR.state = 'wait'; PR.t = 1.8; PR.life = 1; PR.shield = false; PR.out = false; PR.done = false;
      title('护住火苗！');
      narr('第三幕 · 风要来了，\n星星会替你护住火苗', 3600);
      show(ui.lives, true); this.lives();
      // 小女孩完成使命后退场，小男孩才登场
      BD.tween(girl, { a: 0 }, 700, 'out');
      fGirl.out();
      boy.a = 0; BD.tween(boy, { a: 1 }, 900, 'out');
      plank.style.opacity = 1; plank.style.transition = 'opacity .9s';
      boy.el.classList.add('bob');
      girl.el.classList.remove('bob');
      ST.hover(wick().x + 70, wick().y - 40, 0.8);
      at(700, () => sayBoy('我可以吹了吗？？', 2200));
      at(3000, () => sayBoy('再等等嘛……', 1800));
    },
    lives() { ui.lives.textContent = '🌬️'.repeat(PR.gust) + '·'.repeat(3 - PR.gust); },
    down() {}, move() {}, up() {},
    update(dt) {
      if (PR.done) return;
      const w = wick();
      // 风一预警，星星就飞到火苗前，撑起一层护罩
      const holding = PR.state === 'warn' || PR.state === 'blow';
      PR.shield = holding;
      ST.hover(w.x + (holding ? 58 : 80), w.y + (holding ? 20 : -40), holding ? 1 : 0.8);
      shieldEl.style.left = w.x + 'px'; shieldEl.style.top = w.y + 62 + 'px';
      shieldEl.classList.toggle('on', holding);
      fx.rings.length = 0;
      if (holding) fx.rings.push({ x: w.x, y: w.y - 24, r: 58 + Math.sin(G.t * 12) * 2, color: 'rgba(255,220,150,.75)', w: 3, a: 0.8 });

      PR.t -= dt;
      if (PR.state === 'wait' && PR.t <= 0 && PR.gust < 3 && !PR.out) {
        PR.state = 'warn'; PR.t = 1.0;
        A.warn(); toast('⚠️ 风来了！星星来护着～', 1300);
        fx.wind(w.y, 1, 2);
      } else if (PR.state === 'warn') {
        if (PR.t <= 0) { PR.state = 'blow'; PR.t = 1.5; A.gust(1.5); }
      } else if (PR.state === 'blow') {
        if (Math.random() < dt * 22) fx.wind(w.y, 1, 1);
        fCake.shake = 0.7;
        fCake.leanT = 0.25;
        if (PR.t <= 0) {
          PR.state = 'wait'; PR.t = rand(0.9, 1.3);
          PR.gust++; this.lives();
          fCake.leanT = 0;
          fx.stars(w.x + 40, w.y + 10, 8, 80);
          toast(['挡住啦！', '稳稳的 ✨', '最后一阵，过～'][PR.gust - 1], 1200);
          if (PR.gust >= 3) return this.win();
          A.ding(PR.gust + 1);
        }
      }
      if (PR.state !== 'blow') { fCake.leanT = 0; PR.life = Math.min(1, PR.life + dt * 0.25); }
      fCake.target = 0.4 + 0.6 * clamp(PR.life, 0, 1);
    },
    win() {
      if (PR.done) return;
      PR.done = true;
      shieldEl.classList.remove('on'); fx.rings.length = 0;
      fCake.leanT = 0; fCake.target = 1; if (!fCake.lit) fCake.ignite();
      show(ui.lives, false);
      title('火苗保住了！');
      fx.confetti(150, 380, 30, 0.6); A.sparkle(5);
      sayBoy('好啦好啦，\n轮到我了！！', 2200);
      journey('blow', '第四幕', '吹蜡烛', '轮到他了——\n深吸一口气……', 440, 215, 2000);
    },
  };

  // ===== 场景 4：吹蜡烛（手动：按住吸气蓄力，松手吹）=====
  const B = { p: 0, t: 0, puffT: 0, puffLeft: 0, puffLvl: 0, hold: 0, wasDown: false, full: false, done: false };
  S.blow = {
    enter() {
      B.p = 0; B.t = 0; B.puffT = 0; B.puffLeft = 0; B.puffLvl = 0; B.hold = 0; B.wasDown = false; B.full = false; B.done = false;
      title('吹蜡烛时间！');
      narr('第四幕 · 按住屏幕一直吹，把进度条吹满', 0);
      show(ui.meter, true); ui.meterI.style.width = '0%';
      boy.el.classList.remove('bob');
      ST.hover(wick().x + 90, wick().y - 70, 0.9);
      A.blowStart();
    },
    down() {}, move() {}, up() {},
    update(dt) {
      if (B.done) return;
      B.t += dt;
      const down = G.ptr.down || G.key;
      if (down && !B.wasDown) { B.wasDown = true; if (!B.said) { B.said = true; sayBoy('呼————！', 1400); } }
      if (!down && B.wasDown) B.wasDown = false;
      // 按住任意位置持续吹，松手就停
      const b = down ? 0.85 + 0.15 * Math.sin(B.t * 22) : 0;
      if (down) B.p = clamp(B.p + dt * 0.24, 0, 1);
      else B.p = clamp(B.p - dt * 0.12, 0, 1);
      B.b = b;
      A.blowLevel(b);
      boy.el.classList.toggle('puff', b > 0.15);
      fCake.leanT = -b * 0.95;
      fCake.shake = b * 0.8;
      B.puffT -= dt;
      if (b > 0.3 && B.puffT <= 0) {
        B.puffT = 0.2;
        const m = mouth();
        fx.puff(m.x - 10, m.y, -1, 0.6 + b * 0.5, m.x - fCake.x);
        A.puffOnce(b);
      }
      if (b > 0.3 && Math.random() < dt * 40) {
        const m = mouth();
        fx.emit('wind', m.x - 6, m.y + rand(-12, 12), { vx: -rand(500, 800), len: rand(40, 90), life: 0.4, size: 2, alpha: 0.7 });
      }
      fCake.target = 1 - 0.7 * B.p;
      ui.meterI.style.width = B.p * 100 + '%';
      if (B.p >= 1) this.finish();
    },
    finish() {
      if (B.done) return;
      B.done = true;
      A.blowStop();
      show(ui.meter, false);
      boy.el.classList.remove('puff');
      fCake.leanT = -1; fCake.out();
      A.blowOut();
      const w = wick();
      for (let i = 0; i < 24; i++) setTimeout(() => fx.smoke(w.x + rand(-6, 6), w.y - rand(0, 20), 1), i * 60);
      fx.puff(mouth().x - 10, mouth().y, -1, 0.9, mouth().x - fCake.x);
      title('');
      hideNarr();
      BD.tween(fx, { dark: 0.97 }, 700);
      setTimeout(() => { toast('🕯️ 许个愿吧…', 2600); A.ding(0); }, 800);
      journey('party', '第五幕', '庆祝', '蜡烛灭了，\n愿望已经许下……', 270, 330, 3000);
    },
  };

  // ===== 场景 5：庆祝 + 天灯 =====
  const LN = { on: false, lit: false, phase: 'idle', x: 270, y: 760, t: 0, trail: 0, vx: 0, tilt: 0, spin: 0, rings: [], orbs: [], orbT: 0.6, got: 0 };
  fx.hooks = fx.hooks || [];
  fx.hooks.push((ctx) => {
    if (!LN.on) return;
    LN.rings.forEach((r) => {
      ctx.strokeStyle = `rgba(255,220,140,${r.a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    });
    LN.orbs.forEach((o) => {
      const pulse = 0.7 + 0.3 * Math.sin(LN.t * 5 + o.ph);
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(LN.t * 1.5 + o.ph);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      g.addColorStop(0, `rgba(255,240,180,${pulse})`); g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3 : 7, a = (i / 10) * TAU;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    });
    ctx.save(); ctx.translate(LN.x, LN.y);
    ctx.rotate(LN.tilt + Math.sin(LN.t * 1.6) * 0.04 + LN.spin * TAU);
    const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 190 + Math.sin(LN.t * 6) * 10);
    glow.addColorStop(0, 'rgba(255,170,80,.7)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = LN.lit ? glow : 'transparent';
    ctx.beginPath(); ctx.arc(0, 0, 200, 0, TAU); ctx.fill();
    ctx.fillStyle = LN.lit ? '#ffd9a0' : '#e8dcc8';
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 44, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(170,80,40,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 44, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(-12, 44, 24, 8);
    if (LN.lit) {
      const f = 1 + Math.sin(LN.t * 23) * 0.12 + Math.random() * 0.08;
      ctx.fillStyle = '#fff1b0'; ctx.beginPath(); ctx.ellipse(0, 26, 7 * f, 12 * f, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.ellipse(0, 28, 4 * f, 8 * f, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  });

  S.party = {
    enter() {
      // 女孩退场
      girl.a = 0;
      fGirl.out();
      cake.x = L.cakeX;
      ST.hover(90, 300, 0.7);
      setTimeout(() => {
        A.boom();
        fx.setDark(0.12, 1400);
        fx.fireworks(7, 330);
        fx.confettiRain(120);
        fx.balloons(9);
        fx.meteors(2);
        const dur = A.hbd();
        title('周总，生日快乐！🎉');
        boy.el.classList.add('bob');
        sayBoy('耶！！\n蜡烛吹灭啦！', 2400);
      }, 400);
      at(2200, () => narr('愿望已经许下 🎉\n（也可以戳戳他，看看会发生什么）', 2800));
      at(5200, () => {
        const b = bag();
        ST.hover(b.x - 20, b.y - 70, 0.8);
        narr('星星发现，他的礼品袋里\n好像藏着什么……', 2800);
      });
      at(8200, () => { this.eggs = false; const b = bag(); journey('catch', '第六幕', '天灯', '礼品袋里，\n藏着一盏天灯！', b.x - 40, b.y - 90); });
      this.eggs = true;
    },
    down(x, y) { if (this.eggs && boy.hit(x, y)) boyTap(x, y); },
  };

  const boyState = { taps: 0, crying: false };
  function boyTap(x, y) {
    if (boyState.crying) return;
    boyState.taps++;
    animClass(boy, 'wobble');
    A.boing();
    fx.hearts(boy.x + 110 * boy.s, boy.y + 170 * boy.s, 3);
    if (boyState.taps >= 7) {
      boyState.crying = true; boyState.taps = 0;
      boy.el.classList.remove('bob'); boy.el.classList.add('cry');
      A.cry();
      sayBoy('呜呜……我只是想吹蜡烛……', 3000);
      const iv = setInterval(() => {
        for (let k = 0; k < 2; k++) fx.emit('drop', boy.x + 70 * boy.s + rand(-4, 6), boy.y + 190 * boy.s, { vx: rand(-60, -20), vy: rand(-40, 20), g: 600, life: 0.8, size: rand(3, 6) });
      }, 90);
      setTimeout(() => {
        clearInterval(iv); boyState.crying = false;
        boy.el.classList.remove('cry'); boy.el.classList.add('bob');
        sayBoy('好啦好啦，被你哄好了～', 2000); fx.hearts(boy.x + 110 * boy.s, boy.y + 150 * boy.s, 10); A.sparkle(4);
      }, 3400);
    } else if (boyState.taps === 3) sayBoy('干嘛戳我～', 1400);
  }

  S.catch = {
    enter() {
      const b = bag();
      Object.assign(LN, { on: true, lit: false, phase: 'light', x: b.x - 40, y: b.y - 90, t: 0, trail: 0, vx: 0, tilt: 0, spin: 0, rings: [], orbs: [], orbT: 0.6, got: 0 });
      ST.hover(270, 700, 0.6);
      title('天灯');
      narr('第六幕 · 星星先替天灯点亮……', 3200);
    },
    down(x, y) {
      if (LN.phase !== 'fly') return;
      if (Math.hypot(x - LN.x, y - LN.y) < 80) {
        LN.spin = 1;
        LN.rings.push({ x: LN.x, y: LN.y, r: 30, a: 1 });
        fx.stars(LN.x, LN.y, 12, 90);
        A.ding(LN.got % 8);
        sayGirl(['呀，好亮！', '飞吧～', '再高一点！'][LN.got % 3], 1200);
      }
    },
    update(dt) {
      if (LN.phase === 'done') return;
      LN.t += dt;
      LN.spin = Math.max(0, LN.spin - dt * 1.6);
      LN.rings.forEach((r) => { r.r += 160 * dt; r.a -= dt * 1.4; });
      LN.rings = LN.rings.filter((r) => r.a > 0);
      if (LN.phase === 'light') {
        const k = 1 - Math.exp(-dt * 2.4);
        LN.x += (270 - LN.x) * k;
        LN.y += (760 - LN.y) * k;
        ST.hover(LN.x + 50, LN.y - 60, 0.6);
        if (LN.t > 2.4) {
          LN.lit = true; LN.phase = 'fly';
          A.ignite();
          fx.stars(LN.x, LN.y - 30, 12, 90);
          narr('天灯亮啦！用手指拖动它，\n把它送上夜空', 4200);
        }
      } else if (LN.phase === 'fly') {
        const px = LN.x;
        if (G.ptr.down) {
          const k = 1 - Math.exp(-dt * 3);
          LN.x += (G.ptr.x - LN.x) * k;
          LN.y += (G.ptr.y - LN.y) * k;
        } else {
          LN.x += Math.sin(LN.t * 0.9) * 22 * dt;
        }
        LN.y -= 60 * dt;
        LN.x = clamp(LN.x, 50, BD.W - 50);
        LN.vx += ((LN.x - px) / Math.max(dt, 0.001) - LN.vx) * (1 - Math.exp(-dt * 6));
        LN.tilt += (clamp(LN.vx * 0.0009, -0.35, 0.35) - LN.tilt) * (1 - Math.exp(-dt * 6));
        ST.hover(LN.x, LN.y - 110, 0.5);
        LN.trail -= dt;
        if (LN.trail <= 0) {
          LN.trail = 0.1;
          fx.stars(LN.x + rand(-14, 14), LN.y + 50, 2, 22);
        }
        LN.orbT -= dt;
        if (LN.orbT <= 0) {
          LN.orbT = rand(0.7, 1.1);
          LN.orbs.push({ x: rand(60, BD.W - 60), y: BD.H + 30, vy: -rand(40, 70), ph: rand(0, TAU) });
        }
        LN.orbs.forEach((o) => { o.y += o.vy * dt; o.x += Math.sin(LN.t * 2 + o.ph) * 18 * dt; });
        LN.orbs = LN.orbs.filter((o) => {
          if (o.y < -40) return false;
          if (Math.hypot(o.x - LN.x, o.y - LN.y) < 52) {
            LN.got++;
            fx.stars(o.x, o.y, 14, 70);
            A.ding(LN.got % 8);
            toast(`⭐ 收集星星 ${LN.got}`, 900);
            return false;
          }
          return true;
        });
        if (LN.y < 190) this.finish();
      }
    },
    finish() {
      LN.phase = 'done'; LN.on = false;
      fx.stars(LN.x, LN.y, 14, 120);
      fx.confetti(BD.W / 2, 300, 60);
      fx.fireworks(4, 230);
      A.sparkle(8);
      title('愿望升空啦！');
      toast(`愿望升空 ✨ 收集 ${LN.got} 颗星`, 2400);
      journey('wish', '第七幕', '许愿泡泡', '天灯带着祝福飞上天，\n愿望一个个都接住～', 270, 640, 2400);
    },
  };

  // ===== 场景 6：许愿泡泡 =====
  const WISHES = [
    ['🍀', '岁岁坦途，我啥都顺！'],
    ['💰', '钱包鼓鼓，快乐满满！'],
    ['🌟', '所有愿望都实现 ✨'],
    ['🚀', '事业像火箭一样往上冲！'],
    ['☕', '好运像咖啡，续杯不限量～'],
  ];
  const W = { bubbles: [], popped: 0, done: false, busy: false, cd: 0 };
  S.wish = {
    enter() {
      W.bubbles.length = 0; W.popped = 0; W.done = false; W.busy = false; W.cd = 1.2;
      ST.hover(60, 560, 0.7);
      title('许愿泡泡');
      narr('第七幕 · 星星带着祝福，\n一颗一颗戳破泡泡', 3600);
      ui.counter.textContent = '🫧 0 / 5'; show(ui.counter, true);
      this.eggs = true;
      WISHES.forEach((w, i) => at(i * 1500, () => this.spawn(i)));
    },
    down(x, y) { if (this.eggs && boy.hit(x, y)) boyTap(x, y); },
    pop(b) {
      if (b.popped) return;
      b.popped = true;
      b.el.classList.add('pop');
      setTimeout(() => b.el.remove(), 260);
      A.pop(); A.ding(b.i + 1);
      fx.stars(b.x, b.y, 12, 110);
      fx.hearts(b.x, b.y, 3);
      W.popped++;
      ui.counter.textContent = `🫧 ${W.popped} / 5`;
      toast(WISHES[b.i][1], 2300);
      if (W.popped >= 5) at(2200, () => this.finish());
    },
    spawn(i) {
      const el = document.createElement('div');
      el.className = 'wb';
      el.textContent = WISHES[i][0];
      $('#ui').appendChild(el);
      const b = { el, i, x: 90 + i * ((BD.W - 180) / 4) + rand(-16, 16), y: 1000, vy: -rand(95, 125), ph: rand(0, 6), popped: false };
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        A.resume();
        this.pop(b);
      });
      W.bubbles.push(b);
    },
    update(dt) {
      for (const b of W.bubbles) {
        if (b.popped) continue;
        b.y += b.vy * dt;
        b.x += Math.sin(G.t * 1.6 + b.ph) * 28 * dt;
        b.el.style.left = b.x * 1 + 'px';
        b.el.style.top = b.y + 'px';
        b.el.style.position = 'absolute';
      }
      if (W.done) return;
      // 星星依次飞去撞破泡泡（间隔留给祝福语显示）
      W.cd -= dt;
      if (!W.busy && W.cd <= 0) {
        const b = W.bubbles.find((q) => !q.popped && q.y < 700);
        if (b) {
          W.busy = true;
          ST.fly(b.x, b.y - 10, 700, () => { W.busy = false; W.cd = 1.1; if (!b.popped) this.pop(b); });
        }
      }
      if (!W.busy) ST.hover(60 + (W.popped % 2) * 420, 560, 0.7);
    },
    finish() {
      if (W.done) return;
      W.done = true; this.eggs = false;
      show(ui.counter, false);
      W.bubbles.forEach((b) => b.el.remove());
      fx.fireworks(6, 260); fx.confettiRain(100); A.hbd(0.36);
      toast('所有愿望，都会实现 ✨', 3200);
      title('Happy Birthday！');
      journey('final', '终幕', '星图', '最后，星星要带你\n去看一眼属于你的星空……', 270, 230, 3000);
    },
  };

  // ===== 终幕：属于周总的星图 =====
  const BORN = { y: 1974, m: 10, d: 26 };
  const AGE = new Date().getFullYear() - BORN.y;
  const FINALS = [
    '天蝎座的执着，属虎的魄力，\n今年，也无往不利！',
    `第 ${AGE} 个年轮，\n依旧虎虎生威 🐯`,
    '愿你所求皆如愿，\n所行皆坦途。',
    '蜡烛一吹，\n烦恼清零，好运翻倍！',
    '十月的天蝎，\n是夜空里最亮的那一颗。',
  ];
  let finalMsg = '';

  // 天蝎座星图（设计坐标）
  const SCO = {
    pts: [[88, 96], [128, 126], [150, 164], [170, 208], [190, 258], [226, 296], [282, 306], [330, 286], [352, 246], [348, 206], [322, 198], [62, 150], [92, 198]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [1, 11], [2, 12]],
    antares: 3, sting: 10,
    lit: 0, t: 0, on: false, flash: 0,
  };
  fx.hooks.push((ctx) => {
    if (!SCO.on) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = SCO.lit;
    ctx.lineCap = 'round';
    for (const [a, b] of SCO.edges) {
      if (!(a < n && b < n)) continue;
      ctx.strokeStyle = 'rgba(255,214,140,' + (0.35 + SCO.flash * 0.5) + ')';
      ctx.lineWidth = 1.4 + SCO.flash * 2;
      ctx.beginPath(); ctx.moveTo(SCO.pts[a][0], SCO.pts[a][1]); ctx.lineTo(SCO.pts[b][0], SCO.pts[b][1]); ctx.stroke();
    }
    SCO.pts.forEach(([x, y], i) => {
      if (i >= n) return;
      const big = i === SCO.antares, r = (big ? 11 : 5.5) * (1 + SCO.flash * 0.5) * (0.9 + 0.1 * Math.sin(fx.t * 3 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, big ? 'rgba(255,130,70,.95)' : 'rgba(255,236,190,.9)');
      g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      ctx.fillStyle = big ? '#ffb08a' : '#fff8e0';
      ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
    });
    ctx.restore();
  });
  function drawScorpio() {
    SCO.on = true; SCO.lit = 0; SCO.flash = 0;
    SCO.pts.forEach((p, i) => setTimeout(() => {
      SCO.lit = i + 1;
      A.ding(i % 6);
      fx.stars(p[0], p[1], 3, 30);
    }, 500 + i * 230));
    return 500 + SCO.pts.length * 230;
  }
  function flashScorpio() {
    SCO.flash = 1;
    BD.tween(SCO, { flash: 0 }, 1600, 'out');
  }

  S.final = {
    enter() {
      title('');
      finalMsg = pick(FINALS);
      $('#finalMsg').textContent = finalMsg;
      const f = $('#final');
      // 世界淡出，只留下星空与贺卡
      BD.tween(boy, { a: 0 }, 900, 'out');
      cakeEl.style.opacity = 0; plank.style.opacity = 0;
      fx.setDark(0, 900);
      ST.hover(SCO.pts[0][0] - 30, SCO.pts[0][1] - 40, 0.8);
      const done = drawScorpio();
      fx.meteors(3);
      setTimeout(() => {
        const a = SCO.pts[SCO.antares];
        ST.fly(a[0], a[1], 1200, () => {
          ST.vis = false; flashScorpio(); A.sparkle(8); A.sting();
          fx.stars(a[0], a[1], 30, 220); fx.fireworks(4, 320); fx.confettiRain(80);
          f.classList.remove('hidden'); f.style.opacity = 0;
          requestAnimationFrame(() => { f.style.opacity = 1; });
          setTimeout(() => A.hbd(0.36), 500);
        });
      }, done + 200);
      $('#btnAgain').onclick = () => location.reload();
      $('#btnSave').onclick = makeCard;
      const tags = [$('#tagScorpio'), $('#tagTiger')];
      tags[0].onclick = () => {
        A.resume(); A.sparkle(6); A.sting(); flashScorpio();
        fx.meteors(4); fx.stars(SCO.pts[SCO.antares][0], SCO.pts[SCO.antares][1], 24, 200);
        showMsg('♏ 天蝎座：\n热烈，深情，说到做到');
      };
      tags[1].onclick = () => {
        A.resume(); A.roar();
        const t = $('#tiger'); t.classList.remove('roar'); void t.offsetWidth; t.classList.add('roar');
        fx.confetti(BD.W / 2, 420, 70); fx.stars(BD.W / 2, 420, 18, 200);
        const uiEl = $('#ui'); uiEl.classList.remove('shake'); void uiEl.offsetWidth; uiEl.classList.add('shake');
        showMsg('🐯 属虎：\n虎虎生威，万事开门红！');
      };
      $('#bdate').onclick = () => {
        A.resume(); A.hbd(0.34); fx.fireworks(3, 260); fx.balloons(6);
        showMsg(`${BORN.y} 年 ${BORN.m} 月 ${BORN.d} 日，\n宇宙收到了一份好礼：周总 🎁`);
      };
    },
  };
  let msgTimer;
  function showMsg(t) {
    const el = $('#finalMsg');
    el.textContent = t;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.textContent = finalMsg; }, 3600);
  }

  // ------------------------------------------------------------------ 贺卡
  async function makeCard() {
    A.resume(); A.sparkle(4);
    const W2 = 1080, H2 = 1440;
    const c = document.createElement('canvas'); c.width = W2; c.height = H2;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H2);
    g.addColorStop(0, '#1b1411'); g.addColorStop(1, '#070403');
    x.fillStyle = g; x.fillRect(0, 0, W2, H2);
    const gl = x.createRadialGradient(540, 760, 20, 540, 760, 760);
    gl.addColorStop(0, 'rgba(255,170,80,.45)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W2, H2);
    // bokeh
    for (let i = 0; i < 26; i++) {
      const r = 14 + Math.random() * 46, bx = Math.random() * W2, by = Math.random() * H2;
      const bg = x.createRadialGradient(bx, by, 0, bx, by, r);
      bg.addColorStop(0, 'rgba(255,205,130,.3)'); bg.addColorStop(1, 'rgba(255,205,130,0)');
      x.fillStyle = bg; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.fill();
    }
    try { await document.fonts.ready; } catch (e) {}
    const gi = $('#girl img'), bi = $('#boy img');
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 40;
    x.drawImage(gi, 50, 520, 544 * 0.78, 931 * 0.78);
    x.drawImage(bi, 640, 800, 539 * 0.62, 720 * 0.62);
    x.shadowBlur = 0;
    // 火焰
    const fx0 = 50 + 100 * 0.78, fy0 = 520 + 2;
    const fg = x.createRadialGradient(fx0, fy0 - 50, 0, fx0, fy0 - 50, 240);
    fg.addColorStop(0, 'rgba(255,190,90,.7)'); fg.addColorStop(1, 'rgba(255,150,50,0)');
    x.fillStyle = fg; x.fillRect(fx0 - 240, fy0 - 290, 480, 480);
    x.fillStyle = '#ffb347'; x.beginPath(); x.moveTo(fx0, fy0 - 120); x.bezierCurveTo(fx0 + 36, fy0 - 60, fx0 + 24, fy0 + 4, fx0, fy0 + 4); x.bezierCurveTo(fx0 - 24, fy0 + 4, fx0 - 36, fy0 - 60, fx0, fy0 - 120); x.fill();
    x.fillStyle = '#fff3c4'; x.beginPath(); x.moveTo(fx0, fy0 - 70); x.bezierCurveTo(fx0 + 14, fy0 - 40, fx0 + 10, fy0, fx0, fy0); x.bezierCurveTo(fx0 - 10, fy0, fx0 - 14, fy0 - 40, fx0, fy0 - 70); x.fill();
    // 文字
    x.textAlign = 'center';
    x.fillStyle = '#ffe2a8'; x.shadowColor = 'rgba(255,170,70,.8)'; x.shadowBlur = 24;
    x.font = '110px "Ma Shan Zheng", KaiTi, cursive';
    x.fillText('Happy Birthday', 540, 150);
    x.font = '230px "Ma Shan Zheng", KaiTi, cursive';
    x.fillStyle = '#fff'; x.fillText('周总', 540, 400);
    x.shadowBlur = 0;
    x.font = '56px "ZCOOL KuaiLe", sans-serif'; x.fillStyle = 'rgba(255,230,190,.95)';
    x.fillText(`${BORN.y} · ${BORN.m} · ${BORN.d}`, 540, 480);
    x.font = '50px "ZCOOL KuaiLe", sans-serif'; x.fillStyle = 'rgba(255,214,140,.95)';
    x.fillText('♏ 天蝎座  ·  🐯 属虎', 540, 560);
    const lines = finalMsg.split('\n');
    x.font = '64px "Ma Shan Zheng", KaiTi, cursive'; x.fillStyle = '#fff3d6';
    lines.forEach((l, i) => x.fillText(l, 540, 1300 + (i - (lines.length - 1) / 2) * 76 + 20));
    const url = c.toDataURL('image/png');
    const img = $('#cardImg');
    img.src = url; img.classList.remove('hidden');
    const b = $('#btnSave');
    b.textContent = '⬇️ 保存图片（也可长按图片）';
    b.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = '周总生日快乐.png'; a.click(); };
    $('#finalTip').textContent = '长按图片即可保存到相册 ✨';
  }

  // ------------------------------------------------------------------ 主循环
  function frame(now) {
    const dt = Math.min(0.05, (now - G.last) / 1000);
    G.last = now; G.t += dt; G.sceneT += dt;
    BD.updateTweens(dt);
    try {
      const sc = S[G.scene];
      sc && sc.update && sc.update(dt);
      syncFlames();
      ST.update(dt);
      bgDraw(dt);
      fx.update(dt);
      fx.render();
    } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }

  // 调试入口：?s=relay 直接跳场景
  // 每次打开都从头开始：不存任何本地状态；从后退缓存恢复时强制重载
  addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  function boot() {
    fit();
    fx.setDark(0.97);
    girl.a = 0; boy.a = 0;
    girl.apply(); boy.apply();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const q = local ? new URLSearchParams(location.search).get('s') : null;
    if (q && q !== 'intro') debugJump(q); else go('intro');
    requestAnimationFrame(frame);
  }
  // 仅本地调试：?s=girl|relay|protect|blow|party|catch|wish|final
  function debugJump(name) {
    ST.show(60, 200, 1); ST.hover(60, 200, 0.7);
    if (name === 'girl') return go('girl');
    const S0 = S.girl;
    S0.phase = 'play'; matchEl.style.opacity = 0; boxEl.style.opacity = 0;
    fGirl.ignite(); fGirl.power = 1; fx.setDark(0.6);
    cake.x = L.cakeX;
    if (name === 'relay') { girl.x = L.girlBigX; girl.y = 260; girl.s = 0.7; girl.a = 1; return go('relay'); }
    boy.a = 1; plank.style.opacity = 1; cakeEl.style.opacity = 1;
    girl.a = 0; fGirl.out();
    fCake.ignite(); fCake.power = 1;
    if (name === 'protect') return go('protect');
    if (name === 'blow') return go('blow');
    fCake.out();
    if (name === 'party') return go('party');
    if (name === 'catch') { girl.a = 0; return go('catch'); }
    if (name === 'wish') { girl.a = 0; return go('wish'); }
    if (name === 'final') { girl.a = 0; return go('final'); }
    go('intro');
  }
  boot();
})();
