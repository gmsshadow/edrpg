import { rollSkillCheck } from "./dice/skill-check.mjs";
import { rollAttack } from "./dice/attack.mjs";
import { skillCategory, skillChoices, MAX_SKILL_SCORE } from "./config.mjs";

export class EDActor extends foundry.documents.Actor {
   /**
    * New player characters start with the creation checklist showing.
    *
    * @override
    */
   async _preCreate(data, options, user) {
      if ((await super._preCreate(data, options, user)) === false) return false;
      if (this.type === "character" && foundry.utils.getProperty(data, "system.creation.complete") === undefined) {
         this.updateSource({ "system.creation.complete": false });
      }
   }

   /**
    * Taking damage spoils clothing: positive Social Factor from worn items is lost (Core Rules p.128).
    *
    * @override
    */
   async _preUpdate(changes, options, user) {
      if ((await super._preUpdate(changes, options, user)) === false) return false;
      const newEndurance = foundry.utils.getProperty(changes, "system.endurance.value");
      const sf = this.system.socialFactor;
      if (sf && Number.isFinite(newEndurance) && newEndurance < this.system.endurance.value && sf.worn > 0 && !sf.damaged) {
         foundry.utils.setProperty(changes, "system.socialFactor.damaged", true);
      }
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return this.system?.getRollData ? { ...data, ...this.system.getRollData() } : data;
   }

   /**
    * Roll a skill check for this actor.
    *
    * @param {string} skill    Skill key, e.g. "athletics".
    *
    * @param {object} [options]  See {@link rollSkillCheck}.
    *
    * @returns {Promise<ChatMessage|null>}
    */
   rollSkill(skill, options = {}) {
      return rollSkillCheck(this, skill, options);
   }

   /**
    * The bonus this actor attacks with using a weapon.
    * - Characters: the weapon's skill, with a rare weapon's Skill score bonus added for this attack only (never above
    *   100), then the tens digit (Core Rules p.100).
    * - Opponents: the weapon's own To Hit if set, otherwise the stat block's To Hit (Fighting: To Hit −1 unless listed).
    *
    * @param {Item} weapon
    *
    * @returns {number}
    */
   weaponBonus(weapon) {
      const s = weapon.system;
      if (this.type === "opponent") {
         return s.toHit ?? (s.skill === "fighting" ? this.system.fighting : this.system.toHit);
      }
      const skill = this.system.skills[skillCategory[s.skill]][s.skill];
      return Math.floor(Math.min(skill.score + s.attackBonus, MAX_SKILL_SCORE) / 10);
   }

   /**
    * Roll an attack with a weapon (or Fighting): see module/dice/attack.mjs.
    *
    * @param {Item|object} weapon
    *
    * @param {object} [options]
    *
    * @returns {Promise<ChatMessage|null>}
    */
   rollWeaponAttack(weapon, options = {}) {
      return rollAttack(this, weapon, options);
   }
}

export class EDItem extends foundry.documents.Item {
   /**
    * Enforce the background-choice and Karma Capability limits when adding items to a player character.
    *
    * @override
    */
   async _preCreate(data, options, user) {
      if ((await super._preCreate(data, options, user)) === false) return false;
      const actor = this.parent;
      if (!(actor instanceof foundry.documents.Actor)) return;

      // Player characters already have Pilot Trained built in.
      if (this.getFlag("edrpg", "pilotTrained") && actor.system.receivesPilotTrained) {
         ui.notifications.warn("EDRPG.warning.pilotTrainedBuiltIn", { localize: true });
         return false;
      }

      // Prerequisites, e.g. Officer requires Army Trained or Navy Trained.
      if (this.type === "background" && actor.type !== "opponent") {
         const required = this.system.requiredBackgrounds;
         if (required.length && !actor.itemTypes.background.some((b) => required.includes(b.name))) {
            ui.notifications.warn(game.i18n.format("EDRPG.warning.backgroundRequires", { name: this.name, required: required.join(" / ") }));
            return false;
         }
      }

      // Cybernetics: "Maximum 2", and add-ons that need an Arm or Leg Upgrade (Core Rules pp.125–127).
      if (this.type === "cybernetic") {
         const installed = actor.itemTypes.cybernetic ?? [];
         const max = this.system.maxInstalled;
         if (max && installed.filter((c) => c.name === this.name).length >= max) {
            ui.notifications.warn(game.i18n.format("EDRPG.warning.cyberneticMax", { name: this.name, max }));
            return false;
         }
         const needs = this.system.requires?.trim();
         if (needs && !installed.some((c) => c.name.toLowerCase().includes(needs.toLowerCase()))) {
            ui.notifications.warn(game.i18n.format("EDRPG.warning.cyberneticRequires", { name: this.name, required: needs }));
            return false;
         }
      }

      if (actor.type !== "character" || this.system.free) return;

      if (this.type === "background") {
         const limit = game.settings.get("edrpg", "systemMaxBackgrounds");
         if (limit > 0) {
            const used = actor.itemTypes.background
               .filter((i) => !i.system.free)
               .reduce((sum, i) => sum + i.system.choices, 0);
            if (used + this.system.choices > limit) {
               ui.notifications.warn("EDRPG.warning.backgroundLimit", { localize: true });
               return false;
            }
         }
      }

      if (this.type === "karma") {
         const rank = actor.system.rank;
         const used = actor.itemTypes.karma.filter((i) => !i.system.free).length;
         if (used >= rank.karmaCap) {
            ui.notifications.warn(
               game.i18n.format("EDRPG.warning.karmaCapabilityLimit", { rank: game.i18n.localize(rank.name) }),
            );
            return false;
         }
      }
   }

