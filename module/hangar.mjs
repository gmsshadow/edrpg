/**
 * Ship-launched fighters and Spaceship Hangars (Super Traders Supplement pp.26–30).
 *
 * - A Fighter Hangar holds as many fighters as its Fighter Bays; a Spaceship Hangar (Huge ships) holds a small ship.
 *   Drop a fighter (or small ship) onto the mothership's sheet to dock it.
 * - Launching is an Equipment action, one craft per round. The craft appears beside its mothership in the same zone,
 *   joins the combat and rolls Initiative.
 * - A critical hit on a Fighter Hangar destroys the fighters still in it; fighters already out that are flown
 *   remotely go dead in space (crewed ones fight on). A critical hit on a Spaceship Hangar does its Strength in Hull
 *   damage to every ship still docked, and they can't launch until it's repaired.
 * - Fighters can't suffer critical hits.
 */

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * The craft docked in a ship, resolved.
 *
 * @param {Actor} ship
 *
 * @returns {{index: number, uuid: string, launched: boolean, actor: Actor|null, fighter: boolean}[]}
 */
export function hangarEntries(ship) {
   return (ship.system.hangar ?? []).map((h, index) => {
      const actor = fromUuidSync(h.uuid);
      return { index, uuid: h.uuid, launched: h.launched, actor, fighter: actor?.system?.category === "tiny" };
   });
}

/**
 * Is there room for this craft?
 *
 * @param {Actor} ship
 *
 * @param {Actor} craft
 *
 * @returns {string|null}  The reason it won't fit, or null.
 */
export function cannotDock(ship, craft) {
   if (!ship.system.isShip || craft?.type !== "ship") return "EDRPG.hangar.notShip";
   if (craft.uuid === ship.uuid) return "EDRPG.hangar.self";
   if ((ship.system.hangar ?? []).some((h) => h.uuid === craft.uuid)) return "EDRPG.hangar.already";
   const cap = ship.system.hangarCapacity;
   const entries = hangarEntries(ship);
   if (craft.system.category === "tiny") {
      if (entries.filter((e) => e.fighter).length >= cap.fighters) return cap.fighters ? "EDRPG.hangar.full" : "EDRPG.hangar.noFighterHangar";
      return null;
   }
   if (craft.system.category !== "small") return "EDRPG.hangar.tooBig";
   if (entries.filter((e) => !e.fighter).length >= cap.ships) return cap.ships ? "EDRPG.hangar.full" : "EDRPG.hangar.noShipHangar";
   return null;
}

/**
 * Dock a craft (a world actor; one from a compendium is imported first).
 *
 * @param {Actor} ship
 *
 * @param {Actor} craft
 */
export async function dock(ship, craft) {
   const reason = cannotDock(ship, craft);
   if (reason) return void ui.notifications.warn(L(reason, { name: craft?.name ?? "" }));
   if (craft.pack) craft = await Actor.implementation.create(craft.toObject());
   await craft.update({ "system.carrier": ship.uuid });
   await ship.update({ "system.hangar": [...ship.system.toObject().hangar, { uuid: craft.uuid, launched: false }] });
}

/**
 * Take a craft out of the hangar list (it stays in the world).
 *
 * @param {Actor} ship
 *
 * @param {number} index
 */
export async function undock(ship, index) {
   const list = ship.system.toObject().hangar;
   const entry = list[index];
   if (!entry) return;
   list.splice(index, 1);
   await ship.update({ "system.hangar": list });
   const craft = fromUuidSync(entry.uuid);
   if (craft?.isOwner) await craft.update({ "system.carrier": "" });
}

/**
 * Choose a docked craft to launch (Equipment action). Returns the hangar index, or null.
 *
 * @param {Actor} ship
 *
 * @returns {Promise<number|null>}
 */
