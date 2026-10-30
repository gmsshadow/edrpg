import {
   skillCategory,
   karmaCategories,
   karmaRoles,
   rarities,
   equipmentLocations,
   weaponSkills,
   damageTypes,
   burstKinds,
   karmaAttackKinds,
   karmaDefenceKinds,
   enhancementEffects,
   bonusConditions,
   bonusKinds,
   gearCategories,
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
         // Enhancements the background grants (added from the Enhancements compendium when the background is added).
         enhancements: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ required: true, blank: true, initial: "" }),
               skill: new fields.StringField({ required: true, blank: true, initial: "" }),
            }),
         ),
         // "Choose any two Enhancements" (Gene Mod Baby), "Gain an Enhancement" (Self-Taught).
         enhancementChoices: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
         // Prerequisite: any one of these backgrounds, comma-separated (Officer: "Army Trained, Navy Trained").
         requires: new fields.StringField({ initial: "" }),
      };
   }

   /** Prerequisite background names. */
   get requiredBackgrounds() {
      return this.requires
         .split(",")
         .map((s) => s.trim())
         .filter(Boolean);
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
         // What the system automates (see config.enhancementEffects).
         effect: new fields.StringField({ required: true, blank: false, choices: enhancementEffects, initial: "none" }),
         // Natural Genius: the Skill whose Skill Cap is raised.
         skill: new fields.StringField({ required: true, blank: true, initial: "" }),
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
         // Bonuses the attack card can apply: "+2 to the attack you just made" / "+2 to your Defence (Dodge)".
         attackBonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         attackApplies: new fields.StringField({ required: true, blank: true, choices: karmaAttackKinds, initial: "" }),
         defenceBonus: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         defenceApplies: new fields.StringField({ required: true, blank: true, choices: karmaDefenceKinds, initial: "" }),
         // Stay Standing: cancels a knockdown from a hit (offered on the damage card).
         preventsKnockdown: new fields.BooleanField({ initial: false }),
         // Opponents: uses per battle (e.g. "Dive Aside x3") and how many have been used.
         usesPerBattle: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 1 }),
         timesUsed: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
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

/** Item bonuses to Skill checks, e.g. a Medpack's +2 to Medicine when stabilising or healing. */
function rollBonusesField() {
   return new fields.ArrayField(
      new fields.SchemaField({
         skill: new fields.StringField({ required: true, blank: true, initial: "" }),
         value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         kind: new fields.StringField({ required: true, choices: bonusKinds, initial: "roll" }),
         when: new fields.StringField({ required: true, choices: bonusConditions, initial: "always" }),
      }),
   );
}

/**
 * "Kinetic 8, Energy 3, Toxic All"
 *
 * @param {object} system  Armour or cybernetic data with `absorb` and `toxicAll`.
 *
 * @returns {string}
 */
function absorbText(system) {
   const parts = Object.entries(system.absorb)
      .filter(([type, v]) => v > 0 && !(type === "toxic" && system.toxicAll))
      .map(([type, v]) => `${game.i18n.localize(damageTypes[type])} ${v}`);
   if (system.toxicAll) parts.push(`${game.i18n.localize(damageTypes.toxic)} ${game.i18n.localize("EDRPG.sheet.all")}`);
   return parts.join(", ");
}

/** Absorb values by damage type. */
function absorbField() {
   const absorb = () => new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 });
   return new fields.SchemaField(Object.fromEntries(Object.keys(damageTypes).map((t) => [t, absorb()])));
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
      return absorbText(this);
   }
}


/**
 * Cybernetics (Core Rules pp.123–127). Every cybernetic on an actor is installed. Each drains Karma permanently
 * (paid from Cybernetic Affinity's cybernetic Karma first); an upgrade of an existing device costs no more Karma, so
 * set its Karma cost to 0. Non-Discreet cybernetics give the fixed cyborg Social Factor of -3.
 */
export class CyberneticData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const int = () => new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });
      return {
         ...equipmentFields(),
         karmaCost: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
         discreet: new fields.BooleanField({ initial: false }),
         // "Maximum 2" (arms, legs).
         maxInstalled: new fields.NumberField({ required: true, nullable: true, integer: true, min: 1, initial: null }),
         // Prerequisite: another cybernetic whose name contains this text ("Arm Upgrade", "Leg Upgrade").
         requires: new fields.StringField({ initial: "" }),
         damageBonus: int(),
         speedBonus: int(),
         resistKnockdown: int(),
         enduranceBonus: int(),
         initiativeBonus: int(),
         skillMods: skillModsField(),
         absorb: absorbField(),
         toxicAll: new fields.BooleanField({ initial: false }),
         hardened: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),
         spaceSuit: new fields.BooleanField({ initial: false }),
         // Toxin Injector: extra damage on a Fighting hit, a number of times per day.
         fightingDamage: new fields.StringField({ initial: "" }),
         fightingDamageType: new fields.StringField({ required: true, choices: damageTypes, initial: "toxic" }),
         uses: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
            max: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         }),
         // Built-in weapon added from the Weapons compendium (Cyberclaws, retractable pistols).
         grantsWeapon: new fields.StringField({ initial: "" }),
         notes: new fields.StringField({ initial: "" }),
      };
   }

   /** Whether it protects like armour (Armoured Carapace). */
   get isArmour() {
      return this.toxicAll || Object.values(this.absorb).some((v) => v > 0);
   }

   /** "Kinetic 4, Energy 2 …" */
   get absorbLabel() {
      return absorbText(this);
   }
}

/**
 * Clothing (Core Rules pp.128, 131). Worn clothing gives its Social Factor (positive values are lost once the wearer
 * takes damage), Skill score modifiers and Skill check bonuses.
 */
export class ClothingData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         ...equipmentFields(),
         socialFactor: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         skillMods: skillModsField(),
         rollBonuses: rollBonusesField(),
         // Environment Suit: Toxic resistance 20 (absorbs Toxic damage).
         toxicResistance: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
         spaceSuit: new fields.BooleanField({ initial: false }),
         notes: new fields.StringField({ initial: "" }),
         worn: new fields.BooleanField({ initial: false }),
      };
   }
}

/**
 * General equipment, coms, cosmetics, Combat Stims and ammunition (Core Rules pp.129–133).
 * `active` means in use: a com carried in social situations, cosmetics applied, a gas mask on. Active items give
 * their Social Factor (only the best cosmetic counts).
 */
export class GearData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         ...equipmentFields(),
         category: new fields.StringField({ required: true, choices: gearCategories, initial: "general" }),
         quantity: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1 }),
         uses: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
            max: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         }),
         socialFactor: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
         rollBonuses: rollBonusesField(),
         // Combat Stim drugs: extra effect while stimmed (Paranoia Plus: +10 Dodge; Brutal Plus: Strong and Quick Runner).
         stimEffect: new fields.StringField({ required: true, blank: true, choices: { paranoia: "EDRPG.stim.paranoia", brutal: "EDRPG.stim.brutal" }, initial: "" }),
         // Stim injectors: percentage chance of injecting when you drop to 0 Endurance.
         injectionSuccess: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, max: 100, initial: null }),
         // Ammunition: the weapons it reloads (text matched against the weapon's name, e.g. "Autopistol").
         ammoFor: new fields.StringField({ initial: "" }),
         notes: new fields.StringField({ initial: "" }),
         active: new fields.BooleanField({ initial: false }),
      };
   }
}
