/* ============================================================
   command.js — omnibar, command palette, voice, hotkeys
   ============================================================ */
(function (J) {
  "use strict";

  // ---- Command registry ----
  function commands() {
    return [
      { icon: "🤖", label: "Ask JARVIS (AI chat)", hint: "j", run: () => { closePalette(); J.openChat(); } },
      { icon: "✅", label: "Add task…", hint: "t", run: () => quickPrompt("New task:", v => J.addTask(v) && J.toast("Task added")) },
      { icon: "📅", label: "Add calendar event…", run: () => { closePalette(); document.querySelector('#calGrid .cal-cell.today')?.click(); } },
      { icon: "📈", label: "Add crypto ticker…", run: () => { closePalette(); J.addCoin(); } },
      { icon: "📝", label: "New habit…", run: () => quickPrompt("New habit:", v => J.addHabit(v)) },
      { icon: "🔗", label: "Add shortcut…", run: () => document.getElementById("addLinkBtn").click() },
      { icon: "🎯", label: "Start focus timer", hint: "f", run: () => { closePalette(); J.focusToggle(); } },
      { icon: "🌦️", label: "Refresh weather", run: () => J.loadWeather() },
      { icon: "⚙️", label: "Open settings", run: () => J.openSettings() },
      { icon: "🎙️", label: "Voice command", run: () => { closePalette(); J.startVoice(); } },
      { icon: "🔍", label: "Search Google", run: () => quickPrompt("Search Google:", q => open("https://google.com/search?q=" + encodeURIComponent(q), "_blank")) },
      { icon: "📺", label: "Search YouTube", run: () => quickPrompt("Search YouTube:", q => open("https://youtube.com/results?search_query=" + encodeURIComponent(q), "_blank")) },
      { icon: "🌗", label: "Toggle 24-hour clock", run: () => { const s = J.state(); s.clock24 = !s.clock24; J.save(); J.repaintClocks && J.repaintClocks(); J.toast("Clock: " + (s.clock24 ? "24h" : "12h")); } },
      { icon: "💾", label: "Export backup", run: () => J.exportData && J.exportData() },
      { icon: "🌐", label: "Open Gmail", run: () => open("https://mail.google.com", "_blank") },
      { icon: "📅", label: "Open Calendar", run: () => open("https://calendar.google.com", "_blank") }
    ];
  }

  function quickPrompt(msg, cb) {
    closePalette();
    const v = prompt(msg);
    if (v && v.trim()) cb(v.trim());
  }

  // ---- Omnibar: interpret free text ----
  function handleOmni(raw) {
    const text = raw.trim();
    if (!text) return;
    const low = text.toLowerCase();

    // "add task X" / "task X" / "todo X"
    let m = low.match(/^(?:add |new )?(?:task|todo|to-do|remind me to)\s+(.*)/);
    if (m && m[1]) { J.addTask(m[1]); J.toast("Task added: " + m[1]); return; }

    m = low.match(/^(?:add |new )?habit\s+(.*)/);
    if (m && m[1]) { J.addHabit(m[1]); J.toast("Habit added"); return; }

    if (/^(start |begin )?(focus|pomodoro|timer)$/.test(low)) { J.focusToggle(); return; }
    if (/^(weather|forecast)$/.test(low)) { J.loadWeather(); J.toast("Refreshing weather…"); return; }
    if (/^(settings|preferences|config)$/.test(low)) { J.openSettings(); return; }

    // "ask jarvis X" / "jarvis X" / "hey jarvis X"
    m = low.match(/^(?:hey )?jarvis[,:]?\s*(.*)/) || (/^ask jarvis\s+(.*)/.exec(low));
    if (m && m[1]) { J.askJarvis(m[1]); return; }

    // "search X" / "google X"
    m = low.match(/^(?:search|google|find)\s+(.*)/);
    if (m && m[1]) { open("https://google.com/search?q=" + encodeURIComponent(m[1]), "_blank"); return; }

    // Looks like a URL/domain -> open it
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text) || /^https?:\/\//i.test(text)) {
      open(/^https?:/i.test(text) ? text : "https://" + text, "_blank"); return;
    }

    // A natural-language question, or any free text when the AI is configured -> ask JARVIS
    const looksLikeQuestion = /\?$/.test(text) || /^(who|what|when|where|why|how|which|can|could|should|would|is|are|do|does|explain|write|draft|summar|help|give)\b/i.test(text);
    if (J.state().apiKey && (looksLikeQuestion || text.split(/\s+/).length >= 4)) { J.askJarvis(text); return; }

    // Fallback -> web search
    open("https://google.com/search?q=" + encodeURIComponent(text), "_blank");
  }

  // ---- Palette UI ----
  const overlay = () => document.getElementById("paletteOverlay");
  let filtered = [], active = 0;

  function openPalette() {
    overlay().hidden = false;
    const input = document.getElementById("paletteInput");
    input.value = ""; input.focus();
    renderPalette("");
  }
  function closePalette() { overlay().hidden = true; }

  function renderPalette(q) {
    q = q.toLowerCase();
    filtered = commands().filter(c => c.label.toLowerCase().includes(q));
    active = 0;
    const list = document.getElementById("paletteList");
    list.replaceChildren(...filtered.map((c, i) =>
      J.el("li", { class: "palette-item" + (i === 0 ? " active" : ""),
        onclick: () => c.run() }, [
        J.el("span", { class: "pi-ico", text: c.icon }),
        J.el("span", { text: c.label }),
        c.hint ? J.el("kbd", { class: "pi-hint", text: c.hint }) : null
      ])));
  }
  function move(dir) {
    const items = J.$$("#paletteList .palette-item");
    if (!items.length) return;
    items[active].classList.remove("active");
    active = (active + dir + items.length) % items.length;
    items[active].classList.add("active");
    items[active].scrollIntoView({ block: "nearest" });
  }

  // ---- Voice (Web Speech API) ----
  J.startVoice = function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById("micBtn");
    if (!SR) { J.toast("Voice needs Chrome/Edge over http (see README)."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    btn.classList.add("listening");
    J.toast("🎙️ Listening…");
    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      J.toast("Heard: " + said);
      handleOmni(said);
    };
    rec.onerror = () => J.toast("Didn't catch that.");
    rec.onend = () => btn.classList.remove("listening");
    try { rec.start(); } catch (e) { btn.classList.remove("listening"); }
  };

  // ---- Init / hotkeys ----
  J.initCommand = function () {
    const omni = document.getElementById("omni");
    omni.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { handleOmni(omni.value); omni.value = ""; }
    });

    document.getElementById("micBtn").addEventListener("click", J.startVoice);

    const pInput = document.getElementById("paletteInput");
    pInput.addEventListener("input", () => renderPalette(pInput.value));
    pInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) filtered[active].run(); }
      else if (e.key === "Escape") closePalette();
    });
    overlay().addEventListener("click", (e) => { if (e.target === overlay()) closePalette(); });

    document.addEventListener("keydown", (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
      if (e.key === "Escape") { closePalette(); J.closeSettings && J.closeSettings(); J.closeChat && J.closeChat(); }
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); omni.focus(); }
      if (e.key === "t") { e.preventDefault(); document.getElementById("taskInput").focus(); }
      if (e.key === "f") { e.preventDefault(); J.focusToggle(); }
      if (e.key === "j") { e.preventDefault(); J.openChat(); }
    });

    J.openPalette = openPalette;
    J.closePalette = closePalette;
  };

})(window.J);
