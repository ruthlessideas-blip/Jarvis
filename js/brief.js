/* ============================================================
   brief.js — reminders engine + proactive morning brief
   ============================================================ */
(function (J) {
  "use strict";

  // ---------------- Reminders ----------------
  function render() {
    const wrap = document.getElementById("reminderList");
    if (!wrap) return;
    const s = J.state();
    const active = s.reminders.slice().sort((a, b) => a.at - b.at);
    if (!active.length) {
      wrap.innerHTML = '<div class="muted tiny" style="padding:4px 2px">No reminders. Ask JARVIS to set one.</div>';
      return;
    }
    wrap.replaceChildren(...active.map(r => {
      const when = new Date(r.at);
      const soon = when.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const del = J.el("button", { class: "ag-del", text: "✕", onclick: () => remove(r.id) });
      return J.el("div", { class: "rm-row" }, [
        J.el("span", { class: "rm-when", text: soon }),
        J.el("span", { class: "rm-text", text: r.text }),
        del
      ]);
    }));
  }

  function remove(id) {
    const s = J.state();
    s.reminders = s.reminders.filter(r => r.id !== id);
    J.save(); render();
  }

  J.addReminder = function (text, at) {
    J.state().reminders.push({ id: J.uid(), text, at });
    J.save(); render();
  };

  function fire(r) {
    remove(r.id);
    J.toast("⏰ " + r.text);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("JARVIS — Reminder", { body: r.text, silent: false }); } catch (e) {}
    }
    J.speak && J.speak((J.state().persona === "jarvis" ? "A reminder, " + (J.state().address || "sir") + ": " : "Reminder: ") + r.text);
  }

  function tick() {
    const now = Date.now();
    const due = J.state().reminders.filter(r => r.at <= now);
    due.forEach(fire);
    announceUpcoming();
  }

  // Proactively announce Google Calendar events starting soon (once each).
  const announced = new Set();
  function announceUpcoming() {
    if (!J.state().proactive) return;
    const now = Date.now();
    (J.googleEvents || []).forEach(ev => {
      const start = new Date(ev.start).getTime();
      const mins = Math.round((start - now) / 60000);
      if (mins >= 0 && mins <= 10 && !announced.has(ev.id)) {
        announced.add(ev.id);
        const when = mins <= 1 ? "now" : "in " + mins + " minutes";
        J.toast("🗓 " + ev.title + " — " + when);
        if ("Notification" in window && Notification.permission === "granted") {
          try { new Notification("Upcoming: " + ev.title, { body: when }); } catch (e) {}
        }
        J.speak && J.speak((J.state().address || "sir") + ", " + ev.title + " " + (mins <= 1 ? "is starting now." : "starts in " + mins + " minutes."));
      }
    });
  }

  // ---------------- Morning brief ----------------
  J.morningBrief = function () {
    const s = J.state();
    if (!s.apiKey) { J.toast("Add your API key in Settings to enable the brief."); J.openChat && J.openChat(); return; }
    s.briefDay = J.todayKey(); J.save();
    const prompt = "Give me my morning brief for right now, spoken aloud. "
      + "Include: a greeting for the time of day, today's date, the current weather, a rundown of my open tasks and any events today, my top reminders if any, and one short motivating line to start. "
      + "Keep it warm, natural, and under 110 words. Do not use lists or markdown — just speak.";
    J.askJarvis(prompt);
  };

  J.initBrief = function () {
    render();
    J.renderReminders = render;
    tick();
    setInterval(tick, 15 * 1000);

    const btn = document.getElementById("briefBtn");
    if (btn) btn.addEventListener("click", J.morningBrief);

    // proactively offer the brief once per day (no autoplay — needs a tap)
    const s = J.state();
    if (s.apiKey && s.briefDay !== J.todayKey()) {
      setTimeout(() => J.toast("Good " + timeWord() + " — tap ☀ Brief me for your daily briefing."), 3000);
    }
  };

  function timeWord() {
    const h = new Date().getHours();
    return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  }

})(window.J);
