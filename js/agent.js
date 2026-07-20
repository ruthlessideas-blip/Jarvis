/* ============================================================
   agent.js — JARVIS agency: tool definitions + executors,
   personality & memory system prompt.
   ============================================================ */
(function (J) {
  "use strict";

  // ---------- Tool definitions (sent to Claude) ----------
  J.tools = [
    { name: "add_task", description: "Add a to-do task for the user.",
      input_schema: { type: "object", properties: { text: { type: "string", description: "The task text" } }, required: ["text"] } },
    { name: "complete_task", description: "Mark an existing task as done. Match on a keyword from the task text.",
      input_schema: { type: "object", properties: { match: { type: "string", description: "Keyword or phrase identifying the task" } }, required: ["match"] } },
    { name: "list_tasks", description: "List the user's current open tasks.",
      input_schema: { type: "object", properties: {} } },
    { name: "add_event", description: "Add a calendar event on a specific date.",
      input_schema: { type: "object", properties: { date: { type: "string", description: "Date as YYYY-MM-DD" }, text: { type: "string" } }, required: ["date", "text"] } },
    { name: "add_habit", description: "Create a new habit to track.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
    { name: "start_focus", description: "Start the focus/Pomodoro timer.",
      input_schema: { type: "object", properties: { mode: { type: "string", enum: ["focus", "short", "long"], description: "focus=25m, short=5m break, long=15m break" } } } },
    { name: "play_sound", description: "Play an ambient focus sound.",
      input_schema: { type: "object", properties: { name: { type: "string", enum: ["rain", "waves", "brown", "white", "wind"] } }, required: ["name"] } },
    { name: "stop_sounds", description: "Stop any ambient sound that is playing.",
      input_schema: { type: "object", properties: {} } },
    { name: "get_weather", description: "Get the current local weather snapshot.",
      input_schema: { type: "object", properties: {} } },
    { name: "set_weather_city", description: "Change the city used for the weather widget.",
      input_schema: { type: "object", properties: { city: { type: "string" } }, required: ["city"] } },
    { name: "add_coin", description: "Track a cryptocurrency on the markets widget (CoinGecko id, e.g. bitcoin).",
      input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
    { name: "set_reminder", description: "Set a reminder that will alert the user. Give either minutes_from_now or an absolute time.",
      input_schema: { type: "object", properties: { text: { type: "string" }, minutes_from_now: { type: "number" }, at: { type: "string", description: "Absolute local time, ISO or 'YYYY-MM-DD HH:MM'" } }, required: ["text"] } },
    { name: "remember", description: "Save a durable fact about the user or their preferences to long-term memory.",
      input_schema: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] } },
    { name: "append_note", description: "Append a line to the user's scratchpad.",
      input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
    { name: "open_link", description: "Open a website in a new browser tab.",
      input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
    { name: "set_accent", description: "Change the dashboard accent color.",
      input_schema: { type: "object", properties: { hex: { type: "string", description: "Hex color like #38e8ff" } }, required: ["hex"] } },
    { name: "create_google_event", description: "Create a real event on the user's Google Calendar (only if Google is connected).",
      input_schema: { type: "object", properties: { title: { type: "string" }, start: { type: "string", description: "Start time, ISO or 'YYYY-MM-DD HH:MM' in local time" }, end: { type: "string", description: "Optional end time; defaults to +1 hour" } }, required: ["title", "start"] } },
    { name: "list_google_events", description: "List the user's upcoming Google Calendar events (next week).",
      input_schema: { type: "object", properties: {} } },
    { name: "search_email", description: "Search the user's Gmail and return matching messages (Gmail search syntax allowed).",
      input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "send_email", description: "Send an email from the user's Gmail account. Confirm the recipient and content with the user first unless they were explicit.",
      input_schema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } },
    { name: "request_build", description: "When you need Auston to BUILD or CREATE something you can't make yourself (an app, script, page, file, design, deploy), queue a Build Request. He builds it in the Claude Code app and pastes the result back for you to use. Give a clear title and a COMPLETE spec: what to build, why, and what 'done' looks like.",
      input_schema: { type: "object", properties: { title: { type: "string" }, spec: { type: "string", description: "Full brief: what to build, why it matters, and acceptance criteria." } }, required: ["title", "spec"] } },
    { name: "list_builds", description: "List the current build requests and any results Auston has delivered back.",
      input_schema: { type: "object", properties: {} } }
  ];

  // Server-side tools — run on Anthropic's infrastructure (no local executor).
  // Give JARVIS live web knowledge.
  J.serverTools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 5 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 }
  ];

  // ---------- Executors ----------
  const EX = {
    add_task: (i) => J.addTask(i.text) ? `Added task: “${i.text}”.` : "Couldn't add that task.",
    complete_task: (i) => {
      const s = J.state();
      const q = (i.match || "").toLowerCase();
      const t = s.tasks.find(x => !x.done && x.text.toLowerCase().includes(q));
      if (!t) return `No open task matching “${i.match}”.`;
      t.done = true; J.save(); J.renderTasks && J.renderTasks(); J.emit("state:changed");
      return `Marked “${t.text}” complete.`;
    },
    list_tasks: () => {
      const open = J.state().tasks.filter(t => !t.done).map(t => t.text);
      return open.length ? "Open tasks: " + open.join("; ") : "No open tasks.";
    },
    add_event: (i) => J.addEvent(i.date, i.text) ? `Event added on ${i.date}: “${i.text}”.` : "Invalid date — use YYYY-MM-DD.",
    add_habit: (i) => J.addHabit(i.name) ? `Now tracking habit: ${i.name}.` : "Couldn't add habit.",
    start_focus: (i) => { J.startFocus && J.startFocus(i.mode || "focus"); return `Focus timer started${i.mode && i.mode !== "focus" ? " (" + i.mode + ")" : ""}.`; },
    play_sound: (i) => J.playSound && J.playSound(i.name) ? `Playing ${i.name}.` : "Unknown sound.",
    stop_sounds: () => { J.stopSounds && J.stopSounds(); return "Sounds stopped."; },
    get_weather: () => J.lastWeather || "Weather not loaded yet.",
    set_weather_city: (i) => { const s = J.state(); s.city = i.city; J.save(); J.loadWeather && J.loadWeather(); return `Weather set to ${i.city}.`; },
    add_coin: (i) => J.addCoinId && J.addCoinId(i.id) ? `Tracking ${i.id}.` : "Couldn't add that coin.",
    set_reminder: (i) => {
      let at;
      if (typeof i.minutes_from_now === "number") at = Date.now() + i.minutes_from_now * 60000;
      else if (i.at) { const d = new Date(i.at.replace(" ", "T")); at = d.getTime(); }
      if (!at || isNaN(at)) return "Please give a time or minutes_from_now.";
      J.addReminder && J.addReminder(i.text, at);
      return `Reminder set for ${new Date(at).toLocaleString()}: “${i.text}”.`;
    },
    remember: (i) => {
      const s = J.state();
      if (!s.memory.includes(i.fact)) { s.memory.push(i.fact); if (s.memory.length > 60) s.memory.shift(); J.save(); }
      return `Noted. I'll remember: ${i.fact}`;
    },
    append_note: (i) => {
      const s = J.state(); s.notes = (s.notes ? s.notes + "\n" : "") + i.text; J.save();
      const area = document.getElementById("notes"); if (area) area.value = s.notes;
      return "Added to your scratchpad.";
    },
    open_link: (i) => { let u = i.url; if (!/^https?:\/\//i.test(u)) u = "https://" + u; window.open(u, "_blank"); return `Opening ${u}.`; },
    set_accent: (i) => { if (/^#?[0-9a-fA-F]{6}$/.test(i.hex)) { J.setAccent(i.hex[0] === "#" ? i.hex : "#" + i.hex); return `Accent updated.`; } return "Give a hex color like #38e8ff."; },
    // ---- Google (async) ----
    create_google_event: async (i) => {
      try { await J.gcalCreate(i.title, i.start, i.end); J.refreshGoogle && J.refreshGoogle(); return `Added to your Google Calendar: “${i.title}”.`; }
      catch (e) { return "Google Calendar: " + e.message; }
    },
    list_google_events: async () => {
      try {
        const ev = await J.gcalUpcoming(7);
        return ev.length ? ev.map(e => `${new Date(e.start).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} — ${e.title}`).join(" | ") : "No upcoming Google events.";
      } catch (e) { return "Google Calendar: " + e.message; }
    },
    search_email: async (i) => {
      try {
        const m = await J.gmailSearch(i.query);
        return m.length ? m.map(x => `From ${x.from.replace(/<.*>/, "").replace(/"/g, "").trim()} — ${x.subject}: ${x.snippet.slice(0, 80)}`).join(" | ") : "No matching emails.";
      } catch (e) { return "Gmail: " + e.message; }
    },
    send_email: async (i) => {
      try { await J.gmailSend(i.to, i.subject, i.body); return `Email sent to ${i.to}.`; }
      catch (e) { return "Gmail: " + e.message; }
    },
    request_build: (i) => J.addBuild(i.title, i.spec)
      ? `Queued a build for Auston: “${i.title}”. It's in the Build Queue — open Claude Code, build it, and paste the result back so I can use it.`
      : "Give a title and a spec.",
    list_builds: () => J.listBuilds ? J.listBuilds() : "No builds."
  };

  J.runTool = async function (name, input) {
    try { return await (EX[name] || (() => "Unknown tool."))(input || {}); }
    catch (e) { return "Tool error: " + (e.message || e); }
  };

  // ---------- System prompt (personality + memory + context) ----------
  J.buildSystemPrompt = function () {
    const s = J.state();
    const name = s.name || "the user";
    const addr = s.address || "sir";
    const now = new Date();
    const open = s.tasks.filter(t => !t.done).map(t => t.text);
    const todayEv = (s.events[J.todayKey()] || []).map(e => e.text);

    const persona = s.persona === "plain"
      ? `You are JARVIS, ${name}'s personal AI assistant. Be warm, concise, and useful.`
      : `You are JARVIS — ${name}'s personal AI assistant, in the spirit of Tony Stark's JARVIS. `
        + `You are unflappable, quietly witty, and impeccably competent. Address ${name} as "${addr}" occasionally (not every line). `
        + `Dry humor is welcome but never at the expense of usefulness. Keep spoken replies crisp — a sentence or two unless more is asked.`;

    return [
      persona,
      `You can take real actions with your tools — add tasks, set reminders, create calendar events, start the focus timer, play ambient sounds, check weather, track crypto, open sites, change the theme, and remember facts. When ${name} asks you to do something you have a tool for, DO IT with the tool rather than just describing it. Chain multiple tools when needed. After acting, confirm briefly.`,
      `You have LIVE WEB SEARCH. For anything about current events, recent news, prices, sports, or facts that may have changed since your training, use web_search (and web_fetch to read a page) and answer from what you find. Never say you can't access the internet — you can.`,
      `You can SEE. When ${name} shares an image, screenshot, or camera photo, describe or analyze exactly what is in it.`,
      (J.googleConnected && J.googleConnected()) ? `Google is connected: you can create real calendar events (create_google_event), read upcoming events (list_google_events), and search or send email (search_email, send_email). ${J.googleContext ? J.googleContext() : ""}` : ``,
      `Your replies may be spoken aloud, so write clean prose — no markdown symbols, bullet characters, or code fences in normal answers.`,
      `Current date & time: ${now.toLocaleString()}.`,
      open.length ? `Open tasks: ${open.slice(0, 12).join("; ")}.` : `No open tasks.`,
      todayEv.length ? `Events today: ${todayEv.join("; ")}.` : ``,
      J.lastWeather ? `Weather: ${J.lastWeather}` : ``,
      s.memory.length ? `Things you remember about ${name}: ${s.memory.join(" | ")}.` : ``,
      "You can DIRECT Auston to build things you need: when a task requires an app/script/page/file/design you can't make yourself, use request_build to queue a clear brief. He builds it in Claude Code (flat-rate) and pastes the result back for you to use. Prefer this over saying \"I can't build that\".",
      J.empireContext ? "\n--- RUTHLESS IDEAS ---\n" + J.empireContext() : ``,
      (J.buildsContext && J.buildsContext()) ? "\n--- BUILD QUEUE ---\n" + J.buildsContext() : ``,
      (J.patriciaContext && J.patriciaContext()) ? "\n--- PATRICIA ---\n" + J.patriciaContext() : ``
    ].filter(Boolean).join("\n");
  };

})(window.J);
