/* ============================================================
   markets.js — crypto tickers via CoinGecko (free, no key)
   ============================================================ */
(function (J) {
  "use strict";

  const NAMES = {
    bitcoin: "BTC", ethereum: "ETH", solana: "SOL", cardano: "ADA",
    dogecoin: "DOGE", ripple: "XRP", polkadot: "DOT", chainlink: "LINK",
    litecoin: "LTC", avalanche2: "AVAX", polygon: "MATIC", tron: "TRX"
  };
  const ICON = { bitcoin: "₿", ethereum: "Ξ", solana: "◎", dogecoin: "Ð" };

  async function load() {
    const wrap = document.getElementById("marketList");
    if (!wrap) return;
    const ids = (J.state().coins || []).join(",");
    if (!ids) { wrap.innerHTML = '<div class="muted tiny">No coins tracked. Add one with +.</div>'; return; }
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}`
        + `&vs_currencies=usd&include_24hr_change=true`;
      const data = await (await fetch(url)).json();
      const rows = (J.state().coins || []).map(id => {
        const d = data[id];
        if (!d) return null;
        const chg = d.usd_24h_change || 0;
        const up = chg >= 0;
        const price = d.usd >= 1 ? d.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : d.usd.toLocaleString(undefined, { maximumFractionDigits: 6 });
        const sym = NAMES[id] || id.toUpperCase();
        return J.el("div", { class: "mk-row" }, [
          J.el("div", { class: "mk-name" }, [
            J.el("span", { class: "mk-ico", text: ICON[id] || sym[0] }),
            J.el("b", { text: sym })
          ]),
          J.el("div", { class: "mk-price", text: "$" + price }),
          J.el("div", { class: "mk-chg " + (up ? "up" : "down"),
            text: (up ? "▲" : "▼") + " " + Math.abs(chg).toFixed(2) + "%" })
        ]);
      }).filter(Boolean);
      wrap.replaceChildren(...rows);
    } catch (e) {
      wrap.innerHTML = '<div class="muted tiny">Markets unavailable (offline or rate-limited).</div>';
    }
  }

  J.addCoin = function () {
    const id = prompt("CoinGecko id (e.g. bitcoin, ethereum, solana, dogecoin):");
    if (!id) return;
    const key = id.trim().toLowerCase();
    const s = J.state();
    if (!s.coins.includes(key)) { s.coins.push(key); J.save(); load(); }
  };

  J.initMarkets = function () {
    document.getElementById("addCoin").addEventListener("click", J.addCoin);
    document.getElementById("refreshMarket").addEventListener("click", load);
    load();
    setInterval(load, 60 * 1000);
  };

})(window.J);
