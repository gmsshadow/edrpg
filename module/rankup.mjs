import { skillCategory } from "./config.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

/**
 * Going up in Rank (Core Rules pp.49–50). When Rank Points reach a new rank:
 * - the Skill Cap rises, and the Karma and Endurance maximums follow the rank table (derived automatically);
 * - you gain an extra Karma point and 5 Endurance now;
 * - you choose a new Karma Capability *or* a new Enhancement;
 * - you choose ten different Skills and roll a D10 for each, adding it — but no Skill may go above the new Skill Cap.
 * Ranks are applied one at a time, in order.
 */

/** Skills improved at each rank-up. */
export const RANK_UP_SKILLS = 10;

/**
 * Banner for the Data Sheet when a rank is waiting to be applied.
 *
 * @param {Actor} actor
 *
 * @returns {object|null}
 */
export function rankUpView(actor) {
   const pending = actor.system.pendingRanks ?? [];
   if (!pending.length) return null;
   return {
      next: game.i18n.localize(pending[0].name),
      count: pending.length,
      cap: pending[0].skillCap,
   };
}

/**
 * Dialog and application of the next pending rank.
 *
 * @param {Actor} actor
 */
export async function promptRankUp(actor) {
   const rank = actor.system.pendingRanks?.[0];
   if (!rank) return ui.notifications.info(game.i18n.format("EDRPG.rankUp.none", { name: actor.name }));
   const i18n = (k, d) => (d ? game.i18n.format(k, d) : game.i18n.localize(k));
   const esc = foundry.utils.escapeHTML;
   // Partners get the Skills and Endurance only (p.27).
   const partner = actor.type === "partner";
   const cap = (key) => {
      const data = actor.system.skills[skillCategory[key]][key];
      // The rank's cap plus any per-skill increase (Natural Genius, manual), never above 100.
      return Math.min(rank.skillCap + (data.capBonus ?? 0) + (data.geniusCap ?? 0), 100);
   };
   const options = Object.keys(skillCategory)
      .map((key) => {
         const data = actor.system.skills[skillCategory[key]][key];
         return { key, label: skillLabel(key), natural: data.natural, room: Math.max(cap(key) - data.natural, 0) };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
   const select = (i) =>
      `<select name="s${i}"><option value=""></option>${options
         .map((o) => `<option value="${o.key}" ${o.room ? "" : "disabled"}>${esc(o.label)} (${o.natural}${o.room < 10 ? `, ${i18n("EDRPG.rankUp.room", { room: o.room })}` : ""})</option>`)
         .join("")}</select>`;
   const rows = Array.from({ length: RANK_UP_SKILLS }, (_, i) => `<div class="form-group"><label>${i + 1}.</label><div class="form-fields">${select(i)}</div></div>`).join("");
   const content = `
      <p>${i18n("EDRPG.rankUp.intro", { name: esc(actor.name), rank: i18n(rank.name), cap: rank.skillCap })}</p>
      <ul class="ed-rankup-gains">
         <li>${i18n("EDRPG.rankUp.gainCap", { cap: rank.skillCap })}</li>
         ${partner ? "" : `<li>${i18n("EDRPG.rankUp.gainKarma")}</li>`}
         <li>${i18n("EDRPG.rankUp.gainEndurance")}</li>
      </ul>
      ${partner ? `<p class="hint">${i18n("EDRPG.rankUp.partnerNote")}</p>` : `<div class="form-group">
         <label>${i18n("EDRPG.rankUp.choice")}</label>
         <div class="form-fields">
            <select name="choice">
               <option value="karma">${i18n("EDRPG.rankUp.choiceKarma")}</option>
               <option value="enhancement">${i18n("EDRPG.rankUp.choiceEnhancement")}</option>
            </select>
         </div>
      </div>`}
      <h4>${i18n("EDRPG.rankUp.skillsHeading")}</h4>
      <p class="hint">${i18n("EDRPG.rankUp.skillsHint", { cap: rank.skillCap })}</p>
      ${rows}`;
   const result = await foundry.applications.api.DialogV2.input({
      window: { title: i18n("EDRPG.rankUp.title", { rank: i18n(rank.name) }), icon: "fa-solid fa-ranking-star" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-rankup"],
      position: { width: 460 },
      content,
      ok: { label: "EDRPG.rankUp.roll", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!result) return;
   const picks = Array.from({ length: RANK_UP_SKILLS }, (_, i) => result[`s${i}`]).filter(Boolean);
   if (new Set(picks).size !== picks.length) return ui.notifications.warn("EDRPG.rankUp.duplicate", { localize: true });
   if (picks.length < RANK_UP_SKILLS) {
      // Fewer than ten only makes sense when nothing else has room left under the cap.
      const roomLeft = options.filter((o) => o.room > 0 && !picks.includes(o.key)).length;
      if (roomLeft > 0) return ui.notifications.warn(game.i18n.format("EDRPG.rankUp.pickTen", { count: RANK_UP_SKILLS }));
   }
   return applyRankUp(actor, rank, { choice: partner ? "" : result.choice, skills: picks, cap });
}

/**
 * Roll and apply one rank-up.
 *
 * @param {Actor} actor
 *
 * @param {object} rank      Rank table entry being applied.
 *
 * @param {object} options
 *
 * @param {"karma"|"enhancement"} options.choice
 *
 * @param {string[]} options.skills
 *
 * @param {Function} options.cap  Skill key -> cap at the new rank.
 */
export async function applyRankUp(actor, rank, { choice, skills, cap }) {
   const roll = skills.length ? await new Roll(`${skills.length}d10`).evaluate() : null;
   const results = roll?.dice[0].results.map((r) => r.result) ?? [];
   const update = {};
   const lines = skills.map((key, i) => {
      const category = skillCategory[key];
      const data = actor.system.skills[category][key];
      const added = Math.max(Math.min(results[i], cap(key) - data.natural), 0);
      update[`system.skills.${category}.${key}.learning`] = data.learning + added;
      return { skill: key, roll: results[i], added, label: skillLabel(key), from: data.natural, to: data.natural + added, capped: added < results[i] };
   });
   const sys = actor.system;
   Object.assign(update, {
      "system.advancement.rank": rank.key,
      "system.advancement.history": [...(sys.advancement.history ?? []), { rank: rank.key, choice, skills: lines.map(({ skill, roll, added }) => ({ skill, roll, added })) }],
      // 5 Endurance now (and a Karma point, except for partners); the maximums follow the rank table.
      "system.endurance.value": sys.endurance.value + 5,
   });
   if (actor.type !== "partner") update["system.karma.standard.value"] = sys.karma.standard.value + 1;
   await actor.update(update);

   const content = await foundry.applications.handlebars.renderTemplate("systems/edrpg/templates/chat/rank-up.hbs", {
      name: actor.name,
      rank: game.i18n.localize(rank.name),
      cap: rank.skillCap,
      choice: !choice ? "EDRPG.rankUp.partnerChoice" : choice === "enhancement" ? "EDRPG.rankUp.choiceEnhancement" : "EDRPG.rankUp.choiceKarma",
      partner: actor.type === "partner",
      lines,
   });
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.format("EDRPG.rankUp.title", { rank: game.i18n.localize(rank.name) }),
      content,
      rolls: roll ? [roll] : [],
      sound: roll && !game.dice3d ? CONFIG.sounds.dice : null,
   });

   if (!choice) return;
   // Open the compendium to pick the new capability or Enhancement from.
   const pack = game.packs.get(choice === "enhancement" ? "edrpg.enhancements" : "edrpg.karma-capabilities");
   pack?.render(true);
   ui.notifications.info(game.i18n.format(choice === "enhancement" ? "EDRPG.rankUp.pickEnhancement" : "EDRPG.rankUp.pickKarma", { name: actor.name }));
}
