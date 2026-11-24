# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Local software developers running multiple concurrent AI coding and chat sessions (Claude Code, Antigravity CLI/IDE, Hermes, Gemini CLI) on their own Linux workstation who want an immediate, ambient, glanceable view of every active chat alongside a rewarding, persistent visual record of completed work.

## Product Purpose

Turn active local AI chats into builders constructing a persistent, living 3D city on `localhost:3737`. Each active chat occupies a construction site reflecting its live state (**Aan het werk**, **Wacht op mij**, **Klaar**, **Slaapt**). Every time a chat finishes, it permanently builds a house, apartment building (flat), or piece of civic infrastructure saved on disk—growing the city from a small settlement into a richer, greener, more vibrant metropolis.

## Positioning

Unlike ephemeral agent dashboards or static logs, every completed AI conversation leaves a permanent, inspectable architectural footprint on disk (`data/city.json`) whose type reflects the work done and visibly upgrades the entire surrounding city through milestones (streets, parks, lighting, transit, skyline).

## Operating Context

- Runs locally offline on `http://127.0.0.1:3737` via pure Node.js built-ins (zero external runtime dependencies, no `npm install`).
- Discovers real local chat transcripts from `~/.claude/projects`, `~/.gemini/antigravity-cli/brain`, `~/.gemini/antigravity/brain`, `~/.hermes`, and `~/.gemini/tmp`, streamed live via SSE (`/api/events`).
- Supports interactive simulation/spawning of test chats and manual status overrides alongside real chats, plus a city reset option.
- Dutch-language UI (`Aan het werk`, `Wacht op mij`, `Klaar`, `Slaapt`).

## Capabilities and Constraints

- Four exact live agent states: `working` (Aan het werk), `waiting` (Wacht op mij), `done` (Klaar), `sleeping` (Slaapt).
- Automatic building classification from completed chats: large/feature sessions build flats & towers (`flat`), shorter sessions build houses (`huis`), and tooling/setup/infrastructure sessions build civic infrastructure (`infrastructuur` — parks, plazas, bridges, solar/wind, transit stops); manual type selection available when spawning simulated builds.
- Persistent disk storage (`data/city.json`) tracking all permanently built structures, city milestones/levels (from settlement to metropolis unlocking paved avenues, trees, lamps, transit, landmarks), and a deliberate reset action.
- High-performance, lightweight 3D interactive canvas (pan, 360° orbit, tilt toggle, zoom, smooth 60fps with zero heavy `backdrop-filter` or per-frame `shadowBlur` bottlenecks).
- Must completely replace all previous Elden Ring theming, lore, naming, and visual motifs.

## Brand Commitments

- User-confirmed city world: **Tokyo — Moderne Japanse metropool in warme schemering** (warm cedar houses, modern glass-and-concrete flats, sakura blossom parks, elevated metro/bridges, warm lit windows, subtle neon/vermilion urban accents).


## Evidence on Hand

- Existing local Node.js backend (`server.mjs`, `src/scanners.mjs`, `src/demo-store.mjs`) with stat-cached head/tail JSONL scanning, ETag/gzip serving, and SSE broadcasting.
- Real local AI transcripts present on this workstation across Claude Code, Antigravity, and Hermes.

## Product Principles

- **Glanceable state first**: Which AI needs attention (`Wacht op mij`) or is actively building (`Aan het werk`) must be readable in under one second without hovering.
- **Permanent visible reward**: Completed work never vanishes—every finished chat permanently enriches the city on disk and visually elevates its surroundings.
- **Fast and lightweight by default**: Smooth interactive 3D rendering and sub-millisecond cached backend responses on a local machine with zero cloud dependencies.
- **Honest local data**: Real chats and simulated test builders are clearly distinguishable and inspectable.
