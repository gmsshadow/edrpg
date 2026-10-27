import {
   skills,
   BASE_SKILL_SCORE,
   MAX_SKILL_SCORE,
   pilotTrained,
   skillCategory,
   rankFor,
   MAX_HUMAN_ENDURANCE,
   CYBORG_SOCIAL_FACTOR,
} from "../config.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };

/**
 * A current/maximum pool. `max` is derived from rank; `bonus` holds manual adjustments
 * (e.g. the Tough enhancement, cybernetics, the Cyber enhancement's cyber-only Karma).
 *
 * @param {number} initial          Starting current value.
 *
 * @param {object} [options]
 *
 * @param {number} [options.min=0]   Lowest allowed current value (Endurance may go negative).
 *
 * @returns {foundry.data.fields.SchemaField}
 */
function meterField(initial, { min = 0 } = {}) {
   return new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, min, initial }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
   });
}

/**
 * One skill. Stored: permanent improvements (`learning`), a temporary modifier (`mod`),
 * a per-skill Skill Cap adjustment (`capBonus`, e.g. Natural Genius) and the "used" tick.
 * Derived: base, natural, cap, score, bonus.
 */
function skillField() {
   return new fields.SchemaField({
      learning: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      mod: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      capBonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      used: new fields.BooleanField({ initial: false }),
   });
}

/**
 * Shared data model for individual-scale actors (player characters and NPCs).
 */
