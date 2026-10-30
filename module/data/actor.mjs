import {
   ranks,
   skills,
   BASE_SKILL_SCORE,
   MAX_SKILL_SCORE,
   pilotTrained,
   skillCategory,
   rankFor,
   MAX_HUMAN_ENDURANCE,
   CYBORG_SOCIAL_FACTOR,
   BASE_SPEED,
   enhancementEffects,
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
         // Whether this character's partner may spend their Karma (Core Rules p.27).
         partnerKarma: new fields.BooleanField({ initial: true }),
         // Rank advancement (Core Rules pp.49–50): the highest rank whose benefits have been applied, and a record of
         // each rank-up. Blank means "the current rank" (characters from before this was tracked).
         advancement: new fields.SchemaField({
            rank: new fields.StringField({ required: true, blank: true, initial: "" }),
            history: new fields.ArrayField(
               new fields.SchemaField({
                  rank: new fields.StringField({ required: true, blank: false, initial: "harmless" }),
                  choice: new fields.StringField({ required: true, blank: true, initial: "" }),
                  skills: new fields.ArrayField(
                     new fields.SchemaField({
                        skill: new fields.StringField({ required: true, blank: false, initial: "athletics" }),
                        roll: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                        added: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                     }),
                  ),
               }),
            ),
         }),
      };
   }

   /**
    * Ranks reached but not yet applied (in order).
    *
    * @returns {object[]}  Rank table entries.
    */
   get pendingRanks() {
      const current = ranks.indexOf(this.rank);
      const applied = this.advancement.rank ? ranks.findIndex((r) => r.key === this.advancement.rank) : current;
      return applied < 0 || applied >= current ? [] : ranks.slice(applied + 1, current + 1);
   }

   /**
    * Karma Capabilities allowed: the rank table assumes a new capability at every rank, so one less for each rank-up
    * where an Enhancement was chosen instead.
    *
    * @returns {number}
    */
   get karmaCapabilityLimit() {
      return this.rank.karmaCap - (this.advancement.history ?? []).filter((h) => h.choice === "enhancement").length;
   }

   /** Weapons in hand and armour being worn: the items whose modifiers apply. */
   get equippedItems() {
      const items = this.parent.items ?? [];
      return items.filter(
         (i) =>
            (i.type === "weapon" && i.system.equipped) ||
            ((i.type === "armour" || i.type === "clothing") && i.system.worn) ||
            i.type === "cybernetic",
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

   /**
    * Skill bonus for a check.
    *
    * @param {string} skill
    *
    * @returns {number}
    */
   skillBonus(skill) {
      return this.skills[skillCategory[skill]]?.[skill]?.bonus ?? 0;
   }

   /**
    * Equipment bonuses to checks with a Skill: worn clothing and carried gear (e.g. Studded Thug Outfit +1
    * Intimidate, Medpack +2 Medicine when stabilising or healing). Score bonuses are converted to the change in
    * Skill bonus they make.
    *
    * @param {string} skill
    *
    * @returns {{key: string, label: string, value: number, raw: number, kind: string, when: string}[]}
    */
   itemSkillBonuses(skill) {
      const data = this.skills[skillCategory[skill]]?.[skill];
      const out = [];
      for (const item of this.parent.items ?? []) {
         const using = (item.type === "clothing" && item.system.worn) || (item.type === "gear" && item.system.location === "carried");
         if (!using) continue;
         (item.system.rollBonuses ?? []).forEach((b, index) => {
            if (b.skill !== skill || !b.value) return;
            let value = b.value;
            if (b.kind === "score" && data) value = Math.floor(Math.min(data.score + b.value, MAX_SKILL_SCORE) / 10) - data.bonus;
            out.push({ key: `${item.id}.${index}`, label: item.name, value, raw: b.value, kind: b.kind, when: b.when });
         });
      }
      return out;
   }

   /**
    * Initiative score = Tactics bonus (Core Rules, "Determine Defence & Initiative"). With the Awareness
    * enhancement the Perception bonus may be used instead, so the better of the two.
    */
   get initiative() {
      const tactics = this.skills.intelligence.tactics.bonus;
      const base = this.enhancements?.awareness ? Math.max(tactics, this.skills.espionage.perception.bonus) : tactics;
      return base + (this.cybernetics?.initiativeBonus ?? 0);
   }

   /**
    * How many of each Enhancement the actor has, by effect key.
    *
    * @returns {Record<string, number>}
    */
   _countEnhancements() {
      const counts = {};
      const genius = {};
      for (const item of this.parent.itemTypes?.enhancement ?? []) {
         const { effect, skill } = item.system;
         counts[effect] = (counts[effect] ?? 0) + 1;
         if (effect === "naturalGenius" && skill) genius[skill] = (genius[skill] ?? 0) + 1;
      }
      // Combat Stim: Brutal Plus gives Strong and Quick Runner while it lasts.
      if (this.stimEffect === "brutal") {
         counts.strong = (counts.strong ?? 0) + 1;
         counts.quickRunner = (counts.quickRunner ?? 0) + 1;
      }
      // Armour that grants an Enhancement while worn (Powered Armour: Strong).
      for (const armour of this.parent.itemTypes?.armour ?? []) {
         const name = armour.system.enhancement?.trim().toLowerCase();
         if (!armour.system.worn || !name) continue;
         const effect = Object.keys(enhancementEffects).find(
            (k) => k.toLowerCase() === name.replace(/\s+/g, "") || game.i18n.localize(enhancementEffects[k]).toLowerCase() === name,
         );
         if (effect && effect !== "none") counts[effect] = (counts[effect] ?? 0) + 1;
      }
      return { counts, genius };
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
      // An active Combat Stim (the Stimmed status) and its drug's extra effect.
      this.stimmed = this.parent.statuses?.has("edrpgStimmed") ?? false;
      this.stimEffect = this.stimmed ? (this.parent.getFlag?.("edrpg", "stim")?.effect ?? "") : "";
      const { counts, genius } = this._countEnhancements();
      const n = (key) => counts[key] ?? 0;
      this.enhancements = counts;

      // Cybernetics: their bonuses add up (two Type 1 Arm Upgrades: +4 damage), separately from Enhancements.
      const cybernetics = this.parent.itemTypes?.cybernetic ?? [];
      const sum = (key) => cybernetics.reduce((total, c) => total + (c.system[key] ?? 0), 0);
      this.cybernetics = {
         count: cybernetics.length,
         karmaCost: sum("karmaCost"),
         damageBonus: sum("damageBonus"),
         speedBonus: sum("speedBonus"),
         resistKnockdown: sum("resistKnockdown"),
         enduranceBonus: sum("enduranceBonus"),
         initiativeBonus: sum("initiativeBonus"),
      };
      this.resistKnockdown = this.cybernetics.resistKnockdown;

      // Cybernetic Affinity: 2 Karma points for cybernetic upgrades each time. Cybernetics drain Karma permanently,
      // paid from those cybernetic Karma points first, then from standard Karma (Core Rules p.124).
      this.karma.cyber.enhancement = 2 * n("cyberneticAffinity");
      this.karma.cyber.base = this.karma.cyber.enhancement;
      const cyberPool = Math.max(this.karma.cyber.base + this.karma.cyber.bonus, 0);
      this.karma.cyber.spent = Math.min(this.cybernetics.karmaCost, cyberPool);
      this.karma.cyber.max = cyberPool - this.karma.cyber.spent;
      this.karma.standard.base = rank.karmaPoints;
      this.karma.standard.cybernetics = this.cybernetics.karmaCost - this.karma.cyber.spent;
      this.karma.standard.max = Math.max(rank.karmaPoints + this.karma.standard.bonus - this.karma.standard.cybernetics, 0);
      // Tough: +5 Endurance each time, up to the natural human maximum; cybernetics etc. go in `bonus`.
      this.endurance.enhancement = 5 * n("tough");
      this.endurance.rank = rank.endurance;
      this.endurance.base = Math.min(rank.endurance + this.endurance.enhancement, MAX_HUMAN_ENDURANCE);
      // Replacement Internals add to Endurance beyond the natural human maximum.
      this.endurance.cybernetics = this.cybernetics.enduranceBonus;
      this.endurance.max = this.endurance.base + this.endurance.cybernetics + this.endurance.bonus;
      // Quick Runner: +2m each time (at most three times).
      this.speed = BASE_SPEED + 2 * Math.min(n("quickRunner"), 3) + this.cybernetics.speedBonus;
      // Strong: +2 Fighting and Melee damage each time, at most +10.
      this.damageBonus = Math.min(2 * n("strong"), 10) + this.cybernetics.damageBonus;
      // Ambidextrous: two-weapon penalty -1, then none.
      this.twoWeaponPenalty = n("ambidextrous") >= 2 ? 0 : n("ambidextrous") === 1 ? -1 : -2;
      // Hard to Kill: die at minus maximum Endurance; the second time Escape Death costs at most 4 Karma.
      this.hardToKill = n("hardToKill");

      // Natural Genius: +10 to that Skill's Cap (max 100).
      for (const [skill, times] of Object.entries(genius)) {
         const data = this.skills[skillCategory[skill]]?.[skill];
         if (!data) continue;
         data.geniusCap = 10 * times;
         data.cap = Math.min(data.cap + data.geniusCap, MAX_SKILL_SCORE);
      }

      this._prepareSocialFactor();

      // Background skill bonuses (count towards Base and are limited by the Skill Cap).
      const sources = [];
      if (this.receivesPilotTrained) {
         sources.push({ label: "EDRPG.sheet.pilotTrained", mods: pilotTrained });
      }
      for (const background of this.parent.itemTypes.background ?? []) {
         sources.push({ label: background.name, mods: background.system.skills ?? [] });
      }
      // Independent learning at character creation: +10 to the first Skill chosen down to +1 for the tenth.
      const learning = (this.creation?.learning ?? []).slice(0, 10);
      if (learning.length) {
         sources.push({
            label: "EDRPG.creation.independentLearning",
            mods: learning.map((skill, i) => ({ skill, bonus: 10 - i })).filter((m) => m.skill),
         });
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

      // Combat Stim: Paranoia Plus gives +10 Dodge Skill score while it lasts.
      if (this.stimEffect === "paranoia") {
         const dodge = this.skills.combat.dodge;
         dodge.equipmentMod += 10;
         dodge.equipmentSources.push({ label: "EDRPG.stim.paranoia", value: 10 });
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
      const items = this.parent.itemTypes ?? {};
      const sources = [];
      // The Confident enhancement works like the manual "confident" box.
      const confident = sf.confident || !!this.enhancements?.confident;
      sf.confidentEnhancement = !!this.enhancements?.confident;
      // Visible cybernetics (anything not Discreet), or Discreet ones once revealed.
      const cybernetics = items.cybernetic ?? [];
      sf.cyborgVisible = cybernetics.some((c) => !c.system.discreet);
      sf.cyborg = sf.cyborgVisible || sf.cyborgRevealed;

      /**
       * One source, applying the damaged-clothes and Confident rules.
       *
       * @param {string} label
       *
       * @param {number} value
       *
       * @param {object} [options]
       *
       * @param {boolean} [options.clothing]  Positive values are lost once the wearer is damaged.
       */
      const add = (label, value, { clothing = false } = {}) => {
         let note = null;
         if (value > 0 && clothing && sf.damaged) {
            value = 0;
            note = "EDRPG.socialFactor.damagedNote";
         } else if (value < 0 && confident) {
            value = 0;
            note = "EDRPG.socialFactor.confidentNote";
         }
         sources.push({ label, value, note });
         return value;
      };

      let total;
      if (sf.cyborg) {
         // Clothes, cosmetics and other items don't alter a cyborg's Social Factor.
         total = add("EDRPG.socialFactor.cyborg", CYBORG_SOCIAL_FACTOR);
      } else {
         total = add("EDRPG.socialFactor.worn", sf.worn, { clothing: true });
         for (const item of (items.clothing ?? []).filter((c) => c.system.worn && c.system.socialFactor)) {
            total += add(item.name, item.system.socialFactor, { clothing: true });
         }
         // Worn armour (Discreet armour only counts when worn openly).
         for (const armour of (items.armour ?? []).filter((a) => a.system.worn && a.system.effectiveSocialFactor)) {
            total += add(armour.name, armour.system.effectiveSocialFactor);
         }
         // Coms, gas masks and other items in use.
         const active = (items.gear ?? []).filter((g) => g.system.active && g.system.socialFactor);
         for (const item of active.filter((g) => g.system.category !== "cosmetic")) {
            total += add(item.name, item.system.socialFactor);
         }
         // Only one cosmetics bonus at a time: the best applied cosmetic, or the manual value.
         const cosmetics = active.filter((g) => g.system.category === "cosmetic").sort((a, b) => b.system.socialFactor - a.system.socialFactor);
         if (cosmetics.length) total += add(cosmetics[0].name, cosmetics[0].system.socialFactor);
         else total += add("EDRPG.socialFactor.cosmetics", sf.cosmetics);
         total += add("EDRPG.socialFactor.other", sf.other);
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
         speed: this.speed,
         damageBonus: this.damageBonus,
         skill,
      };
   }
}

/** Player characters get Pilot Trained for free (Core Rules p.14). */
export class CharacterData extends IndividualData {
   static defineSchema() {
      return {
         ...super.defineSchema(),
         // Character creation (Core Rules pp.14–39). New characters start with `complete: false` (see EDActor),
         // existing ones default to complete so the checklist doesn't appear on them.
         creation: new fields.SchemaField({
            complete: new fields.BooleanField({ initial: true }),
            // Independent learning: ten Skills in order, receiving +10, +9 … +1 (p.37).
            learning: new fields.ArrayField(new fields.StringField({ required: true, blank: true, initial: "" })),
            equipment: new fields.BooleanField({ initial: false }),
            ship: new fields.BooleanField({ initial: false }),
         }),
      };
   }

   get receivesPilotTrained() {
      return true;
   }
}

/** Individual-scale NPCs: same statistics, no free background. */
export class NPCIndividualData extends IndividualData {}

/**
 * Opponent — the book's abbreviated stat block (Core Rules pp.280–283).
 * - Defence (Dodge/Parry): blank means the opponent can't use that defence (Walker Drones use neither).
 * - To Hit is the bonus for any weapon; a weapon can override it.
 * - Fighting is To Hit −1 unless listed under Other Skills; unarmed damage is 1D10 halved.
 * - Karma Capabilities have no points: each can be used once per battle.
 * - Weapons, worn armour and capabilities are ordinary items on the actor.
 */
export class OpponentData extends foundry.abstract.TypeDataModel {
   static defineSchema() {
      const int = (initial = 0) => new fields.NumberField({ ...requiredInteger, initial });
      const nullableInt = () => new fields.NumberField({ required: true, nullable: true, integer: true, initial: null });
      return {
         rank: new fields.StringField({ required: true, blank: true, initial: "" }),
         role: new fields.StringField({ initial: "" }),
         dodge: nullableInt(),
         parry: nullableInt(),
         initiative: int(1),
         perception: int(1),
         toHit: int(1),
         speed: new fields.StringField({ initial: "10m" }),
         endurance: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 20 }),
            max: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 20 }),
         }),
         otherSkills: new fields.ArrayField(
            new fields.SchemaField({
               skill: new fields.StringField({ required: true, blank: true, initial: "" }),
               bonus: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            }),
         ),
         equipment: new fields.StringField({ initial: "" }),
         notes: new fields.HTMLField({ initial: "" }),
      };
   }

   /** Rank table entry, if a rank is chosen. */
   get rankData() {
      return ranks.find((r) => r.key === this.rank) ?? null;
   }

   /** Fighting bonus: as listed, otherwise To Hit −1 (Core Rules p.281). */
   get fighting() {
      return this.otherSkills.find((s) => s.skill === "fighting")?.bonus ?? Math.max(this.toHit - 1, 0);
   }

   /**
    * Bonus for a skill check. Listed skills first; then the stat block's own numbers; weapon skills use To Hit.
    * Anything else isn't listed, so it is 0 and the GM adds a modifier as they see fit.
    *
    * @param {string} skill
    *
    * @returns {number}
    */
   skillBonus(skill) {
      const listed = this.otherSkills.find((s) => s.skill === skill);
      if (listed) return listed.bonus;
      switch (skill) {
         case "perception":
            return this.perception;
         case "tactics":
            return this.initiative;
         case "dodge":
            return this.dodge ?? 0;
         case "parry":
            return this.parry ?? 0;
         case "fighting":
            return this.fighting;
         case "kineticWeapons":
         case "energyWeapons":
         case "heavyWeapons":
         case "meleeWeapons":
         case "grenade":
            return this.toHit;
         default:
            return 0;
      }
   }

   /** @override */
   getRollData() {
      return {
         initiative: this.initiative,
         perception: this.perception,
         toHit: this.toHit,
         dodge: this.dodge ?? 0,
         parry: this.parry ?? 0,
      };
   }
}

