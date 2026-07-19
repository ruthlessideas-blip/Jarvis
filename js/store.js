/* ============================================================
   store.js — global namespace, state, persistence, helpers
   ============================================================ */
window.J = window.J || {};

(function (J) {
  "use strict";

  const KEY = "jarvis.state.v1";

  const DEFAULTS = {
    name: "",
    city: "",
    accent: "#38e8ff",
    clock24: false,
    tasks: [],
    habits: [],
    links: [
      { name: "Gmail",   url: "https://mail.google.com",   color: "#ea4335" },
      { name: "Calendar",url: "https://calendar.google.com",color: "#4285f4" },
      { name: "GitHub",  url: "https://github.com",        color: "#8b98a5" },
      { name: "YouTube", url: "https://youtube.com",        color: "#ff0000" },
      { name: "Maps",    url: "https://maps.google.com",    color: "#34a853" },
      { name: "Drive",   url: "https://drive.google.com",   color: "#ffba00" },
      { name: "ChatGPT", url: "https://chat.openai.com",    color: "#10a37f" },
      { name: "Claude",  url: "https://claude.ai",          color: "#d97757" }
    ],
    notes: "",
    focus: { sessions: 0, day: "" }
  };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return Object.assign(structuredClone(DEFAULTS), parsed);
    } catch (e) {
      console.warn("Jarvis: failed to load state", e);
      return structuredClone(DEFAULTS);
    }
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.warn("Jarvis: save failed", e); }
    }, 120);
  }

  // ---- Public state API ----
  J.state = () => state;
  J.save = save;
  J.reset = function () { state = structuredClone(DEFAULTS); save(); };
  J.replaceState = function (obj) {
    state = Object.assign(structuredClone(DEFAULTS), obj || {});
    save();
  };

  // ---- Helpers ----
  J.uid = () => "x" + Math.random().toString(36).slice(2, 9) + (performance.now() | 0).toString(36);
  J.$  = (sel, root) => (root || document).querySelector(sel);
  J.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  J.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  };

  J.todayKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  let toastTimer = null;
  J.toast = function (msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  };

  J.setAccent = function (hex) {
    state.accent = hex;
    const root = document.documentElement;
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-soft", hexA(hex, 0.14));
    root.style.setProperty("--accent-line", hexA(hex, 0.38));
    save();
  };

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  J.hexA = hexA;

  // Simple pub/sub so widgets can react to each other
  const listeners = {};
  J.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  J.emit = (evt, data) => { (listeners[evt] || []).forEach(fn => fn(data)); };

})(window.J);
