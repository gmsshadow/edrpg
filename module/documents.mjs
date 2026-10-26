import { rollSkillCheck } from "./dice/skill-check.mjs";

export class EDActor extends foundry.documents.Actor {
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
      if (!(actor instanceof foundry.documents.Actor) || actor.type !== "character" || this.system.free) return;

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
}
