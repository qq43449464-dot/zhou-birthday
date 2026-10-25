(function () {
  const A = (BD.audio = { ctx: null, master: null, muted: false, noise: null, blowSrc: null });

  A.init = () => {
    if (A.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    A.ctx = new C();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.8;
    const comp = A.ctx.createDynamicsCompressor();
    A.master.connect(comp);
    comp.connect(A.ctx.destination);
    const len = A.ctx.sampleRate * 2;
    const b = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = b;
  };
  A.resume = () => {
    A.init();
    if (A.ctx && A.ctx.state !== 'running') A.ctx.resume();
  };
  A.setMuted = (m) => {
    A.muted = m;
    if (A.master) A.master.gain.value = m ? 0 : 0.8;
  };

  function tone(freq, t0, dur, o = {}) {
    if (!A.ctx) return;
    const { type = 'sine', gain = 0.2, attack = 0.005, slide = 0, dest = A.master } = o;
    const osc = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(t0, dur, o = {}) {
    if (!A.ctx) return;
    const { f = 1000, fEnd = null, q = 1, gain = 0.2, type = 'bandpass', attack = 0.01 } = o;
    const src = A.ctx.createBufferSource();
    src.buffer = A.noise;
    src.loop = true;
    const flt = A.ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t0);
    if (fEnd) flt.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur);
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(A.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  const now = () => (A.ctx ? A.ctx.currentTime : 0);
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];

  A.strike = () => {
    const t = now();
    noiseBurst(t, 0.28, { f: 3500, fEnd: 1200, q: 0.8, gain: 0.35, type: 'highpass' });
    for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2500, t + Math.random() * 0.2, 0.04, { type: 'square', gain: 0.03 });
  };
  A.ignite = () => {
    const t = now();
    noiseBurst(t, 0.5, { f: 400, fEnd: 2200, q: 0.9, gain: 0.25 });
    [0, 2, 4, 5].forEach((n, i) => tone(PENTA[n] * 2, t + 0.08 * i + 0.1, 0.9, { gain: 0.08, type: 'triangle' }));
  };
  A.sparkle = (n = 4) => {
    const t = now();
    for (let i = 0; i < n; i++) tone(PENTA[Math.floor(Math.random() * 8)] * 2, t + i * 0.06, 0.5, { gain: 0.06, type: 'triangle' });
  };
  A.pop = () => {
    const t = now();
    tone(700, t, 0.12, { type: 'sine', gain: 0.3, slide: 0.3 });
    noiseBurst(t, 0.06, { f: 2500, q: 0.7, gain: 0.12 });
  };
  A.ding = (i = 0) => {
    const t = now();
    const f = PENTA[i % PENTA.length];
    tone(f, t, 0.9, { gain: 0.2, type: 'sine' });
    tone(f * 2.01, t, 0.5, { gain: 0.06, type: 'sine' });
  };
  A.catch = () => {
    const t = now();
    tone(880, t, 0.1, { type: 'triangle', gain: 0.18 });
    tone(1320, t + 0.06, 0.18, { type: 'triangle', gain: 0.18 });
  };
  A.hit = () => {
    const t = now();
    tone(220, t, 0.3, { type: 'sawtooth', gain: 0.12, slide: 0.4 });
  };
  A.boing = () => {
    const t = now();
    tone(300, t, 0.35, { type: 'sine', gain: 0.25, slide: 2.2 });
  };
  A.gust = (dur = 1.6) => {
    const t = now();
    noiseBurst(t, dur, { f: 300, fEnd: 1400, q: 1.2, gain: 0.35, attack: 0.5 });
  };
  A.warn = () => {
    const t = now();
    tone(660, t, 0.12, { type: 'square', gain: 0.07 });
    tone(660, t + 0.18, 0.12, { type: 'square', gain: 0.07 });
  };
  A.boom = () => {
    const t = now();
    tone(110, t, 0.5, { type: 'sine', gain: 0.4, slide: 0.3 });
    noiseBurst(t, 0.5, { f: 900, fEnd: 120, q: 0.5, gain: 0.3, type: 'lowpass' });
  };
  A.crackle = () => {
    const t = now();
    for (let i = 0; i < 14; i++) noiseBurst(t + Math.random() * 0.7, 0.03, { f: 3000 + Math.random() * 3000, q: 1, gain: 0.08, type: 'highpass' });
  };
  A.cry = () => {
    const t = now();
    for (let i = 0; i < 3; i++) tone(520, t + i * 0.28, 0.26, { type: 'sine', gain: 0.18, slide: 0.55 });
  };
  A.puffOnce = (lvl = 0.5) => {
    const t = now();
    noiseBurst(t, 0.28, { f: 700, fEnd: 300, q: 0.7, gain: 0.12 + lvl * 0.18, type: 'lowpass' });
  };
  A.blowOut = () => {
    const t = now();
    noiseBurst(t, 0.4, { f: 1500, fEnd: 200, q: 0.5, gain: 0.4, type: 'lowpass' });
    tone(180, t, 0.25, { gain: 0.15, slide: 0.5 });
  };

  A.whoosh = () => {
    const t = now();
    noiseBurst(t, 0.9, { f: 500, fEnd: 4200, q: 2.2, gain: 0.16, attack: 0.25 });
    [0, 2, 4, 6].forEach((n, i) => tone(PENTA[n] * 2, t + i * 0.09, 0.7, { gain: 0.05, type: 'sine' }));
  };
  A.roar = () => {
    const t = now();
    tone(90, t, 1.1, { type: 'sawtooth', gain: 0.28, slide: 0.55, attack: 0.08 });
    tone(135, t, 1.0, { type: 'square', gain: 0.1, slide: 0.5, attack: 0.08 });
    noiseBurst(t, 1.1, { f: 500, fEnd: 120, q: 0.6, gain: 0.35, type: 'lowpass', attack: 0.08 });
  };
  A.sting = () => {
    const t = now();
    tone(1568, t, 0.5, { gain: 0.12, type: 'triangle', slide: 0.5 });
    tone(2093, t + 0.05, 0.4, { gain: 0.08, type: 'sine' });
  };
  A.blowStart = () => {
    if (!A.ctx || A.blowSrc) return;
    const src = A.ctx.createBufferSource();
    src.buffer = A.noise;
    src.loop = true;
    const f = A.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const g = A.ctx.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(A.master);
    src.start();
    A.blowSrc = { src, g };
  };
  A.blowLevel = (v) => {
    if (A.blowSrc) A.blowSrc.g.gain.setTargetAtTime(v * 0.3, A.ctx.currentTime, 0.05);
  };
  A.blowStop = () => {
    if (!A.blowSrc) return;
    const s = A.blowSrc;
    A.blowSrc = null;
    s.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05);
    setTimeout(() => { try { s.src.stop(); } catch (e) {} }, 300);
  };

  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const HBD = [
    ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
    ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
    ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
    ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2],
  ];
  A.hbd = (beat = 0.42) => {
    if (!A.ctx) return 0;
    let t = now() + 0.1;
    HBD.forEach(([n, b]) => {
      const f = N[n];
      tone(f, t, b * beat * 1.8, { type: 'triangle', gain: 0.17 });
      tone(f * 2, t, b * beat * 1.2, { type: 'sine', gain: 0.07 });
      t += b * beat;
    });
    return t - now();
  };

  // 麦克风吹气检测：前 700ms 取环境噪声作基线，之后用 RMS 超出基线的部分换算成 0~1
  const mic = (BD.mic = { on: false, level: 0, ok: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext) });
  mic.start = async () => {
    if (mic.on) return true;
    if (!mic.ok()) return false;
    try {
      A.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = A.ctx.createMediaStreamSource(stream);
      const an = A.ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      const t0 = performance.now();
      let base = 0, n = 0;
      mic.stream = stream;
      mic.on = true;
      const loop = () => {
        if (!mic.on) return;
        an.getFloatTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        const rms = Math.sqrt(s / buf.length);
        if (performance.now() - t0 < 700) { base = (base * n + rms) / (n + 1); n++; mic.level = 0; }
        else mic.level = Math.max(0, Math.min(1, (rms - base - 0.02) * 9));
        requestAnimationFrame(loop);
      };
      loop();
      return true;
    } catch (e) {
      return false;
    }
  };
  mic.stop = () => {
    mic.on = false; mic.level = 0;
    if (mic.stream) mic.stream.getTracks().forEach((t) => t.stop());
    mic.stream = null;
  };
})();
