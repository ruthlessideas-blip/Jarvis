/* ============================================================
   habits.js — weekly habit tracker with streaks
   ============================================================ */
(function (J) {
  "use strict";

  const DAY = ["S", "M", "T", "W", "T", "F", "S"];

  // returns array of last 7 date keys ending today (oldest first)
  function last7() {
    const out = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push({ key: J.todayKey(d), dow: d.getDay() });
    }
    return out;
  }

  function streak(h) {
    let n = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (h.days && h.days[J.todayKey(d)]) n++;
      else if (i === 0) continue; // today not done yet doesn't break streak
      else break;
    }
    return n;
  }

  function render() {
    const wrap = document.getElementById("habitList");
    if (!wrap) return;
    const s = J.state();
    if (!s.habits.length) {
      wrap.innerHTML = '<div class="muted tiny" style="padding:6px 2px">No habits yet. Add one to build a streak.</div>';
      return;
    }
    const week = last7();
    const today = J.todayKey();
    wrap.replaceChildren(...s.habits.map(h => {
      const st = streak(h);
      const boxes = week.map(w => {
        const on = h.days && h.days[w.key];
        const b = J.el("div", {
          class: "hbox" + (on ? " on" : "") + (w.key === today ? " today" : ""),
          text: DAY[w.dow], title: w.key,
          onclick: () => { h.days = h.days || {}; h.days[w.key] = !h.days[w.key]; J.save(); render(); }
        });
        return b;
      });
      const name = J.el("div", { class: "habit-name",
        html: `${h.name} ${st > 1 ? `<span class="streak">🔥 ${st}</span>` : ""}` });
      const del = J.el("button", { class: "habit-del", text: "✕",
        onclick: () => { const s2 = J.state(); s2.habits = s2.habits.filter(x => x.id !== h.id); J.save(); render(); } });
      const left = J.el("div", { class: "habit-name" }, [name]);
      return J.el("div", { class: "habit" }, [
        J.el("div", { style: "display:flex;align-items:center;gap:8px" }, [name, del]),
        J.el("div", { class: "habit-week" }, boxes)
      ]);
    }));
  }

  J.addHabit = function (nm) {
    nm = (nm || "").trim();
    if (!nm) return false;
    J.state().habits.push({ id: J.uid(), name: nm, days: {} });
    J.save(); render();
    return true;
  };

  J.initHabits = function () {
    document.getElementById("addHabitBtn").addEventListener("click", () => {
      const nm = prompt("New habit (e.g. Read 20 min, Workout, Water):");
      if (nm) J.addHabit(nm);
    });
    render();
    J.renderHabits = render;
  };

})(window.J);
