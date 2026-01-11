# footballgm

This is **Football GM Lite** — a minimal browser-based football management simulation with a black & orange UI.

Features:
- Team management (roster, player cards)
- Week‑by‑week season simulation
- Basic free agency and 1‑for‑1 trades
- 3–5 round draft with generated prospects
- Settings: difficulty, season length, salary cap toggle

Run locally

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

Open the shown URL (usually http://localhost:5173).

Data is saved to browser `localStorage` under key `fgm_league_v1`.

Files of interest:
- `src/game/api.js` — game logic API (simulateWeek, generateProspects, signFreeAgent, tradePlayers)
- `src/components` — reusable UI components (PlayerCard, TeamDashboard, Roster, Draft, FreeAgency)
- `src/styles.css` — black/orange theme and responsive styles

If you'd like, I can wire up a few enhancements next: prettier UI transitions, difficulty slider in the settings panel, or export/import league JSON.

Trades and AI

- There's a basic 1-for-1 trade UI under the `Trade` view. Other teams evaluate trades via `src/game/api.js` using a simple value model (overall + youth premium) and a positional-need bonus. AI teams will accept trades that don't make them lose too much value given the league `difficulty` setting.

Running tests

Run the small Node script that demonstrates trade evaluation:

```bash
npm run test:node
```

New features added:

- UI polish: hover transitions, mini jerseys for players, clickable player cards.
- Player pages: open a player's page from the roster or key players.
- Trade history: recorded under `league.tradeHistory` and viewable with the `TradeHistory` component.
- Notifications: recorded under `league.notifications` and surfaced in the UI via the `Notifications` component.

