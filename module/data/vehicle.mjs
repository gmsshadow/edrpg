import { skillCategory } from "../config.mjs";

const fields = foundry.data.fields;
const int = (initial = 0, options = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...options });

/** Vehicle and ship size classes. */
export const craftSizes = {
   // Ship-launched fighters (Super Traders Supplement): no critical hits.
   tiny: "EDRPG.craft.size.tiny",
   small: "EDRPG.craft.size.small",
   medium: "EDRPG.craft.size.medium",
   large: "EDRPG.craft.size.large",
   huge: "EDRPG.craft.size.huge",
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

/** Actor types that are craft (vehicles and spaceships). */
export const CRAFT_TYPES = ["vehicle", "ship"];

/** @returns {boolean} Is this actor a vehicle or spaceship? */
export const isCraft = (actor) => CRAFT_TYPES.includes(actor?.type);

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
         // Combat-turn state (Core Rules pp.65–68, 72–75).
         combat: new fields.SchemaField({
            // Speed at the start of this vehicle's turn; null outside its turn (speed is then locked during combat).
            turnSpeed: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
            // The combat action taken this turn (or "").
            action: new fields.StringField({ required: true, blank: true, initial: "" }),
            sniping: new fields.BooleanField({ initial: false }),
            fleeing: new fields.BooleanField({ initial: false }),
            disengaging: new fields.BooleanField({ initial: false }),
            // Damaged by a Ram: no Agility in Defence until its next turn starts.
            rammed: new fields.BooleanField({ initial: false }),
            // Lost this turn's action to an obstacle or slope.
            lostAction: new fields.BooleanField({ initial: false }),
            // Pass: turn starts left during which a re-roll is available (2 = until the end of the next turn).
            pass: int(0, { min: 0 }),
            escaped: new fields.BooleanField({ initial: false }),
            // Ships: Flight Assist off (no Agility in Defence until the next turn).
            faOff: new fields.BooleanField({ initial: false }),
            // Ships: Hovering over smaller units (Combined Scale Combat, p.256): Defence 0 until the next action.
            hovering: new fields.BooleanField({ initial: false }),
            // Ships: spun out of control by a Ram (2 = until its next turn ends; it can't start a Dogfight then).
            outOfControl: int(0, { min: 0 }),
            // Ships' equipment actions, active until the start of the next turn.
            chaff: new fields.BooleanField({ initial: false }),
            mines: new fields.BooleanField({ initial: false }),
            // Rule Variants (Core Rules pp.263–264): who has attacked it since its last turn (Defence Tokens), and
            // whether it has already rolled a Dogfight outside its turn (one Interrupting Action).
            attackedBy: new fields.ArrayField(new fields.StringField(), { initial: [] }),
            interrupted: new fields.BooleanField({ initial: false }),
            // A Heat Sink fired this turn (+2 Systems while silent running, Core Rules p.198).
            heatSink: new fields.BooleanField({ initial: false }),
            // Silent Running (Core Rules p.268): rounds hidden so far, heat sinks fired (each buys another minute), and
            // the ships whose sensor scans have found it.
            silent: new fields.SchemaField({
               active: new fields.BooleanField({ initial: false }),
               rounds: int(0, { min: 0 }),
               sinks: int(0, { min: 0 }),
               seenBy: new fields.ArrayField(new fields.StringField(), { initial: [] }),
            }),
            // Shield Cell Bank running: index into equipment.cellBanks and rounds of boost left.
            cellBank: new fields.SchemaField({ index: int(-1), rounds: int(0, { min: 0 }) }),
            // Floating bonuses assigned (one per area at most).
            floating: new fields.SchemaField({
               engines: new fields.BooleanField({ initial: false }),
               weapons: new fields.BooleanField({ initial: false }),
               shields: new fields.BooleanField({ initial: false }),
            }),
         }),
         // Drones (Core Rules p.318): no crew; fixed Defence, Initiative and Pursuit (+ speed), To Hit in the weapons.
         drone: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false }),
            defence: int(0),
            initiative: int(0),
            pursuit: int(0),
            perception: int(0),
         }),
         // Flying (skimmers): no obstacle checks; fixed-mount vehicle weapons can't target it.
         flying: new fields.BooleanField({ initial: false }),
         // A flying bomb (Stinger-2): extra Damage when its Ram or Chicken connects (less if the target's shields hold),
         // and it is destroyed doing so.
         bomb: new fields.SchemaField({ damage: int(0, { min: 0 }), vsShields: int(0, { min: 0 }) }),
         // Crew caught in this vehicle's destruction who are waiting to be picked up (UUIDs).
         stranded: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), { initial: [] }),
         // Ram Raider "Forward Ram": no Damage from its own successful Ram; half from a Chicken collision.
         forwardRam: new fields.BooleanField({ initial: false }),
         // Crew: the pilot's UUID (any individual actor or opponent).
         pilot: new fields.StringField({ required: true, blank: true, initial: "" }),
         // Whose craft it is (a character's UUID): their Fleet, and the ships they use Between Adventures.
         owner: new fields.StringField({ required: true, blank: true, initial: "" }),
         // The model it was made from (e.g. "Sidewinder – FD-4"), kept when the craft is renamed.
         model: new fields.StringField({ required: true, blank: true, initial: "" }),
         description: new fields.HTMLField({ initial: "" }),
      };
   }

   /**
    * Values that Defence, Pursuit, To Hit and roll data depend on. Prepared in the base phase too, because Foundry
    * asks for roll data while applying Active Effects, before derived data exists.
    */
   prepareCombatValues() {
      this.hull.max = Math.max(this.hull.max, 0);
      this.shields.halfway = Math.ceil(this.shields.max / 2);
      const row = this.speed > 0 ? this.speedTable?.[this.speed - 1] : null;
      this.speedRow = { defence: row?.defence ?? 0, attack: row?.attack ?? 0 };
      this.topSpeed = Math.min(this.maxSpeed ?? 0, this.speedTable?.length ?? 0);
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.prepareCombatValues();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this.prepareCombatValues();
   }

   /** The pilot actor, if one is assigned and available (drones have none). */
   get pilotActor() {
      if (this.drone?.enabled) return null;
      return this.pilot ? (fromUuidSync(this.pilot) ?? null) : null;
   }

   /** Destroyed: Hull 0 or less. */
   get destroyed() {
      return this.hull.value <= 0;
   }

   /** Everyone aboard who can be caught in its destruction: the pilot and turret gunners. */
   get crewActors() {
      const uuids = new Set([this.pilot, ...(this.parent?.itemTypes?.craftWeapon ?? []).map((w) => w.system.gunner)].filter(Boolean));
      if (this.drone?.enabled) return [];
      return [...uuids].map((u) => fromUuidSync(u)).filter(Boolean);
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

   /** Skills for this kind of craft. */
   static PILOTING = "vehiclePiloting";

   static WEAPONS = "vehicleWeapons";

   /** Is this a spaceship? */
   get isShip() {
      return false;
   }

   /** Score used in Tail / Dogfight rolls. */
   get dogfight() {
      return this.defence;
   }

   /** The pilot's Piloting bonus (Vehicle or Spaceship). */
   get piloting() {
      return VehicleData.crewBonus(this.pilotActor, this.constructor.PILOTING);
   }

   /**
    * Defence: Agility + Vehicle Piloting + speed bonus; 0 when stationary or Sniping. A vehicle damaged by a Ram can't
    * add its Agility until its next turn.
    */
   get defence() {
      if (this.speed <= 0 || this.combat?.sniping) return 0;
      if (this.drone?.enabled) return Math.max(0, this.drone.defence - (this.combat?.rammed ? this.agility : 0)) + this.speedRow.defence;
      return (this.combat?.rammed ? 0 : this.agility) + this.piloting + this.speedRow.defence;
   }

   /**
    * The speeds this vehicle may choose right now: within Accelerate/Decelerate of its turn-start speed during its
    * turn; null when unrestricted (outside a turn).
    *
    * @returns {{min: number, max: number}|null}
    */
   get speedRange() {
      const start = this.combat?.turnSpeed ?? null;
      if (start === null) return null;
      return { min: Math.max(0, start - this.decelerate), max: Math.min(this.topSpeed, start + this.accelerate) };
   }

   /** Pursuit: half the Vehicle Piloting bonus (rounded down) + current Speed. */
   get pursuit() {
      if (this.drone?.enabled) return this.drone.pursuit + this.speed;
      return Math.floor(this.piloting / 2) + this.speed;
   }

   /** Initiative: the pilot's Tactics bonus. */
   get initiative() {
      if (this.drone?.enabled) return this.drone.initiative;
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
   gunnery(weapon, { forward = false } = {}) {
      // A drone's (or GM ship's) listed To Hit is held in each weapon's Accuracy.
      if (this.drone?.enabled || this.npc?.enabled) return { bonus: 0, gunner: null, auto: false, drone: true };
      const skill = this.constructor.WEAPONS;
      // Small ships can fix their turrets forwards when Jousting, Sniping, Strafing or winning a Dogfight (p.65).
      const fixedForward = forward && this.isShip && ["tiny", "small"].includes(this.category);
      if (weapon.system.mount?.kind === "turret" && !fixedForward) {
         const gunner = weapon.system.gunner ? (fromUuidSync(weapon.system.gunner) ?? null) : null;
         if (!gunner) return { bonus: AUTO_TURRET_BONUS, gunner: null, auto: true };
         return { bonus: VehicleData.crewBonus(gunner, skill), gunner, auto: false };
      }
      const pilot = this.pilotActor;
      return { bonus: VehicleData.crewBonus(pilot, skill), gunner: pilot, auto: false };
   }

   /**
    * To Hit for a weapon at the current speed.
    *
    * @param {Item} weapon
    *
    * @returns {number}
    */
   toHit(weapon) {
      return this.gunnery(weapon).bonus + (weapon.system.accuracy ?? 0) + this.speedRow.attack + (this.weaponPenalty ?? 0);
   }

   /** @returns {object} Roll data: initiative from the pilot. */
   getRollData() {
      if (!this.speedRow) this.prepareCombatValues();
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
         // Power draw in MW (Core Rules pp.195–196; null = not listed) and the ship hardpoint it's fitted to (-1 = none).
         power: new fields.NumberField({ required: true, nullable: true, min: 0, initial: null }),
         hardpoint: int(-1, { min: -1 }),
         // Engineering (Espionage Supplement): its positive effects and faults.
         engineered: new fields.SchemaField({
            effects: new fields.ArrayField(new fields.StringField(), { initial: [] }),
            faults: new fields.ArrayField(new fields.StringField(), { initial: [] }),
         }),
         // Destabilisation Beam (Exploration Supplement): a hit collapses the shields, puts the Damage on the Hull, and
         // on a ship also on every Fixed and Internal component (weapons and utility mounts too on a critical hit).
         destabilise: new fields.BooleanField({ initial: false }),
         // Aegis weapons (Exploration Supplement): AX munitions harm Thargoid hulls; flak shreds Thargon swarms.
         ax: new fields.BooleanField({ initial: false }),
         flak: new fields.BooleanField({ initial: false }),
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

/** The fixed components every ship must have, each of the hull's class (Core Rules p.192). */
export const FIXED_KINDS = ["powerPlant", "thrusters", "fsd", "lifeSupport", "powerDistributor", "sensors"];

/** Ship component kinds: the fixed components and the ones a critical hit can name (Core Rules pp.69, 197–206). */
export const componentKinds = {
   powerPlant: "EDRPG.ship.component.powerPlant",
   thrusters: "EDRPG.ship.component.thrusters",
   fsd: "EDRPG.ship.component.fsd",
   lifeSupport: "EDRPG.ship.component.lifeSupport",
   powerDistributor: "EDRPG.ship.component.powerDistributor",
   sensors: "EDRPG.ship.component.sensors",
   shieldGenerator: "EDRPG.ship.component.shieldGenerator",
   weapon: "EDRPG.ship.component.weapon",
   utility: "EDRPG.ship.component.utility",
   internal: "EDRPG.ship.component.internal",
};

/**
 * A spaceship (Core Rules pp.63–71, ch. 5). Shares the vehicle model, without a Speed Table or speed changes:
 * - Defence = Agility + the pilot's Spaceship Piloting; 0 when immobilised or Sniping; no Agility with Flight Assist off.
 * - Pursuit = Speed + half the pilot's Spaceship Piloting (rounded down).
 * - To Hit = Spaceship Weapons + Accuracy.
 * GM opponent ships use a fixed stat block instead (Defence, Dogfighting, Pursuit, Initiative, Critical), with each
 * weapon's Accuracy holding its listed To Hit (Core Rules p.302 on).
 */
export class ShipData extends VehicleData {
   static PILOTING = "shipPiloting";

   static WEAPONS = "shipWeapons";

   static defineSchema() {
      const schema = super.defineSchema();
      return {
         ...schema,
         landingPad: new fields.StringField({ initial: "" }),
         // Bonuses from fitted components (ship roster "Bonuses"); Agility and Speed are already in their ratings.
         bonuses: new fields.SchemaField({ toHit: int(0), initiative: int(0), dogfighting: int(0) }),
         range: new fields.StringField({ initial: "" }),
         fuel: new fields.StringField({ initial: "" }),
         utilityMounts: new fields.StringField({ initial: "" }),
         // GM opponent stat block.
         npc: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false }),
            defence: int(0),
            dogfighting: int(0),
            pursuit: int(0),
            initiative: int(0),
            critical: int(20, { min: 0 }),
         }),
         // Combat equipment (Core Rules pp.65, 197–198, 214).
         equipment: new fields.SchemaField({
            chaff: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
            mines: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }), dn: int(15), damage: int(10, { min: 0 }) }),
            pointDefence: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
            heatSinks: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
            ecm: new fields.BooleanField({ initial: false }),
            floating: int(0, { min: 0 }),
            cellBanks: new fields.ArrayField(
               new fields.SchemaField({
                  name: new fields.StringField({ initial: "" }),
                  boost: int(5, { min: 0 }),
                  duration: int(1, { min: 1 }),
                  uses: int(3, { min: 0 }),
               }),
               { initial: [] },
            ),
         }),
         // Engineered bulkhead (Espionage Supplement).
         bulkhead: new fields.SchemaField({
            effects: new fields.ArrayField(new fields.StringField(), { initial: [] }),
            faults: new fields.ArrayField(new fields.StringField(), { initial: [] }),
         }),
         // Craft docked in this ship's Fighter Hangars and Spaceship Hangar (Super Traders Supplement).
         hangar: new fields.ArrayField(
            new fields.SchemaField({
               uuid: new fields.StringField({ initial: "" }),
               launched: new fields.BooleanField({ initial: false }),
            }),
            { initial: [] },
         ),
         // A docked or launched craft: its mothership, and whether it's flown remotely from there.
         carrier: new fields.StringField({ initial: "" }),
         // Thargoids (Exploration Supplement): an impervious hull (only AX weapons harm it, no critical hits), and a
         // swarm (at most 1 Damage a hit, plus 1 per Burst level, except from flak).
         impervious: new fields.BooleanField({ initial: false }),
         swarm: new fields.BooleanField({ initial: false }),
         remote: new fields.BooleanField({ initial: true }),
         // Outfitting (Core Rules pp.192–193): the hull's slots from its Basic Specifications, its starting Hull (for
         // bulkhead bonuses) and the Explorer trait (+50% jump range). Disabled = ratings and roster are kept by hand.
         outfit: new fields.SchemaField({
            enabled: new fields.BooleanField({ initial: false }),
            hull: new fields.StringField({ initial: "" }),
            baseHull: int(0, { min: 0 }),
            explorer: new fields.BooleanField({ initial: false }),
            hardpoints: new fields.ArrayField(new fields.StringField({ required: true, choices: mountSizes, initial: "small" }), { initial: [] }),
            utility: int(0, { min: 0 }),
            fixed: new fields.SchemaField(Object.fromEntries(FIXED_KINDS.map((k) => [k, int(0, { min: 0, max: 8 })]))),
            internal: new fields.ArrayField(new fields.SchemaField({ size: int(1, { min: 1, max: 8 }), military: new fields.BooleanField({ initial: false }) }), { initial: [] }),
         }),
         // The ship roster's components, in roster order (critical hits count along this list).
         components: new fields.ArrayField(
            new fields.SchemaField({
               name: new fields.StringField({ initial: "" }),
               kind: new fields.StringField({ required: true, choices: componentKinds, initial: "internal" }),
               strength: new fields.SchemaField({ value: int(10), max: int(10, { min: 0 }) }),
               notes: new fields.StringField({ initial: "" }),
               // The Ship Component (or Craft Weapon) item it stands for.
               item: new fields.StringField({ initial: "" }),
               // Outfitting: the slot it occupies ("fixed.thrusters", "internal.3", "utility.0"; "" = not tracked).
               slot: new fields.StringField({ initial: "" }),
               // Engineering (Espionage Supplement): its positive effects and faults.
               engineered: new fields.SchemaField({
               effects: new fields.ArrayField(new fields.StringField(), { initial: [] }),
               faults: new fields.ArrayField(new fields.StringField(), { initial: [] }),
            }),
            }),
            { initial: [] },
         ),
      };
   }

   /** @override */
   prepareCombatValues() {
      super.prepareCombatValues();
      // No Speed Table in space: the ship's Speed is a fixed rating.
      this.speedRow = { defence: 0, attack: 0 };
      this.topSpeed = this.speed;
      const broken = (kind) => (this.components ?? []).some((c) => c.kind === kind && c.strength.value <= 0);
      this.damaged = {
         powerPlant: broken("powerPlant"),
         thrusters: broken("thrusters"),
         fsd: broken("fsd"),
         lifeSupport: broken("lifeSupport"),
         powerDistributor: broken("powerDistributor"),
         sensors: broken("sensors"),
      };
      // Destroyed Power Plant or Thrusters: immobilised (p.69).
      this.damaged.shieldGenerator = broken("shieldGenerator");
      this.immobilised = this.damaged.powerPlant || this.damaged.thrusters;
      // Floating bonuses: engines +1 Agility, weapons +1 To Hit.
      const fl = this.combat?.floating ?? {};
      this.floatingAgility = fl.engines ? 1 : 0;
      // Destroyed Power Distributor: −1 Agility and To Hit (−2 for GM ships), and no shield recharge.
      const npc = !!this.npc?.enabled;
      const pd = this.damaged.powerDistributor ? (npc ? 2 : 1) : 0;
      this.agilityPenalty = pd - this.floatingAgility;
      this.weaponPenalty = -pd + (fl.weapons ? 1 : 0) + (npc ? 0 : (this.bonuses?.toHit ?? 0));
   }

   /** @override */
   get isShip() {
      return true;
   }

   /** A ship-launched fighter (no critical hits). */
   get isFighter() {
      return this.category === "tiny";
   }

   /**
    * Hangar capacity from working components: Fighter Bays on Fighter Hangars, one small ship per Spaceship Hangar.
    *
    * @returns {{fighters: number, ships: number}}
    */
   get hangarCapacity() {
      let fighters = 0;
      let ships = 0;
      for (const c of this.components ?? []) {
         if (c.strength.value <= 0) continue;
         if (/fighter hangar/i.test(c.name)) fighters += Number(c.notes.match(/(?:Fighter )?Bays\s*(\d+)/i)?.[1]) || 1;
         else if (/spaceship hangar/i.test(c.name)) ships += 1;
      }
      return { fighters, ships };
   }

   /**
    * Is a weapon out of action (its component destroyed by a critical hit)?
    *
    * @param {Item} weapon
    *
    * @returns {boolean}
    */
   weaponDestroyed(weapon) {
      return this.components.some((c) => c.kind === "weapon" && c.item === weapon.id && c.strength.value <= 0);
   }

   /** Shield recharge this turn: base + floating bonus + a running Shield Cell Bank. */
   get rechargeNow() {
      if (this.damaged?.powerDistributor || this.damaged?.shieldGenerator) return 0;
      const bank = this.equipment?.cellBanks?.[this.combat?.cellBank?.index ?? -1];
      const bankBroken = bank && this.components.some((c) => c.name === bank.name && c.strength.value <= 0);
      return this.shields.recharge + (this.combat?.floating?.shields ? 5 : 0) + (bank && !bankBroken && this.combat.cellBank.rounds > 0 ? bank.boost : 0);
   }

   /** @override */
   get speedRange() {
      return null;
   }

   /** Agility after damage. */
   get effectiveAgility() {
      return this.agility - (this.agilityPenalty ?? 0);
   }

   /** @override */
   get defence() {
      if (this.immobilised || this.combat?.sniping || this.combat?.hovering) return 0;
      const sensors = this.damaged?.sensors ? 1 : 0;
      const agility = this.combat?.faOff ? 0 : this.effectiveAgility;
      if (this.npc.enabled) return Math.max(0, this.npc.defence - (this.combat?.faOff ? this.agility : 0) - (this.agilityPenalty ?? 0) - sensors);
      return Math.max(0, agility + this.piloting - sensors);
   }

   /** @override */
   get dogfight() {
      if (this.npc.enabled) return Math.max(0, this.npc.dogfighting - (this.agilityPenalty ?? 0));
      return this.defence + (this.bonuses?.dogfighting ?? 0);
   }

   /** @override */
   get pursuit() {
      if (this.npc.enabled) return this.npc.pursuit;
      return this.speed + Math.floor(this.piloting / 2);
   }

   /** @override */
   get initiative() {
      if (this.npc.enabled) return this.npc.initiative;
      return VehicleData.crewBonus(this.pilotActor, "tactics") + (this.bonuses?.initiative ?? 0);
   }

   /** @override */
   get crewActors() {
      if (this.npc.enabled) return [];
      return super.crewActors;
   }

   /** @override */
   get pilotActor() {
      if (this.npc?.enabled) return null;
      return super.pilotActor;
   }
}

