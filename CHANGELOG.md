# Changelog

## 0.1.10
- **Damage.** A hit's attack card gets a *Roll damage* button (attacker or GM). The damage card shows the weapon's
  damage (at the range band rolled for, so shotguns drop to 2D10/1D10), Burst (an extra D10 per point over the
  difficulty, 2D10 for Heavy Burst, 5 points for Energy Burst, up to the weapon's maximum), and halves it for divided
  fire. Every d10 is shown; a 10 knocks the target over — except Energy weapons. Explosives offer their Fatal and
  Injury damage separately and knock everyone over.
- **Applying damage** to the target, or to all selected tokens (blast radius, divided fire). The best worn armour for
  the damage type absorbs; Hardened rolls a D10 and doubles the protection on its number or more; every hit does at
  least 1, except Toxic. The card lists what each target took and their Endurance before and after. Players' clicks
  are carried out by the GM.
- **Conditions** as token status effects: Knocked Over, Unconscious, Bleeding Out, Stabilised, Dead.
  - 0 Endurance (or knocked out by Fighting): unconscious, in no danger. Below 0: bleeding out. Dead at a negative
    score of half maximum Endurance (the combatant is marked defeated).
  - Bleeding out is rolled automatically at the start of the bleeding combatant's turn: lose a D10, odd stabilises,
    even keeps bleeding. Dropped by an Energy weapon: cauterised, so they stabilise unless that roll is a 10.
  - Karma on the damage card: *Stay Standing* cancels the knockdown; *Escape Death* (all Karma) undoes a hit that
    dropped you below 1 Endurance.
  - Starting a turn knocked over pre-ticks the attack dialog's "knocked over" box (no skill bonus).
- **Condition panel** on the Combat tab and the opponent sheet: status chips, the Endurance at which they die, and
  Stand up, Bleeding roll, Stabilise (an ally's Medicine check, difficulty 8 for Energy wounds or 10, with their token
  selected), Treat wounds (Medicine check; heals its total) and Day's rest (+5).
- Karma Capabilities have a "Stops a knockdown" option (set on Stay Standing in the compendium and sample opponents).

## 0.1.9
- **Attack card.** Clicking a weapon (or Fighting) opens an attack dialog and posts a card comparing To Hit with the
  Difficulty, both broken down line by line:
  - Difficulty = range band (or Finesse for melee/Fighting) + the targeted token's Dodge or Parry, +2 if the target is
    in cover (ranged only), plus any GM adjustment. Without a target, type the target's Defence instead. A target
    with no Defence listed (e.g. a drone) can't evade.
  - Grenades: 7 or the number of squares, whichever is greater, +2 per interposing cover, +2 in zero gravity.
    Explosives can be aimed at the ground (3 + range).
  - To Hit options: Aim +5, two weapons −2, knocked over (no skill bonus), a free modifier.
  - Natural 1 always misses, natural 10 always hits. The card shows how far a hit beat the difficulty and the Burst
    damage that earns; Divide Fire, Destroy Cover and explosive notes appear where they apply.
  - One ammo point is spent per ranged attack; an empty weapon refuses to fire.
  - Karma: reroll a natural 1; the attacker's "+N to the attack you just made" capabilities appear while it misses;
    the target's owner gets "+N Defence" capabilities (Duck!, Dive Aside, Last Minute Deflection) while it hits.
    The card updates for everyone (relayed through the GM).
- Karma Capabilities have attack/defence bonus fields (filled in on the compendium entries that grant one) and, on
  opponents, uses per battle (e.g. Dive Aside ×3).
- New compendium **Opponents (sample)**: Army Soldier, Heavy Weapons Support, Borchuck, Junga Pattern Walker Drone and
  Unstoppable Assassin, with their weapons, armour and Karma as items — for testing combat. The full opponent
  list will follow as a content release.

## 0.1.8
- Fix: clicking a weapon's name on the Combat tab (and an opponent's attack) now rolls the attack instead of opening
  the item. The roll uses the weapon's skill — with a rare weapon's Skill score bonus for characters, or the
  weapon's / stat block's To Hit for opponents — and the difficulty starts at the Finesse or the first usable range
  band. Shift-click skips the dialog. A pencil icon (on hover) still opens the weapon.

## 0.1.7
- New **Opponent (stat block)** actor type with a sheet laid out like the Core Rules' opponent boxes (e.g. p.285):
  name and rank/role header; Defence (Dodge/Parry; blank = can't use it), Initiative, Perception, Endurance, Speed,
  To Hit; Armour (worn armour items with absorb and Hardened); Attacks (weapon items written as the book does:
  ranges, To Hit, damage, blast, ammo); Fighting at To Hit −1 unless listed; Other Skills (clickable to roll);
  Karma Capabilities (once per battle, no points); Equipment; Abilities & Notes.
  - Opponents roll skill checks and contests from their stat block (listed skills, Perception, Initiative for
    Tactics, To Hit for weapon skills). Initiative uses their Initiative score. Endurance is a token bar.
  - A weapon on an opponent can override the general To Hit.
  - "NPC (individual scale)" is now labelled "NPC (full character)" for NPCs built like player characters.
- Character sheet: new **Combat** tab holding the Ranged Weapons and Close Combat tables (styled after the printed
  sheet, with the RANGE header), a Protection table of worn armour by damage type, and Combat Karma (personal and
  any-combat capabilities with Use buttons). The Data Sheet tab now holds backgrounds, skills and enhancements.

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
