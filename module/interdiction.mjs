/**
 * Interdiction (Core Rules p.209; Super Traders Supplement p.45).
 *
 * - Opposed Spaceship Piloting checks: a pilot who wins two in a row gets their way. The attacker pulls the target
 *   out of supercruise (both drop into realspace); the defender breaks away (the attacker is forced into realspace).
 *   Ties change nothing.
 * - An FSD Interdictor adds its modifier; a target larger than its size limit is −5.
 * - Dropping out costs a ship 10 Hull; on a D10 of 9–10 a component is damaged as well.
 * - Opponents' piloting by rank (Super Traders p.45). Pirates and police go for cargo ships first, then multi-role
 *   ships, then combat ships; ties at random. A player can submit (pulled out, no contest).
 */
import { RANK_PILOTING } from "./supplement-data.mjs";
import { partyInfo } from "./encounters.mjs";
import { partyActors } from "./planet.mjs";
import { activeShip } from "./fleet.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** How tempting a ship is to pirates and police: 0 cargo ships, 1 multi-role, 2 combat. */
export function temptation(name) {
   const n = String(name ?? "");
   if (/hauler|type[- ]?[679]|transport|keelback|boa|cutter|t-?[679]\b|lakon/i.test(n)) return 0;
   if (/eagle|vulture|viper|fer-de-lance|sidewinder|courier|mamba|condor|taipan|gu-97|f63|federal (assault|gunship|corvette)/i.test(n)) return 2;
   return 1;
}

/**
 * The party ships pirates would go for, most tempting first (ties shuffled).
 *
 * @returns {Actor[]}
 */
export function targetsInOrder() {
   const ships = partyActors()
      .map((a) => activeShip(a))
      .filter(Boolean);
   const unique = [...new Map(ships.map((s) => [s.uuid, s])).values()];
   return unique
      .map((s) => ({ s, t: temptation(`${s.system.model ?? ""} ${s.name}`), r: Math.random() }))
      .sort((a, b) => a.t - b.t || a.r - b.r)
      .map((x) => x.s);
}

/**
 * Run one round of the contest (pure).
 *
 * @param {object} state  { attacker: {bonus}, defender: {bonus}, streak: {who, n}, rounds: [] }
 *
 * @param {number} a  Attacker's D10.
 *
 * @param {number} b  Defender's D10.
 *
 * @returns {object}  state, with `result` ("pulled" | "escaped") once decided.
 */
export function contestRound(state, a, b) {
   const at = a + state.attacker.bonus;
   const df = b + state.defender.bonus;
   const winner = at > df ? "attacker" : df > at ? "defender" : null;
   state.rounds.push({ a, b, at, df, winner });
   if (!winner) return state;
   state.streak = state.streak?.who === winner ? { who: winner, n: state.streak.n + 1 } : { who: winner, n: 1 };
   if (state.streak.n >= 2) state.result = winner === "attacker" ? "pulled" : "escaped";
   return state;
}

