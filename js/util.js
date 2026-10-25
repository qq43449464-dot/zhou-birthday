(function () {
  const BD = (window.BD = {});
  BD.W = 540;
  BD.H = 960;
  BD.rand = (a, b) => a + Math.random() * (b - a);
  BD.pick = (a) => a[Math.floor(Math.random() * a.length)];
  BD.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  BD.lerp = (a, b, t) => a + (b - a) * t;
  BD.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  BD.$ = (s) => document.querySelector(s);
  BD.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  BD.ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    lin: (t) => t,
  };

  BD.tweens = [];
  BD.tween = (obj, to, ms, ease = 'out', done) => {
    const from = {};
    for (const k in to) from[k] = obj[k];
    const tw = { obj, from, to, ms, t: 0, ease: BD.ease[ease] || BD.ease.out, done };
    BD.tweens.push(tw);
    return tw;
  };
  BD.updateTweens = (dt) => {
    for (let i = BD.tweens.length - 1; i >= 0; i--) {
      const tw = BD.tweens[i];
      tw.t += dt * 1000;
      const p = Math.min(1, tw.t / tw.ms);
      const e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p >= 1) {
        BD.tweens.splice(i, 1);
        tw.done && tw.done();
      }
    }
  };
})();
