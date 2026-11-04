/**
 * Employing Crew (Core Rules pp.260–263).
 *
 * - Names: D100 for a first name and a second name. 91–00 on either is a title (first-name table) or a nickname
 *   (second-name table): keep it and roll again on the same table, ignoring 91 or higher. At most one of each.
 * - Statistics: a D10 for each of Spaceship Piloting, Spaceship Weapons, Systems, Repair, Combat Skill and Morality on
 *   the Crew Skill Table. Allegiance is only rolled for Principled crew. Salary: a D10 plus one for each other score of
 *   4 or more (the table's asterisks), at most 10, paid at the start of each Between Adventures phase.
 * - Combat Skill is the crew member's Energy Weapons, Fighting and Dodge bonus. Endurance 20. Each starts with a
 *   laser pistol, a flight suit and a Remlok.
 * - Hiring in a hurry takes them as rolled; interviewing (instead of a Between Adventures roll) shows up to six and
 *   the player picks.
 *
 * Crew are created as opponent (stat block) actors in a "Crew" folder, so they can be put in a ship's pilot or gunner
 * seat, and remember who employs them (flags.edrpg.crew).
 */
import { die } from "./starsystem.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cr = (n) => `${Math.round(n).toLocaleString()}cr`;

const FIRST = ["Abe", "Addison", "Al", "Algernon", "Baxter", "Barry", "Bill", "Carl", "Chad", "Chuck", "Dave", "Daniel", "Ed", "Elton", "Fletcher", "Fred", "Gerald", "Greg", "Harry", "Hugh", "Ike", "Jack", "Jim", "Kevin", "Lance", "Lionel", "Magnus", "Mark", "Max", "Neil", "Neville", "Orson", "Pete", "Phil", "Randy", "Ray", "Rich", "Scott", "Steve", "Spike", "Terry", "Vince", "Wayne", "Will", "Zach", "Abbey", "Alexandra", "Amy", "Barbra", "Becca", "Bridget", "Carol", "Cass", "Clara", "Debs", "Diana", "Ellie", "Emma", "Fanny", "Flo", "Gill", "Gwen", "Hayley", "Holly", "Iris", "Izzy", "Jade", "Jenny", "Jessica", "Kate", "Kim", "Kitty", "Laura", "Linda", "Lucy", "Mel", "Molly", "Nancy", "Pam", "Peggy", "Rachel", "Rose", "Ruby", "Sally", "Sharon", "Tara", "Trudy", "Unity", "Verity", "Yasmin"];
const TITLES = ["Old", "The Right Hon.", "The Amazing", "Stuttering", "Lying", "The Inexcusable", "One-eyed", "Angry", "Lady", "Limping"];
const SECOND = ["Abbott", "Ackerman", "Anderson", "Archer", "Banks", "Baxter", "Bishop", "Brewer", "Clark", "Clinton", "Cox", "Daniels", "De'Ath", "Dixon", "Edwards", "English", "Fisher", "Fletcher", "Foster", "Fry", "Gabriel", "Goddard", "Gore", "Green", "Hackett", "Hampton", "Harper", "Henderson", "Honeycutt", "Hopkins", "Hunter", "Ingram", "Irwin", "Jacobs", "Jameson", "Jeffers", "Jervis", "Jones", "Keighley", "Kellogg", "King", "Lee", "Leighton", "Lockwood", "Lucas", "Mallory", "Marshall", "Martell", "May", "Merchant", "Miller", "Monday", "Morris", "Myres", "Nash", "Nelson", "Norman", "Osbourne", "Outlaw", "Palmer", "Paris", "Patton", "Payne", "Perkins", "Pierce", "Pond", "Quick", "Quincy", "Rake", "Randall", "Reynolds", "Rider", "Sanders", "Savage", "Sergeant", "Skinner", "Southgate", "Spencer", "Stone", "Stroud", "Taylor", "Thorn", "Trask", "Trueman", "Vernon", "Wade", "Walker", "Ward", "York", "Young"];
const NICKNAMES = ["Skullcracker", "Switchknife", "Hotcakes", "Wilderbeast", "EmoGoth", "Ace", "Terminator", "Tabletop", "Deathmetal", "Mutley"];

