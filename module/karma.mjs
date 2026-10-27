import { karmaCategories, karmaRoles } from "./config.mjs";

const CARD_TEMPLATE = "systems/edrpg/templates/chat/karma-use.hbs";

/**
 * Karma Capabilities and Karma points (Core Rules pp.31–36).
 * - Spending: pay the capability's cost from current Karma ("All points" for Escape Death, unusable at 0).
 * - Once per turn: a capability can't be used again during your turn or between your turns; you regain them all
 *   at the start of your turn. Tracked only while the actor is in a started combat.
 * - Recovery: +1 Karma after a main rest; all Karma at the start of a new adventure.
 */

/**
 * Is this actor in a combat that has started? Outside combat there are no turns to limit use.
 *
 * @param {Actor} actor
 *
 * @returns {boolean}
 */
function inCombat(actor) {
   return game.combats.some((c) => c.started && c.combatants.some((cb) => cb.actor === actor));
}

/**
 * The built-in Escape Death every player character has, for characters without the compendium item.
 *
 * @returns {object}  An item-like object.
 */
export function builtInEscapeDeath() {
   return {
      id: null,
      name: game.i18n.localize("EDRPG.sheet.escapeDeath.name"),
      system: {
         costAll: true,
         cost: 0,
         role: "defensive",
         category: "anyCombat",
         free: true,
         usedThisTurn: false,
         description: `<p>${game.i18n.localize("EDRPG.sheet.escapeDeath.description")}</p>`,
      },
   };
}

/**
 * Spend Karma on a capability and post it to chat.
 *
 * @param {Actor} actor
 *
 * @param {Item|object} capability  A karma Item, or {@link builtInEscapeDeath}.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function useKarmaCapability(actor, capability) {
   if (!actor.isOwner) return null;
   if (actor.type === "opponent") return useOpponentCapability(actor, capability);
   const sys = capability.system;
   const karma = actor.system.karma.standard.value;
   const fighting = inCombat(actor);

   if (fighting && sys.usedThisTurn) {
      ui.notifications.warn(game.i18n.format("EDRPG.karma.usedThisTurn", { name: capability.name }));
      return null;
   }
   const cost = sys.costAll ? karma : sys.cost;
   if (sys.costAll ? karma < 1 : karma < cost) {
      ui.notifications.warn(game.i18n.format("EDRPG.karma.notEnough", { name: capability.name, cost, karma }));
      return null;
   }

   await actor.update({ "system.karma.standard.value": karma - cost });
   if (fighting && capability.id) await capability.update({ "system.usedThisTurn": true });

   const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      name: capability.name,
      cost,
      remaining: karma - cost,
      max: actor.system.karma.standard.max,
      role: karmaRoles[sys.role],
      category: karmaCategories[sys.category],
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.description ?? "", {
         relativeTo: capability.id ? capability : actor,
      }),
   });
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/**
 * Opponents have no Karma points: each capability can be used once per battle (Core Rules p.281).
 * The mark clears when the combat ends.
 *
 * @param {Actor} actor
 *
 * @param {Item} capability
 *
 * @returns {Promise<ChatMessage|null>}
 */
async function useOpponentCapability(actor, capability) {
   const sys = capability.system;
   if (sys.usedThisTurn) {
      ui.notifications.warn(game.i18n.format("EDRPG.karma.usedThisBattle", { name: capability.name }));
      return null;
   }
   await capability.update({ "system.usedThisTurn": true });
   const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      name: capability.name,
      oncePerBattle: true,
      role: karmaRoles[sys.role],
      category: karmaCategories[sys.category],
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.description ?? "", {
         relativeTo: capability,
      }),
   });
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

/**
 * Main rest: regain one Karma point, up to the maximum.
 *
 * @param {Actor} actor
 */
export async function restKarma(actor) {
   const { value, max } = actor.system.karma.standard;
   if (value >= max) {
      ui.notifications.info(game.i18n.format("EDRPG.karma.alreadyFull", { name: actor.name }));
      return;
   }
   await actor.update({ "system.karma.standard.value": value + 1 });
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>${game.i18n.format("EDRPG.karma.rested", { name: foundry.utils.escapeHTML(actor.name), value: value + 1, max })}</p>`,
   });
}

/**
 * Clear the "used this turn" marks on an actor's capabilities.
 *
 * @param {Actor} actor
 */
async function resetCapabilities(actor) {
   const updates = actor.itemTypes.karma
      .filter((i) => i.system.usedThisTurn)
      .map((i) => ({ _id: i.id, "system.usedThisTurn": false }));
   if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
}

/** Register hooks that give capabilities back at the start of each combatant's turn and when combat ends. */
export function registerKarmaHooks() {
   Hooks.on("combatTurnChange", (combat) => {
      if (!game.user.isActiveGM) return;
      // Opponents' capabilities are once per battle, so only characters get them back each turn.
      const actor = combat.combatant?.actor;
      if (actor && actor.type !== "opponent") resetCapabilities(actor);
   });
   Hooks.on("deleteCombat", (combat) => {
      if (!game.user.isActiveGM) return;
      for (const combatant of combat.combatants) if (combatant.actor) resetCapabilities(combatant.actor);
   });
}
