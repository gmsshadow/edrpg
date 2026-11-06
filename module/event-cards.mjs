/**
 * Event cards: a shared engine for encounter tables whose results have their own mechanics (Space Lane Encounters,
 * Travel (Military)). Each result is a chat card with its text, checks (Relative Difficulty Numbers for the party's
 * rank, one step harder on Alert where marked), damage, groups to fight, tool links and GM actions that roll the
 * result's own sub-tables and log them on the card.
 *
 * A kind registers { events: {name: def}, actions: {key: async (state) => void}, autos: {key: async (state) => html} }.
 * def: { text, tag?, checks?: [{lv, alert?, skills, note?}], damage?: [n], fights?: [[faction, scale, difficulty, label?, extra?]],
 *        tools?: [html], actions?: [key], auto?: [key], random?: bool, alertable?: bool }
 */
import { partyInfo, toolLink } from "./encounters.mjs";
import { checkDn } from "./infiltration.mjs";
import { partyActors, hurt } from "./planet.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
export const d = (n) => 1 + Math.floor(Math.random() * n);

const KINDS = {};

/** Register a kind of event card. */
export function registerKind(kind, spec) {
   KINDS[kind] = spec;
}

/** A check as roll links (anyone; the named player if they own them). */
function checkHtml(c, state) {
   const lv = state.alert && c.alert ? c.alert : c.lv;
   const { dn, level } = checkDn(lv, state.rank);
   return `${L(`EDRPG.infil.level.${level}`)} (${dn}): ${c.skills
      .map((s) => `<a class="ed-pe-check" data-skill="${s}" data-dn="${dn}" data-actor="${state.player?.uuid ?? ""}"><i class="fa-solid fa-dice-d10"></i> ${esc(skillLabel(s))}</a>`)
      .join(" ")}${c.note ? ` <span class="muted">${esc(c.note)}</span>` : ""}`;
}

/** Damage links (GM). */
export function damageHtml(n, actorUuid = "", all = false, hull = false) {
   const label = hull ? (n ? L("EDRPG.lane.hull", { n }) : L("EDRPG.lane.hullRoll")) : all ? L("EDRPG.planet.damageAll", { n }) : L("EDRPG.planet.damage", { n });
   return `<a class="ed-pe-damage" data-amount="${n}" data-actor="${actorUuid}" data-all="${all ? 1 : ""}" data-hull="${hull ? 1 : ""}"><i class="fa-solid fa-heart-crack"></i> ${label}</a>`;
}

/** A fight link. */
export function fightHtml([faction, scale, difficulty, label, extra = {}]) {
   return toolLink(
      "encounter",
      { faction, scale, difficulty, direct: true, ...extra },
      label ?? L("EDRPG.lane.fight", { difficulty: L(`EDRPG.enc.difficulty.${difficulty}`), faction: L(`EDRPG.enc.faction.${faction}`), scale: L(`EDRPG.enc.scale.${scale}`) }),
      "fa-solid fa-users-viewfinder",
   );
}

/** The card's HTML. */
function render(state) {
   const spec = KINDS[state.kind];
   const def = spec.events[state.event] ?? { text: "" };
   const head = spec.title?.(state) ?? state.event;
   const sub = [state.place, state.columnLabel, state.roll ? `D${state.die ?? 100} ${state.roll}` : "", state.page ? L("EDRPG.base.page", { page: state.page }) : ""].filter(Boolean).join(" · ");
   const checks = (def.checks ?? []).map((c) => `<li>${checkHtml(c, state)}</li>`).join("");
   const fights = (def.fights ?? []).map(fightHtml).join(" ");
   const tools = (def.tools ?? []).map((t) => (typeof t === "function" ? t(state) : t)).join(" ");
   const actionKeys = typeof def.actions === "function" ? def.actions(state) : (def.actions ?? []);
   const actions = state.done ? "" : actionKeys.map((a) => `<a class="ed-pe-action" data-ev="${a}"><i class="fa-solid fa-play"></i> ${esc(L(`EDRPG.lane.action.${a}`))}</a>`).join(" ");
   const alert = def.alertable ? `<a class="ed-ev-alert" data-ev="__alert" data-tooltip="EDRPG.infil.alertHint"><i class="fa-solid fa-bell"></i> ${L(state.alert ? "EDRPG.lane.alertOn" : "EDRPG.lane.alertOff")}</a>` : "";
   return `<div class="edrpg edrpg-chat edrpg-planet edrpg-event ${state.alert ? "alert" : ""}">
      <h3><i class="${spec.icon ?? "fa-solid fa-route"}"></i> ${esc(head)}${def.tag ? ` <span class="ed-chip">${L(`EDRPG.lane.tag.${def.tag}`)}</span>` : ""}</h3>
      ${sub ? `<p class="muted">${esc(sub)}</p>` : ""}
      <p>${esc(def.text)}</p>
      ${def.note ? `<p class="muted">${esc(typeof def.note === "function" ? def.note(state) : def.note)}</p>` : ""}
      ${state.player ? `<p><i class="fa-solid fa-user"></i> ${L("EDRPG.planet.randomPlayer", { name: esc(state.player.name) })}</p>` : ""}
      ${checks ? `<ul class="ed-pe-checks">${checks}</ul>` : ""}
      ${def.damage ? `<p>${def.damage.map((n) => damageHtml(n, state.player?.uuid ?? "")).join(" ")}</p>` : ""}
      ${fights || tools ? `<div class="ed-tool-row">${fights} ${tools}</div>` : ""}
      ${state.log.length ? `<ol class="ed-pe-log">${state.log.map((l) => `<li>${l}</li>`).join("")}</ol>` : ""}
      ${actions || alert ? `<div class="ed-tool-row" data-gm>${actions} ${alert}</div>` : ""}
   </div>`;
}

