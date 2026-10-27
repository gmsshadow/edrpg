import {
   skillCategory,
   karmaCategories,
   karmaRoles,
   rarities,
   equipmentLocations,
   weaponSkills,
   damageTypes,
   burstKinds,
} from "../config.mjs";

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

/**
 * Karma Capability — a trick paid for with Karma points (Core Rules pp.31–36).
 * A capability can't be used twice in the same turn (or between your turns); `usedThisTurn` tracks that in
 * combat and is cleared when the owner's turn starts.
 */
export class KarmaCapabilityData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         description: new fields.HTMLField({ initial: "" }),
         role: new fields.StringField({ required: true, choices: karmaRoles, initial: "other" }),
         category: new fields.StringField({ required: true, choices: karmaCategories, initial: "general" }),
         cost: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
         costAll: new fields.BooleanField({ initial: false }),
         free: new fields.BooleanField({ initial: false }),
         usedThisTurn: new fields.BooleanField({ initial: false }),
      };
   }
}

/* -------------------------------------------- */
/*  Equipment (Core Rules ch.5, pp.98–123)       */
/* -------------------------------------------- */

/** Fields shared by physical equipment: cost as printed, rarity, and where it is kept. */
function equipmentFields() {
   return {
      description: new fields.HTMLField({ initial: "" }),
      cost: new fields.StringField({ initial: "" }),
      rarity: new fields.StringField({ required: true, choices: rarities, initial: "common" }),
      location: new fields.StringField({ required: true, choices: equipmentLocations, initial: "carried" }),
   };
}

/** A skill score modifier: `{ skill, value }`. */
function skillModsField() {
   return new fields.ArrayField(
      new fields.SchemaField({
         skill: new fields.StringField({ required: true, blank: true, initial: "" }),
         value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
   );
}

/** One range band: printed distance and its difficulty To Hit (null where the band can't be used). */
function rangeBand() {
   return new fields.SchemaField({
      distance: new fields.StringField({ initial: "" }),
      dn: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
   });
}

/**
 * Weapon — ranged, melee or thrown (Core Rules pp.100–121).
 * - Ranged weapons have short/medium/long bands, each with a difficulty To Hit.
 * - Melee weapons have a Finesse difficulty instead.
 * - `damage` is the roll formula; Burst adds damage for each point the attack beats the difficulty
 *   (Burst: +1D10 per point; Heavy Burst: +2D10; energy Burst: +5), up to `burst.max`.
 * - Explosives use `blast` (Fatal/Injury damage and radii) instead of `damage`.
 * - `attackBonus` is a rare weapon's addition to the attacker's Skill score, applied only when attacking with it.
 * - `skillMods` apply while the weapon is equipped (e.g. the Neo-Samurai Sword's +10 Parry).
 */
export class WeaponData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const nullableInt = { required: true, nullable: true, integer: true, initial: null };
      return {
         ...equipmentFields(),
         skill: new fields.StringField({ required: true, choices: weaponSkills, initial: "kineticWeapons" }),
         damageType: new fields.StringField({ required: true, choices: damageTypes, initial: "kinetic" }),
         heavy: new fields.BooleanField({ initial: false }),
         ranges: new fields.SchemaField({ short: rangeBand(), medium: rangeBand(), long: rangeBand() }),
         finesse: new fields.NumberField(nullableInt),
         damage: new fields.StringField({ initial: "" }),
         rangeDamage: new fields.SchemaField({
            medium: new fields.StringField({ initial: "" }),
            long: new fields.StringField({ initial: "" }),
         }),
         burst: new fields.SchemaField({
            kind: new fields.StringField({ required: true, choices: burstKinds, initial: "none" }),
            max: new fields.StringField({ initial: "" }),
         }),
         blast: new fields.SchemaField({
            fatal: new fields.NumberField(nullableInt),
            injury: new fields.NumberField(nullableInt),
            fatalRadius: new fields.NumberField(nullableInt),
            injuryRadius: new fields.NumberField(nullableInt),
         }),
         ammo: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
            max: new fields.NumberField({ ...nullableInt, min: 0 }),
         }),
         oneHanded: new fields.BooleanField({ initial: false }),
         destroyCover: new fields.BooleanField({ initial: false }),
         divideFire: new fields.BooleanField({ initial: false }),
         attackBonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         // Opponents only: a To Hit for this weapon that replaces the stat block's general To Hit.
         toHit: new fields.NumberField(nullableInt),
         skillMods: skillModsField(),
         notes: new fields.StringField({ initial: "" }),
         equipped: new fields.BooleanField({ initial: false }),
      };
   }

   /** Melee and Fighting weapons use Finesse; everything else is ranged or thrown. */
   get isMelee() {
      return this.skill === "meleeWeapons" || this.skill === "fighting";
   }

   /** Uses ammunition (energy weapons and melee weapons show N/A). */
   get usesAmmo() {
      return this.ammo.max !== null;
   }

   /** Damage as printed: "1D10 + Burst", "8", "Fatal 25 / Injury 10". */
   get damageLabel() {
      if (this.blast.fatal !== null) return `${this.blast.fatal} / ${this.blast.injury}`;
      const base = (this.damage || "—").toUpperCase().replace(/\s+/g, " ");
      return this.burst.kind === "none" ? base : `${base} + Burst`;
   }

   /** Burst as printed: "Burst (3D10)", "Heavy Burst (6D10)", "Burst (20)". */
   get burstLabel() {
      if (this.burst.kind === "none") return "";
      const max = this.burst.max.toUpperCase();
      return this.burst.kind === "heavy" ? `Heavy Burst (${max})` : `Burst (${max})`;
   }
}

/**
 * Armour — absorbs Damage of the types it protects against (Core Rules pp.121–122).
 * - Every hit still does at least 1 Damage, except Toxic.
 * - Hardened N: on a D10 roll of N or more, the protection is doubled.
 * - Discreet armour worn under clothes avoids its Social Factor penalty; worn openly it is Social Factor -1.
 * - While worn, its Social Factor and Skill score modifiers apply to the wearer.
 */
export class ArmourData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const absorb = () => new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 });
      return {
         ...equipmentFields(),
         absorb: new fields.SchemaField(Object.fromEntries(Object.keys(damageTypes).map((t) => [t, absorb()]))),
         toxicAll: new fields.BooleanField({ initial: false }),
         hardened: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
         discreet: new fields.BooleanField({ initial: false }),
         wornOpenly: new fields.BooleanField({ initial: false }),
         socialFactor: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         skillMods: skillModsField(),
         enhancement: new fields.StringField({ initial: "" }),
         worn: new fields.BooleanField({ initial: false }),
      };
   }

   /** Social Factor this armour gives while worn (Discreet armour under clothes: none; openly: -1). */
   get effectiveSocialFactor() {
      if (this.discreet) return this.wornOpenly ? -1 : 0;
      return this.socialFactor;
   }

   /** "Kinetic 8, Energy 3, Melee 3" */
   get absorbLabel() {
      const parts = Object.entries(this.absorb)
         .filter(([type, v]) => v > 0 && !(type === "toxic" && this.toxicAll))
         .map(([type, v]) => `${game.i18n.localize(damageTypes[type])} ${v}`);
      if (this.toxicAll) parts.push(`${game.i18n.localize(damageTypes.toxic)} ${game.i18n.localize("EDRPG.sheet.all")}`);
      return parts.join(", ");
   }
}