/** Ship component categories (Core Rules pp.197–216). */
export const componentCategories = {
   bulkhead: "EDRPG.outfit.cat.bulkhead",
   powerPlant: "EDRPG.ship.component.powerPlant",
   thrusters: "EDRPG.ship.component.thrusters",
   fsd: "EDRPG.ship.component.fsd",
   lifeSupport: "EDRPG.ship.component.lifeSupport",
   powerDistributor: "EDRPG.ship.component.powerDistributor",
   sensors: "EDRPG.ship.component.sensors",
   fuelTank: "EDRPG.outfit.cat.fuelTank",
   cargoHatch: "EDRPG.outfit.cat.cargoHatch",
   utility: "EDRPG.ship.component.utility",
   shieldGenerator: "EDRPG.ship.component.shieldGenerator",
   cargoRack: "EDRPG.outfit.cat.cargoRack",
   afmu: "EDRPG.outfit.cat.afmu",
   collector: "EDRPG.outfit.cat.collector",
   dockingComputer: "EDRPG.outfit.cat.dockingComputer",
   fsdInterdictor: "EDRPG.outfit.cat.fsdInterdictor",
   fuelScoop: "EDRPG.outfit.cat.fuelScoop",
   hatchBreaker: "EDRPG.outfit.cat.hatchBreaker",
   hullReinforcement: "EDRPG.outfit.cat.hullReinforcement",
   moduleReinforcement: "EDRPG.outfit.cat.moduleReinforcement",
   prospector: "EDRPG.outfit.cat.prospector",
   planetaryScanner: "EDRPG.outfit.cat.planetaryScanner",
   refinery: "EDRPG.outfit.cat.refinery",
   vehicleHangar: "EDRPG.outfit.cat.vehicleHangar",
   shieldCellBank: "EDRPG.outfit.cat.shieldCellBank",
   fighterHangar: "EDRPG.outfit.cat.fighterHangar",
   spaceshipHangar: "EDRPG.outfit.cat.spaceshipHangar",
};

