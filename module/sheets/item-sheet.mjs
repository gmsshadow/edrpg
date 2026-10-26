import { skillChoices, karmaCategories, karmaRoles } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * ApplicationV2 sheet for Backgrounds, Enhancements and Karma Capabilities.
 */
export default class EDItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "item"],
      position: { width: 560, height: 520 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         addSkillBonus: EDItemSheet.#onAddSkillBonus,
         removeSkillBonus: EDItemSheet.#onRemoveSkillBonus,
      },
   };

   /** @override */
   static PARTS = {
      header: { template: "systems/edrpg/templates/item/header.hbs" },
      details: { template: "systems/edrpg/templates/item/details.hbs" },
      description: { template: "systems/edrpg/templates/item/description.hbs", scrollable: [""] },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const item = this.document;
      Object.assign(context, {
         item,
         system: item.system,
         source: item.system._source,
         fields: item.system.schema.fields,
         editable: this.isEditable,
         typeLabel: CONFIG.Item.typeLabels[item.type],
         isBackground: item.type === "background",
         isKarma: item.type === "karma",
         skillChoices: skillChoices(),
         karmaCategories,
         karmaRoles,
         onActor: !!item.parent,
         backgroundChoices: { 1: "1", 2: "2" },
      });
      context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
         item.system.description,
         { secrets: item.isOwner, relativeTo: item, rollData: item.getRollData?.() },
      );
      return context;
   }

   /**
    * Form fields named `system.skills.<n>.<key>` arrive as an object; store them as an array.
    *
    * @override
    */
   _processFormData(event, form, formData) {
      const data = super._processFormData(event, form, formData);
      const mods = data.system?.skills;
      if (mods && !Array.isArray(mods)) {
         data.system.skills = Object.keys(mods)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => mods[k]);
      }
      return data;
   }

   /** @this {EDItemSheet} */
   static async #onAddSkillBonus() {
      const skills = [...this.document.system.toObject().skills, { skill: "", bonus: 10 }];
      return this.document.update({ "system.skills": skills });
   }

   /**
    * @this {EDItemSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onRemoveSkillBonus(event, target) {
      const index = Number(target.closest("[data-index]").dataset.index);
      const skills = this.document.system.toObject().skills.filter((_, i) => i !== index);
      return this.document.update({ "system.skills": skills });
   }
}
