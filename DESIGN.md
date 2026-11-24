# Design System — Shin-AI Tokyo

## Visual World

**Tokyo — Moderne Japanse metropool in warme schemering** (`Operate` mode).

A calm, high-contrast twilight architectural interface where a full-bleed 3D Tokyo city is the primary workspace and every UI surface remains neutral, calibrated, and unobtrusive so live construction states and permanent city growth carry the visual signal.

## Color Tokens

### UI Shell & Surfaces (`public/css/style.css`)
- Ground: `#111722` (`--bg-ground`)
- Command shell / chrome: `#12161e` (`--bg-shell`)
- Elevated panels & drawers: linear gradient `rgba(22, 27, 37, 0.97)` to `rgba(16, 20, 28, 0.96)` (zero `backdrop-filter` for locked 60fps canvas performance)
- Interactive surface / hover: `#1a212e` / `#222b3b`
- Inputs: `#0d1118`
- Structural hairlines (1px): `rgba(226, 232, 240, 0.13)` (`--border-hairline`), `rgba(226, 232, 240, 0.24)` (`--border-strong`)

### Ink & Accents
- Primary ink: `#f1efe9` (>13:1 contrast on shell)
- Secondary ink: `#9aa5b4` (>6:1 contrast)
- Muted ink: `#8491a3`
- Focus / primary sky accent: `#38bdf8` (`--accent-sky`)
- Completed / permanent city emerald: `#34d399` (`--accent-emerald`)
- Sakura highlight: `#f48fb1` (`--accent-sakura`)

### Four Live Builder States
- `working` (**Aan het werk**): `#f59e0b` (construction crane amber)
- `waiting` (**Wacht op mij**): `#ef4444` (vermilion-coral urgent approval beacon)
- `done` (**Klaar**): `#34d399` (permanent completion emerald)
- `sleeping` (**Slaapt**): `#64748b` (quiet twilight slate)

### 3D City World (`public/js/scene.js`, `public/js/sprites.js`)
- Twilight ground & bay: `#111722` -> `#192434`, Tokyo canal water `#183546`
- Asphalt blocks & sidewalks: `#212731` with `#3b4350` curbs and Shibuya Scramble crosswalk markings
- Houses (`huis`): warm cedar timber (`#b97648`, `#8f5632`), charcoal eaves (`#2b3340`), warm shoji glow (`#ffcf77`)
- Flats (`flat`): architectural concrete (`#556070`, `#3d4654`), dark curtain glass, lit amber window grids (`#ffd37a`, `#ffb74d`), red rooftop aviation beacons
- Infrastructure (`infrastructuur`): jade park lawns (`#284d43`), sakura canopies (`#f49bb4`, `#f9c6d3`), solar glass (`#2563eb`, `#38bdf8`), vermilion plaza gates (`#e04f3e`), steel-arch canal bridges, and Level 4 elevated monorail viaduct

## Typography

- UI & headings: `"Noto Sans", "Inter", "Liberation Sans", system-ui, -apple-system, sans-serif` (`14px` base, `1.5` leading)
- Monospace (parcel codes `#001`, paths): `"Droid Sans Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
- Numerals: `font-variant-numeric: tabular-nums` across all counters, milestone gauges, population stats, and timestamps.

## Layout & Interaction Architecture

- **Top Command Bar (`56px`)**: Brand mark & title, live SSE indicator, clickable city milestone meter (`Niv. X · <Naam> · N gebouwen`), 5 status filter pills (`Alle`, `Aan het werk`, `Wacht op mij`, `Klaar`, `Slaapt`), `+ Bouwopdracht` popover, and `Geluid` toggle.
- **Full-Bleed 3D Canvas**: True perspective projection (`38°` default cinematic elevation, `64°` tactical overview via `V`, 360° orbit via right-drag / `Q`/`E`, floor pan, wheel zoom, zero `shadowBlur` or per-frame gradient allocations).
- **Dual Right Inspectiepaneel (`380px`)**: Inspects both active construction plots (status overrides, `Bouw voltooien & blijvend opslaan`, building type switcher, recent messages) and permanent completed buildings (`#001` catalog specs, architecture type, built date, coordinates).
- **Left Stadsregister Drawer**: Two tabs (`Actief` sorted by urgency; `Stad` catalog with growth milestones and search).
- **Browser Surfaces**: Custom twilight scrollbars, themed `::selection`, `2px` `#38bdf8` `:focus-visible` outlines, and `prefers-reduced-motion` support.
