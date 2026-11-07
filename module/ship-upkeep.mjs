/**
 * Flying without crew, Between Adventures (Core Rules p.262): a short-handed ship can't earn money; the time goes on
 * servicing it. If that's skipped, each take-off has a 10% chance that the ship fails to start, until 10% of its total
 * value is spent servicing it.
 */
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const fmt = (n) => Number(n).toLocaleString("en-GB");

/** The ship's value in credits (its Cost), or 0 if not known. */
export function shipValue(ship) {
   const digits = String(ship.system.cost ?? "").replace(/[^\d]/g, "");
   return digits ? Number(digits) : 0;
}

/** The cost of a full service: 10% of the ship's value. */
export function serviceCost(ship) {
   return Math.round(shipValue(ship) * 0.1);
}

async function card(ship, lines, rolls = []) {
   return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ship }),
      content: `<div class="edrpg edrpg-chat edrpg-upkeep"><h3><i class="fa-solid fa-oil-can"></i> ${L("EDRPG.upkeep.title")}</h3>${lines.map((l) => `<p>${l}</p>`).join("")}</div>`,
      rolls,
      sound: rolls.length && !game.dice3d ? CONFIG.sounds.dice : null,
   });
}

/**
 * Take off in an unserviced ship: D100, 1–10 and it won't start.
 *
 * @param {Actor} ship
 *
 * @returns {Promise<boolean>}  Did it start?
 */
export async function takeOff(ship) {
   if (!ship.system.unserviced) {
      await card(ship, [L("EDRPG.upkeep.startsFine", { name: esc(ship.name) })]);
      return true;
   }
   const roll = await new Roll("1d100").evaluate();
   const fails = roll.total <= 10;
   await card(ship, [L(fails ? "EDRPG.upkeep.wontStart" : "EDRPG.upkeep.starts", { name: esc(ship.name), roll: roll.total })], [roll]);
   return !fails;
}

/**
 * Spend 10% of the ship's value servicing it, from its owner's credits.
 *
 * @param {Actor} ship
 *
 * @returns {Promise<boolean>}
 */
export async function serviceShip(ship) {
   const cost = serviceCost(ship);
   const owner = ship.system.owner ? await fromUuid(ship.system.owner) : null;
   if (owner && cost) {
      const cash = owner.system.cash?.cr ?? 0;
      if (cash < cost) {
         ui.notifications.warn(L("EDRPG.upkeep.cantAfford", { name: owner.name, cost: fmt(cost), cash: fmt(cash) }));
         return false;
      }
      await owner.update({ "system.cash.cr": cash - cost });
   }
   await ship.update({ "system.unserviced": false });
   await card(ship, [L(owner && cost ? "EDRPG.upkeep.servicedPaid" : "EDRPG.upkeep.serviced", { name: esc(ship.name), cost: fmt(cost), owner: esc(owner?.name ?? "") })]);
   return true;
}
