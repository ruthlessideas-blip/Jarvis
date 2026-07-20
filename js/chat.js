/* ============================================================
   chat.js — JARVIS AI brain: agentic loop (custom + web tools),
   vision input, and voice output.
   ============================================================ */
(function (J) {
  "use strict";

  const API = "https://api.anthropic.com/v1/messages";
  const MODEL = "claude-opus-4-8";
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
      box.innerHTML = '<div class="chat-empty">At your service. Ask me to plan your day, set a reminder, search the web, look at a screenshot, start a focus session — or just talk. Say “Hey JARVIS” if voice is on.</div>';
      return;
    }
    box.replaceChildren(...s.chat.map(m => bubble(m.role, m.content)));
    scroll();
  }

  J.openChat = function () {
    document.getElementById("chatPanel").classList.add("open");
    renderHistory();
    setTimeout(() => document.getElementById("chatInput").focus(), 60);
  };
  J.closeChat = function () { document.getElementById("chatPanel").classList.remove("open"); };

  async function callAPI(messages) {
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
        model: MODEL,
        max_tokens: 3072,
        system: J.buildSystemPrompt(),
        tools: J.tools.concat(J.serverTools || []),
        messages
      })
    });
    if (!res.ok) {
      let msg = "Request failed (" + res.status + ").";
      try { const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  }

  // opts.image = { media_type, data (base64, no prefix), url (for preview) }
  J.askJarvis = async function (text, opts) {
    opts = opts || {};
    text = (text || "").trim();
    if (opts.image && !text) text = "What do you see?";
    if (!text || busy) return;

    const s = J.state();
    if (!s.apiKey) {
      J.openChat();
      document.getElementById("chatMsgs").innerHTML =
        '<div class="chat-empty">To bring me online, add your Anthropic API key in ⚙ <b>Settings → JARVIS AI</b>. It stays on this computer and talks to Claude directly from your browser.</div>';
      return;
    }
    J.openChat();

    const box = document.getElementById("chatMsgs");
    box.appendChild(bubble("user", text, opts.image && opts.image.url));
    const thinking = bubble("assistant", "");
    const setTyping = () => { thinking.querySelector(".msg-body").innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; };
    setTyping();
    box.appendChild(thinking);
    scroll();

    // working message list seeded from stored (text) history
    const messages = s.chat.map(m => ({ role: m.role, content: m.content }));
    const firstContent = opts.image
      ? [{ type: "image", source: { type: "base64", media_type: opts.image.media_type, data: opts.image.data } },
         { type: "text", text }]
      : text;
    messages.push({ role: "user", content: firstContent });

    busy = true; setSending(true);
    let finalText = "";
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const resp = await callAPI(messages);
        messages.push({ role: "assistant", content: resp.content });

        const says = resp.content.filter(b => b.type === "text").map(b => b.text).join(" ").trim();
        const toolUses = resp.content.filter(b => b.type === "tool_use");

        // surface web activity
        resp.content.forEach(b => {
          if (b.type === "server_tool_use") {
            const q = b.input && (b.input.query || b.input.url);
            box.insertBefore(toolLine((b.name === "web_fetch" ? "🌐 Reading " : "🔎 Searching the web: ") + (q || "")), thinking);
          }
        });
        if (says) thinking.querySelector(".msg-body").textContent = says;

        if (resp.stop_reason === "tool_use" && toolUses.length) {
          const results = [];
          for (const tu of toolUses) {
            const out = await J.runTool(tu.name, tu.input);
            box.insertBefore(toolLine("⚙ " + out), thinking);
            results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
          }
          messages.push({ role: "user", content: results });
          J.emit("state:changed"); scroll();
          if (!says) setTyping();
          continue;
        }
        if (resp.stop_reason === "pause_turn") { scroll(); if (!says) setTyping(); continue; }

        finalText = says || "(done)";
        break;
      }
      thinking.querySelector(".msg-body").textContent = finalText || "(done)";
      s.chat.push({ role: "user", content: (opts.image ? "🖼️ " : "") + text });
      s.chat.push({ role: "assistant", content: finalText || "(done)" });
      if (s.chat.length > 40) s.chat = s.chat.slice(-40);
      J.save();
      if (!opts.silent) J.speak && J.speak(finalText);
    } catch (e) {
      thinking.querySelector(".msg-body").textContent = "⚠️ " + (e.message || "Network error.");
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
  };

})(window.J);
