const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

/**
 * Base for the small "edit window" dialogs that hold an actor's hidden modifiers.
 * Bound to the actor, so it re-renders whenever the actor changes.
 */
class EDActorConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "edrpg-config"],
      sheetConfig: false,
      position: { width: 380, height: "auto" },
      window: { resizable: false, contentClasses: ["standard-form"] },
      form: { submitOnChange: true, closeOnSubmit: false },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.actor = this.document;
      context.system = this.document.system;
      context.systemSource = this.document.system._source;
      context.editable = this.isEditable;
      return context;
   }
}

/**
 * Edit window for one skill: shows where Base comes from and holds Learn, the temporary
 * modifier, the per-skill Skill Cap adjustment and the "used" tick.
 */
export class EDSkillConfig extends EDActorConfig {
   /**
    * @param {object} options
    *
    * @param {Actor}  options.document
    *
    * @param {string} options.skill
    *
    * @param {string} options.category
    */
   constructor(options) {
      const { document, skill } = options;
      super({ ...options, id: `edrpg-skill-${document.uuid.replaceAll(".", "-")}-${skill}` });
   }

   /** @override */
   static PARTS = {
      form: { template: "systems/edrpg/templates/actor/skill-config.hbs" },
   };

   /** @override */
   get title() {
      const { category, skill } = this.options;
      const name = game.i18n.localize(`EDRPG.sheet.skills.${category}.${skill}.name`);
      return `${game.i18n.localize("EDRPG.skillConfig.title")}: ${name} — ${this.document.name}`;
   }

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const { category, skill } = this.options;
      context.skill = this.document.system.skills[category][skill];
      context.skillSource = this.document.system._source.skills[category][skill];
      context.path = `system.skills.${category}.${skill}`;
      context.description = `EDRPG.sheet.skills.${category}.${skill}.description`;
      context.rankCap = this.document.system.rank.skillCap;
      return context;
   }
}

/**
 * Edit window for Karma and Endurance maximum adjustments.
 */
export class EDResourceConfig extends EDActorConfig {
   constructor(options) {
      super({ ...options, id: `edrpg-resources-${options.document.uuid.replaceAll(".", "-")}` });
   }

   /** @override */
   static PARTS = {
      form: { template: "systems/edrpg/templates/actor/resource-config.hbs" },
   };

   /** @override */
   get title() {
      return `${game.i18n.localize("EDRPG.resourceConfig.title")} — ${this.document.name}`;
   }
}

/**
 * Edit window for Social Factor sources.
 */
export class EDSocialFactorConfig extends EDActorConfig {
   constructor(options) {
      super({ ...options, id: `edrpg-social-factor-${options.document.uuid.replaceAll(".", "-")}` });
   }

   /** @override */
   static PARTS = {
      form: { template: "systems/edrpg/templates/actor/social-factor-config.hbs" },
   };

   /** @override */
   get title() {
      return `${game.i18n.localize("EDRPG.socialFactor.title")} — ${this.document.name}`;
   }
}
