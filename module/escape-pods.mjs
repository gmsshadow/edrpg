/**
 * Abandoning ship and escape pods (Core Rules p.70), and scooping things up (p.267).
 *
 * Abandon Ship: instead of its combat action, a ship's crew can pile into escape pods and eject, safely while it has at
 * least 1 Hull. There are only pods for its listed crew: anyone beyond that is left behind. Each pod is a tiny craft
 * without a Frame Shift Drive: Defence and Pursuit 8, 1 Hull. It heads for the nearest spaceport or habitable planet,
 * or parks near the star and sends a distress beacon. The empty ship drifts on.
 *
 * Scooping up cargo canisters, escape pods and other small items through the cargo hatch is automatic unless under time
 * pressure (combat, a dying ally): then a Difficulty 8 Spaceship Piloting check; on a failure the ship and the item
 * each take 5 Damage, often enough to destroy the item.
 */
import { judge } from "./dice/resolve.mjs";
import { applyCraftDamage } from "./dice/craft-attack.mjs";

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** An escape pod's stat block. */
export const POD = { defence: 8, pursuit: 8, hull: 1 };

/** Scooping under pressure: Spaceship Piloting against this, 5 Damage to both on a failure. */
export const SCOOP_DN = 8;
export const SCOOP_DAMAGE = 5;

/** Is this actor an escape pod? */
export const isPod = (actor) => !!actor?.getFlag?.("edrpg", "escapePod");

/**
 * Who gets a pod: the named crew aboard (pilot first), then unnamed others, up to the listed crew.
 *
 * @param {Actor} ship
 *
 * @returns {{named: Actor[], unnamed: number, left: number, pods: number}}
 */
export function podPlan(ship) {
   const sys = ship.system;
   const crew = sys.crew;
   const capacity = Math.max(1, sys.crewSize ?? 1);
   const people = [sys.pilot, ...crew.people.filter((u) => u !== sys.pilot)].filter(Boolean).map((u) => fromUuidSync(u)).filter(Boolean);
   // A GM ship (stat block) has no tracked crew: its listed crew all get away.
   const total = sys.npc?.enabled ? capacity : people.length + (sys.crewing?.others ?? 0);
   const named = people.slice(0, capacity);
   const unnamed = Math.max(0, Math.min(total, capacity) - named.length);
   return { named, unnamed, left: Math.max(0, total - capacity), pods: named.length + unnamed };
}

/** The Abandon Ship action's checks and confirmation (on the player's client). */
export async function confirmAbandon(ship) {
   if (ship.system.hull.value < 1) return void ui.notifications.warn(L("EDRPG.pod.tooLate", { name: ship.name }));
   const plan = podPlan(ship);
   const names = [...plan.named.map((a) => esc(a.name)), ...(plan.unnamed ? [L("EDRPG.pod.others", { n: plan.unnamed })] : [])].join(", ");
   return foundry.applications.api.DialogV2.confirm({
      window: { title: L("EDRPG.vcombat.action.abandon"), icon: "fa-solid fa-person-through-window" },
      content: `<p>${L("EDRPG.pod.confirm", { name: esc(ship.name), pods: plan.pods, who: names || "—" })}</p>${plan.left ? `<p class="ed-between-warn">${L("EDRPG.pod.leftBehind", { n: plan.left })}</p>` : ""}`,
      rejectClose: false,
   });
}

/**
 * Eject: one pod actor (and token beside the ship, and combatant) per person who gets away; the ship is left empty.
 * Runs on the GM's client (it creates actors).
 *
 * @param {Actor} ship
 *
 * @returns {Promise<string[]>}  Notes for the chat card.
 */