/**
 * Post an event card.
 *
 * @param {string} kind
 *
 * @param {string} event  Result name.
 *
 * @param {object} [o]    { roll, die, page, place, columnLabel, alert, extra, whisper }
 *
 * @returns {Promise<ChatMessage>}
 */
export async function postEvent(kind, event, o = {}) {
   const spec = KINDS[kind];
   const def = spec.events[event] ?? { text: "" };
   const { rank, tier } = partyInfo();
   const state = { kind, event, rank, tier, log: [], done: false, roll: o.roll ?? null, die: o.die ?? 100, page: o.page ?? null, place: o.place ?? "", columnLabel: o.columnLabel ?? "", alert: !!o.alert, extra: o.extra ?? {}, player: null };
   if (def.random) {
      const p = partyActors();
      const who = p.length ? p[d(p.length) - 1] : null;
      if (who) state.player = { uuid: who.uuid, name: who.name };
   }
   for (const a of def.auto ?? []) {
      const line = await spec.autos[a](state);
      if (line) state.log.push(line);
   }
   const data = { speaker: ChatMessage.getSpeaker(), content: render(state), flags: { edrpg: { eventCard: state } } };
   if (o.whisper) data.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
   return ChatMessage.create(data);
}

/** Chat hook. */
export function onRenderEventCard(message, html) {
   const state = message.getFlag("edrpg", "eventCard");
   const card = html.querySelector(".edrpg-event");
   if (!state || !card) return;
   if (!game.user.isGM) for (const el of card.querySelectorAll("[data-gm], .ed-pe-damage")) el.remove();
   card.addEventListener("click", async (event) => {
      const el = event.target.closest(".ed-pe-check, .ed-pe-damage, [data-ev]");
      if (!el) return;
      event.preventDefault();
      if (el.classList.contains("ed-pe-check")) {
         const named = el.dataset.actor ? await fromUuid(el.dataset.actor) : null;
         const actor = (named?.isOwner ? named : null) ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? named;
         if (!actor?.isOwner) return void ui.notifications.warn(L("EDRPG.infil.noActor"));
         return game.edrpg.rollSkillCheck(actor, el.dataset.skill, { difficulty: Number(el.dataset.dn), label: `${state.event}: ${skillLabel(el.dataset.skill)}` });
      }
      if (!game.user.isGM) return;
      if (el.classList.contains("ed-pe-damage")) return applyDamage(el);
      const key = el.dataset.ev;
      const s = foundry.utils.deepClone(state);
      if (key === "__alert") s.alert = !s.alert;
      else {
         const result = await KINDS[s.kind].actions[key]?.(s, message);
         if (result === false) return;
      }
      await message.update({ content: render(s), "flags.edrpg.eventCard": s });
   });
}

/** Damage from a card: Endurance to people, or Hull (shields first) to their current ships. */
async function applyDamage(el) {
   let amount = Number(el.dataset.amount);
   if (!amount) amount = d(10) * 10;
   let targets = [];
   if (el.dataset.all) targets = partyActors();
   else if (el.dataset.actor) targets = [await fromUuid(el.dataset.actor)].filter(Boolean);
   else targets = (canvas?.tokens?.controlled ?? []).map((t) => t.actor).filter(Boolean);
   if (!targets.length) return void ui.notifications.warn(L("EDRPG.damage.noneSelected"));
   if (!el.dataset.hull) return hurt(amount, targets.filter((a) => a.system?.endurance));
   // Hull damage: a craft directly, or a character's current ship.
   const { applyCraftDamage } = await import("./dice/craft-attack.mjs");
   const { activeShip } = await import("./fleet.mjs");
   const lines = [];
   for (const t of targets) {
      const craft = t.system?.hull ? t : activeShip(t);
      if (!craft) continue;
      const r = await applyCraftDamage(craft, { total: amount });
      lines.push(L("EDRPG.lane.hullTook", { name: esc(craft.name), damage: amount, before: r.hullBefore, after: r.hullAfter }));
   }
   if (lines.length) await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: `<div class="edrpg edrpg-chat edrpg-planet"><p>${lines.join("<br>")}</p></div>` });
}
