/* ============================================================
   tasks.js — to-do list
   ============================================================ */
(function (J) {
  "use strict";

  function render() {
    const s = J.state();
    const list = document.getElementById("taskList");
    if (!list) return;

    // pinned first, then open, then done
    const order = [...s.tasks].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.created || 0) - (b.created || 0);
    });

    list.replaceChildren(...order.map(rowFor));

    const open = s.tasks.filter(t => !t.done).length;
    document.getElementById("taskCount").textContent = open;
    const foot = document.getElementById("taskFoot");
    const done = s.tasks.length - open;
    foot.innerHTML = s.tasks.length
      ? `${open} remaining · ${done} completed` + (done ? ` · <a href="#" id="clearDone" style="color:var(--muted)">clear done</a>` : "")
      : "No tasks yet. Add your first above.";
    const cd = document.getElementById("clearDone");
    if (cd) cd.addEventListener("click", (e) => {
      e.preventDefault();
      s.tasks = s.tasks.filter(t => !t.done);
      J.save(); render(); J.emit("state:changed");
    });
  }

  function rowFor(t) {
    const check = J.el("button", { class: "task-check", "aria-label": "toggle",
      html: '<svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>',
      onclick: () => { t.done = !t.done; J.save(); render(); J.emit("state:changed"); }
    });
    const text = J.el("span", { class: "task-text", text: t.text });
    text.addEventListener("dblclick", () => editTask(t, text));

    const star = J.el("button", { class: "task-star", title: "pin", text: t.pinned ? "★" : "☆",
      onclick: () => { t.pinned = !t.pinned; J.save(); render(); }
    });
    const del = J.el("button", { class: "task-del", "aria-label": "delete", text: "✕",
      onclick: () => { const s = J.state(); s.tasks = s.tasks.filter(x => x.id !== t.id); J.save(); render(); J.emit("state:changed"); }
    });

    return J.el("li", { class: "task-item" + (t.done ? " done" : "") + (t.pinned ? " pinned" : "") },
      [check, star, text, del]);
  }

  function editTask(t, node) {
    const input = J.el("input", { class: "task-text", value: t.text });
    input.style.cssText = "flex:1;background:rgba(0,0,0,.3);border:1px solid var(--accent-line);border-radius:6px;color:var(--text);font-size:13.5px;padding:2px 6px;outline:none;";
    node.replaceWith(input);
    input.focus(); input.select();
    const commit = () => { const v = input.value.trim(); if (v) t.text = v; J.save(); render(); };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", e => { if (e.key === "Enter") commit(); if (e.key === "Escape") render(); });
  }

  J.addTask = function (text, opts) {
    text = (text || "").trim();
    if (!text) return false;
    J.state().tasks.push({ id: J.uid(), text, done: false, pinned: !!(opts && opts.pinned), created: Date.now() });
    J.save(); render(); J.emit("state:changed");
    return true;
  };

  J.initTasks = function () {
    const form = document.getElementById("taskForm");
    const input = document.getElementById("taskInput");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (J.addTask(input.value)) { input.value = ""; }
    });
    render();
    J.renderTasks = render;
  };

})(window.J);
