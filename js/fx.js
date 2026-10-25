(function () {
  const { rand, pick, clamp } = BD;
  const TAU = Math.PI * 2;

  const fx = (BD.fx = {
    canvas: null,
    ctx: null,
    k: 1,
    dark: 0.0,
    darkTarget: 0.0,
    flames: [],
    parts: [],
    puffs: [],
    rockets: [],
    obstacles: [],
    rings: [],
    lights: [],
    t: 0,
  });

  fx.init = (canvas) => {
    fx.canvas = canvas;
    fx.ctx = canvas.getContext('2d');
    fx.resize(1);
  };
  fx.resize = (scale) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.k = Math.max(1, Math.min(2.5, dpr * scale));
    fx.canvas.width = Math.round(BD.W * fx.k);
    fx.canvas.height = Math.round(BD.H * fx.k);
  };
  fx.setDark = (v, ms = 0) => {
    if (ms <= 0) { fx.dark = fx.darkTarget = v; return; }
    BD.tween(fx, { dark: v }, ms, 'inout');
  };

  // ---------------- Flame ----------------
  class Flame {
    constructor(x, y, size = 1) {
      this.x = x; this.y = y; this.size = size;
      this.lit = false; this.power = 0; this.target = 0;
      this.lean = 0; this.leanT = 0; this.shake = 0;
      this.seed = Math.random() * 100;
      this.lightR = 300;
      this.visible = true;
      this.sparkT = 0;
    }
    ignite(speed = 1) { this.lit = true; this.target = 1; this.rate = speed; }
    out() { this.target = 0; }
    get h() { return 64 * this.size * this.power; }
    update(dt) {
      const up = this.target > this.power;
      this.power += (this.target - this.power) * Math.min(1, dt * (up ? 4 : 10));
      if (this.target === 0 && this.power < 0.03) { this.power = 0; this.lit = false; }
      this.lean += (this.leanT - this.lean) * Math.min(1, dt * 9);
      this.shake *= Math.pow(0.02, dt);
      if (this.lit && this.power > 0.4) {
        this.sparkT -= dt;
        if (this.sparkT < 0) {
          this.sparkT = rand(0.25, 0.7);
          if (this.size > 0.35) fx.emit('spark', this.x + rand(-6, 6), this.y - this.h * 0.7, { vy: rand(-50, -20), vx: rand(-12, 12) + this.lean * 40, size: rand(1, 2), life: rand(0.8, 1.6), color: '255,190,90' });
        }
      }
    }
    // 光照挖洞
    cut(ctx) {
      if (!this.lit || this.power <= 0) return;
      const R = this.lightR * this.power * (0.94 + 0.06 * Math.sin(fx.t * 11 + this.seed));
      const cx = this.x, cy = this.y - this.h * 0.45;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.35, 'rgba(0,0,0,.72)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    draw(ctx) {
      if (!this.lit || this.power <= 0.01) return;
      const t = fx.t;
      const fl = 1 + 0.07 * Math.sin(t * 13 + this.seed) + 0.05 * Math.sin(t * 7.3 + this.seed * 2) + this.shake * 0.25 * Math.sin(t * 40);
      const h = this.h * fl;
      const w = Math.max(1.5, h * 0.2);
      const dx = this.lean * h * 0.75 + Math.sin(t * 9 + this.seed) * h * 0.05 * (1 + Math.abs(this.lean) * 2.2) + this.shake * Math.sin(t * 33) * 4;
      const x = this.x, y = this.y;

      ctx.save();
      // 暖光
      ctx.globalCompositeOperation = 'lighter';
      const gr = h * 3.4;
      const rg = ctx.createRadialGradient(x + dx * 0.3, y - h * 0.4, 0, x + dx * 0.3, y - h * 0.4, gr);
      rg.addColorStop(0, 'rgba(255,170,70,' + 0.5 * this.power + ')');
      rg.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - gr, y - h * 0.4 - gr, gr * 2, gr * 2);
      ctx.restore();

      // 烛芯
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y + 6); ctx.stroke();

      const path = (sw, sh, ddx) => {
        const ww = w * sw, hh = h * sh;
        ctx.beginPath();
        ctx.moveTo(x + ddx, y - hh);
        ctx.bezierCurveTo(x + ddx * 0.5 + ww * 0.2, y - hh * 0.7, x + ww * 1.15, y - hh * 0.35, x + ww * 0.9, y - ww * 0.2);
        ctx.bezierCurveTo(x + ww * 0.6, y + ww * 0.45, x - ww * 0.6, y + ww * 0.45, x - ww * 0.9, y - ww * 0.2);
        ctx.bezierCurveTo(x - ww * 1.15, y - hh * 0.35, x + ddx * 0.5 - ww * 0.2, y - hh * 0.7, x + ddx, y - hh);
        ctx.closePath();
      };
      const lg = ctx.createLinearGradient(0, y, 0, y - h);
      lg.addColorStop(0, 'rgba(255,120,30,.95)');
      lg.addColorStop(0.55, 'rgba(255,190,70,.92)');
      lg.addColorStop(1, 'rgba(255,230,150,.0)');
      ctx.fillStyle = lg; path(1, 1, dx); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,110,.95)'; path(0.72, 0.8, dx * 0.85); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,215,.98)'; path(0.42, 0.52, dx * 0.6); ctx.fill();
      ctx.fillStyle = 'rgba(90,130,255,.55)';
      ctx.beginPath(); ctx.ellipse(x, y - w * 0.1, w * 0.55, w * 0.7, 0, 0, TAU); ctx.fill();
    }
  }
  fx.Flame = Flame;
  fx.addFlame = (x, y, size, lightR) => {
    const f = new Flame(x, y, size);
    if (lightR) f.lightR = lightR;
    fx.flames.push(f);
    return f;
  };

  // ---------------- 粒子 ----------------
  fx.emit = (type, x, y, o = {}) => {
    fx.parts.push(Object.assign({
      type, x, y, vx: 0, vy: 0, g: 0, drag: 0, life: 1, max: 1, size: 3, rot: 0, vr: 0,
      color: '255,220,150', alpha: 1, grow: 0, sway: 0, ph: rand(0, 6),
    }, o, { max: o.life || 1, life: o.life || 1 }));
    if (fx.parts.length > 1400) fx.parts.splice(0, 200);
  };
  fx.burst = (type, x, y, n, f) => { for (let i = 0; i < n; i++) fx.emit(type, x, y, f(i)); };

  const COLORS = ['#ff6b81', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f43', '#fff'];
  fx.confetti = (x, y, n = 60, spread = 1) => {
    fx.burst('conf', x, y, n, () => ({
      vx: rand(-260, 260) * spread, vy: rand(-520, -160), g: 520, drag: 0.8, life: rand(2.2, 3.8),
      size: rand(5, 10), color: pick(COLORS), vr: rand(-10, 10), rot: rand(0, TAU), sway: rand(0, 1),
    }));
  };
  fx.confettiRain = (n = 80) => {
    for (let i = 0; i < n; i++) {
      fx.emit('conf', rand(0, BD.W), rand(-300, -10), { vx: rand(-30, 30), vy: rand(60, 200), g: 40, drag: 0.4, life: rand(3, 5), size: rand(5, 10), color: pick(COLORS), vr: rand(-8, 8), rot: rand(0, TAU), sway: rand(0.4, 1.4) });
    }
  };
  fx.hearts = (x, y, n = 6) => {
    fx.burst('heart', x, y, n, () => ({ vx: rand(-50, 50), vy: rand(-140, -70), g: -10, life: rand(1, 1.8), size: rand(9, 16), color: pick(['255,120,150', '255,160,190', '255,90,120']) }));
  };
  fx.stars = (x, y, n = 8, r = 80) => {
    fx.burst('star', x, y, n, () => {
      const a = rand(0, TAU), s = rand(30, r);
      return { vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2, life: rand(0.8, 1.5), size: rand(5, 11), color: pick(['255,226,130', '255,255,255', '255,200,120']), vr: rand(-3, 3) };
    });
  };
  fx.smoke = (x, y, n = 1) => {
    fx.burst('smoke', x, y, n, () => ({ vx: rand(-8, 8), vy: rand(-70, -40), life: rand(1.8, 3), size: rand(5, 9), grow: rand(14, 26), sway: rand(10, 24), color: '230,230,235', alpha: 0.35 }));
  };
  fx.floatText = (txt, x, y, color = '#fff') => {
    fx.emit('text', x, y, { text: txt, vy: -60, life: 1, size: 28, color });
  };
  fx.wind = (y, dir = 1, n = 1) => {
    for (let i = 0; i < n; i++) {
      fx.emit('wind', dir > 0 ? -60 : BD.W + 60, y + rand(-70, 70), { vx: dir * rand(900, 1300), len: rand(80, 220), life: 1.2, size: rand(1.5, 3), alpha: rand(0.25, 0.6) });
    }
  };

  // 流星
  fx.meteor = (x, y, ang = 0.6, speed = 900) => {
    fx.emit('meteor', x, y, { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 0.9, size: 2.4, len: 170 });
  };
  fx.meteors = (n = 3) => {
    for (let i = 0; i < n; i++) setTimeout(() => fx.meteor(rand(120, BD.W + 100), rand(-60, 120), rand(2.2, 2.6), rand(700, 1000)), i * 380);
  };
  // 气球
  const BALLOON = ['#ff6b81', '#ffd166', '#4cc9f0', '#b388ff', '#7be0a8', '#ff9f43'];
  fx.balloons = (n = 8) => {
    for (let i = 0; i < n; i++) {
      setTimeout(() => fx.emit('balloon', rand(30, BD.W - 30), BD.H + 60, { vy: -rand(90, 150), life: 9, size: rand(20, 28), color: pick(BALLOON), sway: rand(0.2, 0.6) }), i * 220);
    }
  };
  // 萤火
  fx.firefly = (x, y) => {
    fx.emit('spark', x, y, { vx: rand(-14, 14), vy: -rand(14, 34), life: rand(4, 7), size: rand(1.2, 2.4), color: '255,196,110', sway: rand(0.2, 0.7), alpha: 0.75 });
  };

  // 手绘云朵气流
  fx.puff = (x, y, dir = -1, power = 0.5, reach = 0) => {
    const vx = 160 + power * 280, life = Math.max(1.3, (reach / vx) * 0.9);
    fx.puffs.push({ x, y, vx: dir * vx, vy: rand(-18, 8), s: 0.35 + power * 0.25, grow: 0.5 + power * 0.5, life, max: life, seed: rand(0, 100), rot: rand(-0.25, 0.25) });
  };

  function cloudPath(ctx, r, seed) {
    const n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + 0.06 * Math.sin(seed + i * 2.1));
      pts.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.85, a]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const ma = (p[2] + (i === n - 1 ? q[2] + TAU : q[2])) / 2;
      const cr = r * 1.22;
      ctx.quadraticCurveTo(Math.cos(ma) * cr * 1.25, Math.sin(ma) * cr * 0.85, q[0], q[1]);
    }
    ctx.closePath();
  }
  fx.cloudPath = cloudPath;

  // ---------------- 烟花 ----------------
  fx.rocket = (x, ty, color) => {
    fx.rockets.push({ x, y: BD.H + 10, ty, vy: -rand(620, 780), color: color || pick(['255,120,140', '255,210,100', '120,220,255', '180,140,255', '140,255,180']) });
    BD.audio.pop();
  };
  fx.fireworks = (n = 5, gap = 380) => {
    for (let i = 0; i < n; i++) setTimeout(() => fx.rocket(rand(80, 460), rand(160, 420)), i * gap);
  };
  function explode(r) {
    BD.audio.boom();
    const n = 70;
    const kind = Math.random();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const s = kind < 0.5 ? rand(150, 260) : (i % 2 ? 260 : 150);
      fx.emit('spark', r.x, r.y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 160, drag: 1.6, life: rand(1, 1.7), size: rand(1.5, 3), color: r.color, trail: true });
    }
    fx.emit('ring', r.x, r.y, { life: 0.5, size: 10, grow: 160, color: r.color });
  }

  // ---------------- 主渲染 ----------------
  fx.update = (dt) => {
    fx.t += dt;
    fx.flames.forEach((f) => f.update(dt));

    for (let i = fx.rockets.length - 1; i >= 0; i--) {
      const r = fx.rockets[i];
      r.y += r.vy * dt;
      fx.emit('spark', r.x, r.y, { vx: rand(-10, 10), vy: rand(20, 60), life: 0.5, size: 1.4, color: '255,230,170' });
      if (r.y <= r.ty) { explode(r); fx.rockets.splice(i, 1); }
    }

    for (let i = fx.parts.length - 1; i >= 0; i--) {
      const p = fx.parts[i];
      p.life -= dt;
      if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; if (p.type !== 'conf' && p.type !== 'candy') p.vy *= d; else p.vy *= Math.exp(-p.drag * 0.2 * dt); }
      p.x += (p.vx + (p.sway ? Math.sin(fx.t * 3 + p.ph) * 40 * p.sway : 0)) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
    }

    for (let i = fx.puffs.length - 1; i >= 0; i--) {
      const p = fx.puffs[i];
      p.life -= dt;
      if (p.life <= 0) { fx.puffs.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-1.1 * dt);
      p.s += p.grow * dt * 0.9;
    }
  };

  fx.render = () => {
    const ctx = fx.ctx;
    ctx.setTransform(fx.k, 0, 0, fx.k, 0, 0);
    ctx.clearRect(0, 0, BD.W, BD.H);

    // 黑暗 + 烛光挖洞
    if (fx.dark > 0.003) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(7,4,3,' + fx.dark + ')';
      ctx.fillRect(0, 0, BD.W, BD.H);
      ctx.globalCompositeOperation = 'destination-out';
      fx.flames.forEach((f) => f.cut(ctx));
      fx.lights.forEach((l) => {
        if (l.a <= 0.01) return;
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, 'rgba(0,0,0,' + l.a + ')');
        g.addColorStop(0.4, 'rgba(0,0,0,' + l.a * 0.6 + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    // 障碍云
    fx.obstacles.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.strokeStyle = o.hit ? 'rgba(255,120,120,.95)' : 'rgba(255,255,255,.9)';
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      cloudPath(ctx, o.r, o.seed + Math.sin(fx.t * 2 + o.seed) * 0.3);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.arc(-o.r * 0.3, -o.r * 0.05, 3, 0, TAU); ctx.arc(o.r * 0.25, -o.r * 0.05, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, o.r * 0.18, o.r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.4; ctx.stroke();
      ctx.restore();
    });

    fx.flames.forEach((f) => f.draw(ctx));
    if (fx.hooks) fx.hooks.forEach((h) => h(ctx));

    // 吹气云
    fx.puffs.forEach((p) => {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,255,255,.7)';
      ctx.shadowBlur = 8;
      const r = 28 * p.s;
      cloudPath(ctx, r, p.seed);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 粒子
    for (const p of fx.parts) {
      const a = clamp(p.life / p.max, 0, 1) * p.alpha;
      switch (p.type) {
        case 'spark': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(' + p.color + ',' + a + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.6), 0, TAU); ctx.fill();
          if (p.trail) { ctx.fillStyle = 'rgba(' + p.color + ',' + a * 0.3 + ')'; ctx.beginPath(); ctx.arc(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.size * 1.2, 0, TAU); ctx.fill(); }
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'star': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          const s = p.size * (0.5 + 0.5 * Math.abs(Math.sin(fx.t * 8 + p.ph)));
          ctx.fillStyle = 'rgba(' + p.color + ',' + a + ')';
          ctx.shadowColor = 'rgba(' + p.color + ',.9)'; ctx.shadowBlur = 8;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? s * 0.28 : s; const aa = (i / 8) * TAU; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;
        }
        case 'heart': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = 'rgba(' + p.color + ',' + a + ')';
          const s = p.size / 10;
          ctx.scale(s, s); ctx.beginPath();
          ctx.moveTo(0, 4); ctx.bezierCurveTo(-12, -4, -6, -14, 0, -7); ctx.bezierCurveTo(6, -14, 12, -4, 0, 4); ctx.fill(); ctx.restore();
          break;
        }
        case 'conf': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4 * Math.abs(Math.cos(fx.t * 6 + p.ph)) - 1, p.size, p.size / 2 * Math.abs(Math.cos(fx.t * 6 + p.ph)) + 2);
          ctx.restore();
          break;
        }
        case 'smoke': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, 'rgba(' + p.color + ',' + a * 0.6 + ')');
          g.addColorStop(1, 'rgba(' + p.color + ',0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
          break;
        }
        case 'candy': {
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.28, 0, TAU); ctx.fill();
          ctx.restore();
          break;
        }
        case 'ring': {
          ctx.strokeStyle = 'rgba(' + p.color + ',' + a * 0.6 + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke();
          break;
        }
        case 'wind': {
          ctx.strokeStyle = 'rgba(255,255,255,' + a * p.alpha + ')'; ctx.lineWidth = p.size; ctx.lineCap = 'round';
          const dir = Math.sign(p.vx);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dir * p.len, p.y); ctx.stroke();
          break;
        }
        case 'meteor': {
          const sp = Math.hypot(p.vx, p.vy), ux = p.vx / sp, uy = p.vy / sp;
          const g = ctx.createLinearGradient(p.x, p.y, p.x - ux * p.len, p.y - uy * p.len);
          g.addColorStop(0, 'rgba(255,240,200,' + a + ')');
          g.addColorStop(1, 'rgba(255,190,110,0)');
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = g; ctx.lineWidth = p.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - ux * p.len, p.y - uy * p.len); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'balloon': {
          const r = p.size;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(fx.t * 1.5 + p.ph) * 0.12);
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, r * 1.25); ctx.quadraticCurveTo(8, r * 2.2, -4, r * 3.2); ctx.stroke();
          const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.3);
          bg.addColorStop(0, '#fff'); bg.addColorStop(0.25, p.color); bg.addColorStop(1, p.color);
          ctx.fillStyle = bg; ctx.globalAlpha = 0.92;
          ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.22, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, r * 1.2); ctx.lineTo(-4, r * 1.45); ctx.lineTo(4, r * 1.45); ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }
        case 'text': {
          ctx.save(); ctx.globalAlpha = a; ctx.font = '900 ' + p.size + 'px ZCOOL KuaiLe, sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = p.color; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fillText(p.text, p.x, p.y); ctx.restore();
          break;
        }
        case 'drop': {
          ctx.fillStyle = 'rgba(150,210,255,' + a + ')';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, 0, 0, TAU); ctx.fill();
          break;
        }
      }
    }
    // 圆环/护盾等自定义
    fx.rings.forEach((r) => {
      ctx.strokeStyle = r.color; ctx.lineWidth = r.w || 3;
      ctx.globalAlpha = r.a == null ? 1 : r.a;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    });
  };
})();
