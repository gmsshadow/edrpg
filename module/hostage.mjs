/**
 * Hostage Release (Military Sourcebook pp.56–57): the hostages and the terrorist groups between the players and them.
 *
 * - 2D10 hostages. Once the Alert sounds, one dies per combat round or skill check. Pay: double if all survive, normal
 *   if some die, nothing if all die.
 * - A group is beaten by hand-to-hand (Melee and Fighting only, both sides), Stealth (an Average check; a failure means
 *   a fight and the Alert; never the last group), technical skills (after the first group: Average Systems or Computer
 *   locks them in; a failure raises the Alert and they aren't beaten; never the last group) or ambush (only the last
 *   group safely: they lose their first turn at Defence 0; flashbangs only).
 * - A negotiator who stays behind (Average Bluff or Diplomacy) makes every later check one step easier.
 */
import { checkDn } from "./infiltration.mjs";
import { partyInfo, toolLink } from "./encounters.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** One step easier for the negotiator (Easy goes 2 lower). */
function dnFor(level, state) {
   if (!state.negotiator) return checkDn(level, state.rank, state.alert).dn;
   if (level === "easy") return checkDn("easy", state.rank, state.alert).dn - 2;
   return checkDn(level === "hard" ? "average" : "easy", state.rank, state.alert).dn;
}

/**
 * Start the tracker.
 *
 * @param {object} o  { groups: ["easy", …], faction }
 *
 * @returns {Promise<ChatMessage>}
 */
export async function startHostages({ groups = ["easy", "easy", "medium"], faction = "criminal" } = {}) {
   const r = await new Roll("2d10").evaluate();
   const state = { hostages: r.total, alive: r.total, faction, rank: partyInfo().rank, alert: false, negotiator: false, groups: groups.map((difficulty) => ({ difficulty, status: "open", method: "" })) };
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), rolls: [r], content: render(state), flags: { edrpg: { hostages: state } } });
}

const check = (state, level, skills) => {
   const dn = dnFor(level, state);
   return skills.map((s) => `<a class="ed-pe-check" data-skill="${s}" data-dn="${dn}"><i class="fa-solid fa-dice-d10"></i> ${esc(skillLabel(s))} (${dn})</a>`).join(" ");
};

function render(state) {
   const firstOpen = state.groups.findIndex((g) => g.status === "open");
   const beaten = state.groups.filter((g) => g.status === "defeated").length;
   const pay = state.alive === state.hostages ? "EDRPG.hostage.payDouble" : state.alive > 0 ? "EDRPG.hostage.payNormal" : "EDRPG.hostage.payNone";
   const rows = state.groups
      .map((g, i) => {
         const last = i === state.groups.length - 1;
         const current = i === firstOpen;
         let ways = "";
         if (current) {
            const fight = toolLink("encounter", { faction: state.faction, scale: "personal", difficulty: g.difficulty, direct: true }, L("EDRPG.hostage.group", { difficulty: L(`EDRPG.enc.difficulty.${g.difficulty}`) }), "fa-solid fa-users-viewfinder");
            ways = `<ul class="ed-pe-checks">
               <li><b>${L("EDRPG.hostage.hand")}</b>: ${L("EDRPG.hostage.handHint")} ${fight}</li>
               ${last ? "" : `<li><b>${L("EDRPG.hostage.stealth")}</b>: ${check(state, "average", ["stealth"])}</li>`}
               ${last || beaten === 0 ? "" : `<li><b>${L("EDRPG.hostage.technical")}</b>: ${check(state, "average", ["systems", "computer"])}</li>`}
               ${last ? `<li><b>${L("EDRPG.hostage.ambush")}</b>: ${L("EDRPG.hostage.ambushHint")}</li>` : ""}
            </ul>
            <span data-gm><a data-host="win" data-i="${i}"><i class="fa-solid fa-check"></i> ${L("EDRPG.hostage.beaten")}</a> <a data-host="alarm" data-i="${i}"><i class="fa-solid fa-bell"></i> ${L("EDRPG.hostage.alarm")}</a></span>`;
         }
         const status = g.status === "defeated" ? `<span class="ed-chip">${L("EDRPG.hostage.done")}</span>` : "";
         return `<li class="${g.status}"><b>${L("EDRPG.hostage.group", { difficulty: L(`EDRPG.enc.difficulty.${g.difficulty}`) })}</b> ${status}${ways}</li>`;
      })
      .join("");
   return `<div class="edrpg edrpg-chat edrpg-hostages ${state.alert ? "alert" : ""}">
      <h3><i class="fa-solid fa-people-group"></i> ${L("EDRPG.hostage.title")}</h3>
      <p>${L("EDRPG.hostage.count", { alive: state.alive, total: state.hostages })} — ${L(pay)}</p>
      ${state.alert ? `<p class="ed-between-warn">${L("EDRPG.hostage.alertOn")} <a data-host="kill" data-gm><i class="fa-solid fa-skull"></i> ${L("EDRPG.hostage.kill")}</a></p>` : ""}
      <p class="muted">${L(state.negotiator ? "EDRPG.hostage.negotiatorOn" : "EDRPG.hostage.negotiatorHint")} ${check({ ...state, negotiator: false }, "average", ["bluff", "diplomacy"])} <a data-host="negotiator" data-gm><i class="fa-solid fa-comments"></i> ${L(state.negotiator ? "EDRPG.hostage.negotiatorOff" : "EDRPG.hostage.negotiatorSet")}</a></p>
      <ol class="ed-hostage-groups">${rows}</ol>
      ${firstOpen < 0 ? `<div class="outcome success">${L("EDRPG.hostage.freed")}</div>` : ""}
      <div class="ed-tool-row" data-gm><a data-host="alert"><i class="fa-solid fa-bell"></i> ${L(state.alert ? "EDRPG.lane.alertOn" : "EDRPG.lane.alertOff")}</a></div>
   </div>`;
}

/** Chat hook. */
export function onRenderHostages(message, html) {
   const state = message.getFlag("edrpg", "hostages");
   const card = html.querySelector(".edrpg-hostages");
   if (!state || !card) return;
   if (!game.user.isGM) for (const el of card.querySelectorAll("[data-gm]")) el.remove();
   card.addEventListener("click", async (event) => {
      const el = event.target.closest(".ed-pe-check, [data-host]");
      if (!el) return;
      event.preventDefault();
      if (el.classList.contains("ed-pe-check")) {
         const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
         if (!actor?.isOwner) return void ui.notifications.warn(L("EDRPG.infil.noActor"));
         return game.edrpg.rollSkillCheck(actor, el.dataset.skill, { difficulty: Number(el.dataset.dn), label: `${L("EDRPG.hostage.title")}: ${skillLabel(el.dataset.skill)}` });
      }
      if (!game.user.isGM) return;
      const s = foundry.utils.deepClone(state);
      const i = Number(el.dataset.i);
      const act = el.dataset.host;
      if (act === "win") s.groups[i].status = "defeated";
      else if (act === "alarm") s.alert = true;
      else if (act === "alert") s.alert = !s.alert;
      else if (act === "kill") s.alive = Math.max(0, s.alive - 1);
      else if (act === "negotiator") s.negotiator = !s.negotiator;
      await message.update({ content: render(s), "flags.edrpg.hostages": s });
   });
}
