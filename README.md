Elite: Dangerous Role Playing Game for FoundryVTT
=================================================

[![License](https://img.shields.io/github/license/gmsshadow/edrpg)](https://github.com/gmsshadow/edrpg/blob/main/LICENSE)

A Foundry VTT game system for the *Elite: Dangerous Role Playing Game*.

**Compatibility:** Foundry VTT v14 (ApplicationV2 sheets, `TypeDataModel` for every document type).

See [CHANGELOG.md](CHANGELOG.md). The `version` in `system.json` is bumped (patch) with every change so Foundry offers the update.

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
- **Opponent** stat-block sheet matching the book's opponent boxes.
- **Combat:** a Combat tab with weapons, protection and combat Karma; an attack dialog and chat card (range/Finesse +
  Defence + cover vs. To Hit, ammo, Burst margin, Karma boosts and rerolls); damage cards with armour, Hardened,
  knockdown and dying/bleeding-out conditions, plus stabilising and treating wounds.
- **Compendia:** Backgrounds, Enhancements (automated), Karma Capabilities, Weapons, Armour, Cybernetics (automated),
  Clothing, Equipment and Opponents (sample).
- **Character creation** checklist with independent learning and the starting equipment kit; **rank-ups**.
- **Partners**: linked companion characters using their host's Karma.
- **Vehicles**: Vehicle Data Sheet actors with crew, weapons and the Speed Table; Vehicles compendium.
- **Vehicle combat turn**: speed changes limited by Accelerate/Decelerate, shield recharge and charge-up, GM obstacle
  checks (light/medium/heavy tables, sudden slopes by gravity), and the Joust, Snipe, Strafe, Chicken, Flee, Pass,
  Tail, Broadsides, Ram and Disengage actions with Pursuits. Zones follow tokens on the combat maps.
- **Assets**: combat map scenes (Scenes & Combat Maps compendium) and ship/vehicle tokens under `systems/edrpg/assets/tokens/`.
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
