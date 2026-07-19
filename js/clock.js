/* ============================================================
   clock.js — live clock, date, greeting, hero
   ============================================================ */
(function (J) {
  "use strict";

  const TIPS = [
    "Tip: press  /  to focus the command bar.",
    "Tip: press  ⌘K  (or Ctrl+K) for the command palette.",
    "Tip: click the mic and say “add task call the dentist”.",
    "Tip: type a web search in the bar and hit Enter.",
    "Tip: everything you add is saved locally on this machine.",
    "Tip: set your city in Settings for accurate weather."
  ];

  function fmtTime(d) {
    const s = J.state();
    let h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
    if (s.clock24) return String(h).padStart(2, "0") + ":" + m;
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + m + " " + ap;
  }

  function greetWord(h) {
    if (h < 5)  return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Working late";
  }

  function tick() {
    const now = new Date();
    const time = fmtTime(now);
    const compact = time.replace(/\s?[AP]M/, "");
    const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    setText("clockTime", time);
    setText("clockDate", dateStr);
    setText("reactorTime", compact);

    // greeting refresh (cheap)
    const s = J.state();
    const name = s.name ? s.name.split(" ")[0] : "";
    const g = greetWord(now.getHours()) + (name ? ", " + name : "") + ".";
    setText("greeting", g);
  }

  function setText(id, v) {
    const n = document.getElementById(id);
    if (n && n.textContent !== v) n.textContent = v;
  }

  J.refreshHeroChips = function () {
    const wrap = document.getElementById("heroChips");
    if (!wrap) return;
    const s = J.state();
    const open = s.tasks.filter(t => !t.done).length;
    const doneToday = s.tasks.filter(t => t.done).length;
    const now = new Date();
    const chips = [
      chip("🗓", now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })),
      chip("✅", `<b>${open}</b> open · ${doneToday} done`, "tasks"),
      chip("🎯", `<b>${s.focus && s.focus.day === J.todayKey() ? s.focus.sessions : 0}</b> focus sessions`)
    ];
    wrap.replaceChildren(...chips);
  };

  function chip(icon, html) {
    return J.el("span", { class: "chip", html: `<span class="k">${icon}</span> ${html}` });
  }

  J.initClock = function () {
    tick();
    setInterval(tick, 1000);
    J.refreshHeroChips();
    // rotating footer tip
    const foot = document.getElementById("footTip");
    if (foot) {
      let i = 0;
      const rot = () => { foot.textContent = TIPS[i % TIPS.length]; i++; };
      rot();
      setInterval(rot, 9000);
    }
    J.on("state:changed", J.refreshHeroChips);
  };

})(window.J);