export async function performAbandon(ship) {
   const plan = podPlan(ship);
   const notes = [];
   const folder = await podFolder();
   const pods = [];
   const make = async (person, n) => {
      const name = person ? L("EDRPG.pod.name", { name: person.name }) : L("EDRPG.pod.nameN", { ship: ship.name, n });
      const actor = await Actor.create({
         name,
         type: "ship",
         img: "icons/svg/target.svg",
         folder: folder?.id ?? null,
         prototypeToken: { name, actorLink: true, disposition: ship.prototypeToken?.disposition ?? 0, width: 0.5, height: 0.5 },
         system: {
            category: "tiny",
            crewSize: 1,
            hull: { value: POD.hull, max: POD.hull },
            shields: { value: 0, max: 0, recharge: 0, down: false },
            agility: 0,
            speed: 0,
            zone: ship.system.zone,
            pilot: person?.uuid ?? "",
            npc: { enabled: true, defence: POD.defence, dogfighting: POD.defence, pursuit: POD.pursuit, initiative: 0, critical: 0 },
            description: `<p>${L("EDRPG.pod.description")}</p>`,
         },
         flags: { edrpg: { escapePod: { from: ship.uuid, person: person?.uuid ?? "" } } },
      });
      if (actor) pods.push(actor);
   };
   for (const person of plan.named) await make(person);
   for (let i = 1; i <= plan.unnamed; i++) await make(null, i);

   // Tokens beside the ship's, and into the fight.
   const scene = canvas?.scene;
   const mother = ship.getActiveTokens?.()[0]?.document;
   const combat = game.combat;
   if (scene && mother) {
      const grid = scene.grid.size;
      const data = [];
      for (const [i, pod] of pods.entries()) {
         const t = await pod.getTokenDocument({ x: mother.x + mother.width * grid + (i % 3) * grid * 0.5, y: mother.y + Math.floor(i / 3) * grid * 0.5, actorLink: true });
         data.push(t.toObject());
      }
      const tokens = data.length ? await scene.createEmbeddedDocuments("Token", data) : [];
      if (combat && tokens.length) await combat.createEmbeddedDocuments("Combatant", tokens.map((t) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 0 })));
   }
   // The empty ship: no crew, out of the fight (its combatant defeated), still there to be shot or salvaged.
   const gunned = (ship.itemTypes?.craftWeapon ?? []).filter((w) => w.system.gunner);
   if (gunned.length) await ship.updateEmbeddedDocuments("Item", gunned.map((w) => ({ _id: w.id, "system.gunner": "" })));
   await ship.update({
      "system.abandoned": true,
      "system.pilot": "",
      "system.crewing": { sensors: "", power: "", repairs: "", others: 0 },
      "system.combat.fleeing": false,
      "system.combat.disengaging": false,
   });
   const combatant = combat?.combatants.find((c) => c.actor?.uuid === ship.uuid);
   if (combatant && !combatant.defeated) await combatant.update({ defeated: true });
   notes.push(L("EDRPG.pod.ejected", { name: esc(ship.name), n: pods.length }));
   if (pods.length) notes.push(L("EDRPG.pod.stats", { defence: POD.defence, pursuit: POD.pursuit, hull: POD.hull }));
   if (plan.left) notes.push(L("EDRPG.pod.leftBehind", { n: plan.left }));
   return notes;
}

async function podFolder() {
   const name = L("EDRPG.pod.folder");
   return game.folders?.find((f) => f.type === "Actor" && f.name === name) ?? (await Folder.create({ name, type: "Actor" }));
}

/** Escape pods and other craft on the scene that could be scooped up. */
export function scoopables(ship) {
   const seen = new Set();
   return (canvas?.scene?.tokens ?? [])
      .map((t) => t.actor)
      .filter((a) => a && a !== ship && isPod(a) && a.system.hull.value > 0 && !seen.has(a.uuid) && seen.add(a.uuid));
}

/**
 * The scoop: automatic without time pressure; otherwise Spaceship Piloting against 8.
 *
 * @param {Actor} ship
 *
 * @param {object} o  { what: "cargo"|"pod"|"other", podUuid, pressure }
 *
 * @returns {Promise<{success: boolean, total?: number, roll?: Roll}>}
 */
