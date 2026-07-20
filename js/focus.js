/* ============================================================
   focus.js — Pomodoro / focus timer
   ============================================================ */
(function (J) {
  "use strict";

  const DUR = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const CIRC = 2 * Math.PI * 52; // r=52

  let mode = "focus";
  let remaining = DUR.focus;
  let running = false;
  let handle = null;

  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function draw() {
    document.getElementById("focusTime").textContent = fmt(remaining);
    const frac = remaining / DUR[mode];
    const ring = document.getElementById("ringFg");
    ring.style.strokeDasharray = CIRC;
    ring.style.strokeDashoffset = CIRC * (1 - frac);
    document.title = running ? `${fmt(remaining)} · Focus — JARVIS` : "JARVIS — Command Center";
  }

  function updateMeta() {
    const s = J.state();
    const n = (s.focus && s.focus.day === J.todayKey()) ? s.focus.sessions : 0;
    document.getElementById("focusMeta").textContent = `Sessions today: ${n}`;
  }

  function tick() {
    if (remaining > 0) { remaining--; draw(); }
    else complete();
  }

  function complete() {
    stop();
    remaining = 0; draw();
    if (mode === "focus") {
      const s = J.state();
      if (!s.focus || s.focus.day !== J.todayKey()) s.focus = { sessions: 0, day: J.todayKey() };
      s.focus.sessions++; J.save(); updateMeta(); J.emit("state:changed");
      J.toast("🎯 Focus session complete — take a break.");
    } else {
      J.toast("Break over — back to it.");
    }
    beep();
    if (J.state().proactive && J.speak) {
      J.speak(mode === "focus"
        ? "Focus session complete. Nicely done — take a short break."
        : "Break's over. Back to it.");
    }
    remaining = DUR[mode];
    setTimeout(draw, 900);
  }

  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 660; o.type = "sine";
      g.gain.setValueAtTime(0.001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.9);
      o.start(); o.stop(ac.currentTime + 0.9);
    } catch (e) { /* audio not allowed */ }
  }

  function start() {
    if (running) return;
    running = true;
    document.getElementById("focusStart").textContent = "Pause";
    handle = setInterval(tick, 1000);
  }
  function stop() {
    running = false;
    document.getElementById("focusStart").textContent = "Start";
    clearInterval(handle);
    draw();
  }
  J.focusToggle = () => (running ? stop() : start());

  function setMode(m) {
    mode = m; remaining = DUR[m]; stop(); draw();
    J.$$("#focusModes button").forEach(b => b.classList.toggle("active", b.dataset.mode === m));
  }

  J.initFocus = function () {
    J.$$("#focusModes button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
    document.getElementById("focusStart").addEventListener("click", J.focusToggle);
    document.getElementById("focusReset").addEventListener("click", () => { remaining = DUR[mode]; stop(); draw(); });
    draw(); updateMeta();
  };

  // programmatic controls (used by the AI agent)
  J.startFocus = function (m) { if (m && DUR[m]) setMode(m); if (!running) start(); };
  J.setFocusMode = setMode;

})(window.J);
