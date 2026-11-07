/**
 * Optional rules: one world setting per rule, grouped by book, behind a single "Optional Rules" window in the system
 * settings. Everything is off by default.
 *
 * - `RULE_GROUPS` lists the books (or packages) of optional rules. A group with `master: true` has its own switch:
 *   none of its rules apply while it's off (for a whole optional package such as Evolution).
 * - `RULES` lists each rule: its group, page and whether it's on by default.
 * - `rule("key")` is what the rest of the system asks; it's false for unknown rules, before the settings exist, and
 *   whenever the rule's group is switched off.
 * Add a rule by adding it here and its name/hint under EDRPG.rules.<key> in the language file.
 */
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

export const RULE_GROUPS = {
   coreVariants: { book: "Core Rules", master: false },
};

export const RULES = {
   interruptLimit: { group: "coreVariants", page: 263 },
   playingDecimals: { group: "coreVariants", page: 263 },
   defenceTokens: { group: "coreVariants", page: 264 },
   groupFire: { group: "coreVariants", page: 264 },
   avoidableExplosives: { group: "coreVariants", page: 265 },
};

const ruleSetting = (key) => `rule.${key}`;
const groupSetting = (key) => `ruleGroup.${key}`;

/** Is this optional rule in play? */
export function rule(key) {
   const def = RULES[key];
   if (!def) return false;
   try {
      if (RULE_GROUPS[def.group]?.master && !game.settings.get("edrpg", groupSetting(def.group))) return false;
      return !!game.settings.get("edrpg", ruleSetting(key));
   } catch {
      return false;
   }
}

/** Register the settings and the menu (call at init). */
export function registerRules() {
   for (const [key, def] of Object.entries(RULES)) {
      game.settings.register("edrpg", ruleSetting(key), { scope: "world", config: false, type: Boolean, default: !!def.default });
   }
   for (const [key, g] of Object.entries(RULE_GROUPS)) {
      if (g.master) game.settings.register("edrpg", groupSetting(key), { scope: "world", config: false, type: Boolean, default: false });
   }
   game.settings.registerMenu("edrpg", "optionalRules", {
      name: "EDRPG.rules.menu.name",
      label: "EDRPG.rules.menu.label",
      hint: "EDRPG.rules.menu.hint",
      icon: "fa-solid fa-list-check",
      type: configClass(),
      restricted: true,
   });
}

/** The window's data: groups with their rules and current values. */
export function rulesView() {
   const get = (k) => {
      try {
         return !!game.settings.get("edrpg", k);
      } catch {
         return false;
      }
   };
   return Object.entries(RULE_GROUPS).map(([key, g]) => ({
      key,
      label: L(`EDRPG.rules.group.${key}`),
      book: g.book,
      master: g.master ? { name: groupSetting(key), on: get(groupSetting(key)) } : null,
      rules: Object.entries(RULES)
         .filter(([, r]) => r.group === key)
         .map(([k, r]) => ({ key: k, name: ruleSetting(k), on: get(ruleSetting(k)), label: L(`EDRPG.rules.${k}.name`), hint: L(`EDRPG.rules.${k}.hint`), page: r.page })),
   }));
}

/** Save the window's form: { "rule.x": bool, "ruleGroup.y": bool }. */
export async function saveRules(data) {
   for (const key of Object.keys(RULES)) {
      const v = !!data[ruleSetting(key)];
      if (game.settings.get("edrpg", ruleSetting(key)) !== v) await game.settings.set("edrpg", ruleSetting(key), v);
   }
   for (const [key, g] of Object.entries(RULE_GROUPS)) {
      if (!g.master) continue;
      const v = !!data[groupSetting(key)];
      if (game.settings.get("edrpg", groupSetting(key)) !== v) await game.settings.set("edrpg", groupSetting(key), v);
   }
}

/** The Optional Rules window (built on first use, so this module loads without Foundry's application classes). */
export let OptionalRulesConfig = null;

function configClass() {
   if (OptionalRulesConfig) return OptionalRulesConfig;
   const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
   OptionalRulesConfig = class OptionalRulesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
      static DEFAULT_OPTIONS = {
         id: "edrpg-optional-rules",
         tag: "form",
         classes: ["edrpg", "edrpg-dialog", "edrpg-rules"],
         window: { title: "EDRPG.rules.menu.name", icon: "fa-solid fa-list-check", resizable: true },
         position: { width: 560, height: "auto" },
         form: { handler: OptionalRulesConfig.onSubmit, closeOnSubmit: true, submitOnChange: false },
      };

      static PARTS = {
         form: { template: "systems/edrpg/templates/settings/optional-rules.hbs", scrollable: [""] },
      };

      /** @override */
      async _prepareContext(options) {
         return { groups: rulesView() };
      }

      static async onSubmit(event, form, formData) {
         // Unchecked boxes are missing from the form data: read every box.
         const data = {};
         for (const box of form.querySelectorAll("input[type=checkbox]")) data[box.name] = box.checked;
         await saveRules(data);
         ui.notifications.info(L("EDRPG.rules.saved"));
      }
   };
   return OptionalRulesConfig;
}
