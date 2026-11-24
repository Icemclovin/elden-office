# Shin-AI Tokyo

Een groeiende 3D-stad voor je lokale AI-chats. Elke actieve chat is een bouwplaats met een live status (**Aan het werk**, **Wacht op mij**, **Klaar**, **Slaapt**). Elke afgeronde chat bouwt blijvend een huis, flat of stuk infrastructuur.

## Starten

Vereist alleen Node.js 18 of nieuwer. Geen `npm install` nodig.

```bash
git clone https://github.com/Icemclovin/elden-office.git
cd elden-office
./start.sh        # of: npm start
```

Open daarna http://127.0.0.1:3737

## Instellingen

| Variabele        | Standaard         | Betekenis                     |
|------------------|-------------------|-------------------------------|
| `PORT`           | `3737`            | Poort van de server           |
| `CITY_DATA_PATH` | `data/city.json`  | Waar de stad wordt opgeslagen |

De stad wordt bij de eerste start automatisch aangemaakt.

## Welke chats worden gevonden

De server leest lokaal (niets gaat naar internet) transcripties uit:

- `~/.claude/projects`
- `~/.gemini/antigravity-cli/brain` en `~/.gemini/antigravity/brain`
- `~/.gemini/tmp`
- `~/.hermes`

Heb je geen van deze tools? Dan kun je in de interface test-chats starten.

## Licentie

MIT, zie [LICENSE](LICENSE). Je mag de code vrij gebruiken, aanpassen en delen.
