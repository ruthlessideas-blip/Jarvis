/* ============================================================
   settings.js — settings modal, accent, import/export/reset
   ============================================================ */
(function (J) {
  "use strict";

  const ACCENTS = ["#38e8ff", "#7c5cff", "#43e6a0", "#ff8f5c", "#ff5d9e", "#ffcf5c"];
  const overlay = () => document.getElementById("settingsOverlay");

  J.openSettings = function () {
    J.closePalette && J.closePalette();
    const s = J.state();
    document.getElementById("setName").value = s.name || "";
    document.getElementById("setCity").value = s.city || "";
    document.getElementById("setKey").value = s.apiKey || "";
    document.getElementById("setOllama").value = s.ollamaModel || "llama3.1";
    document.getElementById("set24h").checked = !!s.clock24;
    document.getElementById("setVoice").checked = !!s.voice;
    document.getElementById("setProactive").checked = !!s.proactive;
    document.getElementById("setPersona").value = s.persona || "jarvis";
    document.getElementById("setAddress").value = s.address || "sir";
    document.getElementById("setGoogleId").value = s.googleClientId || "";
    populateVoices();
    renderAccents();
    overlay().hidden = false;
  };

  function populateVoices() {
    const sel = document.getElementById("setVoiceSel");
    if (!sel || !J.getVoices) return;
    const voices = J.getVoices();
    const cur = J.state().voiceName;
    sel.innerHTML = '<option value="">Auto (best available)</option>';
    voices.forEach(v => {
      const o = J.el("option", { value: v.name, text: `${v.name} (${v.lang})` });
      if (v.name === cur) o.selected = true;
      sel.appendChild(o);
    });
  }
  J.closeSettings = function () { const o = overlay(); if (o) o.hidden = true; };

  function renderAccents() {
    const row = document.getElementById("accentRow");
    const cur = J.state().accent;
    row.replaceChildren(...ACCENTS.map(c =>
      J.el("div", { class: "accent-dot" + (c === cur ? " active" : ""), style: `background:${c}`,
        onclick: () => { J.setAccent(c); renderAccents(); } })));
  }

  J.exportData = function () {
    const blob = new Blob([JSON.stringify(J.state(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = J.el("a", { href: url, download: `jarvis-backup-${J.todayKey()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    J.toast("Backup exported");
  };

  J.initSettings = function () {
    document.getElementById("settingsBtn").addEventListener("click", J.openSettings);
    document.getElementById("closeSettings").addEventListener("click", J.closeSettings);
    overlay().addEventListener("click", (e) => { if (e.target === overlay()) J.closeSettings(); });

    const name = document.getElementById("setName");
    name.addEventListener("input", () => { J.state().name = name.value; J.save(); J.emit("state:changed"); });

    const city = document.getElementById("setCity");
    let ct = null;
    city.addEventListener("input", () => {
      J.state().city = city.value; J.save();
      clearTimeout(ct); ct = setTimeout(() => J.loadWeather(), 700);
    });

    const key = document.getElementById("setKey");
    key.addEventListener("input", () => { J.state().apiKey = key.value.trim(); J.save(); });
    const ollama = document.getElementById("setOllama");
    ollama.addEventListener("input", () => { J.state().ollamaModel = ollama.value.trim() || "llama3.1"; J.save(); });

    const c24 = document.getElementById("set24h");
    c24.addEventListener("change", () => {
      J.state().clock24 = c24.checked; J.save();
      J.repaintClocks && J.repaintClocks();
    });

    const voice = document.getElementById("setVoice");
    voice.addEventListener("change", () => { J.state().voice = voice.checked; J.save(); });
    const proactive = document.getElementById("setProactive");
    proactive.addEventListener("change", () => { J.state().proactive = proactive.checked; J.save(); });
    const vsel = document.getElementById("setVoiceSel");
    vsel.addEventListener("change", () => {
      J.state().voiceName = vsel.value; J.save();
      if (J.state().voice) J.speak && J.speak("Voice set.");
    });
    const persona = document.getElementById("setPersona");
    persona.addEventListener("change", () => { J.state().persona = persona.value; J.save(); });
    const address = document.getElementById("setAddress");
    address.addEventListener("input", () => { J.state().address = address.value.trim() || "sir"; J.save(); });

    const gid = document.getElementById("setGoogleId");
    gid.addEventListener("input", () => { J.state().googleClientId = gid.value.trim(); J.save(); });

    document.getElementById("exportData").addEventListener("click", J.exportData);
    document.getElementById("importData").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          J.replaceState(JSON.parse(reader.result));
          J.toast("Backup imported — reloading…");
          setTimeout(() => location.reload(), 700);
        } catch (err) { J.toast("Invalid backup file."); }
      };
      reader.readAsText(file);
    });

    document.getElementById("resetData").addEventListener("click", () => {
      if (confirm("Reset ALL Jarvis data on this computer? This cannot be undone.")) {
        J.reset(); J.toast("Everything reset — reloading…");
        setTimeout(() => location.reload(), 700);
      }
    });
  };

})(window.J);
