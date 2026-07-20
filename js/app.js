/* ============================================================
   app.js — boot sequence + initialize all modules
   ============================================================ */
(function (J) {
  "use strict";

  const BOOT = [
    "Initializing core systems…",
    "Loading local memory…",
    "Calibrating interface…",
    "Establishing uplinks…",
    "All systems nominal."
  ];

  function runBoot(done) {
    const lines = document.getElementById("bootLines");
    let i = 0;
    (function next() {
      if (i >= BOOT.length) {
        setTimeout(() => {
          const boot = document.getElementById("boot");
          boot.classList.add("hide");
          setTimeout(() => { boot.style.display = "none"; }, 600);
          done();
        }, 350);
        return;
      }
      const ok = i === BOOT.length - 1;
      const div = J.el("div", { class: ok ? "ok" : "", text: (ok ? "✓ " : "› ") + BOOT[i] });
      lines.appendChild(div);
      i++;
      setTimeout(next, 260);
    })();
  }

  function boot() {
    // Apply saved accent immediately so boot matches theme
    J.setAccent(J.state().accent || "#38e8ff");

    runBoot(() => {
      J.initHud();
      J.initClock();
      J.initTasks();
      J.initHabits();
      J.initLinks();
      J.initFocus();
      J.initSounds();
      J.initNotes();
      J.initWeather();
      J.initNews();
      J.initWorldClocks();
      J.initCalendar();
      J.initMarkets();
      J.initChat();
      J.initVision();
      J.initVoice();
      J.initBrief();
      J.initGoogle();
      J.initMission();
      J.initCommand();
      J.initSettings();

      const ask = document.getElementById("askBtn");
      if (ask) ask.addEventListener("click", () => J.openChat());

      // First-run welcome
      if (!J.state().name) {
        setTimeout(() => J.toast("Welcome. Open ⚙ Settings to add your name and city."), 1200);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window.J);
