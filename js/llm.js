/* ============================================================
   llm.js — model layer. One interface, three brains:
     • ollama  — free, local (localhost:11434)
     • haiku   — cheap Claude (API key)
     • sonnet  — "turbo" Claude (API key)
   Exposes J.llmStep(system, messages, opts) -> { text, toolUses[], error }
   messages are normalized:
     { role:"user", content, image? }
     { role:"assistant", content, toolUses:[{id,name,input}] }
     { role:"tool", results:[{id,name,content}] }
   ============================================================ */
(function (J) {
  "use strict";

  const ANTHROPIC = "https://api.anthropic.com/v1/messages";
  const OLLAMA = "http://localhost:11434/api/chat";

  J.MODELS = {
    ollama: { id: "ollama", label: "Ollama", sub: "free · local", kind: "ollama", badge: "FREE" },
    haiku:  { id: "haiku",  label: "Haiku",  sub: "cheap",         kind: "anthropic", model: "claude-haiku-4-5", badge: "¢" },
    sonnet: { id: "sonnet", label: "Turbo",  sub: "Sonnet",        kind: "anthropic", model: "claude-sonnet-5", badge: "⚡" }
  };

  J.currentModel = () => J.MODELS[J.state().model] || J.MODELS.haiku;
  J.setModel = (id) => { if (J.MODELS[id]) { J.state().model = id; J.save(); J.emit("model:changed", id); } };
  J.ollamaModelName = () => (J.state().ollamaModel || "llama3.1");
  J.modelSupportsVision = () => J.currentModel().kind === "anthropic";

  // ---------- Anthropic ----------
  function toAnthropicMessages(msgs) {
    return msgs.map(m => {
      if (m.role === "user") {
        if (m.image) return { role: "user", content: [
          { type: "image", source: { type: "base64", media_type: m.image.media_type, data: m.image.data } },
          { type: "text", text: m.content || "" }] };
        return { role: "user", content: m.content };
      }
      if (m.role === "assistant") {
        const blocks = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        (m.toolUses || []).forEach(tu => blocks.push({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input }));
        return { role: "assistant", content: blocks.length ? blocks : (m.content || "") };
      }
      // tool results
      return { role: "user", content: m.results.map(r => ({ type: "tool_result", tool_use_id: r.id, content: r.content })) };
    });
  }

  async function anthropicStep(system, msgs, tools, onServer) {
    const s = J.state();
    const body = {
      model: J.currentModel().model, max_tokens: 3072, system,
      tools: (tools || []).concat(J.serverTools || []),
      messages: toAnthropicMessages(msgs)
    };
    for (let i = 0; i < 6; i++) { // resolve server-tool pause_turn internally
      let res;
      try {
        res = await fetch(ANTHROPIC, { method: "POST", headers: {
          "content-type": "application/json", "x-api-key": s.apiKey,
          "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"
        }, body: JSON.stringify(body) });
      } catch (e) { return { error: "Network error reaching Claude." }; }
      if (!res.ok) {
        let m = "Request failed (" + res.status + ").";
        try { const j = await res.json(); if (j.error && j.error.message) m = j.error.message; } catch (e) {}
        return { error: m };
      }
      const data = await res.json();
      body.messages.push({ role: "assistant", content: data.content });
      (data.content || []).forEach(b => { if (b.type === "server_tool_use" && onServer) onServer(b); });
      if (data.stop_reason === "pause_turn") continue;
      return {
        text: (data.content || []).filter(b => b.type === "text").map(b => b.text).join(" ").trim(),
        toolUses: (data.content || []).filter(b => b.type === "tool_use").map(b => ({ id: b.id, name: b.name, input: b.input }))
      };
    }
    return { text: "(stopped)", toolUses: [] };
  }

  // ---------- Ollama ----------
  function toOllamaTools(tools) {
    return (tools || []).map(t => ({ type: "function", function: {
      name: t.name, description: t.description, parameters: t.input_schema || { type: "object", properties: {} }
    } }));
  }
  function toOllamaMessages(system, msgs) {
    const out = [{ role: "system", content: system }];
    msgs.forEach(m => {
      if (m.role === "user") out.push({ role: "user", content: m.content || "" }); // images need a vision model
      else if (m.role === "assistant") {
        const a = { role: "assistant", content: m.content || "" };
        if (m.toolUses && m.toolUses.length) a.tool_calls = m.toolUses.map(tu => ({ function: { name: tu.name, arguments: tu.input } }));
        out.push(a);
      } else if (m.role === "tool") {
        m.results.forEach(r => out.push({ role: "tool", content: String(r.content), tool_name: r.name }));
      }
    });
    return out;
  }
  async function ollamaStep(system, msgs, tools) {
    let res;
    try {
      res = await fetch(OLLAMA, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: J.ollamaModelName(), stream: false, messages: toOllamaMessages(system, msgs), tools: toOllamaTools(tools) }) });
    } catch (e) {
      return { error: "Can't reach Ollama on localhost:11434. Start Ollama (run it with OLLAMA_ORIGINS=* so the app can talk to it), or switch to Haiku." };
    }
    if (!res.ok) return { error: "Ollama error " + res.status + ". Is the model \"" + J.ollamaModelName() + "\" pulled? (ollama pull " + J.ollamaModelName() + ")" };
    const data = await res.json();
    const msg = data.message || {};
    return {
      text: (msg.content || "").trim(),
      toolUses: (msg.tool_calls || []).map(tc => ({ id: J.uid(), name: tc.function.name, input: tc.function.arguments || {} }))
    };
  }

  J.llmStep = function (system, msgs, opts) {
    opts = opts || {};
    return J.currentModel().kind === "ollama"
      ? ollamaStep(system, msgs, opts.tools)
      : anthropicStep(system, msgs, opts.tools, opts.onServer);
  };

})(window.J);