/** Where a component is fitted (Core Rules pp.192–193). */
export const componentSlots = {
   fixed: "EDRPG.outfit.slot.fixed",
   internal: "EDRPG.outfit.slot.internal",
   utility: "EDRPG.outfit.slot.utility",
};

/** The numbers a component can add to a ship; 0 = none. */
export const componentStats = [
   "output", "range", "capacity", "shields", "hull", "hullBonus", "shieldBoost", "strengthBonus", "speed", "agility", "toHit",
   "initiative", "dogfighting", "shieldRecharge", "floating", "generalScan", "systems", "mining", "recharge", "duration",
];

/**
 * A spaceship component or utility mount (Core Rules pp.192–216): its slot, size and grade, power draw, Strength and cost,
 * and the numbers it adds to the ship. `special` is the short note shown on the ship's component roster.
 */
export class ShipComponentData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const stats = Object.fromEntries(componentStats.map((key) => [key, new fields.NumberField({ required: true, nullable: false, initial: 0 })]));
      return {
         description: new fields.HTMLField({ initial: "" }),
         cost: new fields.StringField({ initial: "" }),
         category: new fields.StringField({ required: true, choices: componentCategories, initial: "cargoRack" }),
         slot: new fields.StringField({ required: true, choices: componentSlots, initial: "internal" }),
         // Military slots take only Hull and Module Reinforcement Packages and Shield Cell Banks (Core Rules p.193).
         military: new fields.BooleanField({ initial: false }),
         size: int(1, { min: 0, max: 8 }),
         grade: new fields.StringField({ required: true, blank: true, initial: "E" }),
         // Power draw in MW (null = none listed).
         power: new fields.NumberField({ required: true, nullable: true, min: 0, initial: null }),
         // Component Strength (null = not subject to critical hits).
         strength: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         ammo: new fields.SchemaField({
            value: int(0, { min: 0 }),
            max: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
         }),
         stats: new fields.SchemaField(stats),
         special: new fields.StringField({ initial: "" }),
         // On a ship: the slot it's fitted to ("bulkhead", "fixed.thrusters", "internal.3", "utility.0").
         fitted: new fields.StringField({ initial: "" }),
      };
   }

   /** "4A", or "0A" for a utility mount. */
   get code() {
      return `${this.size}${this.grade}`;
   }
}