   /** Backgrounds add the Enhancements they grant (Core Rules p.15). */
   async _onCreate(data, options, userId) {
      await super._onCreate(data, options, userId);
      if (userId !== game.user.id || !(this.parent instanceof foundry.documents.Actor)) return;
      if (this.type === "background") await this.#grantEnhancements();
      if (this.type === "cybernetic" && this.system.grantsWeapon) await this.#grantWeapon();
   }

   /** Removing a background removes the Enhancements it added. */
   async _onDelete(options, userId) {
      await super._onDelete(options, userId);
      if (userId !== game.user.id || !["background", "cybernetic"].includes(this.type)) return;
      if (!(this.parent instanceof foundry.documents.Actor)) return;
      const ids = this.parent.items.filter((e) => e.getFlag("edrpg", "grantedBy") === this.id).map((e) => e.id);
      if (ids.length) await this.parent.deleteEmbeddedDocuments("Item", ids);
   }

   /** A cybernetic's built-in weapon (Cyberclaws, retractable pistols), from the Weapons compendium. */
   async #grantWeapon() {
      const pack = game.packs.get("edrpg.weapons");
      const entry = pack ? (await pack.getIndex()).find((e) => e.name === this.system.grantsWeapon) : null;
      if (!entry) {
         ui.notifications.warn(game.i18n.format("EDRPG.warning.weaponNotFound", { name: this.system.grantsWeapon }));
         return;
      }
      const source = (await pack.getDocument(entry._id)).toObject();
      delete source._id;
      if (!this.name.toLowerCase().includes(source.name.toLowerCase().split(" (")[0])) source.name = `${source.name} (${this.name})`;
      const notes = game.i18n.format("EDRPG.cybernetic.builtIn", { name: this.name });
      Object.assign(source.system, { cost: "", location: "carried", equipped: true, notes: [notes, source.system.notes].filter(Boolean).join(". ") });
      foundry.utils.setProperty(source, "flags.edrpg.grantedBy", this.id);
      await this.parent.createEmbeddedDocuments("Item", [source]);
   }

   /** Create the granted Enhancements from the system compendium (or as blank items if it isn't available). */
   async #grantEnhancements() {
      const grants = this.system.enhancements.filter((g) => g.name);
      const pack = game.packs.get("edrpg.enhancements");
      const index = pack ? await pack.getIndex() : null;
      const labels = skillChoices();
      const docs = [];
      for (const grant of grants) {
         const entry = index?.find((e) => e.name === grant.name);
         const source = entry ? (await pack.getDocument(entry._id)).toObject() : { name: grant.name, type: "enhancement", system: {} };
         delete source._id;
         if (grant.skill) {
            source.system.skill = grant.skill;
            source.name = `${source.name} (${game.i18n.localize(labels[grant.skill] ?? grant.skill)})`;
         }
         foundry.utils.setProperty(source, "flags.edrpg.grantedBy", this.id);
         docs.push(source);
      }
      if (docs.length) await this.parent.createEmbeddedDocuments("Item", docs);
      if (this.system.enhancementChoices) {
         ui.notifications.info(
            game.i18n.format("EDRPG.background.chooseEnhancements", { name: this.name, count: this.system.enhancementChoices }),
         );
      }
   }
}