/** Crew Skill Table by D10 (1–10): piloting, weapons, systems, repair, combat, morality, allegiance, salary. */
const TABLE = [
   null,
   [1, 1, 2, 2, 1, "none", "", 500],
   [2, 2, 2, 3, 1, "none", "", 1000],
   [2, 2, 3, 3, 1, "none", "", 1500],
   [2, 2, 3, 3, 2, "indifferent", "", 2000],
   [3, 3, 3, 4, 2, "indifferent", "empire", 2500],
   [3, 3, 4, 4, 2, "indifferent", "empire", 3000],
   [3, 4, 4, 4, 3, "indifferent", "federation", 4000],
   [4, 4, 4, 5, 3, "principled", "federation", 5000],
   [4, 5, 5, 5, 4, "principled", "federation", 7500],
   [5, 6, 5, 6, 5, "principled", "alliance", 10000],
];
const STATS = ["shipPiloting", "shipWeapons", "systems", "repair", "combat"];

/**
 * A name from the Random Crew Name Generator.
 *
 * @returns {{name: string, title: string, nickname: string, first: string, last: string}}
 */
export function crewName(rng) {
   const roll = (names, extras) => {
      let extra = "";
      let r = die(100, rng);
      if (r >= 91) {
         extra = extras[r - 91];
         // Roll again on the same table, ignoring 91 or higher.
         do r = die(100, rng);
         while (r >= 91);
      }
      return { name: names[r - 1], extra };
   };
   const f = roll(FIRST, TITLES);
   const s = roll(SECOND, NICKNAMES);
   const name = [f.extra, f.name, s.extra ? `'${s.extra}'` : "", s.name].filter(Boolean).join(" ");
   return { name, title: f.extra, nickname: s.extra, first: f.name, last: s.name };
}

/**
 * Roll a crew member's statistics.
 *
 * @returns {{shipPiloting: number, shipWeapons: number, systems: number, repair: number, combat: number, morality: string, allegiance: string, salary: number}}
 */
export function crewStats(rng) {
   const out = {};
   STATS.forEach((k, i) => (out[k] = TABLE[die(10, rng)][i]));
   out.morality = TABLE[die(10, rng)][5];
   // Allegiance only matters to Principled crew.
   out.allegiance = out.morality === "principled" ? TABLE[die(10, rng)][6] || "none" : "";
   const stars = STATS.filter((k) => out[k] >= 4).length;
   out.salary = TABLE[Math.min(10, die(10, rng) + stars)][7];
   return out;
}

/** A whole candidate. */
export function rollCrew(rng) {
   return { ...crewName(rng), ...crewStats(rng) };
}

/**
 * The crew employed by a character.
 *
 * @param {Actor} actor
 *
 * @returns {Actor[]}
 */
export function crewOf(actor) {
   return game.actors?.filter((a) => a.getFlag?.("edrpg", "crew")?.employer === actor.uuid) ?? [];
}

/** A compendium item copied by name, if the system has it. */
async function itemNamed(packId, re) {
   const pack = game.packs.get(`edrpg.${packId}`);
   const hit = (await pack?.getIndex())?.find((e) => re.test(e.name));
   if (!hit) return null;
   const doc = await pack.getDocument(hit._id);
   return doc?.toObject();
}

/**
 * Create a crew member as an opponent actor (Crew folder), employed by a character.
 *
 * @param {object} c          rollCrew()
 *
 * @param {Actor} [employer]
 *
 * @returns {Promise<Actor>}
 */
export async function createCrewActor(c, employer = null) {
   let folder = game.folders.find((f) => f.type === "Actor" && f.name === L("EDRPG.crew.folder"));
   folder ??= await Folder.implementation.create({ name: L("EDRPG.crew.folder"), type: "Actor" });
   const items = (await Promise.all([itemNamed("weapons", /^laser pistol$/i), itemNamed("clothing", /^flight suit$/i), itemNamed("gear", /^remlok/i)])).filter(Boolean);
   for (const i of items) {
      delete i._id;
      if (i.system?.equipped !== undefined) i.system.equipped = true;
      if (i.system?.worn !== undefined) i.system.worn = true;
   }
   const notes = `<p>${L("EDRPG.crew.notes", {
      morality: L(`EDRPG.crew.morality.${c.morality}`),
      allegiance: c.allegiance ? L(`EDRPG.crew.allegiance.${c.allegiance}`) : "—",
      salary: cr(c.salary),
   })}</p><p>${L(`EDRPG.crew.moralityHint.${c.morality}`)}</p>`;
   const data = {
      name: c.name,
      type: "opponent",
      img: "icons/svg/mystery-man.svg",
      folder: folder.id,
      system: {
         role: L("EDRPG.crew.role"),
         dodge: c.combat,
         parry: null,
         initiative: 1,
         perception: 1,
         toHit: c.combat,
         endurance: { value: 20, max: 20 },
         otherSkills: [
            { skill: "shipPiloting", bonus: c.shipPiloting },
            { skill: "shipWeapons", bonus: c.shipWeapons },
            { skill: "systems", bonus: c.systems },
            { skill: "repair", bonus: c.repair },
            { skill: "energyWeapons", bonus: c.combat },
            { skill: "fighting", bonus: c.combat },
         ],
         equipment: L("EDRPG.crew.equipment"),
         notes,
      },
      items,
      flags: { edrpg: { crew: { employer: employer?.uuid ?? "", salary: c.salary, morality: c.morality, allegiance: c.allegiance, stats: STATS.map((k) => c[k]) } } },
   };
   if (employer) {
      // The employing players own their crew.
      data.ownership = { default: 0 };
      for (const u of game.users) if (!u.isGM && employer.testUserPermission(u, "OWNER")) data.ownership[u.id] = 3;
   }
   return Actor.implementation.create(data);
}

