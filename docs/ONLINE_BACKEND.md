# Online Backend Plan — Real Sign-ins, Cross-Device Decks, Global Leaderboard

The game today is a static client: accounts, decks, and stats live in localStorage; multiplayer is peer-to-peer via matchmaking codes. This document maps the path to real online identity without giving up the "one folder, no build step" development experience.

## Recommended stack: Supabase

Postgres + Auth + Realtime + Row-Level Security + Edge Functions in one hosted service with a generous free tier and a plain JS client that works from a static page (one `<script>` tag — consistent with this project's zero-build philosophy). Firebase is the closest alternative (slightly easier auth UI, worse relational queries for leaderboards); a hand-rolled Node/Fastify + Postgres server is the most controllable but the most work and the only option if self-hosting is a hard requirement.

## Architecture at a glance

```
Static client (index.html)                Supabase
┌────────────────────────┐   HTTPS   ┌──────────────────────────┐
│ StorageProvider        │──────────▶│ Auth (magic link/OAuth)  │
│  ├─ LocalProvider      │           │ Postgres + RLS           │
│  └─ RemoteProvider     │           │  users / decks / matches │
│ NetManager (PeerJS)    │           │  leaderboard views       │
│ Engine (unchanged)     │           │ Edge Fn: verify_match    │
└────────────────────────┘           └──────────────────────────┘
        │  P2P gameplay stays exactly as-is
        ▼
   PeerServer + TURN (self-hosted, replaces public broker)
```

**Key principle:** gameplay stays peer-to-peer and the engine stays untouched. The backend owns identity, deck storage, and results — not the moves.

## 1. Sign-ins

- Supabase Auth with **magic-link email** (no passwords to manage) plus optional Google/Apple OAuth. Session persists in the browser; the client reads `supabase.auth.getUser()`.
- **Anonymous-first:** keep the current local accounts working with no sign-in. Add "Sign in to sync" on the accounts screen. On first sign-in, run a one-time migration: upload the local profile's decks/stats and mark the local profile as linked.
- The `Users` module becomes a thin wrapper: `current()` returns the signed-in identity when present, else the local profile. Display names are a `profiles` table row (unique, 3–14 chars, profanity-filtered server-side).

## 2. Cross-device decks

Schema:

```sql
create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null check (char_length(name) <= 18),
  cards jsonb not null,            -- ["spark","spark","frost_witch",...]
  is_active boolean default false,
  updated_at timestamptz default now()
);
-- RLS: user_id = auth.uid() for select/insert/update/delete
-- Enforce the 5-deck cap with a trigger, not client code.
```

Client changes are confined to one seam: extract today's `Decks` object into a `StorageProvider` interface (`load/save/activeCards`) with `LocalProvider` (current code) and `RemoteProvider` (Supabase queries + a small in-memory cache). Sync strategy: **optimistic local-first** — write locally, push in the background, last-write-wins on `updated_at` (decks are small and single-owner; conflicts are rare and harmless). Offline play always works because the active deck is cached locally.

This also fixes BUG_HUNT #15 for free: server decks have real ids.

## 3. Global leaderboard

**Data flow:** both clients report the match result; the server cross-checks.

```sql
create table match_reports (
  id bigint generated always as identity primary key,
  match_code text not null,        -- the GAAM-XXXX code + timestamp bucket
  reporter uuid references auth.users not null,
  opponent uuid,                   -- null for vs-AI (excluded from ranking)
  seed bigint not null,
  my_locations int, opp_locations int, my_power int, opp_power int,
  outcome text check (outcome in ('win','lose','draw')),
  created_at timestamptz default now()
);
```

An Edge Function pairs the two reports for the same match code: if they agree (mirror-image outcomes, same seed), it writes a row to `matches` and updates ratings; if they disagree or only one arrives within 2 minutes, the match is flagged and unrated. Ranking: start with simple W/L + weekly seasons; move to **Glicko-2** when population justifies it. Leaderboard reads are a materialized view refreshed every minute — cheap and cache-friendly.

**Anti-cheat ladder** (implement in this order, each step raises the bar):
1. Paired-report cross-check (above) — kills casual result forgery.
2. Report includes the full move log (plays per turn). The Edge Function re-simulates the match: extract the pure engine (state + reveal logic, no DOM) into `engine.js` shared by client and server — deterministic by design thanks to the shared-seed RNG. Any divergence → flagged.
3. Rate limits, minimum account age for ranked, anomaly review (win-rate z-scores per account).

Note: true cheat-proofing of a P2P game (e.g., an opponent's client revealing your hand — it can't today, hands never leave the owner's machine; our protocol already only shares plays) is bounded; server-authoritative gameplay is the endgame if stakes ever get high.

## 4. Matchmaking & connectivity upgrades

- Replace the public PeerJS broker with a **self-hosted PeerServer** (one small container) and add a **TURN server** (coturn) for symmetric-NAT users — fixes BUG_HUNT #21.
- Optional "Quick Match": a `queue` table + Supabase Realtime channel pairs two waiting players and hands both a generated code; the existing code-join flow does the rest. No gameplay changes.

## Phased rollout

| Phase | Scope | Effort |
|---|---|---|
| 1 | Supabase project, auth, profiles, deck sync behind StorageProvider | 1–2 days |
| 2 | Match reporting + paired verification + global leaderboard UI tab | 2–3 days |
| 3 | Engine extraction + server-side re-simulation, seasons/Glicko | ~1 week |
| 4 | Self-hosted PeerServer + TURN, Quick Match queue | 2–3 days |

Costs: Supabase free tier covers early traffic; a $6–12/mo VPS runs PeerServer+coturn. Nothing here requires changing the game loop, the config system, or the admin panel — the admin's "Export config.js" can later become "Publish config" writing to a `config_versions` table that clients fetch with a cache-busting version stamp.