export async function chooseLaunch(ship) {
   const ready = hangarEntries(ship).filter((e) => !e.launched && e.actor);
   if (!ready.length) {
      ui.notifications.warn(L("EDRPG.hangar.nothingDocked", { name: ship.name }));
      return null;
   }
   if (ready.length === 1) return ready[0].index;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.hangar.launch") },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.hangar.craft")}</label><div class="form-fields"><select name="index">${ready.map((e) => `<option value="${e.index}">${esc(e.actor.name)}</option>`).join("")}</select></div></div>`,
      rejectClose: false,
   });
   return input ? Number(input.index) : null;
}

/**
 * Launch (run by the GM, or an owner who can create tokens): token beside the mothership, same zone, into the combat
 * with Initiative.
 *
 * @param {{shipUuid: string, index: number}} payload
 *
 * @returns {Promise<string[]>}  Notes for the card.
 */
export async function performLaunch({ shipUuid, index }) {
   const ship = await fromUuid(shipUuid);
   const list = ship?.system.toObject().hangar ?? [];
   const entry = list[index];
   const craft = entry ? await fromUuid(entry.uuid) : null;
   if (!ship || !craft) return [];
   const notes = [];
   const combat = game.combat;
   // One launch per round.
   if (combat?.started && ship.getFlag("edrpg", "launchRound") === combat.round) {
      ui.notifications.warn(L("EDRPG.hangar.oncePerRound", { name: ship.name }));
      return [];
   }
   const hangarBroken = ship.system.components.some((c) => /(fighter|spaceship) hangar/i.test(c.name) && c.strength.value <= 0 && (craft.system.category === "tiny") === /fighter/i.test(c.name));
   if (hangarBroken) {
      ui.notifications.warn(L("EDRPG.hangar.broken", { name: ship.name }));
      return [];
   }
   entry.launched = true;
   await ship.update({ "system.hangar": list });
   if (combat?.started) await ship.setFlag("edrpg", "launchRound", combat.round);
   await craft.update({ "system.zone": ship.system.zone, "system.combat.lostAction": false });

   // Token beside the mothership's.
   const scene = canvas?.scene;
   const mother = ship.getActiveTokens?.()[0]?.document;
   let tokenDoc = null;
   if (scene && mother) {
      const grid = scene.grid.size;
      const data = await craft.getTokenDocument({ x: mother.x + mother.width * grid, y: mother.y, actorLink: true });
      [tokenDoc] = await scene.createEmbeddedDocuments("Token", [data.toObject()]);
   }
   if (combat && tokenDoc) {
      const [combatant] = await combat.createEmbeddedDocuments("Combatant", [{ tokenId: tokenDoc.id, sceneId: scene.id, actorId: craft.id }]);
      if (combatant) await combat.rollInitiative([combatant.id]);
   }
   notes.push(L("EDRPG.hangar.launched", { name: esc(craft.name), ship: esc(ship.name) }));
   if (craft.system.category === "tiny") notes.push(L(craft.system.remote ? "EDRPG.hangar.remote" : "EDRPG.hangar.crewed"));
   return notes;
}

/**
 * Bring a launched craft back aboard (after the battle): its tokens on this scene are removed.
 *
 * @param {Actor} ship
 *
 * @param {number} index
 */
export async function recover(ship, index) {
   const list = ship.system.toObject().hangar;
   const entry = list[index];
   if (!entry) return;
   entry.launched = false;
   await ship.update({ "system.hangar": list });
   const craft = fromUuidSync(entry.uuid);
   const tokens = craft?.getActiveTokens?.() ?? [];
   if (tokens.length && canvas?.scene) await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map((t) => t.document?.id ?? t.id));
   if (game.combat) {
      const ids = game.combat.combatants.filter((c) => c.actor?.uuid === entry.uuid || c.actorId === craft?.id).map((c) => c.id);
      if (ids.length) await game.combat.deleteEmbeddedDocuments("Combatant", ids);
   }
}

/**
 * A critical hit landed on a component: if it's a hangar, what happens to the craft inside.
 *
 * @param {Actor} ship
 *
 * @param {{name: string, max?: number}} component
 *
 * @returns {Promise<string[]>}  Notes.
 */
export async function hangarCritical(ship, component) {
   const name = component?.name ?? "";
   const notes = [];
   if (/fighter hangar/i.test(name)) {
      for (const e of hangarEntries(ship).filter((x) => x.fighter && x.actor)) {
         if (!e.launched) {
            await e.actor.update({ "system.hull.value": 0 });
            notes.push(L("EDRPG.hangar.fighterLost", { name: esc(e.actor.name) }));
         } else if (e.actor.system.remote) {
            await e.actor.update({ "system.combat.lostAction": true, "system.speed": 0 });
            notes.push(L("EDRPG.hangar.fighterDead", { name: esc(e.actor.name) }));
         }
      }
   } else if (/spaceship hangar/i.test(name)) {
      const strength = component.max ?? ship.system.components.find((c) => c.name === name)?.strength.max ?? 0;
      for (const e of hangarEntries(ship).filter((x) => !x.fighter && x.actor && !x.launched)) {
         const hull = e.actor.system.hull.value - strength;
         await e.actor.update({ "system.hull.value": hull });
         notes.push(L("EDRPG.hangar.shipHit", { name: esc(e.actor.name), damage: strength, hull }));
      }
   }
   return notes;
}
