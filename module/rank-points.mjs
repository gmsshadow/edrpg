/**
 * Awarding Rank Points (Core Rules p.326). Players gain Rank Points three ways:
 * - completing a mission: about 4 for a quick, simple one, 8 for one that took a couple of sessions, 12 to 20 for very
 *   tough missions spanning many sessions;
 * - overcoming a challenge (sneaking into the police station, disarming the bomb, a social victory): 1;
 * - defeating an enemy (killed, routed or surrendered) of the party's Tier or higher: 1.
 * The GM picks who earns them; going up a rank then shows on each character's sheet as usual.
 */
import { ranks, rankFor } from "./config.mjs";
import { TIER_OF_RANK } from "./supplement-data.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** Award kinds: their points (null = the GM's number, within the range). */
export const AWARDS = {
   missionShort: { points: 4 },
   missionMedium: { points: 8 },
   missionLong: { points: null, min: 12, max: 20, initial: 12 },
   challenge: { points: 1 },
   enemy: { points: 1 },
   custom: { points: null, min: -999, max: 999, initial: 1 },
};

/** The points an award gives (custom amounts kept within the award's range). */
export function awardPoints(kind, amount) {
   const a = AWARDS[kind] ?? AWARDS.custom;
   if (a.points !== null) return a.points;
   const n = Math.round(Number(amount));
   return Math.min(a.max, Math.max(a.min, Number.isFinite(n) ? n : a.initial));
}

/** The party: characters with a player owner. */
const party = () => (game.actors ?? []).filter((a) => a.type === "character" && a.hasPlayerOwner);

/**
 * Give Rank Points to characters and post the result.
 *
 * @param {Actor[]} actors
 *
 * @param {number} points
 *
 * @param {object} [o]  { kind, reason }
 */
export async function giveRankPoints(actors, points, { kind = "custom", reason = "" } = {}) {
   const lines = [];
   for (const a of actors) {
      const before = a.system.rankPoints ?? 0;
      const after = Math.max(0, before + points);
      const rankBefore = rankFor(before);
      await a.update({ "system.rankPoints": after });
      const rankAfter = rankFor(after);
      const up = rankAfter.key !== rankBefore.key && ranks.findIndex((r) => r.key === rankAfter.key) > ranks.findIndex((r) => r.key === rankBefore.key);
      lines.push(L(up ? "EDRPG.rp.lineUp" : "EDRPG.rp.line", { name: esc(a.name), before, after, rank: L(rankAfter.name) }));
   }
   const head = L("EDRPG.rp.cardTitle", { points: `${points > 0 ? "+" : ""}${points}`, why: L(`EDRPG.rp.kind.${kind}`) });
   const content = `<div class="edrpg edrpg-chat edrpg-rp"><h3><i class="fa-solid fa-medal"></i> ${head}</h3>${reason ? `<p class="muted">${esc(reason)}</p>` : ""}<p>${lines.join("<br>")}</p></div>`;
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });
}

/** The GM's dialog: who, what for, how many. */
export async function openRankPoints() {
   if (!game.user.isGM) return void ui.notifications.warn(L("EDRPG.rp.gmOnly"));
   const pcs = party();
   if (!pcs.length) return void ui.notifications.warn(L("EDRPG.rp.noParty"));
   const order = ranks.map((r) => r.key);
   const top = pcs.map((a) => a.system.rank?.key).filter(Boolean).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? "harmless";
   const kinds = Object.keys(AWARDS)
      .map((k) => `<option value="${k}">${L(`EDRPG.rp.kind.${k}`)}${AWARDS[k].points !== null ? ` (+${AWARDS[k].points})` : ""}</option>`)
      .join("");
   const who = pcs
      .map((a) => `<label class="ed-check"><input type="checkbox" name="pc.${a.id}" checked> ${esc(a.name)} <span class="muted">(${L(a.system.rank?.name ?? "")}, ${a.system.rankPoints ?? 0})</span></label>`)
      .join("");
   const content = `<div class="edrpg ed-rp-dialog">
      <div class="form-group"><label>${L("EDRPG.rp.for")}</label><div class="form-fields"><select name="kind">${kinds}</select></div></div>
      <div class="form-group"><label>${L("EDRPG.rp.points")}</label><div class="form-fields"><input type="number" name="amount" value="12" step="1"></div><p class="hint">${L("EDRPG.rp.pointsHint")}</p></div>
      <div class="form-group"><label>${L("EDRPG.rp.reason")}</label><div class="form-fields"><input type="text" name="reason" placeholder="${esc(L("EDRPG.rp.reasonHint"))}"></div></div>
      <p class="hint">${L("EDRPG.rp.enemyHint", { tier: TIER_OF_RANK[top] ?? 1 })}</p>
      <fieldset><legend>${L("EDRPG.rp.who")}</legend>${who}</fieldset></div>`;
   const res = await foundry.applications.api.DialogV2.input({ window: { title: L("EDRPG.rp.title"), icon: "fa-solid fa-medal" }, content, rejectClose: false });
   if (!res) return;
   const chosen = pcs.filter((a) => res[`pc.${a.id}`] || res.pc?.[a.id]);
   if (!chosen.length) return void ui.notifications.warn(L("EDRPG.rp.noneChosen"));
   const points = awardPoints(res.kind, res.amount);
   return giveRankPoints(chosen, points, { kind: res.kind, reason: res.reason ?? "" });
}
