/* ============================================================
   mission.js — autonomous multi-step missions ("Mission Control")
   Give JARVIS a goal; it plans, then executes step by step.
   ============================================================ */
(function (J) {
  "use strict";

  const API = "https://api.anthropic.com/v1/messages";
  const MODEL = "claude-opus-4-8";
  const MAX_STEPS = 26;
  let busy = false;
  let steps = [];

  const MISSION_TOOLS = [
    { name: "set_plan", description: "Record your step-by-step plan BEFORE you begin. Call this exactly once, first, with 3–7 concise steps.",
      input_schema: { type: "object", properties: { steps: { type: "array", items: { type: "string" } } }, required: ["steps"] } },
    { name: "complete_step", description: "Mark a plan step complete right after you finish it.",
      input_schema: { type: "object", properties: { index: { type: "number", description: "1-based step number" } }, required: ["index"] } }
  ];

  const EXAMPLES = [
    "Plan my focused morning: add my top 3 tasks, start a 25-minute focus session, play rain, and give me the weather plus one headline.",
    "Research the best beginner golf clubs, add a task to compare 3 options this weekend, and note the top pick in my scratchpad.",
    "Set up my week: add reminders for a dentist call tomorrow 9am and gym Mon/Wed/Fri 6pm, and track BTC and ETH."
  ];

  function status(text, cls) {
    const el = document.getElementById("missionStatus");
    if (el) { el.textContent = text; el.className = "chat-sub muted tiny" + (cls ? " " + cls : ""); }
  }

  function renderSteps() {
    const wrap = document.getElementById("missionSteps");
    if (!wrap) return;
    wrap.replaceChildren(...steps.map((s, i) =>
      J.el("div", { class: "ms-step " + s.status }, [
        J.el("span", { class: "ms-dot", text: s.status === "done" ? "✓" : s.status === "active" ? "" : String(i + 1) }),
        J.el("span", { class: "ms-text", text: s.text })
      ])));
  }

  function setPlan(list) {
    steps = (list || []).map((t, i) => ({ text: t, status: i === 0 ? "active" : "pending" }));
    renderSteps();
    return "Plan recorded (" + steps.length + " steps).";
  }
  function completeStep(index) {
    const i = (index | 0) - 1;
    if (steps[i]) steps[i].status = "done";
    const next = steps.find(s => s.status === "pending");
    if (next) next.status = "active";
    renderSteps();
    return "Step " + index + " complete.";
  }

  function log(kind, text) {
    const box = document.getElementById("missionLog");
    if (!box) return;
    const icon = kind === "act" ? "⚙" : kind === "search" ? "🔎" : kind === "report" ? "✅" : "›";
    box.appendChild(J.el("div", { class: "ml-row " + kind }, [
      J.el("span", { class: "ml-ico", text: icon }),
      J.el("span", { class: "ml-text", text: text })
    ]));
    box.scrollTop = box.scrollHeight;
  }

  function systemPrompt(goal) {
    const s = J.state();
    const name = s.name || "the user";
    return [
      `You are JARVIS executing an AUTONOMOUS multi-step mission for ${name}.`,
      `Mission goal: "${goal}".`,
      `Step 1: call set_plan with 3–7 concrete steps. Then carry out the plan yourself using your tools (tasks, calendar, reminders, notes, sounds, focus timer, markets, theme, and web_search for any facts). Call complete_step immediately after finishing each step.`,
      `Work autonomously — do NOT ask for confirmation on reversible dashboard actions; just do them.`,
      `IMPORTANT: Do not SEND email or take irreversible external actions on your own. If the goal needs an email or similar, DRAFT it and include the full draft in your final report for ${name} to approve — unless the goal explicitly says to send it.`,
      `Before each major action, output one short sentence saying what you're doing. When all steps are done, finish with a concise final report of what you accomplished (and any drafts for approval).`,
      J.buildSystemPrompt ? "\nContext:\n" + J.buildSystemPrompt() : ""
    ].join("\n");
  }

  async function callAPI(messages, goal) {
    const s = J.state();
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": s.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 3072,
        system: systemPrompt(goal),
        tools: J.tools.concat(J.serverTools || [], MISSION_TOOLS),
        messages
      })
    });
    if (!res.ok) {
      let m = "Request failed (" + res.status + ").";
      try { const j = await res.json(); if (j.error && j.error.message) m = j.error.message; } catch (e) {}
      throw new Error(m);
    }
    return res.json();
  }

  J.openMission = function () {
    document.getElementById("missionPanel").classList.add("open");
    if (!busy) { document.getElementById("missionForm").hidden = false; document.getElementById("missionRun").hidden = true; }
  };
  J.closeMission = function () { document.getElementById("missionPanel").classList.remove("open"); };

  J.startMission = async function (goal) {
    goal = (goal || "").trim();
    if (!goal || busy) return;
    if (!J.state().apiKey) { J.openMission(); status("Add your API key in Settings", "warn"); J.toast("Add your Anthropic API key in Settings first."); return; }

    J.openMission();
    document.getElementById("missionForm").hidden = true;
    document.getElementById("missionRun").hidden = false;
    document.getElementById("missionGoalTxt").textContent = goal;
    document.getElementById("missionLog").replaceChildren();
    steps = []; renderSteps();
    status("Planning…", "");

    const messages = [{ role: "user", content: goal }];
    busy = true;
    let report = "";
    try {
      for (let i = 0; i < MAX_STEPS; i++) {
        const resp = await callAPI(messages, goal);
        messages.push({ role: "assistant", content: resp.content });

        const says = resp.content.filter(b => b.type === "text").map(b => b.text).join(" ").trim();
        if (says) log("say", says);

        resp.content.forEach(b => {
          if (b.type === "server_tool_use") log("search", (b.name === "web_fetch" ? "Reading " : "Searching: ") + ((b.input && (b.input.query || b.input.url)) || ""));
        });

        const toolUses = resp.content.filter(b => b.type === "tool_use");
        if (resp.stop_reason === "tool_use" && toolUses.length) {
          if (steps.length) status("Executing…", "");
          const results = [];
          for (const tu of toolUses) {
            let out;
            if (tu.name === "set_plan") { out = setPlan(tu.input.steps); status("Executing…", ""); }
            else if (tu.name === "complete_step") out = completeStep(tu.input.index);
            else { out = await J.runTool(tu.name, tu.input); log("act", out); }
            results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
          }
          messages.push({ role: "user", content: results });
          J.emit("state:changed");
          continue;
        }
        if (resp.stop_reason === "pause_turn") continue;

        report = says || "Mission complete.";
        break;
      }
      // finish
      steps.forEach(s => { if (s.status !== "done") s.status = "done"; });
      renderSteps();
      status("Mission complete ✓", "good");
      log("report", report);
      const again = J.el("button", { class: "pill", text: "＋ New mission",
        onclick: () => { document.getElementById("missionForm").hidden = false; document.getElementById("missionRun").hidden = true; document.getElementById("missionGoal").value = ""; status("idle"); } });
      document.getElementById("missionLog").appendChild(J.el("div", { class: "ml-again" }, [again]));
      if (!J.state().voice) J.toast("🎯 Mission complete."); else J.speak && J.speak("Mission complete, " + (J.state().address || "sir") + ". " + report);
    } catch (e) {
      status("Mission failed", "warn");
      log("say", "⚠️ " + (e.message || "Error."));
    } finally {
      busy = false;
    }
  };

  J.initMission = function () {
    const btn = document.getElementById("missionBtn");
    if (btn) btn.addEventListener("click", () => document.getElementById("missionPanel").classList.contains("open") ? J.closeMission() : J.openMission());
    document.getElementById("missionClose").addEventListener("click", J.closeMission);
    const form = document.getElementById("missionForm");
    const goal = document.getElementById("missionGoal");
    form.addEventListener("submit", (e) => { e.preventDefault(); J.startMission(goal.value); });

    const ex = document.getElementById("missionExamples");
    ex.replaceChildren(...EXAMPLES.map(t =>
      J.el("button", { type: "button", class: "mission-ex", text: t, onclick: () => { goal.value = t; goal.focus(); } })));
  };

})(window.J);
