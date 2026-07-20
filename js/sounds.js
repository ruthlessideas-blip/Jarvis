/* ============================================================
   sounds.js — ambient focus soundscapes (offline, Web Audio)
   ============================================================ */
(function (J) {
  "use strict";

  let ctx = null, master = null, current = null, currentName = null, volume = 0.5;

  const SOUNDS = [
    { id: "rain",  label: "Rain",       icon: "🌧️" },
    { id: "waves", label: "Waves",      icon: "🌊" },
    { id: "brown", label: "Brown",      icon: "🟤" },
    { id: "white", label: "White",      icon: "⚪" },
    { id: "wind",  label: "Wind",       icon: "🍃" }
  ];

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function noiseBuffer(a) {
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Brown noise via integration of white noise
  function brownBuffer(a) {
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  function makeNoise(a, buf) {
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  function build(id) {
    const a = ac();
    const out = a.createGain(); out.gain.value = 0; out.connect(master);
    const nodes = [];

    if (id === "white") {
      const s = makeNoise(a, noiseBuffer(a)); s.connect(out); s.start(); nodes.push(s);
    } else if (id === "brown") {
      const s = makeNoise(a, brownBuffer(a)); s.connect(out); s.start(); nodes.push(s);
    } else if (id === "rain") {
      const s = makeNoise(a, noiseBuffer(a));
      const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 8000;
      s.connect(hp); hp.connect(lp); lp.connect(out); s.start(); nodes.push(s);
    } else if (id === "waves") {
      const s = makeNoise(a, brownBuffer(a));
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
      const g = a.createGain(); g.gain.value = 0.5;
      // slow LFO swell
      const lfo = a.createOscillator(); lfo.frequency.value = 0.12;
      const lfoGain = a.createGain(); lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      s.connect(lp); lp.connect(g); g.connect(out); s.start(); lfo.start();
      nodes.push(s, lfo);
    } else if (id === "wind") {
      const s = makeNoise(a, noiseBuffer(a));
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.7;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.2;
      const lfoGain = a.createGain(); lfoGain.gain.value = 300;
      lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
      s.connect(bp); bp.connect(out); s.start(); lfo.start();
      nodes.push(s, lfo);
    }
    // fade in
    out.gain.linearRampToValueAtTime(1, a.currentTime + 0.6);
    return { out, nodes };
  }

  function stop() {
    if (!current) return;
    const a = ac();
    current.out.gain.cancelScheduledValues(a.currentTime);
    current.out.gain.setValueAtTime(current.out.gain.value, a.currentTime);
    current.out.gain.linearRampToValueAtTime(0, a.currentTime + 0.4);
    const nodes = current.nodes;
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 500);
    current = null; currentName = null;
    paintActive();
  }

  function play(id) {
    if (currentName === id) { stop(); return; }
    stop();
    ac().resume && ac().resume();
    current = build(id); currentName = id;
    paintActive();
  }

  function paintActive() {
    J.$$("#soundGrid .snd").forEach(b => b.classList.toggle("active", b.dataset.id === currentName));
  }

  function render() {
    const grid = document.getElementById("soundGrid");
    if (!grid) return;
    grid.replaceChildren(...SOUNDS.map(s =>
      J.el("button", { class: "snd", "data-id": s.id, title: s.label,
        html: `<span class="snd-ico">${s.icon}</span><span class="snd-lbl">${s.label}</span>`,
        onclick: () => play(s.id) })));
  }

  J.initSounds = function () {
    render();
    const vol = document.getElementById("soundVol");
    vol.value = volume * 100;
    vol.addEventListener("input", () => {
      volume = vol.value / 100;
      if (master) master.gain.value = volume;
    });
  };

})(window.J);
