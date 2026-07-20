/* ============================================================
   google.js — real Google Calendar + Gmail (client-side OAuth)
   No backend: uses Google Identity Services token flow.
   ============================================================ */
(function (J) {
  "use strict";

  const SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
  ].join(" ");

  let tokenClient = null, accessToken = null, tokenExp = 0, connected = false;
  J.googleEvents = [];        // upcoming Google events (merged into the agenda)

  J.googleConnected = () => connected;

  function loadGIS() {
    return new Promise((res, rej) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error("Couldn't load Google sign-in. Check your connection."));
      document.head.appendChild(s);
    });
  }

  async function ensureClient() {
    const cid = J.state().googleClientId && J.state().googleClientId.trim();
    if (!cid) throw new Error("Add your Google Client ID in Settings → Google first.");
    await loadGIS();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: SCOPES, callback: () => {} });
    }
  }

  function requestToken(interactive) {
    return new Promise(async (resolve, reject) => {
      try { await ensureClient(); } catch (e) { return reject(e); }
      tokenClient.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        accessToken = resp.access_token;
        tokenExp = Date.now() + ((resp.expires_in || 3600) * 1000) - 60000;
        connected = true;
        const s = J.state(); if (!s.googleConnected) { s.googleConnected = true; J.save(); }
        resolve(accessToken);
      };
      try { tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" }); }
      catch (e) { reject(e); }
    });
  }

  async function token() {
    if (accessToken && Date.now() < tokenExp) return accessToken;
    try { return await requestToken(false); }
    catch (e) { return requestToken(true); }
  }

  async function api(url, opts, retried) {
    const t = await token();
    const r = await fetch(url, Object.assign({}, opts, {
      headers: Object.assign({ Authorization: "Bearer " + t }, (opts && opts.headers) || {})
    }));
    if (r.status === 401 && !retried) { accessToken = null; return api(url, opts, true); }
    if (!r.ok) {
      let m = "Google API error " + r.status;
      try { const j = await r.json(); if (j.error && j.error.message) m = j.error.message; } catch (e) {}
      throw new Error(m);
    }
    return r.status === 204 ? {} : r.json();
  }

  // ---------------- Calendar ----------------
  J.gcalUpcoming = async function (days) {
    const now = new Date(), max = new Date(); max.setDate(now.getDate() + (days || 14));
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      + "?singleEvents=true&orderBy=startTime&maxResults=25"
      + "&timeMin=" + encodeURIComponent(now.toISOString())
      + "&timeMax=" + encodeURIComponent(max.toISOString());
    const j = await api(url);
    return (j.items || []).map(ev => ({
      id: ev.id, title: ev.summary || "(no title)",
      start: (ev.start && (ev.start.dateTime || ev.start.date)) || null,
      allDay: !!(ev.start && ev.start.date && !ev.start.dateTime),
      link: ev.htmlLink
    })).filter(e => e.start);
  };

  J.gcalCreate = async function (title, startISO, endISO) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = new Date(startISO);
    const end = endISO ? new Date(endISO) : new Date(start.getTime() + 60 * 60000);
    const body = { summary: title, start: { dateTime: start.toISOString(), timeZone: tz }, end: { dateTime: end.toISOString(), timeZone: tz } };
    return api("https://www.googleapis.com/calendar/v3/calendars/primary/events",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  };

  // ---------------- Gmail ----------------
  async function fetchMessages(q, max) {
    const list = await api("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=" + (max || 6) + "&q=" + encodeURIComponent(q));
    const ids = (list.messages || []).map(m => m.id);
    const full = await Promise.all(ids.map(id =>
      api("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject")));
    return full.map(m => {
      const h = (m.payload && m.payload.headers) || [];
      const get = n => (h.find(x => x.name === n) || {}).value || "";
      return { id: m.id, from: get("From"), subject: get("Subject") || "(no subject)", snippet: (m.snippet || "").trim() };
    });
  }
  J.gmailRecent = () => fetchMessages("is:unread in:inbox", 6);
  J.gmailSearch = (q) => fetchMessages(q, 5);

  J.gmailSend = async function (to, subject, body) {
    const mime = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
    const raw = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return api("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
  };

  // ---------------- Context for the AI ----------------
  let unread = 0;
  J.googleContext = function () {
    if (!connected) return "";
    const bits = [];
    const today = J.googleEvents.filter(e => (e.start || "").slice(0, 10) === J.todayKey());
    if (today.length) bits.push("Google Calendar today: " + today.map(e => e.title).join("; ") + ".");
    if (unread) bits.push(unread + " unread email(s) in the inbox.");
    return bits.join(" ");
  };

  // ---------------- UI ----------------
  function renderInbox(items, err) {
    const wrap = document.getElementById("inboxList");
    if (!wrap) return;
    if (err) { wrap.innerHTML = '<div class="muted tiny">' + err + '</div>'; return; }
    if (!connected) { wrap.innerHTML = '<div class="muted tiny">Connect Google in ⚙ Settings to see your inbox.</div>'; return; }
    if (!items || !items.length) { wrap.innerHTML = '<div class="muted tiny">Inbox zero. Nothing unread. ✨</div>'; return; }
    wrap.replaceChildren(...items.map(m => {
      const who = m.from.replace(/<.*>/, "").replace(/"/g, "").trim() || m.from;
      return J.el("a", { class: "mail-row", href: "https://mail.google.com/mail/u/0/#inbox/" + m.id, target: "_blank", rel: "noopener" }, [
        J.el("div", { class: "mail-top" }, [
          J.el("span", { class: "mail-from", text: who }),
        ]),
        J.el("div", { class: "mail-subj", text: m.subject }),
        J.el("div", { class: "mail-snip muted tiny", text: m.snippet.slice(0, 90) })
      ]);
    }));
  }

  J.refreshGoogle = async function () {
    if (!connected) { renderInbox(); return; }
    try {
      const [events, mails] = await Promise.all([J.gcalUpcoming().catch(() => []), J.gmailRecent().catch(() => [])]);
      J.googleEvents = events;
      unread = mails.length;
      renderInbox(mails);
      J.renderCalendar && J.renderCalendar();
    } catch (e) {
      renderInbox(null, e.message);
    }
  };

  J.googleConnect = async function () {
    try {
      await requestToken(true);
      J.toast("Google connected.");
      updateConnUI();
      J.refreshGoogle();
    } catch (e) { J.toast("Google: " + e.message); }
  };
  J.googleDisconnect = function () {
    if (accessToken && window.google) { try { google.accounts.oauth2.revoke(accessToken); } catch (e) {} }
    accessToken = null; connected = false; J.googleEvents = []; unread = 0;
    const s = J.state(); s.googleConnected = false; J.save();
    updateConnUI(); renderInbox(); J.renderCalendar && J.renderCalendar();
    J.toast("Google disconnected.");
  };

  function updateConnUI() {
    const btn = document.getElementById("googleConnBtn");
    const status = document.getElementById("googleStatus");
    if (btn) btn.textContent = connected ? "Disconnect" : "Connect Google";
    if (status) { status.textContent = connected ? "Connected ✓" : "Not connected"; status.className = "muted tiny" + (connected ? " good" : ""); }
  }

  J.initGoogle = function () {
    const btn = document.getElementById("googleConnBtn");
    if (btn) btn.addEventListener("click", () => connected ? J.googleDisconnect() : J.googleConnect());
    const refresh = document.getElementById("refreshInbox");
    if (refresh) refresh.addEventListener("click", () => J.refreshGoogle());
    renderInbox();
    updateConnUI();
    // try to silently reconnect if the user connected before
    const s = J.state();
    if (s.googleClientId && s.googleConnected) {
      requestToken(false).then(() => { connected = true; updateConnUI(); J.refreshGoogle(); }).catch(() => {});
    }
    setInterval(() => { if (connected) J.refreshGoogle(); }, 5 * 60 * 1000);
  };

})(window.J);