/**
 * Hire crew: in a hurry (take them as rolled) or by interviewing up to six and picking.
 *
 * @param {Actor} [employer]  A character.
 *
 * @returns {Promise<Actor[]>}
 */
export async function openHireCrew(employer = null) {
   const row = (label, field, hint = "") => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const first = await foundry.applications.api.DialogV2.input({
      window: { title: employer ? L("EDRPG.crew.titleFor", { name: employer.name }) : L("EDRPG.crew.title"), icon: "fa-solid fa-user-astronaut" },
      classes: ["edrpg", "edrpg-dialog"],
      content:
         `<p class="hint">${L("EDRPG.crew.intro")}</p>` +
         row(L("EDRPG.crew.how"), `<select name="how"><option value="hurry">${L("EDRPG.crew.hurry")}</option><option value="interview">${L("EDRPG.crew.interview")}</option></select>`, L("EDRPG.crew.howHint")) +
         row(L("EDRPG.crew.count"), `<input type="number" name="count" value="1" min="1" max="6" step="1">`),
      ok: { label: "EDRPG.crew.rollButton", icon: "fa-solid fa-dice-d10" },
      rejectClose: false,
   });
   if (!first) return [];
   const count = Math.clamp(Number(first.count) || 1, 1, 6);
   const candidates = Array.from({ length: count }, () => rollCrew());
   let hired = candidates;
   if (first.how === "interview") {
      const line = (c, i) => `<label class="ed-crew-candidate"><input type="checkbox" name="c${i}">
         <span><b>${esc(c.name)}</b> — ${L("EDRPG.crew.statLine", { pilot: c.shipPiloting, weapons: c.shipWeapons, systems: c.systems, repair: c.repair, combat: c.combat })}<br>
         <span class="muted">${L(`EDRPG.crew.morality.${c.morality}`)}${c.allegiance ? ` · ${L(`EDRPG.crew.allegiance.${c.allegiance}`)}` : ""} · ${cr(c.salary)}</span></span></label>`;
      const pick = await foundry.applications.api.DialogV2.input({
         window: { title: L("EDRPG.crew.candidates"), icon: "fa-solid fa-user-astronaut" },
         classes: ["edrpg", "edrpg-dialog", "edrpg-crew"],
         position: { width: 480 },
         content: `<p class="hint">${L("EDRPG.crew.pickHint")}</p><div class="ed-crew-list">${candidates.map(line).join("")}</div>`,
         ok: { label: "EDRPG.crew.hireButton", icon: "fa-solid fa-handshake" },
         rejectClose: false,
      });
      if (!pick) return [];
      hired = candidates.filter((_, i) => pick[`c${i}`]);
   }
   const actors = [];
   for (const c of hired) actors.push(await createCrewActor(c, employer));
   if (actors.length) {
      await ChatMessage.create({
         speaker: employer ? ChatMessage.getSpeaker({ actor: employer }) : ChatMessage.getSpeaker(),
         content: `<div class="edrpg edrpg-chat edrpg-crew-card"><h3><i class="fa-solid fa-user-astronaut"></i> ${L("EDRPG.crew.hired", { count: actors.length })}</h3><ul>${hired
            .map((c, i) => `<li>@UUID[${actors[i].uuid}]{${esc(c.name)}} — ${L("EDRPG.crew.statLine", { pilot: c.shipPiloting, weapons: c.shipWeapons, systems: c.systems, repair: c.repair, combat: c.combat })}, ${L(`EDRPG.crew.morality.${c.morality}`)}, ${cr(c.salary)}</li>`)
            .join("")}</ul><p class="hint">${L("EDRPG.crew.wagesNote")}</p></div>`,
      });
   }
   return actors;
}