/**
 * A partner (Core Rules pp.27–30): a companion created through the Partner background, on a character sheet of their
 * own but linked to their host.
 * - Three background choices; Pilot Trained isn't free (it uses a choice); no independent learning.
 * - Endurance 5 less than the host's for each step down the chain (the host's Enhancements and cybernetics don't
 *   count): a partner's partner has 10 less. A partner's partner can't have a partner of their own.
 * - No Karma points or Karma Capabilities: while they can see the host and are within 30m they use the host's,
 *   paid from the host's Karma, if the host allows. A partner with visible (non-Discreet) cybernetics can't.
 * - Rank follows the host. On each rank-up: ten Skills +D10 and +5 Endurance, nothing else.
 * - Cybernetics are fitted against a virtual Karma pool equal to the host's total.
 */
export class PartnerData extends IndividualData {
   static defineSchema() {
      return {
         ...super.defineSchema(),
         // The host's UUID: a player character, an NPC (full character) or another partner.
         host: new fields.StringField({ required: true, blank: true, initial: "" }),
         // 1 = a character's partner, 2 = a partner's partner.
         depth: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, max: 2, initial: 1 }),
         creation: new fields.SchemaField({
            complete: new fields.BooleanField({ initial: true }),
            equipment: new fields.BooleanField({ initial: false }),
         }),
      };
   }

   /** Partners don't get Pilot Trained for free (they may pick it as a choice). */
   get receivesPilotTrained() {
      return false;
   }

   /** No Karma Capabilities of their own. */
   get karmaCapabilityLimit() {
      return 0;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      const rank = this.rank;
      // Endurance: the host's rank Endurance less 5 per step, plus the partner's own Enhancements and cybernetics.
      this.endurance.rank = rank.endurance - 5 * this.depth;
      this.endurance.base = Math.min(this.endurance.rank + this.endurance.enhancement, MAX_HUMAN_ENDURANCE);
      this.endurance.max = this.endurance.base + this.endurance.cybernetics + this.endurance.bonus;
      // No Karma points of their own.
      this.karma.standard.base = 0;
      this.karma.standard.max = 0;
      this.karma.cyber.max = 0;
   }
}