export async function rollScoop(ship, { pressure }) {
   if (!pressure) return { success: true };
   const bonus = ship.system.piloting ?? 0;
   const roll = await new Roll("1d10 + @bonus", { bonus }).evaluate();
   const natural = roll.dice[0].total;
   const { outcome } = judge({ natural, total: roll.total, dn: SCOOP_DN });
   return { success: outcome === "success" || outcome === "critSuccess", natural, bonus, total: roll.total, roll };
}

/**
 * Apply a scoop's result (GM, or whoever owns everything involved): 5 Damage to both on a failure; a pod scooped up
 * is taken aboard (its token leaves the scene).
 *
 * @returns {Promise<string[]>}  Notes.
 */
export async function applyScoop({ shipUuid, podUuid, success, label }) {
   const ship = await fromUuid(shipUuid);
   const pod = podUuid ? await fromUuid(podUuid) : null;
   const notes = [];
   const name = esc(pod?.name ?? label);
   if (success) {
      notes.push(L("EDRPG.scoop.got", { ship: esc(ship.name), what: name }));
      if (pod) {
         await pod.setFlag("edrpg", "escapePod.rescuedBy", ship.uuid);
         const tokens = pod.getActiveTokens?.() ?? [];
         if (tokens.length && canvas?.scene) await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map((t) => t.document?.id ?? t.id));
         const ids = (game.combat?.combatants ?? []).filter((c) => c.actor?.uuid === pod.uuid).map((c) => c.id);
         if (ids.length) await game.combat.deleteEmbeddedDocuments("Combatant", ids);
         notes.push(L("EDRPG.scoop.podAboard", { what: name }));
      }
      return notes;
   }
   const hit = await applyCraftDamage(ship, { total: SCOOP_DAMAGE });
   notes.push(L("EDRPG.scoop.failed", { ship: esc(ship.name), what: name, damage: SCOOP_DAMAGE, shields: hit.toShields ?? 0, hull: hit.toHull ?? 0 }));
   if (pod) {
      const podHit = await applyCraftDamage(pod, { total: SCOOP_DAMAGE });
      notes.push(L(podHit.destroyed ? "EDRPG.scoop.podDestroyed" : "EDRPG.scoop.podHit", { what: name }));
   } else notes.push(L("EDRPG.scoop.itemHit", { what: name, damage: SCOOP_DAMAGE }));
   return notes;
}

/** The scoop dialog (on the ship owner's client). */
export async function chooseScoop(ship) {
   const pods = scoopables(ship);
   const inFight = !!game.combat?.started && game.combat.combatants.some((c) => c.actor?.uuid === ship.uuid);
   const options = [
      `<option value="cargo">${L("EDRPG.scoop.cargo")}</option>`,
      ...pods.map((p) => `<option value="${p.uuid}">${esc(p.name)}</option>`),
      `<option value="other">${L("EDRPG.scoop.other")}</option>`,
   ].join("");
   const res = await foundry.applications.api.DialogV2.input({
      window: { title: L("EDRPG.scoop.title"), icon: "fa-solid fa-box-open" },
      classes: ["edrpg", "edrpg-dialog"],
      content: `<div class="form-group"><label>${L("EDRPG.scoop.what")}</label><div class="form-fields"><select name="what">${options}</select></div></div>
         <div class="form-group"><label>${L("EDRPG.scoop.pressure")}</label><div class="form-fields"><input type="checkbox" name="pressure" ${inFight ? "checked" : ""}></div><p class="hint">${L("EDRPG.scoop.pressureHint", { dn: SCOOP_DN, damage: SCOOP_DAMAGE })}</p></div>`,
      rejectClose: false,
   });
   if (!res) return null;
   const pod = pods.find((p) => p.uuid === res.what) ?? null;
   const label = pod ? pod.name : L(res.what === "other" ? "EDRPG.scoop.otherShort" : "EDRPG.scoop.cargoShort");
   return { podUuid: pod?.uuid ?? null, label, pressure: !!res.pressure };
}
