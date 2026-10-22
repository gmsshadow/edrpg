Elite: Dangerous Role Playing Game for FoundryVTT
=================================================

[![License](https://img.shields.io/github/license/ElSaico/edrpg-fvtt)](https://github.com/ElSaico/edrpg-fvtt/blob/main/LICENSE)

A Foundry VTT game system for the *Elite: Dangerous Role Playing Game*.

**Compatibility:** Foundry VTT v14 (ApplicationV2 sheets, `TypeDataModel` for every document type).

## Features

- **Character / NPC (individual scale)** sheet:
  - Name, portrait, gender, age, height, weight.
  - Rank derived from Rank Points, with Skill Cap, Karma and Endurance maxima from the rank table.
  - Dodge, Parry and Initiative derived from skill bonuses.
  - All 37 skills: base (10 + Pilot Trained + backgrounds), learning, score, bonus and the "used" tick box.
    Scores above the rank's Skill Cap are highlighted.
  - Click a skill name to make a skill check (D10 + bonus + modifier vs. difficulty, natural 1 fails and
    natural 10 succeeds). Shift-click skips the dialog.
  - Karma reroll button on chat cards (on a natural 1, or on any roll with the *Allow to reroll all tests* setting).
  - Backgrounds, Karma Capabilities and Enhancements lists with limits enforced for player characters.
- **Item sheets** for Backgrounds (choices used, skill bonuses), Karma Capabilities (category, cost) and Enhancements.
- Initiative: `1d10 + Tactics bonus`.

## Development

No build step. The system is plain ES modules, Handlebars templates and CSS:

```
system.json
module/      ES modules (entry: module/edrpg.mjs)
templates/   Handlebars templates for sheets and chat cards
styles/      CSS and fonts
lang/        Localisation
```

Symlink or copy the folder into `Data/systems/edrpg` and reload Foundry.
