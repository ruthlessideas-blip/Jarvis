/* ============================================================
   hud.js — voice-reactive arc-reactor HUD (canvas visualizer)
   Reads J.voiceState: "idle" | "listening" | "speaking".
   ============================================================ */
(function (J) {
  "use strict";

  J.voiceState = J.voiceState || "idle";
  let canvas, ctx, dpr = 1, size = 240, level = 0.16, raf = null;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function accent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return v || "#38e8ff";
  }
  function hexRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    const t = now / 1000;
    const state = J.voiceState;
    const target = state === "speaking" ? 0.85 : state === "listening" ? 0.42 : 0.16;
    const jitter = state === "speaking" ? Math.random() * 0.45
                 : state === "listening" ? Math.random() * 0.18 : Math.random() * 0.04;
    level += ((target + jitter) - level) * 0.18;

    const c = ctx, cx = size / 2, cy = size / 2, R = size / 2 - 6;
    const [r, g, b] = hexRgb(accent());
    const rgba = (a) => `rgba(${r},${g},${b},${a})`;
    c.clearRect(0, 0, size, size);

    // --- outer HUD tick ring (rotating) ---
    const ticks = 72;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2 + t * 0.15;
      const lit = i % 6 === 0;
      const amp = lit ? 10 : 5 + level * 8 * (0.5 + 0.5 * Math.sin(i * 0.7 + t * 3));
      const r0 = R - amp, r1 = R;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.strokeStyle = rgba(lit ? 0.6 : 0.18 + level * 0.4);
      c.lineWidth = lit ? 2 : 1;
      c.stroke();
    }

    // --- rotating arc segments (counter) ---
    c.lineWidth = 2;
    c.strokeStyle = rgba(0.5);
    for (let k = 0; k < 3; k++) {
      const base = -t * 0.5 + k * (Math.PI * 2 / 3);
      c.beginPath();
      c.arc(cx, cy, R - 20, base, base + 0.6);
      c.stroke();
    }

    // --- reactive circular waveform ---
    const rings = [{ rad: R * 0.72, amp: 0.14, freq: 6, sp: 2.2 },
                   { rad: R * 0.58, amp: 0.10, freq: 9, sp: -3.1 }];
    rings.forEach((ring, idx) => {
      c.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wob = Math.sin(a * ring.freq + t * ring.sp) * ring.amp * level
                  + Math.sin(a * (ring.freq + 3) - t * 1.7) * ring.amp * 0.4 * level;
        const rad = ring.rad * (1 + wob);
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.closePath();
      c.strokeStyle = rgba(idx === 0 ? 0.55 + level * 0.35 : 0.3);
      c.lineWidth = idx === 0 ? 2 : 1;
      c.shadowColor = rgba(0.8); c.shadowBlur = 8 + level * 14;
      c.stroke();
      c.shadowBlur = 0;
    });

    if (!reduce) raf = requestAnimationFrame(draw);
  }

  J.initHud = function () {
    canvas = document.getElementById("hudCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    if (reduce) { draw(0); return; }
    raf = requestAnimationFrame(draw);
  };

})(window.J);
