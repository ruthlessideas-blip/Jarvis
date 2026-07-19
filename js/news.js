/* ============================================================
   news.js — Hacker News top stories (free, no key)
   ============================================================ */
(function (J) {
  "use strict";

  async function load() {
    const list = document.getElementById("newsList");
    try {
      const ids = await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")).json();
      const top = ids.slice(0, 8);
      const stories = await Promise.all(top.map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
      ));
      list.replaceChildren(...stories.filter(Boolean).map((s, i) => {
        const host = s.url ? new URL(s.url).hostname.replace(/^www\./, "") : "news.ycombinator.com";
        const url = s.url || `https://news.ycombinator.com/item?id=${s.id}`;
        return J.el("li", {}, [
          J.el("a", { href: url, target: "_blank", rel: "noopener" }, [
            J.el("span", { class: "news-rank", text: (i + 1) + "." }),
            J.el("span", { text: s.title }),
            J.el("span", { class: "news-meta", text: `▲${s.score || 0} · ${host}` })
          ])
        ]);
      }));
    } catch (e) {
      list.innerHTML = '<li class="muted tiny">Briefing unavailable (offline or blocked).</li>';
    }
  }

  J.initNews = function () {
    load();
    setInterval(load, 15 * 60 * 1000);
  };

})(window.J);
