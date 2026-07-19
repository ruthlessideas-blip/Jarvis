/* ============================================================
   worldclocks.js — multiple timezones
   ============================================================ */
(function (J) {
  "use strict";

  const ZONES = [
    { city: "Local",        tz: undefined },
    { city: "San Francisco",tz: "America/Los_Angeles" },
    { city: "New York",     tz: "America/New_York" },
    { city: "London",       tz: "Europe/London" },
    { city: "Tokyo",        tz: "Asia/Tokyo" },
    { city: "Sydney",       tz: "Australia/Sydney" }
  ];

  function paint() {
    const wrap = document.getElementById("worldClocks");
    if (!wrap) return;
    const use24 = J.state().clock24;
    wrap.replaceChildren(...ZONES.map(z => {
      const opts = { hour: "2-digit", minute: "2-digit", hour12: !use24 };
      if (z.tz) opts.timeZone = z.tz;
      let time = "--:--", sub = "";
      try {
        time = new Intl.DateTimeFormat(undefined, opts).format(new Date());
        const dopts = { weekday: "short" };
        if (z.tz) dopts.timeZone = z.tz;
        sub = new Intl.DateTimeFormat(undefined, dopts).format(new Date());
      } catch (e) {}
      return J.el("div", { class: "wc" }, [
        J.el("div", { class: "wc-city", html: `${z.city}<small>${sub}</small>` }),
        J.el("div", { class: "wc-time", text: time })
      ]);
    }));
  }

  J.initWorldClocks = function () {
    paint();
    setInterval(paint, 30 * 1000);
    J.repaintClocks = paint;
  };

})(window.J);
