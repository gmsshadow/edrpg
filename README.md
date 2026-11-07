Elite: Dangerous Role Playing Game for FoundryVTT
=================================================

[![License](https://img.shields.io/github/license/gmsshadow/edrpg)](https://github.com/gmsshadow/edrpg/blob/main/LICENSE)

A Foundry VTT game system for the *Elite: Dangerous Role Playing Game*.

Based on [edrpg-fvtt](https://github.com/ElSaico/edrpg-fvtt) by Bruno Marques (ElSaico). See
[Credits and legal](#credits-and-legal).

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
- **Ship Weapons and Ship Components compendia** (Core Rules pp.192–216): every spaceship weapon, component and
  utility mount with its size, grade, power, Strength and cost.
- **Outfitting** (Core Rules pp.192–193): every compendium ship knows its hull's hardpoints, utility mounts, fixed
  component classes and internal slots. Its Outfitting tab shows the power budget and each slot; drop a component or
  weapon to fit it (slot sizes, military slots and power are checked), and the ship's ratings change by what it adds.
  The owner can pay for parts and sell old ones for 70%.
- **Ships compendium**: all 63 ship variants from the Spaceships chapter, plus the 56 from the supplements (in a folder
  per book), with weapons, components, equipment, bonuses and tokens; the GM's spaceship- and vehicle-scale opponents in the Opponents compendium.
- **Silent Running** (Core Rules p.268): ships can go dark (no shields, invisible until scanned for), fire Heat Sinks,
  and scan for hidden ships; detected silent ships are harder to hit with gimballed weapons and can't be targeted by
  seekers or torpedoes, and they overheat after a minute.
- **Award Rank Points** (Core Rules p.326): the GM's sidebar button gives the party Rank Points for missions,
  challenges and defeated enemies.
- **Optional Rules** (Game Settings → Configure Settings → Optional Rules): one switch per optional rule, grouped by
  book, all off by default. The Core Rules' Rule Variants (pp.263–265) are in: one interrupting action per round,
  Playing the Decimals, Defence Tokens, Group Fire and Avoidable Explosives. Later optional packages (such as
  Evolution) add their own group here.
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
- **Fleet**: ships and vehicles belong to a character (an Owner field on the craft). The character sheet lists their
  fleet; drag a craft onto it to add it, and star the current ship. Character creation offers the eight starting ships
  (p.38). The chosen ship is copied from the compendium into the fleet under a name of the player's choice, with a
  Scarab SRV for the Sidewinder Discovery.
- **Supplement generators** (Espionage, Exploration, Military, Super Traders): the GM's Generators button rolls
  opponent groups by faction, difficulty and Tier (and places their tokens), tracks reinforcements and base Alerts
  in combat, and runs Infiltration challenges, corporate and military bases room by room, and Space Lane, Planet and
  Travel encounters. The Mission Generator adds the Trade Missions and each supplement's notes on running every mission,
  with one-click links to the right generator. Journals can use the same links: `@EDRPG[encounter faction=military
  difficulty=hard]{Hard Military group}`.
- **Planet exploration** (Exploration Supplement pp.43–46): an Explore button on each landable planet and moon of a Star
  System rolls its Planet Encounter (Life-bearing for Earth-like and Water worlds) as a card with the checks, damage,
  groups to fight and treasure. The Alien Ruins traps and Relic AI Base are played step by step, and Alien Items and
  Rare items are rolled and linked.
- **Space Lane and Travel encounters** (Super Traders pp.44–49, Military Sourcebook p.59): each result is a card with
  its checks, fights and sub-tables, plus Interdiction contests (Core p.209), Heists, Sneak into Port and a Hostage
  Release tracker.
- **Between Adventures** (Core Rules p.272): a character-sheet button for Safe Trading, Asteroid Mining, Exploring or
  Bounty Hunting with one of the character's ships. It reads the ship's fit, rolls, runs the employee risk check, pays
  crew wages and puts the income in the character's cash.
- **Employing Crew** (Core Rules pp.260–263): roll crew in a hurry or interview up to six. Each becomes an opponent
  actor in a Crew folder, owned by the employing player, with wages charged at Between Adventures.
- **Rare Item Availability** (Core Rules p.324): the GM's sidebar button rolls rare items on sale for the party's rank,
  linked to the compendium.
- **Combined Scale Combat** (Core Rules pp.254–259): people, vehicles and spaceships can target each other. Defence
  bonuses for being smaller, damage scaling (×8 down to ⅛), weapon reach, cover, and the Hover and Crawl actions are
  applied automatically.
- **Addiction** (Core Rules p.253): Combat Stim uses are counted per adventure, with the addiction roll from the second
  use on. An addict picks clinic, keep using or neither before their Between Adventures roll.

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

## Credits and legal

- **Original system**: this system started from [edrpg-fvtt](https://github.com/ElSaico/edrpg-fvtt) by Bruno Marques
  ([ElSaico](https://github.com/ElSaico)), released under the Mozilla Public License 2.0. It has since been rewritten
  for Foundry VTT v14 and extended. The code is still under the MPL 2.0 (see [LICENSE](LICENSE)), and the source of
  every file is available in this repository.
- **Unofficial**: this is an unofficial fan project. It is not made, endorsed or approved by Frontier Developments plc
  or by Spidermind Games.
- **Trademarks**: Elite and Elite: Dangerous are trademarks of Frontier Developments plc. *Elite: Dangerous* © 1984–2026
  Frontier Developments plc. All rights reserved. The *Elite: Dangerous Role Playing Game* is published by Spidermind
  Games under licence from Frontier Developments. All other trademarks belong to their respective owners.
- **Rules content**: the compendiums hold names, costs and game statistics only, with no rulebook text. You need the
  *Elite: Dangerous Role Playing Game* books to play.
