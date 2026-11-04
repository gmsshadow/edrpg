/**
 * Addiction (Core Rules p.253): Combat Stims (the book's "Combat Stabilisers", p.129).
 *
 * - The first use in a mission is safe. On the second, roll a D10: a 1 means addiction. Each further use widens it by
 *   one (the fourth use addicts on 1–3).
 * - An addict chooses at each Between Adventures phase:
 *   - Clinic: 10,000cr, no Between Adventures roll this time, and 5 Endurance lost permanently. Cured.
 *   - Keep using: 100,000cr. They can still make the roll, but a D10 of 10 means their heart gives out.
 *   - Neither (or no money): they are permanently disfigured and crippled; only cybernetic surgery can help.
 * Uses are counted on the character (flags.edrpg.addiction) and reset by End of Adventure.
 */
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** Who can become addicted: player characters, full NPCs and partners. */
const ADDICTABLE = ["character", "npcIndividual", "partner"];

export const CLINIC_COST = 10000;
export const HABIT_COST = 100000;

/** GM and owners, for whispering. */
const audience = (actor) => game.users.filter((u) => u.isGM || actor.testUserPermission(u, "OWNER")).map((u) => u.id);

/**
 * A Combat Stim was used: count it, and from the second use this mission roll for addiction.
 *
 * @param {Actor} actor
 *
 * @param {Function} [d10]  For tests: returns the D10.
 *
 * @returns {Promise<{uses: number, roll: number|null, addicted: boolean}|null>}
 */
export async function recordStimUse(actor, d10 = null) {
   if (!ADDICTABLE.includes(actor?.type)) return null;
   const state = foundry.utils.deepClone(actor.getFlag("edrpg", "addiction") ?? { uses: 0, addicted: false });
   state.uses += 1;
   let roll = null;
   let became = false;
   if (state.uses >= 2 && !state.addicted) {
      if (d10) roll = d10();
      else {
         const r = await new Roll("1d10").evaluate();
         roll = r.total;
      }
      became = roll <= state.uses - 1;
      if (became) state.addicted = true;
   }
   await actor.setFlag("edrpg", "addiction", state);
   if (roll !== null) {
      await ChatMessage.create({
         speaker: ChatMessage.getSpeaker({ actor }),
         whisper: audience(actor),
         content: `<div class="edrpg edrpg-chat edrpg-condition"><p>${L(became ? "EDRPG.addiction.became" : "EDRPG.addiction.safe", { name: esc(actor.name), uses: state.uses, roll, need: state.uses - 1 })}</p></div>`,
      });
   }
   return { uses: state.uses, roll, addicted: state.addicted };
}

/** End of an adventure: the mission's count starts again (addiction stays). */
export async function resetStimUses(actor) {
   const state = actor.getFlag?.("edrpg", "addiction");
   if (state?.uses) await actor.setFlag("edrpg", "addiction", { ...state, uses: 0 });
}

/**
 * Between Adventures for an addict: clinic, keep using, or neither.
 *
 * @param {Actor} actor
 *
 * @returns {Promise<{proceed: boolean, notes: string[]}>}  proceed: they may still make the income roll.
 */
export async function addictionPhase(actor) {
   const state = actor.getFlag("edrpg", "addiction");
   if (!state?.addicted) return { proceed: true, notes: [] };
   const cash = actor.system.cash?.cr ?? 0;
   const fmt = (n) => `${n.toLocaleString()}cr`;
   const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: L("EDRPG.addiction.title", { name: actor.name }), icon: "fa-solid fa-syringe" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p>${L("EDRPG.addiction.choose", { name: esc(actor.name), cash: fmt(cash) })}</p>`,
      buttons: [
         { action: "clinic", label: L("EDRPG.addiction.clinic", { cost: fmt(CLINIC_COST) }), icon: "fa-solid fa-hospital", disabled: cash < CLINIC_COST },
         { action: "habit", label: L("EDRPG.addiction.habit", { cost: fmt(HABIT_COST) }), icon: "fa-solid fa-syringe", disabled: cash < HABIT_COST },
         { action: "neither", label: L("EDRPG.addiction.neither"), icon: "fa-solid fa-person-falling" },
      ],
      rejectClose: false,
   });
   if (!choice) return { proceed: false, notes: [] };
   const notes = [];
   let proceed = true;
   if (choice === "clinic") {
      await actor.update({ "system.cash.cr": cash - CLINIC_COST, "system.endurance.bonus": (actor.system._source.endurance?.bonus ?? 0) - 5 });
      await actor.setFlag("edrpg", "addiction", { uses: 0, addicted: false });
      notes.push(L("EDRPG.addiction.cured", { name: esc(actor.name), cost: fmt(CLINIC_COST) }));
      proceed = false;
   } else if (choice === "habit") {
      await actor.update({ "system.cash.cr": cash - HABIT_COST });
      const r = await new Roll("1d10").evaluate();
      if (r.total === 10) {
         notes.push(L("EDRPG.addiction.dies", { name: esc(actor.name), roll: r.total }));
         if (actor.toggleStatusEffect) await actor.toggleStatusEffect("dead", { active: true, overlay: true });
         proceed = false;
      } else notes.push(L("EDRPG.addiction.habitOk", { name: esc(actor.name), cost: fmt(HABIT_COST), roll: r.total }));
   } else {
      notes.push(L("EDRPG.addiction.crippled", { name: esc(actor.name) }));
   }
   await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="edrpg edrpg-chat edrpg-condition">${notes.map((n) => `<p>${n}</p>`).join("")}</div>` });
   return { proceed, notes };
}
