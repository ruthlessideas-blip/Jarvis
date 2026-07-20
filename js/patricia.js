/* ============================================================
   patricia.js — bridge to the live Patricia service (port 3141)
   Jarvis becomes Patricia's cockpit: reads her briefing + tasks,
   pushes tasks back. Additive — never touches Patricia's code.
   Documented API (PATRICIA-LIVE-NOW.md / START-HERE.md):
     GET  /health
     GET  /api/kb        GET /api/status     GET /api/briefing
     GET  /api/tasks/nudges
     POST /api/task/add  { task, priority }
   ============================================================ */
(function (J) {
  "use strict";

  const BASE = "http://localhost:3141";
  let connected = false, briefing = "", nudges = [];

  J.patriciaConnected = () => connected;

  async function get(path) {
    const r = await fetch(BASE + path, { headers: { "Accept": "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const ct = r.headers.get("content-type") || "";
    return ct.includes("json") ? r.json() : r.text();
  }

  J.patriciaAddTask = async function (task, priority) {
    if (!connected) return false;
    try {
      await fetch(BASE + "/api/task/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, priority: priority || "medium" })
      });
      return true;
    } catch (e) { return false; }
  };

  // Context for the assistant's system prompt.
  J.patriciaContext = function () {
    if (!connected) return "";
    const bits = ["PATRICIA (your 24/7 brain) is connected on port 3141."];
    if (briefing) bits.push("Today's briefing: " + briefing.slice(0, 500));
    if (nudges.length) bits.push("Patricia's nudges: " + nudges.slice(0, 6).join("; "));
    return bits.join("\n");
  };
  J.patriciaBriefing = () => briefing;

  function normalizeNudges(data) {
    if (!data) return [];
    const arr = Array.isArray(data) ? data : (data.nudges || data.tasks || data.items || []);
    return arr.map(x => typeof x === "string" ? x : (x.task || x.text || x.title || x.name || "")).filter(Boolean);
  }
  function normalizeBriefing(data) {
    if (!data) return "";
    if (typeof data === "string") return data.trim();
    return (data.briefing || data.text || data.content || data.markdown || "").toString().trim();
  }

  async function refresh() {
    if (!connected) return;
    try { briefing = normalizeBriefing(await get("/api/briefing").catch(() => "")); } catch (e) {}
    try { nudges = normalizeNudges(await get("/api/tasks/nudges").catch(() => null)); } catch (e) {}
    render();
  }

  function render() {
    const status = document.getElementById("patriciaStatus");
    const body = document.getElementById("patriciaBody");
    if (!status || !body) return;
    if (!connected) {
      status.textContent = "offline"; status.className = "chat-sub muted tiny";
      body.innerHTML = '<div class="muted tiny">Patricia isn\'t reachable on <code>localhost:3141</code>. Start her (<code>node patricia-app.js</code>) and she\'ll sync her 5&nbsp;AM briefing and tasks into this cockpit. <br><span class="tiny">(If she\'s running but still shows offline, her service needs CORS enabled for the dashboard origin — one line in patricia-app.js.)</span></div>';
      return;
    }
    status.textContent = "connected ✓"; status.className = "chat-sub good tiny";
    const kids = [];
    if (briefing) kids.push(J.el("div", { class: "pat-brief" }, [
      J.el("div", { class: "pat-label muted tiny", text: "Today's briefing" }),
      J.el("div", { class: "pat-brief-text", text: briefing.slice(0, 420) + (briefing.length > 420 ? "…" : "") })
    ]));
    if (nudges.length) kids.push(J.el("div", { class: "pat-nudges" }, [
      J.el("div", { class: "pat-label muted tiny", text: "Patricia's nudges" }),
      ...nudges.slice(0, 6).map(n => J.el("div", { class: "pat-nudge", text: "• " + n }))
    ]));
    if (!kids.length) kids.push(J.el("div", { class: "muted tiny", text: "Connected. No briefing yet (generates at 5 AM)." }));
    body.replaceChildren(...kids);
  }

  async function connect() {
    try {
      await get("/health");
      connected = true;
      render();
      await refresh();
      setInterval(refresh, 3 * 60 * 1000);
    } catch (e) {
      connected = false;
      render();
    }
  }

  J.initPatricia = function () {
    render();
    const btn = document.getElementById("patriciaRetry");
    if (btn) btn.addEventListener("click", () => { render(); connect(); });
    connect();
  };

})(window.J);