/**
 * Start an interdiction: pick the target and the attacker's bonus, then post the contest card.
 *
 * @param {object} [o]  { attacker: name, bonus, rank }
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function openInterdiction(o = {}) {
   const { rank } = partyInfo();
   const atRank = o.rank ?? rank;
   const bonus = o.bonus ?? RANK_PILOTING[atRank] ?? 3;
   const ships = targetsInOrder();
   const opts = ships.map((s, i) => `<option value="${s.uuid}"${i === 0 ? " selected" : ""}>${esc(s.name)} (${L(`EDRPG.interdict.tempt.${temptation(`${s.system.model ?? ""} ${s.name}`)}`)}, ${L("EDRPG.interdict.piloting")} +${s.system.piloting ?? 0})</option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.interdict.title"), icon: "fa-solid fa-magnet" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<p class="hint">${L("EDRPG.interdict.intro")}</p>
         <div class="form-group"><label>${L("EDRPG.interdict.attacker")}</label><div class="form-fields"><input type="text" name="attacker" value="${esc(o.attacker ?? L("EDRPG.interdict.pirates"))}"></div></div>
         <div class="form-group"><label>${L("EDRPG.interdict.attackerBonus")}</label><div class="form-fields"><input type="number" name="bonus" value="${bonus}" step="1"></div><p class="hint">${L("EDRPG.interdict.bonusHint")}</p></div>
         <div class="form-group"><label>${L("EDRPG.interdict.target")}</label><div class="form-fields"><select name="target">${opts}<option value="">${L("EDRPG.interdict.other")}</option></select></div><p class="hint">${L("EDRPG.interdict.targetHint")}</p></div>
         <div class="form-group"><label>${L("EDRPG.interdict.defenderBonus")}</label><div class="form-fields"><input type="number" name="defBonus" value="" step="1" placeholder="${L("EDRPG.interdict.fromShip")}"></div></div>`,
      ok: { label: "EDRPG.interdict.start", icon: "fa-solid fa-magnet" },
      rejectClose: false,
   });
   if (!input) return null;
   const ship = input.target ? await fromUuid(input.target) : null;
   const defBonus = input.defBonus === "" || input.defBonus === null || input.defBonus === undefined ? (ship?.system.piloting ?? 0) : Number(input.defBonus) || 0;
   const state = {
      attacker: { name: input.attacker || L("EDRPG.interdict.pirates"), bonus: Number(input.bonus) || 0 },
      defender: { name: ship?.name ?? L("EDRPG.interdict.theTarget"), uuid: ship?.uuid ?? null, bonus: defBonus },
      streak: null,
      rounds: [],
      result: null,
      damage: [],
   };
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: render(state), flags: { edrpg: { interdiction: state } } });
}

function render(s) {
   const rounds = s.rounds
      .map((r, i) => `<li>${L("EDRPG.interdict.round", { n: i + 1, a: r.a, at: r.at, b: r.b, df: r.df })} — ${r.winner ? esc(r.winner === "attacker" ? s.attacker.name : s.defender.name) : L("EDRPG.interdict.tie")}</li>`)
      .join("");
   const outcome = s.result === "pulled" ? L("EDRPG.interdict.pulled", { name: esc(s.defender.name) }) : s.result === "escaped" ? L("EDRPG.interdict.escaped", { name: esc(s.defender.name), attacker: esc(s.attacker.name) }) : s.result === "submitted" ? L("EDRPG.interdict.submitted", { name: esc(s.defender.name) }) : "";
   const buttons = s.result
      ? s.result !== "submitted" && s.defender.uuid && !s.damage.length && (s.result === "pulled")
         ? `<a data-int="hull"><i class="fa-solid fa-heart-crack"></i> ${L("EDRPG.interdict.dropDamage", { name: esc(s.defender.name) })}</a>`
         : ""
      : `<a data-int="round"><i class="fa-solid fa-dice-d10"></i> ${L("EDRPG.interdict.roll")}</a> <a data-int="submit"><i class="fa-solid fa-hand"></i> ${L("EDRPG.interdict.submit")}</a>`;
   return `<div class="edrpg edrpg-chat edrpg-interdiction">
      <h3><i class="fa-solid fa-magnet"></i> ${L("EDRPG.interdict.title")}</h3>
      <p>${L("EDRPG.interdict.vs", { attacker: esc(s.attacker.name), ab: s.attacker.bonus, defender: esc(s.defender.name), db: s.defender.bonus })}</p>
      ${rounds ? `<ol>${rounds}</ol>` : `<p class="hint">${L("EDRPG.interdict.howTo")}</p>`}
      ${outcome ? `<div class="outcome ${s.result === "escaped" ? "success" : "failure"}">${outcome}</div>` : ""}
      ${s.damage.map((x) => `<p>${x}</p>`).join("")}
      ${buttons ? `<div class="ed-tool-row" data-gm>${buttons}</div>` : ""}
   </div>`;
}

/** Chat hook (GM drives the contest). */
export function onRenderInterdiction(message, html) {
   const state = message.getFlag("edrpg", "interdiction");
   const card = html.querySelector(".edrpg-interdiction");
   if (!state || !card) return;
   if (!game.user.isGM) for (const el of card.querySelectorAll("[data-gm]")) el.remove();
   card.addEventListener("click", async (event) => {
      const el = event.target.closest("[data-int]");
      if (!el || !game.user.isGM) return;
      event.preventDefault();
      const s = foundry.utils.deepClone(state);
      const rolls = [];
      if (el.dataset.int === "round") {
         const a = await new Roll("1d10").evaluate();
         const b = await new Roll("1d10").evaluate();
         rolls.push(a, b);
         contestRound(s, a.total, b.total);
      } else if (el.dataset.int === "submit") s.result = "submitted";
      else if (el.dataset.int === "hull") {
         const ship = await fromUuid(s.defender.uuid);
         if (ship) {
            const { applyCraftDamage } = await import("./dice/craft-attack.mjs");
            const r = await applyCraftDamage(ship, { total: 10 });
            const c = await new Roll("1d10").evaluate();
            rolls.push(c);
            s.damage.push(L("EDRPG.lane.hullTook", { name: esc(ship.name), damage: 10, before: r.hullBefore, after: r.hullAfter }) + ` ${L(c.total >= 9 ? "EDRPG.interdict.component" : "EDRPG.interdict.noComponent", { roll: c.total })}`);
         }
      }
      if (rolls.length && game.dice3d) for (const r of rolls) game.dice3d.showForRoll(r, game.user, true);
      await message.update({ content: render(s), "flags.edrpg.interdiction": s });
   });
}
