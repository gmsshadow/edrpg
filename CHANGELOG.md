# Changelog

## 0.1.6
- Weapon and Armour item types (Core Rules ch.5).
  - Weapons: attack skill, damage type, short/medium/long range with difficulty To Hit (or Finesse for melee),
    damage formula with per-range damage (shotguns), Burst / Heavy Burst / energy Burst with maximum, explosive blast
    (Fatal/Injury damage and radii), ammo, One Handed, Destroy Cover, Divide Fire, a rare weapon's Skill score bonus
    (applied only when attacking with it) and skill modifiers while equipped (e.g. Neo-Samurai Sword +10 Parry).
  - Armour: absorb per damage type (incl. "all Toxic"), Hardened, Discreet / worn openly, Social Factor, skill
    modifiers while worn, granted enhancement.
- Worn armour and equipped weapons now feed the character: their skill modifiers appear under Modifiers in the
  skill edit window and change the score; worn armour's Social Factor is added to the Social Factor automatically
  (Confident still ignores the penalties).
- Character sheet: Ranged Weapons and Close Combat tables list carried weapons with To Hit (including a rare weapon's
  bonus), ranges, damage and ammo (edit inline, reload button). Karma & Equipment: Carried Weapons (equipped toggle),
  Clothing (armour, worn toggle), and Pack / Ship storage with a location selector.
- Compendia: Weapons (78, in folders by type) and Armour (10), with stats, costs, rarity (common/rare as in the
  book's green/blue) and mechanics only. Fighting stays built into the sheet.

## 0.1.5
- Fix: Dice So Nice now animates contested checks — the opening roll is attached to the card, and the opponent's roll
  and Karma rerolls are shown through Dice So Nice before the card updates (a hidden opponent's dice show to GMs only).
- Cleanup: removed 22 unused Exo 2 font files (only weights 400–800 are used), the empty FUNDING.yml, unused
  language keys (old tab names, Empire/Federation honorary ranks, which aren't in the Core Rules, etc.) and dead
  code; replaced the inherited .editorconfig (CRLF/JetBrains settings) with a short LF one; LevelDB LOG/LOCK files
  are no longer committed.

## 0.1.4
- Karma Capabilities compendium: all 40 capabilities from the Core Rules (pp.31–36) with name, cost, list
  (Defensive / Offensive / Skill-based & Other), where they're used, and prerequisite/effect mechanics in our own
  words. No flavour text. Escape Death is included (free, costs all Karma).
- Use button on each capability: spends the cost from current Karma and posts the effect to chat. Escape Death spends
  all Karma and can't be used at 0. Disabled when you can't afford it.
- Once per turn: in a started combat a used capability is marked "Used" until the start of that character's next turn
  (cleared automatically by the GM's client), and all marks clear when the combat is deleted.
- Rest +1 (Karma Capabilities header): a main rest regains 1 Karma.
- End of Adventure also offers to restore all Karma for the next adventure, and is always available.
- Karma Capability items have a List field (Defensive/Offensive/Other), a "costs all Karma" option and a new
  "Vehicle or Spaceship Combat" category; the sheet groups capabilities by list.
- Fix: contested checks allow repeated Karma rerolls of a natural 1, as the rules permit.
- Build tooling: `npm run packs` compiles `packs/_source` into the LevelDB packs (`tools/karma-capabilities.py`
  regenerates the capability source).

## 0.1.3
- Skill check dialog: the difficulty presets are gone. The GM types the difficulty; the box is pre-filled with the
  world default (9) and selected, so typing replaces it.
- Contested checks: choose "Against: Targeted …" or "Other opponent" in the skill dialog.
  - The acting character rolls straight away; the opponent's controller (the GM for a typed-in opponent) clicks Roll
    on the card. Opponents without the skill can use a flat bonus (e.g. Perception or To Hit from a stat block).
  - Natural 1 always loses, natural 10 always wins; if both roll the same natural, the totals decide.
  - Ties follow the book's two patterns: when the opponent's roll sets the difficulty (Stealth vs Perception p.267,
    Charm vs Insight p.33) ties go to the acting character; in a roll-off (Grab/Escape p.61) ties go to the opponent.
    Pairings and tie rule are pre-selected and can be changed.
  - The opponent's roll can be hidden from players (default for Stealth); the GM still sees it.
  - Each side can spend Karma to reroll a natural 1.
  - Players' rolls reach the card through the active GM (`socket: true`), so a GM must be logged in.
- Rolling a skill now ticks it as used (Core Rules p.43).

## 0.1.2
- End of Adventure button (Data Sheet tab, above the skills): every ticked skill gains +1 Learn unless that would
  take Base + Learn over the Skill Cap, then all ticks are cleared. Shows a confirmation listing the changes and posts
  a summary to chat. Also available as `game.edrpg.endAdventure(actor)` for macros.

## 0.1.1
- Social Factor: added to Bargain, Bluff, Charm and Diplomacy rolls as a roll bonus (not a Skill score change).
  - Sources (clothing/armour/equipment, cosmetics, other) are edited from the "SocFac" chip on the Social Skills header.
  - Positive clothing bonus is lost when the character takes damage (flagged automatically when Endurance drops).
  - Revealed cyborgs have a fixed −3; the Confident enhancement removes equipment penalties.
  - The skill check dialog has an "Apply Social Factor" toggle; the chat card shows the bonus.
  - The `socialFactorCap` setting is now an optional house rule and defaults to 0 (no cap), as in the Core Rules.
- Social skills show the Social Factor next to their bonus.

## 0.1.0
- Rebuilt for Foundry VTT v14: ApplicationV2 sheets, data models for every document type, no build step.
- Character sheet laid out after the official data sheet; skill Learn/modifiers/cap adjustments in an edit window.
- Skill checks with the rule of 1 and 10, Karma reroll, initiative, Fighting attack and damage.
