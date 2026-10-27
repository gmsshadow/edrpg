import {
   skillChoices,
   karmaCategories,
   karmaRoles,
   weaponSkills,
   damageTypes,
   burstKinds,
   rarities,
   equipmentLocations,
   karmaAttackKinds,
   karmaDefenceKinds,
} from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * ApplicationV2 sheet for Backgrounds, Enhancements, Karma Capabilities, Weapons and Armour.
 */
export default class EDItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "item"],
      position: { width: 600, height: 680 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         addSkillBonus: EDItemSheet.#onAddSkillBonus,
         removeSkillBonus: EDItemSheet.#onRemoveSkillBonus,
         addSkillMod: EDItemSheet.#onAddSkillMod,
         removeSkillMod: EDItemSheet.#onRemoveSkillMod,
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
         onOpponent: item.parent?.type === "opponent",
         backgroundChoices: { 1: "1", 2: "2" },
         isWeapon: item.type === "weapon",
         isMelee: item.type === "weapon" && item.system.isMelee,
         isArmour: item.type === "armour",
         isEquipment: ["weapon", "armour"].includes(item.type),
         weaponSkills,
         damageTypes,
         burstKinds,
         rarities,
         equipmentLocations,
         karmaAttackKinds,
         karmaDefenceKinds,
      });
      if (item.type === "weapon") {
         context.rangeBands = ["short", "medium", "long"].map((key) => ({
            key,
            label: `EDRPG.sheet.range.${key}`,
            ...item.system._source.ranges[key],
         }));
      }
      if (item.type === "armour") {
         context.absorbRows = Object.entries(damageTypes).map(([key, label]) => ({
            key,
            label,
            value: item.system._source.absorb[key],
         }));
      }
      context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
         item.system.description,
         { secrets: item.isOwner, relativeTo: item, rollData: item.getRollData?.() },
      );
      return context;
   }

   /**
    * Form fields named `system.skills.<n>.<key>` / `system.skillMods.<n>.<key>` arrive as objects; store arrays.
    *
    * @override
    */
   _processFormData(event, form, formData) {
      const data = super._processFormData(event, form, formData);
      for (const key of ["skills", "skillMods"]) {
         const list = data.system?.[key];
         if (list && !Array.isArray(list)) {
            data.system[key] = Object.keys(list)
               .sort((a, b) => Number(a) - Number(b))
               .map((k) => list[k]);
         }
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

   /** @this {EDItemSheet} */
   static async #onAddSkillMod() {
      const mods = [...this.document.system.toObject().skillMods, { skill: "", value: 0 }];
      return this.document.update({ "system.skillMods": mods });
   }

   /**
    * @this {EDItemSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onRemoveSkillMod(event, target) {
      const index = Number(target.closest("[data-index]").dataset.index);
      const mods = this.document.system.toObject().skillMods.filter((_, i) => i !== index);
      return this.document.update({ "system.skillMods": mods });
   }
}
