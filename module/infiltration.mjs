/**
 * Infiltration challenges (Espionage Supplement pp.45–48).
 *
 * - A mission sets a number of challenges (drawn at random, or a named list) and how many the team must complete.
 *   Players split up and take one each; a challenge is complete only if every Skill check in it is passed. A failed
 *   challenge can't be retried: pick another from the list.
 * - Difficulty numbers are the Relative Difficulty Numbers for the party's highest rank (Core Rules p.242). Once the
 *   Alert is raised every check is one step harder (Easy → Average → Hard; Hard +2).
 * - Bribe counts as two successes (and costs the mission's Treasure Income).
 *
 * The tracker is a chat card: anyone can roll the checks for their own character; the GM marks each challenge passed
 * or failed, raises the Alert, and draws more.
 */
import { INFILTRATION, INTERROGATE, RELATIVE_DIFFICULTY } from "./supplement-data.mjs";
import { partyInfo } from "./encounters.mjs";
import { skillLabel } from "./dice/skill-check.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const TEMPLATE = "systems/edrpg/templates/chat/infiltration.hbs";
const ALL = [...INFILTRATION, INTERROGATE];
const byKey = (k) => ALL.find((c) => c.key === k);
const byName = (n) => ALL.find((c) => c.name.toLowerCase().replace(/[’']/g, "'") === n.toLowerCase().replace(/[’']/g, "'"));

/**
 * The difficulty number of a check.
 *
 * @param {string} level  easy | average | hard
 *
 * @param {string} rank
 *
 * @param {boolean} alert
 *
 * @returns {{dn: number, level: string}}
 */
export function checkDn(level, rank, alert = false) {
   const row = RELATIVE_DIFFICULTY[rank] ?? RELATIVE_DIFFICULTY.harmless;
   const i = { easy: 0, average: 1, hard: 2 }[level] ?? 1;
   if (!alert) return { dn: row[i], level };
   if (i === 2) return { dn: row[2] + 2, level: "hard" };
   return { dn: row[i + 1], level: ["average", "hard"][i] };
}

/**
 * Draw random challenges (no repeats; the D100 table, re-rolling ones already drawn).
 *
 * @param {number} count
 *
 * @param {string[]} [exclude]  Keys already in play.
 *
 * @param {Function} [rng]
 *
 * @returns {string[]}  Keys.
 */
export function drawChallenges(count, exclude = [], rng = Math.random) {
   const out = [];
   const taken = new Set(exclude);
   for (let guard = 0; out.length < count && guard < 500; guard++) {
      const d = 1 + Math.floor(rng() * 100);
      const c = INFILTRATION.find((x) => d >= x.range[0] && d <= x.range[1]);
      if (!c || taken.has(c.key)) continue;
      taken.add(c.key);
      out.push(c.key);
   }
   return out;
}

/** Successes so far (Bribe counts two). */
export function successes(state) {
   return state.challenges.filter((c) => c.status === "passed").reduce((n, c) => n + (byKey(c.key)?.counts ?? 1), 0);
}

/**
 * Start a tracker.
 *
 * @param {object} o
 *
 * @param {number} [o.count]   Random challenges to draw.
 *
 * @param {string[]} [o.list]  Named challenges to choose from (instead).
 *
 * @param {number} o.need      How many to complete.
 *
 * @param {boolean} [o.alert]
 *
 * @param {boolean} [o.interrogate]  Add the Interrogate challenge (Determining the Mole).
 *
 * @param {string} [o.title]
 *
 * @returns {Promise<ChatMessage>}
 */
export async function startInfiltration({ count = 0, list = [], need = 1, alert = false, interrogate = false, title = "" } = {}) {
   const { rank } = partyInfo();
   const keys = list.length ? list.map((n) => (byKey(n) ?? byName(n))?.key).filter(Boolean) : drawChallenges(count);
   if (interrogate) keys.push(INTERROGATE.key);
   const state = { title, need, alert, rank, fromList: list.length > 0, challenges: keys.map((key) => ({ key, status: "open", by: "" })) };
   return ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: await render(state), flags: { edrpg: { infiltration: state } } });
}

/** The card's view. */
async function render(state) {
   const view = {
      ...state,
      done: successes(state),
      enough: successes(state) >= state.need,
      title: state.title || L("EDRPG.infil.title"),
      challenges: state.challenges.map((c, index) => {
         const def = byKey(c.key);
         return {
            ...c,
            index,
            name: def.name,
            special: def.special,
            counts: def.counts,
            reward: def.reward,
            penalty: def.penalty,
            cost: def.cost === "treasure",
            doubleSocial: !!def.doubleSocial,
            checks: def.checks.map(([level, skills, note], ci) => {
               const { dn, level: shown } = checkDn(level, state.rank, state.alert);
               return { ci, dn, level: L(`EDRPG.infil.level.${shown}`), note, skills: skills.map((s) => ({ key: s, label: skillLabel(s) })) };
            }),
            open: c.status === "open",
            passed: c.status === "passed",
            failed: c.status === "failed",
         };
      }),
   };
   return foundry.applications.handlebars.renderTemplate(TEMPLATE, view);
}

/** Change the card (GM). */
async function change(message, fn) {
   const state = foundry.utils.deepClone(message.getFlag("edrpg", "infiltration"));
   fn(state);
   await message.update({ content: await render(state), "flags.edrpg.infiltration": state });
}

/**
 * Roll one of a challenge's checks for the user's character.
 *
 * @param {object} state
 *
 * @param {number} index
 *
 * @param {number} ci
 *
 * @param {string} skill
 */
async function rollCheck(state, index, ci, skill) {
   const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
   if (!actor) return void ui.notifications.warn(L("EDRPG.infil.noActor"));
   const def = byKey(state.challenges[index].key);
   const [level] = def.checks[ci];
   const { dn } = checkDn(level, state.rank, state.alert);
   // Invite to Party: double Social Factor (the bonus is added a second time as a modifier).
   const sf = def.doubleSocial ? (actor.system.socialFactor?.value ?? 0) : 0;
   return game.edrpg.rollSkillCheck(actor, skill, { difficulty: dn, modifier: sf, label: `${def.name}: ${skillLabel(skill)}` });
}

/**
 * Chat hook: the tracker's buttons.
 *
 * @param {ChatMessage} message
 *
 * @param {HTMLElement} html
 */
export function onRenderInfiltration(message, html) {
   const state = message.getFlag("edrpg", "infiltration");
   const card = html.querySelector(".edrpg-infiltration");
   if (!state || !card) return;
   const gm = game.user.isGM;
   for (const el of card.querySelectorAll("[data-gm]")) if (!gm) el.remove();
   card.addEventListener("click", async (event) => {
      const b = event.target.closest("[data-infil]");
      if (!b) return;
      event.preventDefault();
      const index = Number(b.dataset.index);
      const act = b.dataset.infil;
      if (act === "roll") return rollCheck(state, index, Number(b.dataset.check), b.dataset.skill);
      if (!gm) return;
      if (act === "pass" || act === "fail" || act === "reopen") {
         const by = canvas?.tokens?.controlled?.[0]?.actor?.name ?? "";
         return change(message, (s) => {
            s.challenges[index].status = act === "reopen" ? "open" : act === "pass" ? "passed" : "failed";
            if (act !== "reopen" && by) s.challenges[index].by = by;
         });
      }
      if (act === "alert") return change(message, (s) => (s.alert = !s.alert));
      if (act === "draw") return change(message, (s) => s.challenges.push(...drawChallenges(1, s.challenges.map((c) => c.key)).map((key) => ({ key, status: "open", by: "" }))));
      if (act === "drawTwo") return change(message, (s) => s.challenges.push(...drawChallenges(2, s.challenges.map((c) => c.key)).map((key) => ({ key, status: "open", by: "" }))));
   });
}

/**
 * The GM's dialog: draw a number of challenges, or pick from the list.
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function openInfiltration() {
   const opts = INFILTRATION.map((c) => `<label class="checkbox"><input type="checkbox" name="c_${c.key}"> ${esc(c.name)}</label>`).join("");
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.infil.title"), icon: "fa-solid fa-user-secret" },
      classes: ["edrpg", "edrpg-dialog", "edrpg-infil-dialog"],
      position: { width: 520 },
      content: `<p class="hint">${L("EDRPG.infil.intro")}</p>
         <div class="form-group"><label>${L("EDRPG.infil.count")}</label><div class="form-fields"><input type="number" name="count" value="6" min="0" max="25" step="1"></div><p class="hint">${L("EDRPG.infil.countHint")}</p></div>
         <div class="form-group"><label>${L("EDRPG.infil.need")}</label><div class="form-fields"><input type="number" name="need" value="3" min="1" step="1"></div></div>
         <div class="form-group"><label>${L("EDRPG.infil.alert")}</label><div class="form-fields"><input type="checkbox" name="alert"></div></div>
         <details><summary>${L("EDRPG.infil.pick")}</summary><div class="ed-infil-pick">${opts}</div></details>`,
      ok: { label: "EDRPG.infil.start", icon: "fa-solid fa-user-secret" },
      rejectClose: false,
   });
   if (!input) return null;
   const list = INFILTRATION.filter((c) => input[`c_${c.key}`]).map((c) => c.name);
   return startInfiltration({ count: Number(input.count) || 0, list, need: Number(input.need) || 1, alert: !!input.alert });
}
