import { skillCategory, karmaCategories } from "../config.mjs";

const fields = foundry.data.fields;

/**
 * Background — grants skill bonuses and uses one or two of the character's background choices.
 */
export class BackgroundData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         description: new fields.HTMLField({ initial: "" }),
         choices: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, max: 2, initial: 1 }),
         free: new fields.BooleanField({ initial: false }),
         skills: new fields.ArrayField(
            new fields.SchemaField({
               skill: new fields.StringField({ required: true, blank: true, initial: "" }),
               bonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10 }),
            }),
         ),
      };
   }

   /** @override */
   static migrateData(source) {
      // The pre-v14 draft stored `{ category, skill, bonus }`; the category is now implied by the skill.
      if (Array.isArray(source.skills)) {
         for (const mod of source.skills) {
            if (mod && "category" in mod) delete mod.category;
         }
      }
      return super.migrateData(source);
   }

   /** Skill bonuses with valid skill keys only. */
   get validSkills() {
      return this.skills.filter((mod) => mod.skill in skillCategory);
   }
}

/** Enhancement — a permanent improvement granted by backgrounds or rank advancement. */
export class EnhancementData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         description: new fields.HTMLField({ initial: "" }),
      };
   }
}

/** Karma Capability — a trick paid for with Karma points. */
export class KarmaCapabilityData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         description: new fields.HTMLField({ initial: "" }),
         category: new fields.StringField({ required: true, choices: karmaCategories, initial: "general" }),
         cost: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
         free: new fields.BooleanField({ initial: false }),
      };
   }
}
