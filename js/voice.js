/* ============================================================
   voice.js — text-to-speech (JARVIS talks) + wake-word listening
   ============================================================ */
(function (J) {
  "use strict";

  const synth = window.speechSynthesis || null;
  let voices = [];
  let listening = false, speaking = false, rec = null;

  function loadVoices() { if (synth) voices = synth.getVoices() || []; }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  J.getVoices = () => voices;

  function pickVoice() {
    const want = J.state().voiceName;
    if (want) { const v = voices.find(v => v.name === want); if (v) return v; }
    // prefer a British male "butler" voice, then any en-GB, then en
    return voices.find(v => /UK English Male|Daniel|Arthur|George/i.test(v.name))
        || voices.find(v => /en-GB/i.test(v.lang))
        || voices.find(v => /en/i.test(v.lang))
        || voices[0] || null;
  }

  const clean = (t) => (t || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}⬀-⯿]/gu, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ").trim();

  J.speak = function (text) {
    const s = J.state();
    if (!s.voice || !synth) return;
    const t = clean(text);
    if (!t) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = 1.03; u.pitch = 1.0; u.volume = 1;
    speaking = true;
    status("speaking", "JARVIS speaking…");
    u.onend = u.onerror = () => { speaking = false; status(listening ? "listening" : "", listening ? "Listening — say “Hey JARVIS”" : ""); };
    synth.speak(u);
  };
  J.stopSpeaking = () => { if (synth) synth.cancel(); speaking = false; };

  // ---------- Wake-word / continuous listening ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function handle(transcript) {
    if (speaking) return; // ignore our own voice
    let t = transcript.toLowerCase().trim();
    const m = t.match(/(?:hey |ok |okay )?jarvis[\s,:.]*(.*)/);
    if (!m) return;
    const cmd = (m[1] || "").trim();
    J.$("#voiceStatus") && flash();
    if (!cmd) { J.speak("Yes?"); return; }
    // route to the agent so JARVIS can both answer and act
    if (J.state().apiKey) J.askJarvis(cmd);
    else J.toast && J.toast("Heard: " + cmd + " (add an API key to enable full JARVIS)");
  }

  function flash() {
    const el = document.getElementById("voiceStatus");
    if (!el) return;
    el.classList.add("hit");
    setTimeout(() => el.classList.remove("hit"), 500);
  }

  function startRec() {
    if (!SR) return false;
    rec = new SR();
    rec.lang = "en-US"; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) handle(e.results[i][0].transcript);
      }
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { stopListening(); J.toast("Microphone blocked. Allow mic access and run over http/localhost."); } };
    rec.onend = () => { if (listening) { try { rec.start(); } catch (e) {} } };
    try { rec.start(); return true; } catch (e) { return false; }
  }

  function stopListening() {
    listening = false;
    if (rec) { try { rec.abort(); } catch (e) {} rec = null; }
    J.state().wake = false; J.save();
    paintMic(); status("", "");
  }
  function startListening() {
    if (!SR) { J.toast("Voice input needs Chrome/Edge over http or localhost."); return; }
    if (!startRec()) return;
    listening = true;
    J.state().wake = true; J.save();
    paintMic(); status("listening", "Listening — say “Hey JARVIS”");
    J.speak("Online.");
    requestNotify();
  }
  J.toggleVoiceMode = function () { listening ? stopListening() : startListening(); };

  function paintMic() {
    const b = document.getElementById("micBtn");
    if (b) { b.classList.toggle("listening", listening); b.title = listening ? "Voice mode ON — click to stop" : "Voice mode (say “Hey JARVIS”)"; }
  }

  let statusTimer = null;
  function status(cls, text) {
    const el = document.getElementById("voiceStatus");
    if (!el) return;
    clearTimeout(statusTimer);
    if (!text) { el.hidden = true; return; }
    el.className = "voice-status " + cls;
    el.querySelector(".vs-text").textContent = text;
    el.hidden = false;
  }

  function requestNotify() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }
  J.requestNotify = requestNotify;

  J.initVoice = function () {
    const mic = document.getElementById("micBtn");
    if (mic) mic.addEventListener("click", J.toggleVoiceMode);
    // restore wake mode if it was on (needs a user gesture in some browsers; safe to attempt)
    if (J.state().wake) setTimeout(() => { try { startListening(); } catch (e) {} }, 800);
  };

})(window.J);
