/* ============================================================
   chat.js — JARVIS AI brain (Anthropic Claude, browser-direct)
   ============================================================ */
(function (J) {
  "use strict";

  const API = "https://api.anthropic.com/v1/messages";
  const MODEL = "claude-opus-4-8";
  let busy = false;

  function systemPrompt() {
    const s = J.state();
    const name = s.name || "the user";
    const now = new Date();
    const open = s.tasks.filter(t => !t.done).map(t => t.text);
    return [
      `You are JARVIS, ${name}'s personal AI assistant — the intelligence behind their command-center dashboard.`,
      `Be warm, concise, and genuinely useful. Lead with the answer. Use plain language.`,
      `Current date & time: ${now.toLocaleString()}.`,
      open.length ? `${name}'s open tasks right now: ${open.slice(0, 8).join("; ")}.` : `${name} has no open tasks.`,
      `You can advise, brainstorm, draft, explain, and plan. Keep answers focused; expand only when asked.`
    ].join(" ");
  }

  function el(role, text) {
    return J.el("div", { class: "msg " + role }, [
      J.el("div", { class: "msg-role", text: role === "user" ? (J.state().name || "You") : "JARVIS" }),
      J.el("div", { class: "msg-body", text })
    ]);
  }

  function scroll() {
    const box = document.getElementById("chatMsgs");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function renderHistory() {
    const box = document.getElementById("chatMsgs");
    if (!box) return;
    const s = J.state();
    if (!s.chat.length) {
      box.innerHTML = '<div class="chat-empty">Ask me anything — plan your day, draft a message, explain a concept, or just think out loud. I have context on your tasks.</div>';
      return;
    }
    box.replaceChildren(...s.chat.map(m => el(m.role, m.content)));
    scroll();
  }

  J.openChat = function () {
    document.getElementById("chatPanel").classList.add("open");
    renderHistory();
    setTimeout(() => document.getElementById("chatInput").focus(), 60);
  };
  J.closeChat = function () { document.getElementById("chatPanel").classList.remove("open"); };

  J.askJarvis = async function (text) {
    text = (text || "").trim();
    if (!text || busy) return;
    const s = J.state();
    if (!s.apiKey) {
      J.openChat();
      const box = document.getElementById("chatMsgs");
      box.innerHTML = '<div class="chat-empty">To bring me online, add your Anthropic API key in ⚙ <b>Settings → JARVIS AI</b>. It is stored only on this computer and used only to talk to Claude directly from your browser.</div>';
      return;
    }

    J.openChat();
    s.chat.push({ role: "user", content: text });
    J.save();
    renderHistory();

    const box = document.getElementById("chatMsgs");
    const bubble = el("assistant", "");
    const body = bubble.querySelector(".msg-body");
    body.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    box.appendChild(bubble);
    scroll();

    busy = true;
    setSending(true);
    let acc = "";
    try {
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
          max_tokens: 2048,
          system: systemPrompt(),
          stream: true,
          messages: s.chat.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        let msg = "Request failed (" + res.status + ").";
        try { const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; } catch (e) {}
        body.textContent = "⚠️ " + msg;
        busy = false; setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
              acc += ev.delta.text;
              body.textContent = acc;
              scroll();
            }
          } catch (e) { /* ignore keep-alives */ }
        }
      }
      if (!acc) body.textContent = "(no response)";
      s.chat.push({ role: "assistant", content: acc || "(no response)" });
      // cap stored history
      if (s.chat.length > 40) s.chat = s.chat.slice(-40);
      J.save();
    } catch (e) {
      body.textContent = "⚠️ " + (e.message || "Network error. Check your connection and key.");
    } finally {
      busy = false; setSending(false);
    }
  };

  function setSending(on) {
    const btn = document.getElementById("chatSend");
    if (btn) { btn.disabled = on; btn.textContent = on ? "…" : "Send"; }
  }

  J.initChat = function () {
    document.getElementById("chatBtn").addEventListener("click", () => busy ? null : (document.getElementById("chatPanel").classList.contains("open") ? J.closeChat() : J.openChat()));
    document.getElementById("chatClose").addEventListener("click", J.closeChat);
    document.getElementById("chatClear").addEventListener("click", () => {
      J.state().chat = []; J.save(); renderHistory();
    });
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value; input.value = "";
      J.askJarvis(v);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
  };

})(window.J);
