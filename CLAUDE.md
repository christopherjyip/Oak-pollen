# Oak-Pollen: Pentair IntelliCenter Cloud Interface

## Project Overview

A self-hosted web interface for a Pentair IntelliCenter pool controller (firmware 1.064), replacing the broken Pentair Pool iOS app. The primary pain point is **historical temperature data** — Pentair's history feature doesn't work. This app provides full pool/spa control and temperature graphing with weather overlay.

## Architecture

```
User (anywhere)
  ↓ Tailscale (encrypted tunnel, bypasses Starlink CGNAT)
CloudKey Gen2 Plus (1TB SSD, always on, SonomaHouse LAN)
  ├── Next.js app (systemd service on port 3000)
  ├── SQLite database (90-day temperature history)
  ├── Cron job (every 15 min → polls IntelliCenter)
  └── IntelliCenter (same LAN, port 6680, zero auth)
```

- **No cloud services required** — everything runs on the CloudKey
- **Tailscale** for remote access (required because Starlink has double NAT/CGNAT, so port forwarding and UniFi WireGuard VPN won't work)
- **Vercel** hosts a demo instance with `DEMO_MODE=true` for testing

## Tech Stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **node-intellicenter v0.5.3** — NPM library for local IntelliCenter communication via WebSocket on port 6680
- **better-sqlite3** — persistent temperature history with WAL mode
- **Recharts** — interactive temperature charting
- **Weather Underground API** — historical weather + 48h forecast overlay (requires API key; free with registered PWS)

## Key Technical Details

### IntelliCenter Protocol
- WebSocket on port 6680, raw TCP on port 6681
- JSON-based messages: `GetParamList` / `SetParamList`
- `node-intellicenter` exports `Unit` and `FindUnits` from main; message helpers (`GetBodyStatus`, `GetCircuitStatus`, `GetChemicalStatus`, etc.) from `node-intellicenter/messages`
- **Port 6680 has ZERO authentication** — never expose to the internet
- Pentair cloud uses AWS IoT Core + Cognito — not publicly reverse-engineered, all community projects are local-only

### String-Based IDs (not numeric like ScreenLogic)
- Bodies: `B1101` (Pool), `B1102` (Spa)
- Circuits: `C0001`–`C0008`
- Pumps: `P0001`, `P0002`
- Heaters: `H0001`
- Schedules: `S0001`–`S0004`

### Settings System
- Settings persisted to `data/settings.json`
- Cascade: env vars → settings.json (UI wins)
- In-app settings page at `/settings` for configuring IntelliCenter host, Weather Underground, and data retention
- Station lat/lon auto-resolved from WU station metadata (no manual lat/lon needed)
- API key masked in GET responses

## Repository Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (temps, circuits, pumps)
│   ├── history/page.tsx            # Temperature history charts (24H–3M ranges)
│   ├── circuits/page.tsx           # Circuit toggle controls
│   ├── schedules/page.tsx          # Schedule list
│   ├── chemistry/page.tsx          # Chemistry gauges
│   ├── settings/page.tsx           # In-app configuration
│   └── api/pool/
│       ├── status/route.ts         # GET pool status
│       ├── history/route.ts        # GET historical temps (range param)
│       ├── circuits/route.ts       # GET/PUT circuit state
│       ├── temperature/route.ts    # PUT heat mode / set point
│       ├── schedules/route.ts      # GET schedules
│       ├── settings/route.ts       # GET/PUT/POST settings + WU validation
│       └── db-stats/route.ts       # GET/POST database stats + pruning
├── components/
│   ├── Navigation.tsx              # Bottom tab bar (6 tabs)
│   ├── TemperatureChart.tsx        # Recharts ComposedChart
│   ├── TemperatureCard.tsx         # Body temp + setpoint controls
│   ├── CircuitCard.tsx             # Toggle buttons with icons
│   ├── PumpCard.tsx                # RPM/watts/GPM display
│   ├── ChemistryPanel.tsx          # pH/ORP gauges
│   └── ScheduleList.tsx            # Schedule display
├── hooks/
│   └── usePoolStatus.ts           # 10s polling, optimistic updates
└── lib/
    ├── intellicenter.ts           # IntelliCenter service layer + demo mode
    ├── types.ts                   # All TypeScript interfaces
    ├── db.ts                      # SQLite layer (temps, weather, pruning, stats)
    ├── weather.ts                 # Weather Underground integration
    └── settings.ts                # JSON settings persistence

scripts/
├── poll-temperatures.ts           # Cron job: polls IntelliCenter + WU every 15 min
└── setup-cloudkey.sh              # One-shot CloudKey setup (Node, Tailscale, systemd, cron)

Dockerfile                         # Multi-stage build with persistent data volume
vercel.json                        # Demo deployment config
```

## Deployment (CloudKey)

1. SSH into CloudKey via Teleport VPN
2. Install Tailscale: `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`
3. Clone repo: `git clone <repo> /opt/pool-controller && cd /opt/pool-controller && git checkout claude/setup-new-project-57ITA`
4. Run setup: `sudo ./scripts/setup-cloudkey.sh` (installs Node 20, systemd service, cron, log rotation)
5. Build: `npm ci && npm run build`
6. Configure via app UI at `http://<cloudkey-lan-ip>:3000/settings`
7. Start: `sudo systemctl enable --now pool-controller`
8. Access remotely: `http://<tailscale-ip>:3000`

## Current Branch

All work is on `claude/setup-new-project-57ITA`. Commits:
1. Initial project scaffolding
2. Replace ScreenLogic with IntelliCenter protocol
3. Add deployment config (Dockerfile, Vercel, standalone output)
4. Add temperature history dashboard with charts and weather overlay
5. Add CloudKey deployment with temperature polling and 90-day retention
6. Add in-app settings page with Weather Underground auto-config

## Pending / Next Steps

- Deploy to CloudKey and connect to real IntelliCenter
- Install Tailscale on CloudKey for remote access
- Configure Weather Underground API key and station ID via settings page
- Verify live temperature recording with real controller data
- Consider adding push notifications for temperature alerts
- Home screen shortcut on iPhone for app-like feel
