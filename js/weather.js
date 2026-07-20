/* ============================================================
   weather.js — Open-Meteo (no API key required)
   ============================================================ */
(function (J) {
  "use strict";

  const WMO = {
    0: ["Clear", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
    56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
    80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Violent showers", "⛈️"],
    85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm + hail", "⛈️"], 99: ["Thunderstorm + hail", "⛈️"]
  };
  const desc = c => (WMO[c] || ["—", "🌡️"]);

  async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    const r = await fetch(url);
    const j = await r.json();
    if (!j.results || !j.results.length) throw new Error("City not found");
    const g = j.results[0];
    return { lat: g.latitude, lon: g.longitude, label: g.name + (g.country_code ? ", " + g.country_code : "") };
  }

  function browserGeo() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no geolocation"));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location" }),
        err => reject(err), { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`;
    const r = await fetch(url);
    return r.json();
  }

  function paint(data, label) {
    const body = document.getElementById("weatherBody");
    const cur = data.current;
    const [d, emoji] = desc(cur.weather_code);
    // stash a plain-language snapshot for the AI agent / brief
    J.lastWeather = `${label}: ${Math.round(cur.temperature_2m)}°F, ${d}, feels ${Math.round(cur.apparent_temperature)}°, humidity ${cur.relative_humidity_2m}%, wind ${Math.round(cur.wind_speed_10m)} mph. Today ${Math.round(data.daily.temperature_2m_max[0])}°/${Math.round(data.daily.temperature_2m_min[0])}°.`;
    body.innerHTML = "";
    body.append(
      J.el("div", { class: "weather-ico", text: emoji }),
      J.el("div", { class: "weather-main" }, [
        J.el("div", { class: "weather-temp", text: Math.round(cur.temperature_2m) + "°" }),
        J.el("div", { class: "weather-desc", text: d }),
        J.el("div", { class: "weather-loc", text: label })
      ]),
      J.el("div", { class: "weather-side", html:
        `Feels ${Math.round(cur.apparent_temperature)}°<br>💧 ${cur.relative_humidity_2m}%<br>💨 ${Math.round(cur.wind_speed_10m)} mph` })
    );

    const week = document.getElementById("weatherWeek");
    week.innerHTML = "";
    const days = data.daily;
    for (let i = 0; i < days.time.length; i++) {
      const dt = new Date(days.time[i] + "T00:00");
      const name = i === 0 ? "Today" : dt.toLocaleDateString(undefined, { weekday: "short" });
      const [, em] = desc(days.weather_code[i]);
      week.append(J.el("div", { class: "wday" }, [
        J.el("span", { text: name }),
        J.el("span", { class: "we", text: em }),
        J.el("b", { text: Math.round(days.temperature_2m_max[i]) + "°" }),
        J.el("span", { text: Math.round(days.temperature_2m_min[i]) + "°" })
      ]));
    }
  }

  J.loadWeather = async function () {
    const body = document.getElementById("weatherBody");
    body.innerHTML = '<div class="weather-loading">Locating…</div>';
    try {
      let loc;
      const city = J.state().city && J.state().city.trim();
      if (city) loc = await geocodeCity(city);
      else {
        try { loc = await browserGeo(); }
        catch (e) { loc = await geocodeCity("New York"); loc.label = "New York (set your city in ⚙)"; }
      }
      const data = await fetchWeather(loc.lat, loc.lon);
      paint(data, loc.label);
    } catch (e) {
      body.innerHTML = `<div class="weather-loading">Weather unavailable.<br><span class="tiny">${e.message}. Set a city in Settings, or run over http (see README).</span></div>`;
    }
  };

  J.initWeather = function () {
    document.getElementById("refreshWeather").addEventListener("click", J.loadWeather);
    J.loadWeather();
    setInterval(J.loadWeather, 30 * 60 * 1000); // refresh every 30 min
  };

})(window.J);
