import { ranks, skillChoices, skillCategory, karmaCategories } from "../config.mjs";
import { useKarmaCapability } from "../karma.mjs";
import { fightingWeapon } from "../dice/attack.mjs";
import { conditionView, conditionAction } from "../dice/damage.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Stat-block sheet for opponents, laid out like the Core Rules' opponent boxes (e.g. p.285).
 * Weapons, worn armour and Karma Capabilities are items dropped onto the actor.
 */
export default class EDOpponentSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "opponent"],
      position: { width: 560, height: 720 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         rollSkill: EDOpponentSheet.#onRollSkill,
         rollInitiative: EDOpponentSheet.#onRollInitiative,
         rollWeapon: EDOpponentSheet.#onRollWeapon,
         rollFighting: EDOpponentSheet.#onRollFighting,
         condition: EDOpponentSheet.#onCondition,
         createItem: EDOpponentSheet.#onCreateItem,
         editItem: EDOpponentSheet.#onEditItem,
         deleteItem: EDOpponentSheet.#onDeleteItem,
         toggleItem: EDOpponentSheet.#onToggleItem,
         useKarma: EDOpponentSheet.#onUseKarma,
         addSkill: EDOpponentSheet.#onAddSkill,
         removeSkill: EDOpponentSheet.#onRemoveSkill,
      },
   };

   /** @override */
   static PARTS = {
      block: { template: "systems/edrpg/templates/actor/opponent.hbs", scrollable: [""] },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const actor = this.document;
      const system = actor.system;
      const source = system._source;
      const labels = skillChoices();

      Object.assign(context, {
         actor,
         system,
         source,
         editable: this.isEditable,
         owner: actor.isOwner,
         condition: conditionView(actor),
         rankChoices: Object.fromEntries(ranks.map((r) => [r.key, r.name])),
         skillChoices: labels,
         fighting: system.fighting,
         subtitle: [system.rankData ? game.i18n.localize(system.rankData.name) : "", system.role].filter(Boolean).join(" "),
      });

      context.otherSkills = source.otherSkills.map((s, index) => ({ ...s, index, label: labels[s.skill] ?? "" }));

      const items = (type) => [...actor.itemTypes[type]].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      context.armour = items("armour").map((a) => ({
         id: a.id,
         name: a.name,
         worn: a.system.worn,
         details: [
            a.system.absorbLabel ? `${game.i18n.localize("EDRPG.opponent.absorb")} ${a.system.absorbLabel}` : "",
            a.system.hardened ? game.i18n.format("EDRPG.armour.hardenedShort", { value: a.system.hardened }) : "",
         ]
            .filter(Boolean)
            .join(" – "),
      }));
      context.attacks = items("weapon").map((w) => this.#attackView(w));
      context.karma = items("karma").map((k) => ({
         id: k.id,
         name: k.name,
         category: karmaCategories[k.system.category] ?? "",
         used: (k.system.timesUsed ?? 0) >= (k.system.usesPerBattle ?? 1),
         uses: (k.system.usesPerBattle ?? 1) > 1 ? `${k.system.usesPerBattle - (k.system.timesUsed ?? 0)}/${k.system.usesPerBattle}` : "",
      }));

      context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.notes, {
         secrets: actor.isOwner,
         relativeTo: actor,
      });
      context.notesField = system.schema.getField("notes");
      return context;
   }

   /**
    * One attack line in the book's style: ranges, To Hit, damage, ammo.
    *
    * @param {Item} weapon
    *
    * @returns {object}
    */
   #attackView(weapon) {
      const s = weapon.system;
      const toHit = s.toHit ?? (s.skill === "fighting" ? this.document.system.fighting : this.document.system.toHit);
      const parts = [];
      if (s.isMelee) {
         if (s.finesse !== null) parts.push(game.i18n.format("EDRPG.opponent.finesse", { value: s.finesse }));
      } else {
         const bands = ["short", "medium", "long"].map((k) => s.ranges[k]).filter((b) => b.distance);
         const usable = bands.filter((b) => b.dn !== null).map((b) => `${b.distance} (${b.dn})`);
         const min = bands.find((b) => b.dn === null);
         if (usable.length) parts.push(`${min ? `${min.distance}, ` : ""}${usable.join("/")}`);
      }
      const hit = game.i18n.format("EDRPG.opponent.toHit", { value: toHit });
      if (s.blast.fatal !== null) {
         parts.push(
            `${hit}, ${game.i18n.format("EDRPG.opponent.blast", {
               fatalRadius: s.blast.fatalRadius,
               injuryRadius: s.blast.injuryRadius,
               fatal: s.blast.fatal,
               injury: s.blast.injury,
            })}`,
         );
      } else {
         parts.push(`${hit}, ${game.i18n.format("EDRPG.opponent.damage", { value: s.damageLabel })}`);
      }
      if (s.burstLabel) parts.push(s.burstLabel);
      if (s.usesAmmo) parts.push(game.i18n.format("EDRPG.opponent.ammo", { value: s.ammo.value, max: s.ammo.max }));
      if (s.notes) parts.push(s.notes);
      return { id: weapon.id, name: weapon.name, line: parts.join(". ").replace(/\.\./g, ".") };
   }

   /* -------------------------------------------- */
   /*  Actions                                     */
   /* -------------------------------------------- */

   /** @this {EDOpponentSheet} */
   static async #onRollSkill(event, target) {
      const skill = target.closest("[data-skill]").dataset.skill;
      if (skill in skillCategory) return this.document.rollSkill(skill, { prompt: !event.shiftKey });
   }

   /** @this {EDOpponentSheet} */
   static async #onRollWeapon(event, target) {
      const item = this.#getItem(target);
      if (item) return this.document.rollWeaponAttack(item, { prompt: !event.shiftKey });
   }

   /** @this {EDOpponentSheet} */
   static async #onRollFighting(event) {
      return this.document.rollWeaponAttack(fightingWeapon(), { prompt: !event.shiftKey });
   }

   /** @this {EDOpponentSheet} */
   static async #onCondition(event, target) {
      return conditionAction(this.document, target.dataset.which);
   }

   /** @this {EDOpponentSheet} */
   static async #onRollInitiative() {
      return this.document.rollInitiative({ createCombatants: true });
   }

   /** @this {EDOpponentSheet} */
   static async #onCreateItem(event, target) {
      const { type } = target.dataset;
      const name = game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(CONFIG.Item.typeLabels[type]) });
      const data = { name, type };
      if (type === "weapon") data.system = { equipped: true };
      if (type === "armour") data.system = { worn: true };
      const [item] = await this.document.createEmbeddedDocuments("Item", [data]);
      item?.sheet.render({ force: true });
   }

   /** @this {EDOpponentSheet} */
   static #onEditItem(event, target) {
      this.#getItem(target)?.sheet.render({ force: true });
   }

   /** @this {EDOpponentSheet} */
   static async #onDeleteItem(event, target) {
      return this.#getItem(target)?.deleteDialog();
   }

   /** @this {EDOpponentSheet} */
   static async #onToggleItem(event, target) {
      if (!this.isEditable) return;
      const item = this.#getItem(target);
      const field = target.dataset.field;
      if (item) return item.update({ [field]: !foundry.utils.getProperty(item, field) });
   }

   /** @this {EDOpponentSheet} */
   static async #onUseKarma(event, target) {
      const item = this.#getItem(target);
      if (item) return useKarmaCapability(this.document, item);
   }

   /** @this {EDOpponentSheet} */
   static async #onAddSkill() {
      const list = [...this.document.system.toObject().otherSkills, { skill: "", bonus: 1 }];
      return this.document.update({ "system.otherSkills": list });
   }

   /** @this {EDOpponentSheet} */
   static async #onRemoveSkill(event, target) {
      const index = Number(target.closest("[data-index]").dataset.index);
      const list = this.document.system.toObject().otherSkills.filter((_, i) => i !== index);
      return this.document.update({ "system.otherSkills": list });
   }

   /**
    * `system.otherSkills.<n>.<key>` arrives as an object; store an array.
    *
    * @override
    */
   _processFormData(event, form, formData) {
      const data = super._processFormData(event, form, formData);
      const list = data.system?.otherSkills;
      if (list && !Array.isArray(list)) {
         data.system.otherSkills = Object.keys(list)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => list[k]);
      }
      return data;
   }

   /**
    * @param {HTMLElement} target
    *
    * @returns {Item|undefined}
    */
   #getItem(target) {
      return this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
   }
}
