import { skillCategory } from "./config.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

/**
 * Character creation (Core Rules pp.14–39):
 * Harmless rank; four background choices (plus Pilot Trained, free); three Karma Capabilities (plus Escape Death,
 * free); independent learning — ten Skills at +10, +9 … +1; no Skill above the Skill Cap of 40; Endurance and Karma
 * filled in; starting equipment; a starting ship.
 */

/** Karma Capabilities chosen at creation (Escape Death is extra and free). */
export const STARTING_KARMA_CAPABILITIES = 3;

/** Skills picked for independent learning. */
export const INDEPENDENT_LEARNING = 10;

/**
 * The checklist shown on a new character's Data Sheet tab.
 *
 * @param {Actor} actor
 *
 * @returns {object|null}  Null once creation is complete (or for other actor types).
 */
export function creationView(actor) {
   if (actor.type !== "character" || actor.system.creation?.complete !== false) return null;
   const sys = actor.system;
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));

   const limit = game.settings.get("edrpg", "systemMaxBackgrounds") || 4;
   const backgrounds = actor.itemTypes.background;
   const used = backgrounds.filter((b) => !b.system.free).reduce((n, b) => n + b.system.choices, 0);
   const openSkills = backgrounds.flatMap((b) => b.system.skills.filter((m) => !(m.skill in skillCategory)).map(() => b.name));
   const enhancementsNeeded = backgrounds.reduce((n, b) => n + (b.system.enhancementChoices ?? 0), 0);
   const enhancementsChosen = actor.itemTypes.enhancement.filter((e) => !e.getFlag("edrpg", "grantedBy")).length;
   const karma = actor.itemTypes.karma.filter((k) => !k.system.free && !k.system.costAll).length;
   const learning = (sys.creation.learning ?? []).filter((s) => s in skillCategory);
   const overCap = Object.values(sys.skills).flatMap((list) =>
      Object.entries(list)
         .filter(([, s]) => s.overCap)
         .map(([key, s]) => `${skillLabel(key)} ${s.natural}/${s.cap}`),
   );

   const steps = [
      {
         key: "rank",
         label: i18n("EDRPG.creation.step.rank"),
         detail: i18n(sys.rank.name),
         done: sys.rank.key === "harmless",
      },
      {
         key: "backgrounds",
         label: i18n("EDRPG.creation.step.backgrounds"),
         detail: i18n("EDRPG.creation.ofCount", { value: used, max: limit }),
         done: used === limit,
         hint: i18n("EDRPG.creation.hint.backgrounds"),
      },
   ];
   if (openSkills.length) {
      steps.push({
         key: "openSkills",
         label: i18n("EDRPG.creation.step.openSkills"),
         detail: [...new Set(openSkills)].join(", "),
         done: false,
         hint: i18n("EDRPG.creation.hint.openSkills"),
      });
   }
   if (enhancementsNeeded) {
      steps.push({
         key: "enhancements",
         label: i18n("EDRPG.creation.step.enhancements"),
         detail: i18n("EDRPG.creation.ofCount", { value: enhancementsChosen, max: enhancementsNeeded }),
         done: enhancementsChosen >= enhancementsNeeded,
         hint: i18n("EDRPG.creation.hint.enhancements"),
      });
   }
   steps.push(
      {
         key: "karma",
         label: i18n("EDRPG.creation.step.karma"),
         detail: i18n("EDRPG.creation.ofCount", { value: karma, max: STARTING_KARMA_CAPABILITIES }),
         done: karma === STARTING_KARMA_CAPABILITIES,
         hint: i18n("EDRPG.creation.hint.karma"),
      },
      {
         key: "learning",
         label: i18n("EDRPG.creation.step.learning"),
         detail: i18n("EDRPG.creation.ofCount", { value: learning.length, max: INDEPENDENT_LEARNING }),
         done: learning.length === INDEPENDENT_LEARNING,
         action: "creationLearning",
         actionLabel: i18n("EDRPG.creation.chooseSkills"),
         hint: i18n("EDRPG.creation.hint.learning"),
      },
      {
         key: "cap",
         label: i18n("EDRPG.creation.step.cap", { cap: sys.rank.skillCap }),
         detail: overCap.length ? overCap.join(", ") : i18n("EDRPG.creation.none"),
         done: !overCap.length,
         warn: overCap.length > 0,
      },
      {
         key: "equipment",
         label: i18n("EDRPG.creation.step.equipment"),
         done: !!sys.creation.equipment,
         toggle: "system.creation.equipment",
         action: sys.creation.equipment ? null : "creationEquipment",
         actionLabel: i18n("EDRPG.creation.addEquipment"),
         hint: i18n("EDRPG.creation.hint.equipment"),
      },
      {
         key: "ship",
         label: i18n("EDRPG.creation.step.ship"),
         done: !!sys.creation.ship,
         toggle: "system.creation.ship",
         hint: i18n("EDRPG.creation.hint.ship"),
      },
   );
   const done = steps.filter((s) => s.done).length;
   return { steps, done, total: steps.length, allDone: done === steps.length };
}

