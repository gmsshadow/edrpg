import { skills, BASE_SKILL_SCORE, pilotTrained, skillCategory, rankFor, MAX_HUMAN_ENDURANCE } from "../config.mjs";

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

/** One skill: only player-entered data is stored; base/score/bonus are derived. */
function skillField() {
   return new fields.SchemaField({
      learning: new fields.NumberField({ ...requiredInteger, min: 0, initial: 0 }),
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
         biography: new fields.HTMLField({ initial: "" }),
      };
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
            skill.cap = rank.skillCap;
         }
      }
   }

   /** @override */
   prepareDerivedData() {
      const rank = this.rank;

      this.karma.standard.max = rank.karmaPoints + this.karma.standard.bonus;
      this.karma.cyber.max = this.karma.cyber.bonus;
      this.endurance.base = Math.min(rank.endurance, MAX_HUMAN_ENDURANCE);
      this.endurance.max = this.endurance.base + this.endurance.bonus;

      // Background skill bonuses.
      const mods = this.receivesPilotTrained ? [...pilotTrained] : [];
      for (const background of this.parent.itemTypes.background ?? []) {
         mods.push(...(background.system.skills ?? []));
      }
      for (const { skill, bonus } of mods) {
         const category = skillCategory[skill];
         if (category && Number.isFinite(bonus)) this.skills[category][skill].base += bonus;
      }

      for (const list of Object.values(this.skills)) {
         for (const skill of Object.values(list)) {
            skill.score = skill.base + skill.learning;
            skill.bonus = Math.floor(skill.score / 10);
            skill.overCap = skill.score > skill.cap;
         }
      }
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
