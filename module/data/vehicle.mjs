import { skillCategory } from "../config.mjs";

const fields = foundry.data.fields;
const int = (initial = 0, options = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...options });

/** Vehicle and ship size classes. */
export const craftSizes = {
   small: "EDRPG.craft.size.small",
   medium: "EDRPG.craft.size.medium",
   large: "EDRPG.craft.size.large",
};

/** Weapon mount sizes. */
export const mountSizes = {
   small: "EDRPG.craft.size.small",
   medium: "EDRPG.craft.size.medium",
   large: "EDRPG.craft.size.large",
   huge: "EDRPG.craft.size.huge",
};

/** Weapon mount kinds (Core Rules p.194). */
export const mountKinds = {
   fixed: "EDRPG.craft.mount.fixed",
   gimballed: "EDRPG.craft.mount.gimballed",
   turret: "EDRPG.craft.mount.turret",
};

/** Combat zones (Core Rules p.63). */
export const combatZones = {
   atDistance: "EDRPG.craft.zone.atDistance",
   upClose: "EDRPG.craft.zone.upClose",
};

/** A turret firing on its own uses Vehicle/Spaceship Weapons bonus 3 (Core Rules p.65). */
export const AUTO_TURRET_BONUS = 3;

/**
 * A ground vehicle (Core Rules pp.71–75, 220–235), laid out like the Vehicle Data Sheet (p.363).
 *
 * Crew: a pilot (any individual actor or opponent) whose Vehicle Piloting gives Defence and Pursuit, Tactics gives
 * Initiative and Vehicle Weapons fires fixed and gimballed weapons. Turrets use their gunner's Vehicle Weapons, or
 * 3 when firing automatically.
 * - Defence = Agility + the pilot's Vehicle Piloting bonus + the Speed Table's Defence bonus; 0 when stationary.
 * - Pursuit = half the pilot's Vehicle Piloting bonus (rounded down) + current Speed.
 * - To Hit = Vehicle Weapons bonus + the weapon's Accuracy + the Speed Table's Attack penalty.
 */
export class VehicleData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         // Specifications (book stat block)
         category: new fields.StringField({ required: true, choices: craftSizes, initial: "small" }),
         manufacturer: new fields.StringField({ initial: "" }),
         dimensions: new fields.StringField({ initial: "" }),
         bays: int(1, { min: 0 }),
         crewSize: int(1, { min: 0 }),
         passengers: int(0, { min: 0 }),
         sensors: new fields.StringField({ initial: "" }),
         cargo: new fields.StringField({ initial: "" }),
         cost: new fields.StringField({ initial: "" }),
         special: new fields.StringField({ initial: "" }),
         // Handling
         agility: int(0),
         maxSpeed: int(5, { min: 0 }),
         accelerate: int(2, { min: 0 }),
         decelerate: int(2, { min: 0 }),
         // Speed Table: index 0 = Speed 1 … index 9 = Speed 10.
         speedTable: new fields.ArrayField(
            new fields.SchemaField({ defence: int(0), attack: int(0) }),
            { initial: () => Array.from({ length: 10 }, () => ({ defence: 0, attack: 0 })) },
         ),
         // Protection
         hull: new fields.SchemaField({ value: int(40), max: int(40, { min: 0 }) }),
         shields: new fields.SchemaField({
            value: int(0, { min: 0 }),
            max: int(0, { min: 0 }),
            recharge: int(5, { min: 0 }),
            // Knocked out shields charge up to half before they work again (Core Rules p.65).
            down: new fields.BooleanField({ initial: false }),
         }),
         // In combat
         speed: int(0, { min: 0 }),
         zone: new fields.StringField({ required: true, choices: combatZones, initial: "atDistance" }),
         // Crew: the pilot's UUID (any individual actor or opponent).
         pilot: new fields.StringField({ required: true, blank: true, initial: "" }),
         description: new fields.HTMLField({ initial: "" }),
      };
   }

   /** @override */
   prepareDerivedData() {
      this.hull.max = Math.max(this.hull.max, 0);
      this.shields.halfway = Math.ceil(this.shields.max / 2);
      this.speedRow = this.speed > 0 ? (this.speedTable[this.speed - 1] ?? { defence: 0, attack: 0 }) : { defence: 0, attack: 0 };
      this.topSpeed = Math.min(this.maxSpeed, this.speedTable.length);
   }

   /** The pilot actor, if one is assigned and available. */
   get pilotActor() {
      return this.pilot ? (fromUuidSync(this.pilot) ?? null) : null;
   }

   /**
    * A crew member's bonus in a skill (characters' skill bonus; opponents' listed or stat-block value).
    *
    * @param {Actor|null} actor
    *
    * @param {string} skill
    *
    * @returns {number}
    */
   static crewBonus(actor, skill) {
      if (!actor || !(skill in skillCategory)) return 0;
      return actor.system.skillBonus?.(skill) ?? 0;
   }

   /** The pilot's Vehicle Piloting bonus. */
   get piloting() {
      return VehicleData.crewBonus(this.pilotActor, "vehiclePiloting");
   }

   /** Defence: Agility + Vehicle Piloting + speed bonus; 0 when stationary. */
   get defence() {
      if (this.speed <= 0) return 0;
      return this.agility + this.piloting + this.speedRow.defence;
   }

   /** Pursuit: half the Vehicle Piloting bonus (rounded down) + current Speed. */
   get pursuit() {
      return Math.floor(this.piloting / 2) + this.speed;
   }

   /** Initiative: the pilot's Tactics bonus. */
   get initiative() {
      return VehicleData.crewBonus(this.pilotActor, "tactics");
   }

   /**
    * Vehicle Weapons bonus for a weapon: its gunner's for a crewed turret, 3 for an automatic one, the pilot's for
    * fixed and gimballed weapons.
    *
    * @param {Item} weapon
    *
    * @returns {{bonus: number, gunner: Actor|null, auto: boolean}}
    */
   gunnery(weapon) {
      if (weapon.system.mount?.kind === "turret") {
         const gunner = weapon.system.gunner ? (fromUuidSync(weapon.system.gunner) ?? null) : null;
         if (!gunner) return { bonus: AUTO_TURRET_BONUS, gunner: null, auto: true };
         return { bonus: VehicleData.crewBonus(gunner, "vehicleWeapons"), gunner, auto: false };
      }
      const pilot = this.pilotActor;
      return { bonus: VehicleData.crewBonus(pilot, "vehicleWeapons"), gunner: pilot, auto: false };
   }

   /**
    * To Hit for a weapon at the current speed.
    *
    * @param {Item} weapon
    *
    * @returns {number}
    */
   toHit(weapon) {
      return this.gunnery(weapon).bonus + (weapon.system.accuracy ?? 0) + this.speedRow.attack;
   }

   /** @returns {object} Roll data: initiative from the pilot. */
   getRollData() {
      return { initiative: this.initiative, defence: this.defence, pursuit: this.pursuit, speed: this.speed };
   }
}