/**
 * Dialog: choose the ten Skills for independent learning, in order (+10 down to +1).
 *
 * @param {Actor} actor
 */
export async function promptIndependentLearning(actor) {
   const current = actor.system.creation.learning ?? [];
   // The score each skill would have without the current picks, so the player can see what they're improving.
   const without = {};
   for (const [key] of Object.entries(skillCategory)) {
      const data = actor.system.skills[skillCategory[key]][key];
      const index = current.indexOf(key);
      without[key] = data.natural - (index >= 0 && index < INDEPENDENT_LEARNING ? 10 - index : 0);
   }
   const options = Object.keys(skillCategory)
      .map((key) => ({ key, label: skillLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label));
   const esc = foundry.utils.escapeHTML;
   const cap = actor.system.rank.skillCap;
   const rows = Array.from({ length: INDEPENDENT_LEARNING }, (_, i) => {
      const opts = options
         .map((o) => `<option value="${o.key}" ${current[i] === o.key ? "selected" : ""}>${esc(o.label)} (${without[o.key]})</option>`)
         .join("");
      return `<div class="form-group"><label>+${10 - i}</label><div class="form-fields"><select name="s${i}"><option value=""></option>${opts}</select></div></div>`;
   }).join("");
   const result = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("EDRPG.creation.step.learning"), icon: "fa-solid fa-graduation-cap" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p class="hint">${game.i18n.format("EDRPG.creation.learningHint", { cap })}</p>${rows}`,
      ok: { label: "EDRPG.creation.save", icon: "fa-solid fa-check" },
      rejectClose: false,
   });
   if (!result) return;
   const picks = Array.from({ length: INDEPENDENT_LEARNING }, (_, i) => result[`s${i}`] || "");
   const chosen = picks.filter(Boolean);
   if (new Set(chosen).size !== chosen.length) {
      ui.notifications.warn("EDRPG.creation.duplicateSkills", { localize: true });
      return;
   }
   await actor.update({ "system.creation.learning": picks });
   const over = chosen.filter((key) => without[key] + 10 - picks.indexOf(key) > cap).map(skillLabel);
   if (over.length) ui.notifications.warn(game.i18n.format("EDRPG.creation.overCap", { skills: over.join(", "), cap }));
}

/**
 * Finish creation: fill Endurance and Karma to their maximums and hide the checklist.
 *
 * @param {Actor} actor
 */
export async function finishCreation(actor) {
   const view = creationView(actor);
   if (view && !view.allDone) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
         window: { title: game.i18n.localize("EDRPG.creation.finish") },
         content: `<p>${game.i18n.format("EDRPG.creation.finishIncomplete", { done: view.done, total: view.total })}</p>`,
         rejectClose: false,
      });
      if (!proceed) return;
   }
   const sys = actor.system;
   await actor.update({
      "system.creation.complete": true,
      "system.endurance.value": sys.endurance.max,
      "system.karma.standard.value": sys.karma.standard.max,
      "system.karma.cyber.value": sys.karma.cyber.max,
   });
   ui.notifications.info(game.i18n.format("EDRPG.creation.finished", { name: actor.name }));
}

/**
 * A compendium item's data by name, with overrides.
 *
 * @param {string} pack   Pack name in the edrpg system.
 *
 * @param {string} name
 *
 * @param {object} [system]  System data overrides.
 *
 * @returns {Promise<object|null>}
 */
async function fromPack(pack, name, system = {}) {
   const collection = game.packs.get(`edrpg.${pack}`);
   const entry = collection ? (await collection.getIndex()).find((e) => e.name === name) : null;
   if (!entry) return null;
   const data = (await collection.getDocument(entry._id)).toObject();
   delete data._id;
   foundry.utils.mergeObject(data.system, system);
   return data;
}

/**
 * Dialog: add the starting equipment (Core Rules p.39) from the compendia, plus 1000 credits.
 *
 * @param {Actor} actor
 */
export async function promptStartingEquipment(actor) {
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const skills = actor.system.skills;
   const melee = skills.combat.meleeWeapons.score >= 20;
   const grenade = skills.combat.grenade.score >= 20;
   const row = (label, field) => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div></div>`;
   let content = `<p class="hint">${i18n("EDRPG.creation.equipmentIntro")}</p>`;
   content += row(
      i18n("EDRPG.creation.equipment.pistol"),
      `<select name="pistol"><option value="Laser Pistol">Laser Pistol</option><option value="Autopistol">Autopistol</option></select>
       <select name="pistols"><option value="1">×1</option><option value="2">×2</option></select>`,
   );
   content += row(
      i18n("EDRPG.creation.equipment.com"),
      `<select name="com"><option value="Hand Com">Hand Com</option><option value="Wrist Com">Wrist Com</option></select>`,
   );
   if (melee) {
      content += row(
         i18n("EDRPG.creation.equipment.melee"),
         `<select name="melee"><option value="">—</option><option value="Knife">Knife</option><option value="Sword">Sword</option><option value="Axe/Hammer">Sledgehammer (Axe/Hammer)</option></select>`,
      );
   }
   if (grenade) content += row(i18n("EDRPG.creation.equipment.grenade"), `<input type="checkbox" name="grenade" checked>`);
   content += row(i18n("EDRPG.creation.equipment.partner"), `<input type="checkbox" name="partner">`);
   content += row(i18n("EDRPG.creation.equipment.discovery"), `<input type="checkbox" name="discovery">`);

   const result = await foundry.applications.api.DialogV2.input({
      window: { title: i18n("EDRPG.creation.step.equipment"), icon: "fa-solid fa-box-open" },
      classes: ["edrpg", "edrpg-dialog"],
      content,
      ok: { label: "EDRPG.creation.addEquipment", icon: "fa-solid fa-plus" },
      rejectClose: false,
   });
   if (!result) return;

   const wanted = [];
   const add = (pack, name, system = {}, times = 1) => {
      for (let i = 0; i < times; i++) wanted.push({ pack, name, system });
   };
   add("weapons", result.pistol, { equipped: true }, Number(result.pistols) || 1);
   if (result.pistol === "Autopistol") add("gear", "Autopistol Magazine", { quantity: 2 });
   add("clothing", "Flight Suit", { worn: true });
   add("gear", "Magnetic Boots");
   add("gear", "Remlok");
   add("gear", result.com);
   if (melee && result.melee) add("weapons", result.melee, { equipped: true });
   if (grenade && result.grenade) add("weapons", "Frag Grenade");
   add("clothing", "Space Suit", { location: "ship" }, result.partner ? 2 : 1);
   add("gear", "Medpack, Standard", { location: "ship" });
   add("gear", "Spaceship Repair Kit, Basic", { location: "ship" });
   if (result.discovery) add("gear", "Vehicle Repair Kit, Basic", { location: "ship" });

   const docs = [];
   const missing = [];
   for (const { pack, name, system } of wanted) {
      const data = await fromPack(pack, name, system);
      if (data) docs.push(data);
      else missing.push(name);
   }
   if (docs.length) await actor.createEmbeddedDocuments("Item", docs);
   await actor.update({
      "system.cash.cr": (actor.system.cash.cr ?? 0) + 1000,
      "system.creation.equipment": true,
   });
   if (missing.length) ui.notifications.warn(i18n("EDRPG.creation.equipmentMissing", { items: missing.join(", ") }));
   else ui.notifications.info(i18n("EDRPG.creation.equipmentAdded", { count: docs.length }));
}
