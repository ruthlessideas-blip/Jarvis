# J.A.R.V.I.S — Personal Command Center

A self-contained, offline-first assistant dashboard for your computer. No build
step, no accounts, no servers to sign up for. Everything you add (tasks, notes,
habits, shortcuts) is saved **locally in your browser** on this machine.

![JARVIS](https://img.shields.io/badge/status-online-brightgreen) `local · private · no keys required`

## What's inside

| Panel | What it does |
|-------|--------------|
| **JARVIS AI** 🤖 | A real AI assistant powered by Claude. Click the 💬 button (or press `j`) to chat — it has context on your tasks and can plan, draft, explain, and brainstorm. Type a question in the command bar and it answers there too. |
| **Command bar** | Type anything: `add task call mom`, `weather`, `search rocket league`, a URL, `jarvis plan my day`, or a plain question. Press `/` to jump to it. |
| **Command palette** | Press `⌘K` / `Ctrl+K` for a searchable list of every action. |
| **Voice** | Click the 🎙️ mic (or palette → Voice) and speak a command. |
| **Tasks** | Add, check off, pin ★, edit (double-click), auto-sorted. |
| **Habits** | 7-day tracker with 🔥 streaks. |
| **Calendar** | Month view + agenda. Click any day to add an event; upcoming events list automatically. |
| **Quick Launch** | Your favorite sites as tiles. Add/remove your own. |
| **Focus** | Pomodoro timer (25/5/15) with session counting + chime. |
| **Focus Sounds** | Ambient soundscapes — rain, waves, wind, brown/white noise — generated locally in your browser, no files or streaming. |
| **Weather** | Live current + 5-day forecast (auto-location or set a city). |
| **Markets** | Live crypto tickers with 24h change (CoinGecko). Track any coins you like. |
| **Scratchpad** | Free-form notes, auto-saved as you type. |
| **World Clocks** | Six time zones at a glance. |
| **Briefing** | Top tech stories (Hacker News). |
| **Settings ⚙** | Name, city, accent color, 24h clock, your AI key, backup export/import, reset. |

## Turning on JARVIS AI

The AI chat needs an Anthropic API key (it talks to Claude directly from your browser — nothing goes through any server of mine).

1. Get a key at **console.anthropic.com**.
2. Open **⚙ Settings → JARVIS AI** and paste it in.
3. Click 💬 (or press `j`, or just ask a question in the command bar).

The key is stored only in this browser's local storage and is sent only to Anthropic's API. The assistant runs on Claude Opus 4.8 and streams replies live.

## Run it

### Easiest — just open it
Double-click **`index.html`**. It works straight from the file system.

> Two features need a local web server (browser security rules): **voice input**
> and **auto-location weather**. Setting a city in Settings makes weather work
> even from a plain file open.

### Recommended — run a tiny local server (unlocks everything)

```bash
cd Jarvis
./start.sh          # macOS / Linux
```
or manually:
```bash
python3 -m http.server 4173
```
Then open **http://localhost:4173** in Chrome or Edge.

On Windows, double-click `start.bat`, or run `python -m http.server 4173`.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus the command bar |
| `⌘K` / `Ctrl+K` | Open command palette |
| `t` | Jump to add-task |
| `f` | Start / pause focus timer |
| `j` | Open JARVIS AI chat |
| `Esc` | Close any overlay |

## Privacy

All of your data — tasks, notes, habits, events, shortcuts, and your API key —
lives in this browser's `localStorage` under the key `jarvis.state.v1`. Nothing
is uploaded to any server of mine. Outbound requests go only to:
**open-meteo.com** (weather), **hacker-news** (briefing), **coingecko.com**
(markets), and **api.anthropic.com** (the AI chat, only when you use it, with
your own key). Use Settings → **Export backup** to save a copy, or **Reset all**
to wipe everything.

## Make it your own

- Add shortcuts with **+ Add** on the Quick Launch card.
- Change the accent color in Settings.
- Everything is plain HTML/CSS/vanilla JS in `index.html`, `css/`, and `js/` —
  no framework, easy to extend. Ask Claude Code to add a new panel any time.
