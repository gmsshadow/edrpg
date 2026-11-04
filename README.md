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
- **Spaceships**: a Spaceship actor type (crewed, or a GM opponent stat block) sharing the vehicle sheet and combat
  turn, with the space rules: Dogfight, Flight Assist Off, size-based Chicken and Ram damage, out-of-control ships,
  small ships fixing turrets forwards, damaged components' effects, and ship destruction (emergency eject, cargo).
  Components and critical hits, targeted shots, and equipment actions (chaff, mines, point defence, ECM, Shield Cell
  Banks, floating bonuses).
- **Engineering** (Espionage Supplement): an Engineer button on a ship's components rolls Repair on the component's
  Engineering Table (or lets a professional roll twice, or applies an Overclocking pick) and applies the effects and
  faults to the ship. **Ship-launched fighters** (Super Traders): the F63 Condor, GU-97 and Taipan in four loadouts;
  drop them on a carrier to dock them in its hangar, and launch them as an Equipment action.
- **Supplements**: backgrounds, enhancements and Karma Capabilities from the Espionage, Exploration, Military and
  Super Traders supplements, plus their weapons, armour, cybernetics and equipment (heavy pistols, laser carbines,
  rail rifles, Guardian Anti-Material Projectors, hacks, personal shields, alien artefacts), in a folder per book.
  Split Energy/Kinetic damage, armour-piercing and armour-destroying weapons, molten munitions, personal shields,
  the Cellular Regeneration Emitter and the Destabilisation Beam are automated.
- **Opponents compendium**: every individual-scale opponent in the Core Rules (51), plus the spaceship- and
  vehicle-scale ones and the drones; and the supplements' 68 opponents (individual, spaceship and vehicle scale) in a
  folder per book. Robotic opponents take their controller's Cyber bonus.
- **Roll Tables compendium**: the supplements' random generation tables (opponents by Tier, linked to their stat
  blocks; number of opponents; space lane and planet encounters; infiltration; base rooms and corridors; cargo; alien
  items).
- **Commodity Market** (Super Traders): a GM button in the Actors sidebar rolls a star port's price column and posts
  every commodity's price. **Honorary ranks** (Military Sourcebook) on the character's Notes tab. **Aegis**
  (Exploration): AX and flak weapons against impervious Thargoid hulls and Thargon swarms.
- **Ships compendium**: all 63 ship variants from the Spaceships chapter, plus the 56 from the supplements (in a folder
  per book), with weapons, components, equipment, bonuses and tokens; the GM's spaceship- and vehicle-scale opponents in the Opponents compendium.
- **Turn panel** for spaceship and vehicle combat: the GM and the craft's owners step through Adjust Speed,
  Equipment, Recharge Shields, Check for Obstacles and the Combat Action, then End Turn.
- **Vehicle destruction**: wrecks stop and are marked defeated, crew take 4D10 Endurance Damage and are stranded until
  another vehicle stops to Rescue them. Vehicle-scale drones (the four skimmers) in the Opponents compendium, with
  flying and flying-bomb rules.
- **Assets**: combat map scenes (Scenes & Combat Maps compendium) and ship/vehicle tokens under `systems/edrpg/assets/tokens/`.
- **Item sheets** for Backgrounds (choices used, skill bonuses), Karma Capabilities (category, cost) and Enhancements.
- **Star System Generator** (Core Rules pp.330–337): a Star System actor and sheet. The GM's sidebar button rolls
  stars, planets, rings, moons and civilisation by the book. Everything is editable and rerollable, and links to the
  Commodity Market and the Space Lane and Planet Encounter tables.
- **Mission Generator** (Core Rules pp.338–347): the GM's sidebar button rolls Military, Espionage or Exploration
  missions with their detail and twist, and the rewards for the party's rank. It posts a briefing (and a journal entry)
  and creates the star systems Stellar Cartography calls for.
- **d100 variant**: a world setting switches every check to d100 roll-under against the Skill score, with Success
  Levels from the tens die, criticals on doubles or the exact target, and 01–05 / 96–00 automatic results.
  Manoeuvre contests, Initiative and damage stay on d10.
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
