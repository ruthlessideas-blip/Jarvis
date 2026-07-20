/* ============================================================
   calendar.js — mini month calendar + local events / agenda
   ============================================================ */
(function (J) {
  "use strict";

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW = ["S","M","T","W","T","F","S"];
  let view = new Date(); // month currently shown

  function render() {
    const grid = document.getElementById("calGrid");
    const label = document.getElementById("calLabel");
    if (!grid) return;
    const s = J.state();
    const y = view.getFullYear(), m = view.getMonth();
    label.textContent = MONTHS[m] + " " + y;

    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = J.todayKey();

    const cells = [];
    DOW.forEach(d => cells.push(J.el("div", { class: "cal-dow", text: d })));
    for (let i = 0; i < first; i++) cells.push(J.el("div", { class: "cal-cell empty" }));
    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const has = s.events[key] && s.events[key].length;
      const cell = J.el("div", {
        class: "cal-cell" + (key === today ? " today" : "") + (has ? " has-ev" : ""),
        text: String(d),
        onclick: () => promptEvent(key)
      });
      if (has) cell.appendChild(J.el("i", { class: "cal-dot" }));
      cells.push(cell);
    }
    grid.replaceChildren(...cells);
    renderAgenda();
  }

  function renderAgenda() {
    const wrap = document.getElementById("agenda");
    if (!wrap) return;
    const s = J.state();
    const now = new Date();
    const upcoming = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const key = J.todayKey(d);
      (s.events[key] || []).forEach(ev => upcoming.push({ key, d, ev }));
    }
    // merge in Google Calendar events (read-only)
    (J.googleEvents || []).forEach(ge => {
      const d = new Date(ge.start);
      upcoming.push({ key: J.todayKey(d), d, ev: { id: "g:" + ge.id, text: ge.title, google: true, link: ge.link } });
    });
    upcoming.sort((a, b) => a.d - b.d);
    if (!upcoming.length) {
      wrap.innerHTML = '<div class="muted tiny" style="padding:4px 2px">No upcoming events. Click a day to add one.</div>';
      return;
    }
    wrap.replaceChildren(...upcoming.slice(0, 7).map(({ key, d, ev }) => {
      const when = key === J.todayKey() ? "Today"
        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      const text = J.el("span", { class: "ag-text", text: ev.text });
      const row = J.el("div", { class: "ag-row" }, [
        J.el("span", { class: "ag-when", text: when }),
        text
      ]);
      if (ev.google) {
        row.appendChild(J.el("span", { class: "g-badge", title: "Google Calendar", text: "G" }));
        if (ev.link) { text.style.cursor = "pointer"; text.addEventListener("click", () => window.open(ev.link, "_blank")); }
      } else {
        row.appendChild(J.el("button", { class: "ag-del", text: "✕", onclick: () => removeEvent(key, ev.id) }));
      }
      return row;
    }));
  }

  function promptEvent(key) {
    const text = prompt("Event on " + key + ":");
    if (!text || !text.trim()) return;
    const s = J.state();
    (s.events[key] = s.events[key] || []).push({ id: J.uid(), text: text.trim() });
    J.save(); render();
  }
  function removeEvent(key, id) {
    const s = J.state();
    s.events[key] = (s.events[key] || []).filter(e => e.id !== id);
    if (!s.events[key].length) delete s.events[key];
    J.save(); render();
  }

  J.initCalendar = function () {
    document.getElementById("calPrev").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
    document.getElementById("calNext").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });
    document.getElementById("calToday").addEventListener("click", () => { view = new Date(); render(); });
    render();
    J.renderCalendar = render;
  };

  // programmatic add (used by the AI agent)
  J.addEvent = function (key, text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const s = J.state();
    (s.events[key] = s.events[key] || []).push({ id: J.uid(), text: text });
    J.save(); render();
    return true;
  };

})(window.J);
