/* ============================================================
   links.js — quick launch grid
   ============================================================ */
(function (J) {
  "use strict";

  function normalize(url) {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return url;
  }
  function pickColor(name) {
    const colors = ["#38e8ff", "#7c5cff", "#43e6a0", "#ff8f5c", "#ff5d9e", "#ffcf5c", "#5ca8ff"];
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
    return colors[h % colors.length];
  }

  function render() {
    const grid = document.getElementById("linkGrid");
    if (!grid) return;
    const s = J.state();
    const tiles = s.links.map((l, idx) => {
      const color = l.color || pickColor(l.name);
      const letter = (l.name || "?").trim()[0].toUpperCase();
      const ico = J.el("div", { class: "link-ico", text: letter, style: `background:${color}` });
      const name = J.el("div", { class: "link-name", text: l.name });
      const remove = J.el("button", { class: "link-remove", text: "✕", title: "remove",
        onclick: (e) => {
          e.preventDefault(); e.stopPropagation();
          s.links.splice(idx, 1); J.save(); render();
        } });
      return J.el("a", { class: "link-tile", href: normalize(l.url), target: "_blank", rel: "noopener" },
        [remove, ico, name]);
    });
    grid.replaceChildren(...tiles);
  }

  J.addLink = function (name, url) {
    name = (name || "").trim(); url = (url || "").trim();
    if (!name || !url) return false;
    J.state().links.push({ name, url: normalize(url), color: pickColor(name) });
    J.save(); render();
    return true;
  };

  J.initLinks = function () {
    document.getElementById("addLinkBtn").addEventListener("click", () => {
      const name = prompt("Shortcut name (e.g. Notion):");
      if (!name) return;
      const url = prompt("URL (e.g. notion.so):");
      if (!url) return;
      J.addLink(name, url);
      J.toast(`Added ${name} to Quick Launch`);
    });
    render();
    J.renderLinks = render;
  };

})(window.J);
