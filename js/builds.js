/* ============================================================
   builds.js — the JARVIS → Auston build loop.
   JARVIS queues "build requests" (things it needs made).
   Auston copies the brief into Claude Code (flat-rate subscription),
   builds it, and pastes the result back so JARVIS can use it.
   ============================================================ */
(function (J) {
  "use strict";

  function render() {
    const wrap = document.getElementById("buildList");
    if (!wrap) return;
    const s = J.state();
    if (!s.builds.length) {
      wrap.innerHTML = '<div class="muted tiny" style="padding:4px 2px">Nothing queued. Ask JARVIS what it wants built — it drops briefs here for you to make in Claude Code.</div>';
      updateCount();
      return;
    }
    // requested first, done last
    const order = [...s.builds].sort((a, b) => (a.status === "done") - (b.status === "done") || a.created - b.created);
    wrap.replaceChildren(...order.map(rowFor));
    updateCount();
  }

  function updateCount() {
    const c = document.getElementById("buildCount");
    if (c) c.textContent = J.state().builds.filter(b => b.status !== "done").length;
  }

  function rowFor(b) {
    const head = J.el("div", { class: "bq-head" }, [
      J.el("span", { class: "bq-title", text: b.title }),
      J.el("span", { class: "bq-status " + b.status, text: b.status === "done" ? "✓ done" : "● to build" })
    ]);
    const spec = J.el("div", { class: "bq-spec", text: b.spec });

    const copy = J.el("button", { class: "ghost-btn", text: "📋 Copy brief",
      onclick: () => copyBrief(b) });
    const doneBtn = J.el("button", { class: "ghost-btn", text: b.status === "done" ? "Edit result" : "✓ Add result",
      onclick: () => addResult(b, row) });
    const del = J.el("button", { class: "ghost-btn", text: "✕",
      onclick: () => { const st = J.state(); st.builds = st.builds.filter(x => x.id !== b.id); J.save(); render(); J.emit("state:changed"); } });

    const actions = J.el("div", { class: "bq-actions" }, [copy, doneBtn, del]);
    const row = J.el("div", { class: "bq-item" + (b.status === "done" ? " done" : "") }, [head, spec, actions]);
    if (b.status === "done" && b.result) {
      row.appendChild(J.el("div", { class: "bq-result" }, [
        J.el("div", { class: "muted tiny", text: "Result JARVIS can use:" }),
        J.el("div", { class: "bq-result-text", text: b.result })
      ]));
    }
    return row;
  }

  function briefText(b) {
    return [
      "Build this for my JARVIS assistant.",
      "",
      "TITLE: " + b.title,
      "",
      "SPEC:",
      b.spec,
      "",
      "When it's done, give me a short plain-language summary of what you built and where it lives, so I can paste that back into JARVIS."
    ].join("\n");
  }

  function copyBrief(b) {
    const text = briefText(b);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => { mark(b, "building"); J.toast("Brief copied — paste it into Claude Code."); },
        () => showFallback(text)
      );
    } else showFallback(text);
  }
  function showFallback(text) {
    const ta = J.el("textarea", { class: "notes-area", style: "position:fixed;top:-1000px" });
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); J.toast("Brief copied."); } catch (e) { prompt("Copy this brief for Claude Code:", text); }
    ta.remove();
  }

  function mark(b, status) {
    const item = J.state().builds.find(x => x.id === b.id);
    if (item && item.status !== "done") { item.status = status; J.save(); render(); }
  }

  function addResult(b, row) {
    if (row.querySelector(".bq-add")) return;
    const ta = J.el("textarea", { class: "bq-add", rows: "3", placeholder: "Paste what you built — a summary, the code, a file path, or a link. JARVIS will use it." });
    ta.value = b.result || "";
    const save = J.el("button", { class: "pill primary", text: "Save",
      onclick: () => {
        const item = J.state().builds.find(x => x.id === b.id);
        if (item) { item.result = ta.value.trim(); item.status = item.result ? "done" : "requested"; J.save(); render(); J.emit("state:changed"); }
      } });
    const cancel = J.el("button", { class: "pill", text: "Cancel", onclick: () => render() });
    row.appendChild(J.el("div", { class: "bq-addwrap" }, [ta, J.el("div", { class: "bq-addbtns" }, [save, cancel]) ]));
    ta.focus();
  }

  // ---- Programmatic (used by the AI tool) ----
  J.addBuild = function (title, spec) {
    title = (title || "").trim(); spec = (spec || "").trim();
    if (!title || !spec) return false;
    J.state().builds.push({ id: J.uid(), title, spec, status: "requested", result: "", created: Date.now() });
    J.save(); render(); J.emit("state:changed");
    J.toast("🛠 JARVIS queued a build: " + title);
    return true;
  };
  J.listBuilds = function () {
    const s = J.state();
    if (!s.builds.length) return "No build requests yet.";
    return s.builds.map(b => `[${b.status}] ${b.title}` + (b.status === "done" && b.result ? " → " + b.result.slice(0, 120) : "")).join(" | ");
  };

  // ---- Context injected into the assistant ----
  J.buildsContext = function () {
    const s = J.state();
    if (!s.builds.length) return "";
    const open = s.builds.filter(b => b.status !== "done").map(b => b.title);
    const done = s.builds.filter(b => b.status === "done");
    const bits = [];
    if (open.length) bits.push("Build requests you've queued for Auston (he builds these in Claude Code): " + open.join("; ") + ".");
    if (done.length) bits.push("Delivered builds you can now use: " + done.map(b => b.title + " — " + (b.result || "done").slice(0, 220)).join(" | ") + ".");
    return bits.join("\n");
  };

  J.initBuilds = function () {
    render();
    J.on("state:changed", updateCount);
  };

})(window.J);
