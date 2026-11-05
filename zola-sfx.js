/* Zola Think — أصوات مولّدة بـ WebAudio (من غير ملفات). لازم unlock() من ضغطة المستخدم الأول. */
(function () {
  let ctx = null, master = null, muted = false, waitTimer = null, waitStep = 0;
  try { muted = localStorage.getItem('zola-muted') === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function tone(f, t0, dur, type, vol, f2) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(t0, dur, vol, f1, f2) {
    if (!ensure()) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + t0;
    s.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f1, t); bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.value = vol; s.connect(bp); bp.connect(g); g.connect(master); s.start(t);
  }
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392, A4: 440, E4: 329.63, C4: 261.63 };

  const S = {
    pop()     { tone(660, 0, .09, 'sine', .18, 990); },
    tick()    { tone(1200, 0, .03, 'square', .05); },
    card()    { [N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * .08, .22, 'triangle', .2)); },
    whoosh()  { noise(0, .45, .35, 300, 3200); },
    warn()    { tone(880, 0, .14, 'square', .14); tone(880, .22, .14, 'square', .14); },
    last()    { tone(1000, 0, .08, 'square', .12); },
    timeup()  { tone(440, 0, .35, 'sawtooth', .22, 220); tone(330, .38, .55, 'sawtooth', .22, 140); },
    success() { [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, i * .09, .3, 'triangle', .22)); tone(N.C6, .5, .6, 'sine', .15); },
    correct() { tone(N.G5, 0, .12, 'triangle', .2); tone(N.C6, .1, .22, 'triangle', .2); },
    wrong()   { tone(220, 0, .25, 'sawtooth', .14, 150); },
    siren()   { for (let i = 0; i < 3; i++) { tone(600, i * .5, .25, 'sawtooth', .15, 900); tone(900, i * .5 + .25, .25, 'sawtooth', .15, 600); } },
    drum()    { tone(120, 0, .18, 'sine', .35, 50); },
  };
  // موسيقى انتظار هادية (أربع نغمات بتلف) — بتشتغل وقت الكارت الفردي
  const WAIT = [N.C5, N.E5, N.G5, N.E5, N.D5, N.A5, N.G5, N.E5];
  window.Sfx = {
    unlock() { ensure(); },
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m; try { localStorage.setItem('zola-muted', m ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.8;
    },
    play(n) { if (muted) return; (S[n] || S.pop)(); },
    startWait() {
      this.stopWait(); waitStep = 0;
      waitTimer = setInterval(() => { if (!muted) tone(WAIT[waitStep++ % WAIT.length] / 2, 0, .5, 'sine', .07); }, 650);
    },
    stopWait() { if (waitTimer) clearInterval(waitTimer); waitTimer = null; },
  };
})();
