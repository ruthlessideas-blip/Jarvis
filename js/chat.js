/* ============================================================
   chat.js — JARVIS AI: provider-agnostic agentic loop
   (Ollama / Haiku / Sonnet), vision, voice out, model switch.
   ============================================================ */
(function (J) {
  "use strict";

  const MAX_STEPS = 10;
  let busy = false;

  function bubble(role, text, imageUrl) {
    const kids = [J.el("div", { class: "msg-role", text: role === "user" ? (J.state().name || "You") : "JARVIS" })];
    if (imageUrl) kids.push(J.el("img", { class: "msg-img", src: imageUrl }));
    kids.push(J.el("div", { class: "msg-body", text }));
    return J.el("div", { class: "msg " + role }, kids);
  }
  function toolLine(text) { return J.el("div", { class: "msg tool", text: text }); }
  function scroll() { const b = document.getElementById("chatMsgs"); if (b) b.scrollTop = b.scrollHeight; }

  function renderHistory() {
    const box = document.getElementById("chatMsgs");
    if (!box) return;
    const s = J.state();
    if (!s.chat.length) {
      box.innerHTML = '<div class="chat-empty">At your service. Ask me to plan your day, draft Boston DMs in your voice, set a reminder, search the web, or look at a screenshot. Say “Hey JARVIS” if voice is on.</div>';
      return;
    }
    box.replaceChildren(...s.chat.map(m => bubble(m.role, m.content)));
    scroll();
  }

  J.openChat = function () {
    document.getElementById("chatPanel").classList.add("open");
    renderHistory(); renderModelSwitch();
    setTimeout(() => document.getElementById("chatInput").focus(), 60);
  };
  J.closeChat = function () { document.getElementById("chatPanel").classList.remove("open"); };

  // ---------- Model switch ----------
  function renderModelSwitch() {
    const wrap = document.getElementById("modelSwitch");
    if (!wrap) return;
    const cur = J.state().model;
    wrap.replaceChildren(...Object.values(J.MODELS).map(m =>
      J.el("button", { class: "ms-btn" + (m.id === cur ? " active" : ""), title: m.label + " — " + m.sub,
        html: `${m.label} <span class="ms-badge">${m.badge}</span>`,
        onclick: () => { J.setModel(m.id); renderModelSwitch(); J.toast("Brain: " + m.label + (m.kind === "ollama" ? " (free, local)" : "")); } })));
  }

  // ---------- Agentic loop ----------
  J.askJarvis = async function (text, opts) {
    opts = opts || {};
    text = (text || "").trim();
    if (opts.image && !text) text = "What do you see?";
    if (!text || busy) return;

    const s = J.state();
    const model = J.currentModel();
    if (model.kind === "anthropic" && !s.apiKey) {
      J.openChat();
      document.getElementById("chatMsgs").innerHTML =
        '<div class="chat-empty">Haiku/Turbo need an Anthropic key (⚙ <b>Settings → JARVIS AI</b>) — or switch the brain to <b>Ollama</b> above to run free & local with no key.</div>';
      return;
    }
    J.openChat();

    const box = document.getElementById("chatMsgs");
    box.appendChild(bubble("user", text, opts.image && opts.image.url));
    const thinking = bubble("assistant", "");
    const setTyping = () => { thinking.querySelector(".msg-body").innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; };
    setTyping(); box.appendChild(thinking); scroll();

    if (opts.image && !J.modelSupportsVision()) {
      box.insertBefore(toolLine("🖼 Vision needs Haiku or Turbo — switch the brain to see images."), thinking);
    }

    // normalized history from stored text turns + this turn
    const messages = s.chat.map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: "user", content: text, image: opts.image });

    busy = true; setSending(true);
    let finalText = "";
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const res = await J.llmStep(J.buildSystemPrompt(), messages, {
          tools: J.tools,
          onServer: (b) => { const q = b.input && (b.input.query || b.input.url); box.insertBefore(toolLine((b.name === "web_fetch" ? "🌐 Reading " : "🔎 Searching the web: ") + (q || "")), thinking); scroll(); }
        });
        if (res.error) { thinking.querySelector(".msg-body").textContent = "⚠️ " + res.error; break; }

        messages.push({ role: "assistant", content: res.text, toolUses: res.toolUses });
        if (res.text) thinking.querySelector(".msg-body").textContent = res.text;

        if (res.toolUses && res.toolUses.length) {
          const results = [];
          for (const tu of res.toolUses) {
            const out = await J.runTool(tu.name, tu.input);
            box.insertBefore(toolLine("⚙ " + out), thinking);
            results.push({ id: tu.id, name: tu.name, content: out });
          }
          messages.push({ role: "tool", results });
          J.emit("state:changed"); scroll();
          if (!res.text) setTyping();
          continue;
        }
        finalText = res.text || "(done)";
        break;
      }
      if (finalText) {
        thinking.querySelector(".msg-body").textContent = finalText;
        s.chat.push({ role: "user", content: (opts.image ? "🖼️ " : "") + text });
        s.chat.push({ role: "assistant", content: finalText });
        if (s.chat.length > 40) s.chat = s.chat.slice(-40);
        J.save();
        if (!opts.silent) J.speak && J.speak(finalText);
      }
    } catch (e) {
      thinking.querySelector(".msg-body").textContent = "⚠️ " + (e.message || "Error.");
    } finally {
      busy = false; setSending(false);
    }
    return finalText;
  };

  function setSending(on) {
    const btn = document.getElementById("chatSend");
    if (btn) { btn.disabled = on; btn.textContent = on ? "…" : "Send"; }
  }

  J.initChat = function () {
    document.getElementById("chatBtn").addEventListener("click", () =>
      document.getElementById("chatPanel").classList.contains("open") ? J.closeChat() : J.openChat());
    document.getElementById("chatClose").addEventListener("click", J.closeChat);
    document.getElementById("chatClear").addEventListener("click", () => { J.state().chat = []; J.save(); renderHistory(); });
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value; input.value = "";
      const img = J.takePendingImage ? J.takePendingImage() : null;
      J.askJarvis(v, img ? { image: img } : undefined);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    renderModelSwitch();
  };

})(window.J);
