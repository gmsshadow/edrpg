/**
 * Advanced Trading (Super Traders Supplement pp.6–14).
 *
 * - On arriving at a star port the GM rolls D10+2 for the column of the system's Price Index (by economy); the column
 *   gives the price per ton of every commodity, the same to buy or sell. Colony, military, service and tourism
 *   economies use the General index; colony, prison and terraforming systems only buy from traders.
 * - Each return visit rolls a lower maximum: 2nd D10, 3rd D8, 4th D6, 5th and later D4. A system "recovers" after a
 *   few months: reset its visits.
 * - Column meanings: 10 rich or booming, 4 poor or frontier, 5 at war; 3, 7 and 11 have black markets (illegal goods).
 *   The GM can pick a column instead of rolling.
 * - You can't sell a good back in the system where you bought it.
 */
import { PRICE_INDICES } from "./trading-data.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** Economies and the index each uses. */
export const ECONOMIES = {
   agricultural: "Agricultural",
   extraction: "Extraction",
   highTech: "High Tech",
   industrial: "Industrial",
   refinery: "Refinery",
   terraforming: "Terraforming",
   colony: "General",
   military: "General",
   service: "General",
   tourism: "General",
   prison: "General",
};

/** Economies that only buy from traders. */
const BUY_ONLY = ["colony", "prison", "terraforming"];

/** Visit number → the die rolled for the column. */
const VISIT_DICE = ["1d10 + 2", "1d10", "1d8", "1d6", "1d4"];

/** What a column says about the system. */
const COLUMN_NOTES = { 3: "blackMarket", 4: "poor", 5: "war", 7: "blackMarket", 10: "rich", 11: "blackMarket" };

/**
 * A price list for a column.
 *
 * @param {string} index  Price Index name ("Agricultural").
 *
 * @param {number} column 1–12.
 *
 * @returns {{commodity: string, price: string}[]}
 */
export function priceList(index, column) {
   return (PRICE_INDICES[index] ?? []).map(([commodity, prices]) => ({ commodity, price: prices[column - 1] ?? "-" }));
}

/** Open the market dialog (GM): roll or choose the column and post the price list. */
export async function openMarket({ port: presetPort = "", economy = "" } = {}) {
   const visits = game.settings.get("edrpg", "marketVisits") ?? {};
   const econ = Object.keys(ECONOMIES).map((k) => `<option value="${k}"${k === economy ? " selected" : ""}>${L(`EDRPG.trade.economy.${k}`)}</option>`).join("");
   const cols = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}${COLUMN_NOTES[i + 1] ? ` — ${L(`EDRPG.trade.column.${COLUMN_NOTES[i + 1]}`)}` : ""}</option>`).join("");
   const known = Object.keys(visits).map((n) => `<option value="${esc(n)}"></option>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.trade.title") },
      classes: ["edrpg", "edrpg-dialog"],
      content: `
         <div class="form-group"><label>${L("EDRPG.trade.port")}</label><div class="form-fields"><input type="text" name="port" value="${esc(presetPort)}" list="edrpg-ports" placeholder="${L("EDRPG.trade.portHint")}"><datalist id="edrpg-ports">${known}</datalist></div></div>
         <div class="form-group"><label>${L("EDRPG.trade.economyLabel")}</label><div class="form-fields"><select name="economy">${econ}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.trade.columnLabel")}</label><div class="form-fields"><select name="column"><option value="roll">${L("EDRPG.trade.roll")}</option>${cols}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.trade.reset")}</label><div class="form-fields"><input type="checkbox" name="reset"></div></div>
         <div class="form-group"><label>${L("EDRPG.trade.whisper")}</label><div class="form-fields"><input type="checkbox" name="whisper"></div></div>
         <p class="hint">${L("EDRPG.trade.hint")}</p>`,
      rejectClose: false,
   });
   if (!input) return;
   const port = String(input.port ?? "").trim();
   const all = foundry.utils.deepClone(visits);
   if (port && input.reset) all[port] = 0;
   const visit = port ? (all[port] ?? 0) + 1 : 1;
   let column;
   let roll = null;
   if (input.column === "roll") {
      roll = await new Roll(VISIT_DICE[Math.min(visit, 5) - 1]).evaluate();
      column = Math.max(1, Math.min(12, roll.total));
   } else column = Number(input.column);
   if (port) {
      all[port] = visit;
      await game.settings.set("edrpg", "marketVisits", all);
   }
   const index = ECONOMIES[input.economy] ?? "General";
   const rows = priceList(index, column);
   const content = `<div class="edrpg edrpg-chat edrpg-market">
      <h3><i class="fa-solid fa-scale-balanced"></i> ${port ? esc(port) : L("EDRPG.trade.title")}</h3>
      <p>${L("EDRPG.trade.summary", { economy: L(`EDRPG.trade.economy.${input.economy}`), index, column, visit })}${roll ? ` <span class="muted">(${roll.formula.replace(/\s/g, "").toUpperCase()}: ${roll.total})</span>` : ""}</p>
      ${COLUMN_NOTES[column] ? `<p class="ed-market-note">${L(`EDRPG.trade.columnNote.${COLUMN_NOTES[column]}`)}</p>` : ""}
      ${BUY_ONLY.includes(input.economy) ? `<p class="ed-market-note">${L("EDRPG.trade.buyOnly")}</p>` : ""}
      <table class="ed-market"><thead><tr><th>${L("EDRPG.trade.commodity")}</th><th>${L("EDRPG.trade.price")}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="${r.price === "-" ? "muted" : ""}"><td>${esc(r.commodity)}</td><td>${esc(r.price)}</td></tr>`).join("")}</tbody></table>
      <p class="hint">${L("EDRPG.trade.footer")}</p></div>`;
   await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content,
      rolls: roll ? [roll] : [],
      whisper: input.whisper ? game.users.filter((u) => u.isGM).map((u) => u.id) : undefined,
   });
}