export class IndividualData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         gender: new fields.StringField({ initial: "" }),
         height: new fields.StringField({ initial: "" }),
         weight: new fields.StringField({ initial: "" }),
         age: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
         rankPoints: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
         karma: new fields.SchemaField({
            standard: meterField(10),
            cyber: meterField(0),
         }),
         // Endurance can drop below zero before death (Core Rules, Personal Combat).
         endurance: meterField(20, { min: undefined }),
         skills: new fields.SchemaField(
            Object.fromEntries(
               Object.entries(skills).map(([category, list]) => [
                  category,
                  new fields.SchemaField(Object.fromEntries(list.map((skill) => [skill, skillField()]))),
               ]),
            ),
         ),
         // Social Factor sources (Core Rules, Clothing / Cosmetics / Cybernetics). `worn` covers clothing, armour
         // and other equipment until those item types supply it automatically.
         socialFactor: new fields.SchemaField({
            worn: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            cosmetics: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            other: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            damaged: new fields.BooleanField({ initial: false }),
            cyborgRevealed: new fields.BooleanField({ initial: false }),
            confident: new fields.BooleanField({ initial: false }),
         }),
         // 1 cr = 100 mcr = 10,000 u (Core Rules, Currency).
         cash: new fields.SchemaField({
            cr: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            mcr: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            u: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
         }),
         biography: new fields.HTMLField({ initial: "" }),
      };
   }

   /** Weapons in hand and armour being worn: the items whose modifiers apply. */
   get equippedItems() {
      const items = this.parent.items ?? [];
      return items.filter(
         (i) => (i.type === "weapon" && i.system.equipped) || (i.type === "armour" && i.system.worn),
      );
   }

   /** Whether this actor receives the free Pilot Trained background. */
   get receivesPilotTrained() {
      return false;
   }

   /** @returns {object} The current rank entry from the rank table. */
   get rank() {
      return rankFor(this.rankPoints);
   }

   /** Initiative score = Tactics bonus (Core Rules, "Determine Defence & Initiative"). */
   get initiative() {
      return this.skills.intelligence.tactics.bonus;
   }

   /** Defence (Dodge) = Dodge bonus. */
   get dodge() {
      return this.skills.combat.dodge.bonus;
   }

   /** Defence (Parry) = Parry bonus. */
   get parry() {
      return this.skills.combat.parry.bonus;
   }

   /** @override */
   prepareBaseData() {
      const rank = this.rank;
      for (const list of Object.values(this.skills)) {
         for (const skill of Object.values(list)) {
            skill.base = BASE_SKILL_SCORE;
            skill.baseSources = [{ label: "EDRPG.skillConfig.starting", value: BASE_SKILL_SCORE }];
            skill.cap = rank.skillCap + skill.capBonus;
            skill.equipmentMod = 0;
            skill.equipmentSources = [];
         }
      }
   }

   /** @override */
   prepareDerivedData() {
      const rank = this.rank;

      this.karma.standard.base = rank.karmaPoints;
      this.karma.standard.max = rank.karmaPoints + this.karma.standard.bonus;
      this.karma.cyber.base = 0;
      this.karma.cyber.max = this.karma.cyber.bonus;
      this.endurance.base = Math.min(rank.endurance, MAX_HUMAN_ENDURANCE);
      this.endurance.max = this.endurance.base + this.endurance.bonus;

      this._prepareSocialFactor();

      // Background skill bonuses (count towards Base and are limited by the Skill Cap).
      const sources = [];
      if (this.receivesPilotTrained) {
         sources.push({ label: "EDRPG.sheet.pilotTrained", mods: pilotTrained });
      }
      for (const background of this.parent.itemTypes.background ?? []) {
         sources.push({ label: background.name, mods: background.system.skills ?? [] });
      }
      for (const { label, mods } of sources) {
         for (const { skill, bonus } of mods) {
            const category = skillCategory[skill];
            if (!category || !Number.isFinite(bonus)) continue;
            const data = this.skills[category][skill];
            data.base += bonus;
            data.baseSources.push({ label, value: bonus });
         }
      }

      // Equipment Skill score modifiers: worn armour (e.g. Riot Armour -20 Athletics) and equipped weapons
      // (e.g. the Neo-Samurai Sword's +10 Parry). A rare weapon's attack bonus is applied only when attacking with it.
      for (const item of this.equippedItems) {
         for (const { skill, value } of item.system.skillMods ?? []) {
            const category = skillCategory[skill];
            if (!category || !value) continue;
            const data = this.skills[category][skill];
            data.equipmentMod += value;
            data.equipmentSources.push({ label: item.name, value });
         }
      }

      // Score: Base + Learn is the natural score, limited by the Skill Cap. Equipment and temporary
      // modifiers apply on top and may exceed the cap, but never 100 (Core Rules, "Skill Bonuses").
      for (const list of Object.values(this.skills)) {
         for (const skill of Object.values(list)) {
            skill.natural = skill.base + skill.learning;
            skill.overCap = skill.natural > skill.cap;
            skill.totalMod = skill.mod + skill.equipmentMod;
            skill.score = Math.clamp(skill.natural + skill.totalMod, 0, MAX_SKILL_SCORE);
            skill.bonus = Math.floor(skill.score / 10);
            skill.modified = skill.totalMod !== 0;
         }
      }
   }

   /**
    * Social Factor: a bonus to Bargain, Bluff, Charm and Diplomacy rolls.
    * - Positive bonuses from worn clothing are lost once the wearer takes damage.
    * - Only one cosmetics bonus applies at a time (a single field enforces that).
    * - The Confident enhancement removes penalties from equipment, armour and cybernetics.
    * - A revealed (or non-discreet) cyborg has a fixed -3 that nothing else alters.
    * - The world setting `socialFactorCap` (0 = none) is a house rule limiting the positive total.
    */
   _prepareSocialFactor() {
      const sf = this.socialFactor;
      const sources = [];
      let total;
      if (sf.cyborgRevealed) {
         const value = sf.confident ? 0 : CYBORG_SOCIAL_FACTOR;
         sources.push({ label: "EDRPG.socialFactor.cyborg", value });
         total = value;
      } else {
         let worn = sf.worn;
         let wornNote = null;
         if (worn > 0 && sf.damaged) {
            worn = 0;
            wornNote = "EDRPG.socialFactor.damagedNote";
         } else if (worn < 0 && sf.confident) {
            worn = 0;
            wornNote = "EDRPG.socialFactor.confidentNote";
         }
         sources.push({ label: "EDRPG.socialFactor.worn", value: worn, note: wornNote });
         // Worn armour (Discreet armour only counts when worn openly).
         for (const armour of (this.parent.itemTypes?.armour ?? []).filter((a) => a.system.worn)) {
            let value = armour.system.effectiveSocialFactor;
            let note = null;
            if (value < 0 && sf.confident) {
               value = 0;
               note = "EDRPG.socialFactor.confidentNote";
            }
            if (value || note) {
               sources.push({ label: armour.name, value, note });
               worn += value;
            }
         }
         sources.push({ label: "EDRPG.socialFactor.cosmetics", value: sf.cosmetics });
         sources.push({ label: "EDRPG.socialFactor.other", value: sf.other });
         total = worn + sf.cosmetics + sf.other;
      }
      const cap = game.settings.get("edrpg", "socialFactorCap");
      sf.sources = sources;
      sf.total = total;
      sf.cap = cap;
      sf.value = cap > 0 && total > cap ? cap : total;
      sf.capped = sf.value !== total;
   }

   /**
    * Data exposed to roll formulas: `@initiative`, `@dodge`, `@parry`, `@skill.<key>` (skill bonus).
    *
    * @returns {object}
    */
   getRollData() {
      const skill = {};
      for (const list of Object.values(this.skills)) {
         for (const [key, data] of Object.entries(list)) skill[key] = data.bonus;
      }
      return {
         initiative: this.initiative,
         dodge: this.dodge,
         parry: this.parry,
         rankPoints: this.rankPoints,
         socialFactor: this.socialFactor.value,
         skill,
      };
   }
}

/** Player characters get Pilot Trained for free (Core Rules p.14). */
export class CharacterData extends IndividualData {
   get receivesPilotTrained() {
      return true;
   }
}

/** Individual-scale NPCs: same statistics, no free background. */
export class NPCIndividualData extends IndividualData {}