/**
 * A weapon mounted on a vehicle or spaceship (Core Rules pp.194–196, vehicle stat blocks pp.221–234).
 * Damage is fixed, or a base plus Burst: +5 per point the attack beats the Defence, up to the Burst maximum.
 * Some do extra damage to Hull (kinetic) or to Shields (energy), or less to Shields (missiles).
 */
export class CraftWeaponData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      return {
         description: new fields.HTMLField({ initial: "" }),
         cost: new fields.StringField({ initial: "" }),
         mount: new fields.SchemaField({
            size: new fields.StringField({ required: true, choices: mountSizes, initial: "small" }),
            kind: new fields.StringField({ required: true, choices: mountKinds, initial: "fixed" }),
         }),
         accuracy: int(0),
         damage: int(10, { min: 0 }),
         // Burst: +5 damage per point over the Defence, up to `max` (0 = not a Burst weapon).
         burst: new fields.SchemaField({ perPoint: int(5, { min: 0 }), max: int(0, { min: 0 }) }),
         // Missiles and torpedoes: damage against Shields instead of the full damage (null = same).
         damageVsShields: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         bonusVsHull: int(0),
         bonusVsShields: int(0),
         ammo: new fields.SchemaField({
            value: int(0, { min: 0 }),
            max: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         }),
         special: new fields.StringField({ initial: "" }),
         // The crew member firing a turret (UUID); none = automatic fire at bonus 3.
         gunner: new fields.StringField({ required: true, blank: true, initial: "" }),
      };
   }

   /** Whether it uses ammunition. */
   get usesAmmo() {
      return this.ammo.max !== null;
   }

   /** "5 + Burst (15)", "25 (10 vs Shields)", "30" — with the Hull/Shields extras. */
   get damageLabel() {
      let text = `${this.damage}`;
      if (this.burst.max) text += ` + ${game.i18n.format("EDRPG.craft.burstShort", { max: this.burst.max })}`;
      if (this.damageVsShields !== null) text += ` (${game.i18n.format("EDRPG.craft.vsShieldsShort", { value: this.damageVsShields })})`;
      return text;
   }

   /** Short special notes for the table. */
   get specialLabel() {
      return [
         this.bonusVsHull ? game.i18n.format("EDRPG.craft.bonusVsHull", { value: this.bonusVsHull }) : "",
         this.bonusVsShields ? game.i18n.format("EDRPG.craft.bonusVsShields", { value: this.bonusVsShields }) : "",
         this.special,
      ]
         .filter(Boolean)
         .join(". ");
   }
}
