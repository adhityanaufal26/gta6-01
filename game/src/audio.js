// audio.js — procedural WebAudio: engine hum, sirens, gunshots, chimes. No audio files.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      // Engine hum: low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      // Siren: triangle sweeping between two tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch (e) { return false; }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    setEngine(speed, maxSpeed) {
      if (!ensure()) return;
      const k = Math.min(1, Math.abs(speed) / (maxSpeed || 500));
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.05 + k * 0.06, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + k * 140, ctx.currentTime, 0.1);
    },
    sirenStart() { if (!ensure()) return; sirenOn = true; sirenGain.gain.setTargetAtTime(muted ? 0 : 0.05, ctx.currentTime, 0.2); },
    sirenStop() { if (!ctx) return; sirenOn = false; sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); },
    sirenTick(t) {
      if (!ctx || !sirenOn) return;
      sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t / 350) * 250, ctx.currentTime, 0.05);
    },
    sirenBlip() { blip(880, 0.18, 'square', 0.12, 660); },
    gunshot() { noise(0.16, 0.5, 1800); blip(160, 0.1, 'square', 0.2, 60); },
    punch() { noise(0.08, 0.25, 700); },
    hit() { blip(220, 0.12, 'square', 0.2, 110); },
    hurt() { blip(180, 0.3, 'sawtooth', 0.25, 70); },
    crash() { noise(0.25, 0.4, 900); },
    chime() { blip(880, 0.12, 'sine', 0.2); setTimeout(() => blip(1320, 0.18, 'sine', 0.2), 90); },
    door() { noise(0.1, 0.2, 500); blip(300, 0.08, 'square', 0.1, 200); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.22), i * 110)); },
    gameOver() { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'sawtooth', 0.2), i * 180)); },
  };
}
