import {
   skills,
   skillChoices,
   skillCategory,
   pilotTrained,
   fighting,
   karmaCategories,
   karmaRoles,
   socialFactorSkills,
   equipmentLocations,
   damageTypes,
   MAX_SKILL_SCORE,
} from "../config.mjs";
import { useKarmaCapability, restKarma, builtInEscapeDeath } from "../karma.mjs";
import { endAdventure } from "../advancement.mjs";
import { fightingWeapon } from "../dice/attack.mjs";
import { conditionView, conditionAction } from "../dice/damage.mjs";
import { rankUpView, promptRankUp } from "../rankup.mjs";
import { creationView, promptIndependentLearning, promptStartingEquipment, finishCreation } from "../creation.mjs";
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
         creationLearning: EDActorSheet.#onCreationLearning,
         creationEquipment: EDActorSheet.#onCreationEquipment,
         creationFinish: EDActorSheet.#onCreationFinish,
         rankUp: EDActorSheet.#onRankUp,
         useKarma: EDActorSheet.#onUseKarma,
         restKarma: EDActorSheet.#onRestKarma,
         toggleItem: EDActorSheet.#onToggleItem,
         rollWeapon: EDActorSheet.#onRollWeapon,
         reloadWeapon: EDActorSheet.#onReloadWeapon,
         rollInitiative: EDActorSheet.#onRollInitiative,
         rollFighting: EDActorSheet.#onRollFighting,
         condition: EDActorSheet.#onCondition,
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
      combat: { template: "systems/edrpg/templates/actor/combat.hbs", scrollable: [""] },
      karmaEquipment: { template: "systems/edrpg/templates/actor/karma-equipment.hbs", scrollable: [""] },
      notes: { template: "systems/edrpg/templates/actor/notes.hbs", scrollable: [""] },
   };

   /** @override */
   static TABS = {
      primary: {
         tabs: [
            { id: "datasheet", label: "EDRPG.sheet.tabs.datasheet" },
            { id: "combat", label: "EDRPG.sheet.tabs.combat" },
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
         condition: conditionView(actor),
         creation: creationView(actor),
         rankUp: rankUpView(actor),
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
            category: s.category,
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
      // Combat tab: the capabilities usable in personal combat, for quick use mid-fight.
      const combatCategories = new Set(["personal", "anyCombat"]);
      context.combatKarma = views.filter((v) => combatCategories.has(v.category));

      this._prepareEquipment(context);
      context.karmaCount = `${karma.filter((i) => !i.system.free).length} / ${system.karmaCapabilityLimit ?? system.rank.karmaCap}`;

      context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.biography, {
         secrets: actor.isOwner,
         relativeTo: actor,
         rollData: actor.getRollData(),
      });
      context.biographyField = system.schema.getField("biography");
      return context;
   }

   /**
    * Weapons and armour for the Data Sheet and Karma & Equipment tabs.
    *
    * @param {object} context
    */
   _prepareEquipment(context) {
      const actor = this.document;
      const skillsData = actor.system.skills;
      const loc = (i) => i.system.location;

      const weaponView = (item) => {
         const s = item.system;
         const skill = skillsData[skillCategory[s.skill]][s.skill];
         // A rare weapon's bonus adds to the Skill score only when attacking with it (Core Rules p.100).
         const score = Math.min(skill.score + s.attackBonus, MAX_SKILL_SCORE);
         const props = [
            s.burstLabel,
            s.oneHanded ? game.i18n.localize("EDRPG.weapon.oneHanded") : "",
            s.destroyCover ? game.i18n.localize("EDRPG.weapon.destroyCover") : "",
            s.divideFire ? game.i18n.localize("EDRPG.weapon.divideFire") : "",
            s.attackBonus ? game.i18n.format("EDRPG.weapon.attackBonusShort", { value: s.attackBonus }) : "",
            s.blast.fatalRadius ? game.i18n.format("EDRPG.weapon.blastShort", { fatal: s.blast.fatalRadius, injury: s.blast.injuryRadius }) : "",
            s.notes,
         ].filter(Boolean);
         return {
            id: item.id,
            name: item.name,
            img: item.img,
            skillLabel: `EDRPG.sheet.skills.${skillCategory[s.skill]}.${s.skill}.name`,
            toHit: Math.floor(score / 10),
            ranges: ["short", "medium", "long"].map((k) => {
               const band = s.ranges[k];
               return band.distance ? `${band.distance}${band.dn !== null ? ` (${band.dn})` : ""}` : "—";
            }),
            finesse: s.finesse ?? "—",
            damage: s.damageLabel,
            usesAmmo: s.usesAmmo,
            ammo: s.ammo,
            notes: props.join(". "),
            equipped: s.equipped,
            isMelee: s.isMelee,
            location: s.location,
         };
      };
      const armourView = (item) => ({
         id: item.id,
         name: item.name,
         img: item.img,
         notes: [
            item.system.absorbLabel,
            item.system.hardened ? game.i18n.format("EDRPG.armour.hardenedShort", { value: item.system.hardened }) : "",
            item.system.discreet ? game.i18n.localize("EDRPG.armour.discreet") : "",
            item.system.effectiveSocialFactor
               ? game.i18n.format("EDRPG.armour.sfShort", { value: item.system.effectiveSocialFactor })
               : "",
         ]
            .filter(Boolean)
            .join(". "),
         worn: item.system.worn,
         location: item.system.location,
      });

      const sorted = (type) => [...(actor.itemTypes[type] ?? [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const weapons = sorted("weapon");
      const armour = sorted("armour");
      const clothing = sorted("clothing");
      const gear = sorted("gear");
      const signedSf = (v) => (v ? game.i18n.format("EDRPG.armour.sfShort", { value: v > 0 ? `+${v}` : v }) : "");
      const bonusText = (s) =>
         (s.rollBonuses ?? [])
            .filter((b) => b.skill && b.value)
            .map((b) => `${b.value > 0 ? "+" : ""}${b.value} ${game.i18n.localize(skillChoices()[b.skill] ?? "")}`)
            .join(", ");
      const modText = (s) =>
         (s.skillMods ?? [])
            .filter((m) => m.skill && m.value)
            .map((m) => `${m.value > 0 ? "+" : ""}${m.value} ${game.i18n.localize(skillChoices()[m.skill] ?? "")}`)
            .join(", ");
      const clothingView = (item) => ({
         id: item.id,
         name: item.name,
         kind: "clothing",
         notes: [signedSf(item.system.socialFactor), item.system.notes || [modText(item.system), bonusText(item.system)].filter(Boolean).join(", ")]
            .filter(Boolean)
            .join(". "),
         worn: item.system.worn,
         location: item.system.location,
      });
      const gearView = (item) => {
         const s = item.system;
         return {
            id: item.id,
            name: item.name,
            kind: "gear",
            quantity: s.quantity,
            uses: s.uses.max !== null ? s.uses : null,
            toggleable: !!s.socialFactor || ["cosmetic", "com"].includes(s.category),
            active: s.active,
            notes: [signedSf(s.socialFactor), s.notes || bonusText(s), s.injectionSuccess !== null ? `${s.injectionSuccess}%` : ""].filter(Boolean).join(". "),
            location: s.location,
         };
      };
      const carried = weapons.filter((w) => loc(w) === "carried").map(weaponView);
      context.rangedWeapons = carried.filter((w) => !w.isMelee);
      context.meleeWeapons = carried.filter((w) => w.isMelee);
      context.carriedWeapons = carried;
      context.clothing = [
         ...clothing.filter((c) => loc(c) === "carried").map(clothingView),
         ...armour.filter((a) => loc(a) === "carried").map(armourView),
      ];
      context.gear = gear.filter((g) => loc(g) === "carried").map(gearView);
      context.cybernetics = sorted("cybernetic").map((item) => {
         const s = item.system;
         const effects = [
            s.damageBonus ? game.i18n.format("EDRPG.cybernetic.short.damage", { value: s.damageBonus }) : "",
            s.speedBonus ? game.i18n.format("EDRPG.cybernetic.short.speed", { value: s.speedBonus }) : "",
            s.resistKnockdown ? game.i18n.format("EDRPG.cybernetic.short.resist", { value: s.resistKnockdown }) : "",
            s.enduranceBonus ? game.i18n.format("EDRPG.cybernetic.short.endurance", { value: s.enduranceBonus }) : "",
            s.initiativeBonus ? game.i18n.format("EDRPG.cybernetic.short.initiative", { value: s.initiativeBonus }) : "",
            modText(s),
            s.isArmour ? s.absorbLabel : "",
            s.hardened ? game.i18n.format("EDRPG.armour.hardenedShort", { value: s.hardened }) : "",
            s.notes,
         ].filter(Boolean);
         return { id: item.id, name: item.name, karmaCost: s.karmaCost, discreet: s.discreet, notes: effects.join(". ") };
      });
      context.cyberKarma = {
         spent: actor.system.karma.standard.cybernetics ?? 0,
         fromCyber: actor.system.karma.cyber.spent ?? 0,
         cyborg: actor.system.socialFactor.cyborg,
      };

      // Combat tab: what worn armour absorbs, by damage type.
      context.damageTypeLabels = Object.keys(damageTypes).map((t) => `EDRPG.damageShort.${t}`);
      context.wornArmour = armour
         .filter((a) => a.system.worn)
         .map((a) => ({
            id: a.id,
            name: a.name,
            absorb: Object.keys(damageTypes).map((t) =>
               t === "toxic" && a.system.toxicAll ? game.i18n.localize("EDRPG.sheet.all") : a.system.absorb[t] || "—",
            ),
            hardened: a.system.hardened ?? "—",
         }));

      const stored = (where) => [
         ...weapons.filter((w) => loc(w) === where).map((w) => ({ ...weaponView(w), kind: "weapon" })),
         ...armour.filter((a) => loc(a) === where).map((a) => ({ ...armourView(a), kind: "armour" })),
         ...clothing.filter((c) => loc(c) === where).map(clothingView),
         ...gear.filter((g) => loc(g) === where).map(gearView),
      ];
      context.packItems = stored("pack");
      context.shipItems = stored("ship");
      context.equipmentLocations = equipmentLocations;
   }

   /** @override */
   async _onRender(context, options) {
      await super._onRender(context, options);
      // Inline item fields (ammo, storage location) update the embedded item directly.
      for (const input of this.element.querySelectorAll("[data-item-field]")) {
         input.addEventListener("change", (event) => {
            event.stopPropagation();
            const item = this.document.items.get(input.closest("[data-item-id]").dataset.itemId);
            const value = input.type === "number" ? Number(input.value) : input.value;
            item?.update({ [input.dataset.itemField]: value });
         });
      }
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

   /**
    * Attack with a weapon: a check with its skill (and a rare weapon's bonus).
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onRollWeapon(event, target) {
      const item = this.#getItem(target);
      if (item) return this.document.rollWeaponAttack(item, { prompt: !event.shiftKey });
   }

   /**
    * Toggle a boolean on an embedded item (weapon equipped, armour worn).
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onToggleItem(event, target) {
      if (!this.isEditable) return;
      const item = this.#getItem(target);
      const field = target.dataset.field;
      if (item) return item.update({ [field]: !foundry.utils.getProperty(item, field) });
   }

   /**
    * Reload: a fresh magazine. Any rounds left in the old one are lost (Core Rules p.100).
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    *
    * @param {HTMLElement} target
    */
   static async #onReloadWeapon(event, target) {
      const item = this.#getItem(target);
      if (!item?.system.usesAmmo) return;
      // Use a spare magazine of the right kind if the character carries one (Core Rules p.133).
      const name = item.name.toLowerCase();
      const group = String(item.getFlag("edrpg", "group") ?? "").toLowerCase();
      const spare = this.document.itemTypes.gear.find((g) => {
         const kind = g.system.ammoFor?.trim().toLowerCase();
         return g.system.category === "ammo" && kind && g.system.quantity > 0 && (name.includes(kind) || group.includes(kind));
      });
      if (spare) await spare.update({ "system.quantity": spare.system.quantity - 1 });
      await item.update({ "system.ammo.value": item.system.ammo.max });
      const key = spare ? "EDRPG.weapon.reloadedFrom" : "EDRPG.weapon.reloadedNoSpare";
      ui.notifications.info(game.i18n.format(key, { weapon: item.name, ammo: spare?.name ?? "", left: spare ? spare.system.quantity : 0 }));
   }

   /** @this {EDActorSheet} */
   static async #onRestKarma() {
      if (this.isEditable) return restKarma(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onCreationLearning() {
      return promptIndependentLearning(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onCreationEquipment() {
      return promptStartingEquipment(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onRankUp() {
      return promptRankUp(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onCreationFinish() {
      return finishCreation(this.document);
   }

   /** @this {EDActorSheet} */
   static async #onEndAdventure() {
      if (!this.isEditable) return;
      await endAdventure(this.document);
      // Rank up straight after the adventure, before any Between Adventures checks (Core Rules p.49).
      if (this.document.system.pendingRanks?.length) return promptRankUp(this.document);
   }

   /** @this {EDActorSheet} */
   static #onConfigureSocialFactor() {
      new EDSocialFactorConfig({ document: this.document }).render({ force: true });
   }

   /**
    * Fighting attack: Finesse 5 + the target's Dodge or Parry, through the attack card.
    *
    * @this {EDActorSheet}
    *
    * @param {PointerEvent} event
    */
   static async #onRollFighting(event) {
      return this.document.rollWeaponAttack(fightingWeapon(), { prompt: !event.shiftKey });
   }

   /** @this {EDActorSheet} */
   static async #onRollFightingDamage() {
      // 1D10 halved, rounding up (Core Rules p.60).
      const roll = await new Roll(`ceil(${fighting.damage} / 2)`).evaluate();
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
   static async #onCondition(event, target) {
      return conditionAction(this.document, target.dataset.which);
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
