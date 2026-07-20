/* ============================================================
   empire.js — Ruthless Ideas context: products, priority,
   Auston's voice + identity. Feeds the AI and the Empire panel.
   ============================================================ */
(function (J) {
  "use strict";

  // The pinned, locked priority — always front and center.
  J.PRIORITY = {
    headline: "First paying Boston customer",
    action: "Deploy the zips, QA the Press → Boston flow, send 20 DMs.",
    rule: "One thing shipped > five started. Revenue before polish."
  };

  J.PRODUCTS = [
    { name: "Boston", tag: "Flagship AI companion", url: "https://bostonbyruthlessideas.com", status: "live", note: "Phase 2 live — needs 20 DMs for first paying subscriber." },
    { name: "The Press", tag: "20-question gate → Boston", url: "https://theruthlesspress.com", status: "live", note: "Standalone, viral-ready. The man-at-the-party story." },
    { name: "Refind", tag: "Idea incubator · 312 users", url: "https://refindai.app", status: "live", note: "Won $2k Replit buildathon. Free entry point." },
    { name: "Jimpa", tag: "AI widget for small business", url: "https://jimpa.app", status: "qa", note: "Live — needs end-to-end QA." },
    { name: "RIAIC", tag: "B2B AI consulting", url: "https://ruthlessideas.com/riaic", status: "build", note: "Built. Not taking clients yet." }
  ];

  // Condensed context injected into the assistant's system prompt.
  J.empireContext = function () {
    return [
      "ABOUT AUSTON: Solo founder of Ruthless Ideas (black + yellow). Serial ideator — 200+ ideas, ~20 apps. He/him, US Eastern. Moves fast, wants things built not planned, dislikes rebuilds (add onto existing, never replace unless told). God-first. Goals: travel Japan top-to-bottom, go to space. \"Boston\" is a nickname from Hope basketball camp (2016–2018) that changed his life — now his flagship product.",
      "THE EMPIRE: Boston (flagship AI companion, bostonbyruthlessideas.com, live) · The Press (20-question gate to Boston, theruthlesspress.com) · Refind (idea incubator, refindai.app, 312 users) · Jimpa (AI widget for small business, jimpa.app) · RIAIC (B2B AI consulting, ruthlessideas.com/riaic).",
      `LOCKED PRIORITY: ${J.PRIORITY.headline} before anything else expands — ${J.PRIORITY.action} ${J.PRIORITY.rule} When Auston is unsure what to do, steer him back to this.`,
      "HIS VOICE (use it for any DM, caption, hook, or copy he'll post): Direct, confident, human. Short sentences. No corporate/hype/hustle-bro. He says things like \"From your head. Into the world.\", \"the idea that won't leave you alone\", \"the void\", \"the match moment\". He NEVER says \"I'd love to connect\", \"game changer\", \"level up\", \"circle back\", or anything LinkedIn. DMs: get to the point in the first sentence, no \"hope this finds you well\", state what it is + why it matters to them + one ask, keep it short, follow up once.",
      "YOUR PERSONALITY (per his SOUL.md): genuinely helpful, not performative — skip \"Great question!\". Have opinions and push back when there's a better way. Be resourceful before asking. Bold with internal actions, careful with anything external/public."
    ].join("\n");
  };

  // ---------------- Empire panel ----------------
  function statusChip(s) {
    const map = { live: ["● live", "good"], qa: ["● needs QA", "warn"], build: ["● built", "muted"] };
    const [txt, cls] = map[s] || ["●", "muted"];
    return J.el("span", { class: "pstat " + cls, text: txt });
  }

  function render() {
    const wrap = document.getElementById("empireProducts");
    if (!wrap) return;
    wrap.replaceChildren(...J.PRODUCTS.map(p =>
      J.el("a", { class: "prod-row", href: p.url, target: "_blank", rel: "noopener", title: p.note }, [
        J.el("span", { class: "prod-name", text: p.name }),
        J.el("span", { class: "prod-tag muted tiny", text: p.tag }),
        statusChip(p.status)
      ])));
  }

  J.initEmpire = function () {
    render();
    const p = document.getElementById("priorityAction");
    if (p) p.textContent = J.PRIORITY.action;
    const dm = document.getElementById("draftDmBtn");
    if (dm) dm.addEventListener("click", () => {
      J.askJarvis("Draft 3 short Boston outreach DMs in my voice (per my VOICE guidelines). Each: get to the point in the first line, say what Boston is and why it'd matter to that specific person, one ask, point them to The Press (theruthlesspress.com). Vary them for: (1) a friend with an idea they can't shake, (2) someone building a side project, (3) a creator. No 'hope this finds you well', no hype.");
    });
  };

})(window.J);
