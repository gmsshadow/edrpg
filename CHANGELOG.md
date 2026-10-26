# Changelog

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
