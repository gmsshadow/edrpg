# Changelog

## 0.1.15
- **Fighting** (Core Rules pp.60–61):
  - Fix: damage is 1D10 halved *rounding up* (it rounded down). A 10 still knocks the target over.
  - Disarm: an even number on the Fighting damage die knocks a weapon or item out of the target's hands (noted on
    the damage card).
  - *Grab instead of hitting* (attack dialog): on a hit, *Resolve the grab* rolls both sides' Athletics plus
    Strength damage bonuses (opponents use a listed Athletics or their To Hit); the grabber must win. Both get the
    Grabbing / Grabbed conditions: Dodge 0 and no Parry against attacks. The condition panel offers *Escape grab*
    (must exceed the grabber's check) and *Release grab*.
  - New Weapons compendium entry: Weapon Butt (rifle or SMG), a club: Finesse 6, 1D10.
- **Counter-attacks**: when a Melee or Fighting attack against you misses and you Parried, the attack card offers
  *Counter-attack* (Fighting or a Melee weapon in hand), aimed back at the attacker. A counter-attack can't be
  countered, except with the Riposte Karma Capability (offered on the card if you have it).
- **Free attacks**: the attack dialog's *Free attack (point blank / running away)* marks the card; if its damage
  knocks the target over, the damage card notes that their turn ends.
- **Aiming**: an Aim button on the condition panel sets the Aiming status; the next attack dialog pre-ticks +5 and
  the attack uses it up. Taking damage cancels it.
- **Combat Stims** (p.130):
  - Stimmed status: you don't fall unconscious at 0 Endurance or below (you still bleed and die as usual).
  - Automatic dispensers fire when you drop: percentile against the injector's score using a carried dose; a 100
    overloads the heart. If it fails, it tries again at the end of each of your turns (in combat), waking you knocked
    over. The result shows on the damage card.
  - *Use Combat Stim* on the condition panel (needs a syringe or injector) and *Stim wears off* (after about an hour;
    unconscious again if at 0 or less).
  - Paranoia Plus gives +10 Dodge score, Brutal Plus gives Strong and Quick Runner while stimmed.
- **Toxin Injectors**: a Fighting hit's damage card offers the injector's extra 1D10 / 2D10 Toxic damage as its own
  damage card (no knockdown), using one of its two uses per day. *Day's rest* recharges per-day cybernetics.

## 0.1.14
- **Explosives with or without a battle map** (Core Rules pp.58–60). New world setting *Explosives: battle map*:
  Ask each time (default), On a battle map, or Without a map.
  - With "Ask", grenade and missile attack dialogs have a *Combat* choice (map / no map) and show only the fields
    that apply. Shift-click rolls leave the choice to the card.
  - Grenade difficulty: on a map, 7 or the number of squares (+2 per interposing cover); without a map, 7 thrown with
    advantage or 12 with disadvantage. Both +2 in zero gravity.
  - **Missed explosives** get a button for each mode allowed (both when it hasn't been chosen):
    *Scatter (map)* rolls the D10 direction (1–8 clockwise from the square above the target, 9–10 overshoots along
    the line of fire) and D10 squares; *Miss table (no map)* rolls the Grenade Miss Table (thrown grenades) or the
    Missile Miss Table (missiles and launchers), including the extra metres. The result is written on the card for
    everyone.
  - A missed explosive can still roll its explosion damage once it has landed, unless the result was a harmless
    "Whoosh!".
  - Without a map, a hit offers *How many are caught?* (D10 halved, rounded up) for when the GM is unsure.

## 0.1.13
- New item types **Cybernetic**, **Clothing** and **Equipment**, each with a compendium (mechanics only; rarity from
  the book's table colours):
  - *Cybernetics* (44, pp.125–127): replacements, Type 1–5 arm and leg upgrades, internals, nervous systems,
    armoured carapaces and eyes, toxin injectors, cyberclaws, retractable pistols and leg jets.
  - *Clothing & Cosmetics* (21 clothes; the 6 rare cosmetics are under Equipment).
  - *Equipment* (55): general gear, Medpacks, repair kits, coms, cosmetics, Combat Stims and injectors, and
    ammunition.
- **Cybernetics are automated** while installed (every cybernetic on a character is installed):
  - Karma drain: each one's Karma cost comes off cybernetic Karma (Cybernetic Affinity) first, then off the Karma
    maximum. Set an upgrade's cost to 0 when it replaces a device you had.
  - Arm upgrades add Fighting and Melee damage (on top of Strong, which keeps its own +10 limit); leg upgrades add
    movement and Resist Knockdown (N): the first N tens on the damage dice are ignored; internals add Endurance
    beyond the natural 80; nervous systems add Dodge and Initiative; eyes add weapon and Perception Skill score;
    armoured carapaces protect like armour.
  - "Maximum 2" and "Requires Arm/Leg Upgrade" are enforced. Cyberclaws and retractable pistols add their weapon
    from the Weapons compendium (two Cyberclaws weapons added there), and remove it with the cybernetic.
  - Any non-Discreet cybernetic makes the cyborg Social Factor (−3) apply automatically.
- **Clothing and equipment feed Social Factor**: worn clothing (positive values lost once damaged), items in use
  (coms, gas mask) and the best applied cosmetic. Confident removes their penalties. The Environment Suit's Toxic
  resistance absorbs Toxic damage.
- **Equipment bonuses on Skill checks**: worn clothing and carried gear can give roll or Skill-score bonuses
  (Studded Thug Outfit +1 Intimidate; Medpacks +2/+4 Medicine; Hacker com +10 Computer when hacking). "Always"
  bonuses are added automatically; the rest are tick boxes in the check dialog, with the best Medpack pre-ticked for
  Stabilise and Treat wounds. They show as their own lines on the chat card.
- **Reloading** uses a matching spare magazine (Autopistol Magazine, Shotgun Shells, missiles …) when one is
  carried.
- Karma & Equipment tab: Clothing (with armour), Equipment (quantity or uses, an "in use" toggle) and Cybernetics
  (Karma cost, effects, Karma drained) sections; pack and ship lists include clothing and equipment. The Karma &
  Endurance window shows what cybernetics take or add.
- Character creation: *Add starting equipment* fills in the p.39 kit from the compendia (pistol choice ×1 or ×2 with
  two magazines for Autopistols, Flight Suit worn, Magnetic Boots, Remlok, hand or wrist com, a melee weapon or
  grenade if your Skill is 20+, a Space Suit (two with a partner), Medpack and repair kit on the ship) plus 1000
  credits.

## 0.1.12
- **Character creation checklist** on new player characters' Data Sheet tab (Core Rules pp.14–39), ticking itself
  off as you go: Harmless rank, background choices (4), open background skills to fill in (Self-Taught, University
  Graduate), Enhancements to choose (Gene Mod Baby, Self-Taught), three Karma Capabilities (Escape Death is extra),
  independent learning, no Skill above the Skill Cap (offending Skills listed), starting equipment and ship (tick
  boxes; the equipment list is in the tooltip).
  - *Independent learning:* a dialog to pick ten Skills in order for +10, +9 … +1, showing each Skill's score
    before the points and warning about anything over the cap. The points count towards Base and appear as their
    own line in each Skill's window.
  - *Finish creation* fills Endurance and Karma to their maximums and hides the checklist (it asks first if steps
    are still open). Existing characters don't get the checklist.

## 0.1.11
- New compendium **Backgrounds**: all 53 from the Core Rules (pp.15–23), including Pilot Trained, with their
  background choices, skill bonuses, granted Enhancements, prerequisites and the D100 random-background range.
  Mechanics only, no flavour text.
  - Backgrounds with open choices have blank skill lines to fill in: Self-Taught (any two Skills +10) and
    University Graduate (one Intelligence Skill +20, two +10). Cyborg, Partner and Gene Mod Baby carry their rule
    as text.
  - Adding a background to a character adds the Enhancements it grants (e.g. Hacker → Natural Genius (Computer))
    from the Enhancements compendium; removing the background removes them. Gene Mod Baby and Self-Taught remind
    you to choose Enhancements.
  - Officer can only be added after Army Trained or Navy Trained. Pilot Trained is refused on player characters,
    who already have it for free.
  - Background items have new fields for the Enhancements they grant, Enhancements to choose and a prerequisite.
- New compendium **Enhancements**: all 10 (p.25), each with an *Effect* the system automates, stacking when taken
  again:
  - Tough: +5 maximum Endurance (natural maximum 80), shown in the Karma & Endurance window.
  - Natural Genius: +10 to one Skill's Skill Cap (max 100), shown in that skill's window.
  - Strong: +2 Fighting and Melee damage (max +10), added on the damage card.
  - Ambidextrous: two-weapon penalty −1, then 0.
  - Awareness: Initiative uses the better of Tactics and Perception.
  - Confident: Social Factor ignores penalties from equipment, armour and cybernetics.
  - Cybernetic Affinity: +2 cybernetic Karma.
  - Hard to Kill: death at minus maximum Endurance; twice, Escape Death costs at most 4 Karma.
  - Quick Runner: +2m Speed (up to three times). Characters' Speed now shows in the Combat tab's condition panel.
  - Dynamic Karma: reminder only.

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
