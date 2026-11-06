/**
 * Travel (Military) encounters (Military Sourcebook p.59) as event cards.
 *
 * D10 per encounter (10+ is a Spacecraft Sweep); unique events happen once a mission (again, No Event). Fighting a
 * battle during the mission (or travelling) puts the area on Alert, which makes several checks harder; toggle it on
 * the card.
 */
import { EVENT_TABLES, OPPONENT_TABLES } from "./generation-data.mjs";
import { registerKind, postEvent, d } from "./event-cards.mjs";
import { toolLink, opponentFor } from "./encounters.mjs";
import { link } from "./planet.mjs";
import { rollEvents } from "./tools.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

const person = (name, label = name) => toolLink("person", { name }, label, "fa-solid fa-user");

export const TRAVEL_EVENTS = {
   "No Event": { text: "They avoid all attention as they close in." },
   Minefield: {
      tag: "unique",
      checks: [{ lv: "easy", skills: ["perception"], note: "spot it" }, { lv: "easy", skills: ["grenade"], note: "each player crossing on foot" }],
      actions: ["detour"],
      text: "Easy Perception spots it; a failure, and that player takes damage as from a Frag Grenade. Go around (three more Travel rolls) or cross on foot (each player an Easy Grenade check, a failure sets off a mine). Any mine going off puts the base on Alert. Vehicles must go around once it's spotted.",
   },
   "Vehicle Patrol": {
      alertable: true,
      checks: [{ lv: "easy", alert: "average", skills: ["stealth"], note: "on foot: one player ducks into cover" }, { lv: "easy", alert: "average", skills: ["vehiclePiloting"], note: "by vehicle, with a sensor range over 1km: hide the group" }],
      fights: [["military", "vehicle", "easy"], ["military", "personal", "medium", "Medium soldier group (from the transport)", { humansOnly: true }]],
      text: "An Easy group of military vehicles and a Military Transport carrying a Medium group of soldiers. On foot, one Easy Stealth check avoids them; a failure means the Alert and the soldiers attack. In vehicles, someone with sensors over 1km can lead the others into hiding (Easy Vehicle Piloting); otherwise the patrol raises the Alert and chases them. On Alert, these checks are Average.",
   },
   "Foot Patrol": {
      alertable: true,
      checks: [{ lv: "easy", alert: "average", skills: ["stealth"], note: "on foot: hide" }, { lv: "hard", skills: ["bluff"], note: "bluff (+2 on Alert); in vehicles, to pass the wave-down" }],
      fights: [["military", "personal", "easy", "Easy soldier group", { humansOnly: true }]],
      text: "An Easy group of soldiers. In vehicles they wave you down: a Difficult Bluff to pass, or drive past and they raise the Alert. On foot, hide (Easy Stealth, Average on Alert) or bluff (Difficult Bluff, +2 on Alert); a failure means the Alert and a fight.",
   },
   "Checkpoint (unique)": {
      tag: "unique",
      alertable: true,
      checks: [{ lv: "average", skills: ["vehiclePiloting"], note: "jump the barrier (each SRV)" }, { lv: "average", alert: "hard", skills: ["stealth"], note: "on foot: sneak past" }, { lv: "hard", skills: ["bluff"], note: "on foot: bluff (+2 on Alert)" }],
      fights: [["military", "vehicle", "easy", "Easy vehicle battle"], ["military", "personal", "easy", "Easy soldier group", { humansOnly: true }], ["military", "personal", "medium", "Average group (on Alert)", { humansOnly: true }]],
      text: "The only way through is a shielded checkpoint. Attacking the barrier means an Easy vehicle battle. Jumping it: an SRV each and Average Vehicle Piloting; success raises the Alert as they speed off; failure is 25 Damage and an Easy vehicle battle; failing by more than 4 (or a natural 1) impales the SRV, which must be abandoned. On foot: sneak (Average Stealth, Difficult on Alert) or bluff (Difficult Bluff, +2 on Alert); failure is an Easy battle (Average on Alert).",
   },
   "Snipers (unique; only on alert and on foot)": {
      tag: "unique",
      checks: [{ lv: "average", skills: ["stealth", "athletics"], note: "each player escaping after two rounds" }],
      fights: [["military", "personal", "easy", "Easy soldier group (Laser Rifles, in cover)", { humansOnly: true }]],
      text: "Only on Alert and on foot (otherwise nothing). An Easy group of soldiers at 400m, all in cover, with any weapon short of 500m range swapped for a Laser Rifle (re-roll drones and robots). Fight, or after two rounds escape: each player an Average Stealth or Athletics check, or another round under fire.",
   },
   "Spacecraft Sweep": {
      auto: ["sweepShip"],
      checks: [{ lv: "easy", skills: ["stealth"], note: "on foot: hide from it" }],
      fights: [["military", "personal", "hard", "Difficult soldier group (in an APC)", { humansOnly: true }]],
      text: "One spaceship overhead. On foot without an Alert, ignore it. Vehicles are spotted: abandon them and hide, or race at top speed into Heavy Obstacles terrain; after the obstacle check the ship fires on a random player (their Defence +9; a hit does ×4 Damage); then a D10 of 9–10 finds cover and ends the chase (the ship still raises the Alert). On foot: Easy Stealth, or the ship calls the Alert and a Difficult group of soldiers arrives by APC.",
   },
};

const ACTIONS = {
   /** Going around a minefield: three more Travel rolls. */
   async detour(s) {
      await rollTravel({ count: 3, alert: s.alert });
      s.done = true;
   },
};

const AUTOS = {
   async sweepShip(s) {
      // The first ship on the Easy table: re-roll the gaps the book leaves.
      let r = null;
      for (let i = 0; !r && i < 20; i++) r = opponentFor(OPPONENT_TABLES.military.spaceship, s.tier, d(100));
      return L("EDRPG.travel.ship", { ship: r ? link(r) : "—" });
   },
};

registerKind("travel", { events: TRAVEL_EVENTS, actions: ACTIONS, autos: AUTOS, icon: "fa-solid fa-person-hiking" });

/**
 * Roll Travel (Military) encounters and post their cards.
 *
 * @param {object} o  { count, alert }
 */
export async function rollTravel({ count = 1, alert = false } = {}) {
   for (const { roll, row } of rollEvents("travel", 0, count)) {
      if (!row) continue;
      await postEvent("travel", row.name, { roll, die: 10, page: EVENT_TABLES.travel.page, alert });
   }
}
