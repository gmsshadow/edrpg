import { skills, skillChoices } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * ApplicationV2 sheet for individual-scale actors (characters and NPCs).
 */
export default class EDActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "actor"],
      position: { width: 1000, height: 720 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         rollSkill: EDActorSheet.#onRollSkill,
         toggleSkillUsed: EDActorSheet.#onToggleSkillUsed,
         rollInitiative: EDActorSheet.#onRollInitiative,
         createItem: EDActorSheet.#onCreateItem,
         editItem: EDActorSheet.#onEditItem,
         deleteItem: EDActorSheet.#onDeleteItem,
      },
   };

   /** @override */
   static PARTS = {
      header: { template: "systems/edrpg/templates/actor/header.hbs" },
      tabs: { template: "systems/edrpg/templates/actor/tabs.hbs" },
      main: { template: "systems/edrpg/templates/actor/main.hbs", scrollable: [""] },
      skills: { template: "systems/edrpg/templates/actor/skills.hbs", scrollable: [""] },
      backgroundsKarma: { template: "systems/edrpg/templates/actor/backgrounds-karma.hbs", scrollable: [""] },
      combat: { template: "systems/edrpg/templates/actor/combat.hbs", scrollable: [""] },
      equipment: { template: "systems/edrpg/templates/actor/equipment.hbs", scrollable: [""] },
   };

   /** @override */
   static TABS = {
      primary: {
         tabs: [
            { id: "main", label: "EDRPG.sheet.tabs.main" },
            { id: "skills", label: "EDRPG.sheet.tabs.skills" },
            { id: "backgroundsKarma", label: "EDRPG.sheet.tabs.bgKarma" },
            { id: "combat", label: "EDRPG.sheet.tabs.combat" },
            { id: "equipment", label: "EDRPG.sheet.tabs.equipment" },
         ],
         initial: "skills",
      },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const actor = this.document;
      const system = actor.system;

      Object.assign(context, {
         actor,
         system,
         source: actor.system._source,
         editable: this.isEditable,
         owner: actor.isOwner,
         rank: system.rank,
         tabs: this._prepareTabs("primary"),
         isCharacter: actor.type === "character",
         skillLabels: skillChoices(),
      });

      context.detailFields = ["gender", "age", "height", "weight"].map((key) => ({
         key,
         type: key === "age" ? "number" : "text",
         value: actor.system._source[key],
         label: `EDRPG.sheet.${key}`,
      }));

      context.skillCategories = Object.entries(skills).map(([category, list]) => ({
         key: category,
         label: `EDRPG.sheet.skills.${category}.name`,
         skills: list.map((key) => ({
            key,
            category,
            label: `EDRPG.sheet.skills.${category}.${key}.name`,
            description: `EDRPG.sheet.skills.${category}.${key}.description`,
            path: `system.skills.${category}.${key}`,
            ...system.skills[category][key],
         })),
      }));

      const sortItems = (items) => items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      context.backgrounds = sortItems([...actor.itemTypes.background]);
      context.enhancements = sortItems([...actor.itemTypes.enhancement]);
      context.karmaCapabilities = sortItems([...actor.itemTypes.karma]);

      const maxBackgrounds = game.settings.get("edrpg", "systemMaxBackgrounds");
      const usedBackgrounds = context.backgrounds
         .filter((i) => !i.system.free)
         .reduce((sum, i) => sum + i.system.choices, 0);
      context.backgroundCount = maxBackgrounds > 0 ? `${usedBackgrounds} / ${maxBackgrounds}` : `${usedBackgrounds}`;
      context.karmaCount = `${context.karmaCapabilities.filter((i) => !i.system.free).length} / ${system.rank.karmaCap}`;

      context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.biography, {
         secrets: actor.isOwner,
         relativeTo: actor,
         rollData: actor.getRollData(),
      });
      context.biographyField = system.schema.getField("biography");
      return context;
   }

   /** @override */
   async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      if (partId in context.tabs) context.tab = context.tabs[partId];
      return context;
   }

   /* -------------------------------------------- */
   /*  Actions                                     */
   /* -------------------------------------------- */

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onRollSkill(event, target) {
      const { skill } = target.closest("[data-skill]").dataset;
      return this.document.rollSkill(skill, { prompt: !event.shiftKey });
   }

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onToggleSkillUsed(event, target) {
      if (!this.isEditable) return;
      const { skill, category } = target.closest("[data-skill]").dataset;
      const path = `system.skills.${category}.${skill}.used`;
      return this.document.update({ [path]: !foundry.utils.getProperty(this.document, path) });
   }

   /** @this {EDActorSheet} */
   static async #onRollInitiative() {
      return this.document.rollInitiative({ createCombatants: true });
   }

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onCreateItem(event, target) {
      const { type } = target.dataset;
      const name = game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(CONFIG.Item.typeLabels[type]) });
      const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
      item?.sheet.render({ force: true });
   }

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static #onEditItem(event, target) {
      const item = this.#getItem(target);
      item?.sheet.render({ force: true });
   }

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onDeleteItem(event, target) {
      const item = this.#getItem(target);
      return item?.deleteDialog();
   }

   /**
    * @param {HTMLElement} target
    *
    * @returns {Item|undefined}
    */
   #getItem(target) {
      const { itemId } = target.closest("[data-item-id]").dataset;
      return this.document.items.get(itemId);
   }
}
