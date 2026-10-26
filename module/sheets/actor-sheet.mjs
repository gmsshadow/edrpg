import { skills, skillChoices, pilotTrained, fighting, karmaCategories, karmaRoles, socialFactorSkills } from "../config.mjs";
import { useKarmaCapability, restKarma, builtInEscapeDeath } from "../karma.mjs";
import { endAdventure } from "../advancement.mjs";
import { EDSkillConfig, EDResourceConfig, EDSocialFactorConfig } from "./actor-config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Font Awesome icons for each skill category's section roundel. */
const CATEGORY_ICONS = {
   combat: "fa-solid fa-hand-fist",
   intelligence: "fa-solid fa-lightbulb",
   social: "fa-solid fa-users",
   vehicle: "fa-solid fa-gauge-high",
   espionage: "fa-solid fa-eye",
};

/**
 * Plain-text summary of an HTML description, for compact table cells.
 *
 * @param {string} html
 *
 * @param {number} [length=240]
 *
 * @returns {string}
 */
function summarise(html, length = 240) {
   const div = document.createElement("div");
   div.innerHTML = html ?? "";
   const text = div.textContent.replace(/\s+/g, " ").trim();
   return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/**
 * ApplicationV2 sheet for individual-scale actors (characters and NPCs),
 * laid out after the official EDRPG character data sheet.
 */
export default class EDActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "actor"],
      position: { width: 960, height: 820 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         rollSkill: EDActorSheet.#onRollSkill,
         configureSkill: EDActorSheet.#onConfigureSkill,
         configureResources: EDActorSheet.#onConfigureResources,
         configureSocialFactor: EDActorSheet.#onConfigureSocialFactor,
         toggleSkillUsed: EDActorSheet.#onToggleSkillUsed,
         endAdventure: EDActorSheet.#onEndAdventure,
         useKarma: EDActorSheet.#onUseKarma,
         restKarma: EDActorSheet.#onRestKarma,
         rollInitiative: EDActorSheet.#onRollInitiative,
         rollFighting: EDActorSheet.#onRollFighting,
         rollFightingDamage: EDActorSheet.#onRollFightingDamage,
         createItem: EDActorSheet.#onCreateItem,
         editItem: EDActorSheet.#onEditItem,
         deleteItem: EDActorSheet.#onDeleteItem,
      },
   };

   /** @override */
   static PARTS = {
      header: { template: "systems/edrpg/templates/actor/header.hbs" },
      tabs: { template: "systems/edrpg/templates/actor/tabs.hbs" },
      datasheet: { template: "systems/edrpg/templates/actor/datasheet.hbs", scrollable: [""] },
      karmaEquipment: { template: "systems/edrpg/templates/actor/karma-equipment.hbs", scrollable: [""] },
      notes: { template: "systems/edrpg/templates/actor/notes.hbs", scrollable: [""] },
   };

   /** @override */
   static TABS = {
      primary: {
         tabs: [
            { id: "datasheet", label: "EDRPG.sheet.tabs.datasheet" },
            { id: "karmaEquipment", label: "EDRPG.sheet.tabs.karmaEquipment" },
            { id: "notes", label: "EDRPG.sheet.tabs.notes" },
         ],
         initial: "datasheet",
      },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const actor = this.document;
      const system = actor.system;
      const isCharacter = actor.type === "character";

      Object.assign(context, {
         actor,
         system,
         source: actor.system._source,
         editable: this.isEditable,
         owner: actor.isOwner,
         rank: system.rank,
         tabs: this._prepareTabs("primary"),
         isCharacter,
         fighting,
         fightingBonus: system.skills.combat.fighting.bonus,
      });

      context.detailFields = ["gender", "age", "height", "weight"].map((key) => ({
         key,
         type: key === "age" ? "number" : "text",
         value: actor.system._source[key],
         label: `EDRPG.sheet.${key}`,
      }));

      const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
      const sf = system.socialFactor.value;
      context.skillCategories = Object.entries(skills).map(([category, list]) => ({
         key: category,
         label: `EDRPG.sheet.skills.${category}.name`,
         icon: CATEGORY_ICONS[category],
         // Social Factor lives on the Social Skills header; click it to edit its sources.
         ...(category === "social"
            ? {
                 chip: `${game.i18n.localize("EDRPG.sheet.SocialFactorAbbr")} ${signed(sf)}`,
                 chipAction: "configureSocialFactor",
                 chipTooltip: "EDRPG.sheet.SocialFactorInfoNoCap",
              }
            : {}),
         skills: list.map((key) => ({
            key,
            category,
            label: `EDRPG.sheet.skills.${category}.${key}.name`,
            description: `EDRPG.sheet.skills.${category}.${key}.description`,
            rollBonus: socialFactorSkills.includes(key) && sf ? signed(sf) : null,
            ...system.skills[category][key],
         })),
      }));

      context.tickedCount = context.skillCategories.reduce((n, c) => n + c.skills.filter((s) => s.used).length, 0);

      const sorted = (items) => [...items].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const labels = skillChoices();
      const modsView = (mods) =>
         mods.filter((m) => m.skill in labels).map((m) => ({ label: labels[m.skill], bonus: m.bonus }));

      // Backgrounds as cards: Pilot Trained first, then owned backgrounds, then empty slots for the remaining choices.
      const backgrounds = sorted(actor.itemTypes.background);
      const maxBackgrounds = game.settings.get("edrpg", "systemMaxBackgrounds");
      const usedBackgrounds = backgrounds.filter((i) => !i.system.free).reduce((n, i) => n + i.system.choices, 0);
      const cards = [];
      if (isCharacter) cards.push({ fixed: true, name: "EDRPG.sheet.pilotTrained", mods: modsView(pilotTrained) });
      for (const item of backgrounds) {
         cards.push({
            id: item.id,
            name: item.name,
            choices: item.system.choices > 1 ? item.system.choices : null,
            mods: modsView(item.system.skills),
         });
      }
      const emptySlots = isCharacter && maxBackgrounds > 0 ? Math.max(0, maxBackgrounds - usedBackgrounds) : 0;
      for (let i = 0; i < emptySlots; i++) cards.push({ empty: true });
      if (!cards.length) cards.push({ empty: true });
      context.backgroundCards = cards;
      context.backgroundCount = maxBackgrounds > 0 ? `${usedBackgrounds} / ${maxBackgrounds}` : `${usedBackgrounds}`;

      context.enhancements = sorted(actor.itemTypes.enhancement).map((item) => ({
         id: item.id,
         name: item.name,
         summary: summarise(item.system.description),
      }));

      // Karma Capabilities, grouped as in the book (Defensive / Offensive / Other).
      const karma = sorted(actor.itemTypes.karma);
      const pool = system.karma.standard.value;
      const inCombat = game.combats.some((c) => c.started && c.combatants.some((cb) => cb.actor === actor));
      const capabilityView = (item) => {
         const s = item.system;
         const used = inCombat && s.usedThisTurn;
         const affordable = s.costAll ? pool > 0 : pool >= s.cost;
         return {
            id: item.id,
            name: item.name,
            role: s.role,
            costLabel: s.costAll ? game.i18n.localize("EDRPG.sheet.all") : s.cost,
            categoryLabel: karmaCategories[s.category] ?? "",
            summary: summarise(s.description, 400),
            used,
            usable: !used && affordable,
            useTooltip: used ? "EDRPG.karma.usedHint" : affordable ? "EDRPG.karma.useHint" : "EDRPG.karma.cantAfford",
         };
      };
      const views = karma.map(capabilityView);
      const hasEscapeDeath = karma.some((i) => i.system.costAll);
      if (isCharacter && !hasEscapeDeath) views.unshift(capabilityView(builtInEscapeDeath()));
      context.karmaGroups = Object.entries(karmaRoles)
         .map(([role, label]) => ({ label, items: views.filter((v) => v.role === role) }))
         .filter((g) => g.items.length);
      context.restChip = game.i18n.localize("EDRPG.karma.rest");
      context.karmaCount = `${karma.filter((i) => !i.system.free).length} / ${system.rank.karmaCap}`;

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
    * Open the edit window holding a skill's Learn, modifier and cap adjustment.
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static #onConfigureSkill(event, target) {
      const { skill, category } = target.closest("[data-skill]").dataset;
      new EDSkillConfig({ document: this.document, skill, category }).render({ force: true });
   }

   /** @this {EDActorSheet} */
   static #onConfigureResources() {
      new EDResourceConfig({ document: this.document }).render({ force: true });
   }

   /**
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onUseKarma(event, target) {
      const row = target.closest("tr");
      const capability = row.dataset.builtin === "escapeDeath" ? builtInEscapeDeath() : this.document.items.get(row.dataset.itemId);
      if (capability) return useKarmaCapability(this.document, capability);
   }

   /** @this {EDActorSheet} */
   static async #onRestKarma() {
      if (this.isEditable) return restKarma(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onEndAdventure() {
      if (!this.isEditable) return;
      return endAdventure(this.document);
   }

   /** @this {EDActorSheet} */
   static #onConfigureSocialFactor() {
      new EDSocialFactorConfig({ document: this.document }).render({ force: true });
   }

   /**
    * Fighting attack: a Fighting skill check against Finesse 5 (+ the target's Defence, entered in the dialog).
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    */
   static async #onRollFighting(event) {
      return this.document.rollSkill("fighting", { difficulty: fighting.finesse, prompt: !event.shiftKey });
   }

   /** @this {EDActorSheet} */
   static async #onRollFightingDamage() {
      const roll = await new Roll(fighting.damage).evaluate();
      return roll.toMessage({
         speaker: ChatMessage.getSpeaker({ actor: this.document }),
         flavor: `${game.i18n.localize("EDRPG.sheet.skills.combat.fighting.name")} — ${game.i18n.localize("EDRPG.sheet.damage")}`,
      });
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
