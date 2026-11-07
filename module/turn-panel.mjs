/**
 * The vehicle and spaceship turn panel: when a craft's turn starts, the GM and the craft's owners get a window that
 * walks through the turn in the book's order (Core Rules p.64 ships, p.72 vehicles), one confirmed step at a time:
 *
 *   Vehicles: Adjust Speed → Equipment → Recharge Shields → Check for Obstacles (GM) → Combat Action → End Turn
 *   Ships:    Equipment → Recharge Shields → Combat Action → End Turn
 *
 * Progress is kept on the craft (flags.edrpg.turn), so everyone's panel shows the same step. The sheet's buttons still
 * work alongside it. The world setting "vehicleTurnPanel" turns it off.
 */
import { safeRounds } from "./silent-running.mjs";
import {
   panelEnabled,
   turnSteps,
   turnState,
   markStep,
   endVehicleTurn,
   rechargeShields,
   setVehicleSpeed,
   equipmentAction,
   checkObstacles,
   rollPilotCheck,
   vehicleAction,
   actionsFor,
   ACTION_ICONS,
   TARGETED_ACTIONS,
   targetCandidates,
   actionBlocked,
   actionTargetBlocked,
   startVehicleTurn,
} from "./vehicle-combat.mjs";
import { isCraft } from "./data/vehicle.mjs";
import { zoneOf } from "./zones.mjs";
import { scaleOf, effectiveZone } from "./combined.mjs";
import { defenceOf } from "./dice/attack.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

export class VehicleTurnPanel extends HandlebarsApplicationMixin(ApplicationV2) {
   /** The one panel on this client. */
   static instance = null;

   /** The craft whose turn this is. */
   actor = null;

   /** A step being run, so its buttons don't fire twice. */
   #busy = false;

   /** The target chosen in the Combat Action step (this client only). */
   targetUuid = null;

   /** Which combat turn the panel is showing. */
   turnKey = "";

   /** @override */
   static DEFAULT_OPTIONS = {
      id: "edrpg-turn-panel",
      classes: ["edrpg", "edrpg-turn-panel"],
      window: { title: "EDRPG.turn.title", icon: "fa-solid fa-shuttle-space", resizable: true },
      position: { width: 360, height: "auto", top: 80 },
      actions: {
         speed: VehicleTurnPanel.#onSpeed,
         confirm: VehicleTurnPanel.#onConfirm,
         equip: VehicleTurnPanel.#onEquip,
         recharge: VehicleTurnPanel.#onRecharge,
         obstacles: VehicleTurnPanel.#onObstacles,
         noObstacles: VehicleTurnPanel.#onNoObstacles,
         pilotCheck: VehicleTurnPanel.#onPilotCheck,
         action: VehicleTurnPanel.#onAction,
         selectTarget: VehicleTurnPanel.#onSelectTarget,
         skipAction: VehicleTurnPanel.#onSkipAction,
         endTurn: VehicleTurnPanel.#onEndTurn,
         openSheet: VehicleTurnPanel.#onOpenSheet,
         startTurn: VehicleTurnPanel.#onStartTurn,
      },
   };

   /** @override */
   static PARTS = {
      panel: { template: "systems/edrpg/templates/vehicle/turn-panel.hbs" },
   };

   /**
    * Open (or move) the panel to a craft, or close it when there's nothing for this user.
    *
    * @param {Actor|null} actor
    */
   static async show(actor) {
      const wanted = actor && isCraft(actor) && panelEnabled() && (game.user.isGM || actor.isOwner);
      const panel = VehicleTurnPanel.instance;
      if (!wanted) {
         if (panel?.rendered) await panel.close();
         return;
      }
      if (!panel) {
         VehicleTurnPanel.instance = new VehicleTurnPanel();
      }
      const p = VehicleTurnPanel.instance;
      if (p.actor?.uuid !== actor.uuid || p.turnKey !== `${game.combat?.id}.${game.combat?.round}.${game.combat?.turn}`) p.targetUuid = null;
      p.turnKey = `${game.combat?.id}.${game.combat?.round}.${game.combat?.turn}`;
      p.actor = actor;
      // Open the panel left of the sidebar.
      const left = Math.max(10, (window.innerWidth ?? 1200) - 360 - 320);
      await p.render({ force: true, position: p.rendered ? undefined : { left } });
   }

   /** Re-render if this actor is the panel's. */
   static refresh(actor) {
      const p = VehicleTurnPanel.instance;
      if (p?.rendered && p.actor && actor && (p.actor === actor || p.actor.uuid === actor.uuid)) {
         p.actor = actor;
         p.render();
      }
   }

   /** @override */
   get title() {
      return this.actor ? L("EDRPG.turn.titleFor", { name: this.actor.name }) : L("EDRPG.turn.title");
   }

   /** @override */
   async _prepareContext(options) {
      const actor = this.actor;
      const sys = actor.system;
      const combat = game.combat;
      const t = turnState(actor, combat);
      const c = sys.combat ?? {};
      const canAct = actor.isOwner;
      const zone = zoneOf(actor);
      const base = {
         actor,
         img: actor.img,
         canAct,
         isGM: game.user.isGM,
         isShip: !!sys.isShip,
         zone: L(`EDRPG.craft.zone.${zone}`),
         speed: sys.speed,
         hull: `${sys.hull.value}/${sys.hull.max}`,
         shields: sys.shields.max ? `${sys.shields.value}/${sys.shields.max}${sys.shields.down ? ` (${L("EDRPG.turn.down")})` : ""}` : "—",
         round: combat?.round ?? 0,
         isCurrent: combat?.combatant?.actor?.uuid === actor.uuid,
      };
      if (c.escaped || sys.destroyed) return { ...base, out: L(c.escaped ? "EDRPG.turn.escaped" : "EDRPG.turn.destroyed", { name: actor.name }) };
      if (!t) return { ...base, waiting: true };

      // Steps that don't apply right now.
      const skipObstacle = t.obstacle === "skip" || sys.flying || sys.speed < 1;
      const done = {
         speed: !!t.speed,
         equipment: !!t.equipment,
         recharge: !!t.recharge,
         obstacle: t.obstacle === "done" || skipObstacle,
         action: !!t.action || !!c.action,
      };
      const keys = turnSteps(actor);
      const current = keys.find((k) => !done[k]) ?? null;
      const steps = keys.map((key, i) => {
         const status = key === current ? "current" : done[key] ? (key === "obstacle" && skipObstacle ? "skipped" : "done") : "pending";
         return { key, n: i + 1, label: L(`EDRPG.turn.step.${key}`), status, current: key === current, done: status === "done" || status === "skipped", ...this.#stepView(key, { actor, sys, c, t, zone, skipObstacle }) };
      });
      return { ...base, notes: t.notes ?? [], steps, allDone: !current };
   }

   /**
    * What a step shows.
    *
    * @returns {object}
    */
   #stepView(key, { actor, sys, c, t, zone, skipObstacle }) {
      switch (key) {
         case "speed": {
            const range = sys.speedRange;
            const min = range?.min ?? sys.speed;
            const max = range?.max ?? sys.speed;
            const row = (n) => sys.speedTable?.[n - 1] ?? { defence: 0, attack: 0 };
            return {
               summary: L("EDRPG.turn.speedSummary", { speed: sys.speed }),
               speeds: Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => {
                  const n = min + i;
                  const r = row(n);
                  return { n, current: n === sys.speed, hint: n ? L("EDRPG.turn.speedHint", { defence: r.defence, attack: r.attack }) : L("EDRPG.turn.stopHint") };
               }),
               rangeText: range ? L("EDRPG.turn.speedRange", { min, max, start: c.turnSpeed ?? sys.speed }) : "",
            };
         }
         case "equipment": {
            if (!sys.isShip) return { summary: L("EDRPG.turn.noEquipment"), none: true };
            const eq = sys.equipment;
            const opts = [];
            if (eq.chaff.max > 0) opts.push({ which: "chaff", icon: "fa-solid fa-cloud", label: L("EDRPG.equip.chaff"), info: `${eq.chaff.value}/${eq.chaff.max}`, active: c.chaff, disabled: c.chaff || eq.chaff.value < 1 });
            if (eq.mines.max > 0) opts.push({ which: "mines", icon: "fa-solid fa-burst", label: L("EDRPG.equip.mines"), info: `${eq.mines.value}/${eq.mines.max}`, active: c.mines, disabled: c.mines || eq.mines.value < 1 });
            if (eq.cellBanks.length) {
               const running = c.cellBank?.index >= 0 && c.cellBank.rounds > 0;
               const uses = eq.cellBanks.reduce((n, b) => n + b.uses, 0);
               opts.push({ which: "cellBank", icon: "fa-solid fa-battery-full", label: L("EDRPG.equip.cellBank"), info: running ? L("EDRPG.turn.bankRunning", { rounds: c.cellBank.rounds }) : L("EDRPG.turn.uses", { uses }), active: running, disabled: running || uses < 1 });
            }
            const silent = c.silent ?? {};
            opts.push({ which: "silent", icon: "fa-solid fa-eye-slash", label: L(silent.active ? "EDRPG.silent.stop" : "EDRPG.silent.start"), info: silent.active ? L("EDRPG.silent.chip", { rounds: silent.rounds ?? 0, safe: safeRounds(sys) }) : "", active: !!silent.active, disabled: false });
            if (eq.heatSinks?.max > 0) opts.push({ which: "heatSink", icon: "fa-solid fa-temperature-low", label: L("EDRPG.silent.heatSink"), info: `${eq.heatSinks.value}/${eq.heatSinks.max}`, active: c.heatSink, disabled: c.heatSink || eq.heatSinks.value < 1 });
            opts.push({ which: "scan", icon: "fa-solid fa-satellite-dish", label: L("EDRPG.silent.scan"), info: "", active: false, disabled: false });
            if (eq.floating) {
               const list = ["engines", "weapons", "shields"].filter((k) => c.floating?.[k]).map((k) => L(`EDRPG.equip.floating.${k}`)).join(", ");
               opts.push({ which: "floating", icon: "fa-solid fa-sliders", label: L("EDRPG.equip.floatingTitle"), info: list || L("EDRPG.equip.none"), active: !!list, disabled: false });
            }
            if ((sys.hangar ?? []).some((h) => !h.launched)) opts.push({ which: "launch", icon: "fa-solid fa-plane-departure", label: L("EDRPG.hangar.launch"), info: "", disabled: false });
            if (t.equipment) {
               // Done: what's running this turn.
               const used = opts.filter((o) => o.active).map((o) => (o.which === "floating" ? `${o.label}: ${o.info}` : o.label));
               return { summary: used.length ? used.join(", ") : L("EDRPG.turn.noneUsed") };
            }
            return { equipment: opts, summary: opts.length ? L("EDRPG.turn.equipmentHint") : L("EDRPG.turn.noEquipment"), none: !opts.length };
         }
         case "recharge": {
            if (t.recharge) return { summary: (t.rechargeNotes ?? []).join(" ") || L("EDRPG.turn.rechargeDone") };
            const sh = sys.shields;
            if (!sh.max) return { summary: L("EDRPG.turn.noShields"), noShields: true };
            if (sys.isShip && (sys.damaged?.powerDistributor || sys.damaged?.shieldGenerator)) return { summary: L("EDRPG.ship.noRecharge") };
            const rate = sys.isShip ? sys.rechargeNow : sh.recharge;
            const parts = [L("EDRPG.turn.rateBase", { n: sh.recharge })];
            if (sys.isShip && c.floating?.shields) parts.push(L("EDRPG.turn.rateFloating"));
            const bank = sys.isShip ? sys.equipment.cellBanks[c.cellBank?.index ?? -1] : null;
            if (bank && c.cellBank.rounds > 0 && rate > sh.recharge + (c.floating?.shields ? 5 : 0)) parts.push(L("EDRPG.turn.rateBank", { name: bank.name, n: bank.boost }));
            const after = Math.min(sh.max, sh.value + rate);
            return {
               summary: sh.down
                  ? L("EDRPG.turn.rechargeDown", { value: sh.value, after, need: sh.halfway, rate })
                  : L("EDRPG.turn.rechargeUp", { value: sh.value, after, max: sh.max, rate }),
               rateText: parts.join(" + "),
            };
         }
         case "obstacle": {
            if (skipObstacle) return { summary: L(sys.flying ? "EDRPG.turn.obstacleFlying" : sys.speed < 1 ? "EDRPG.turn.obstacleStopped" : "EDRPG.turn.obstacleNone") };
            if (t.obstacle === "done") return { summary: L("EDRPG.turn.obstacleDone") };
            const pending = String(t.obstacle ?? "").startsWith("pending:");
            if (pending) return { summary: L("EDRPG.turn.pilotCheckNeeded"), pilotCheck: t.obstacle.slice(8) };
            return { summary: L(game.user.isGM ? "EDRPG.turn.obstacleGM" : "EDRPG.turn.obstacleWaiting"), gmCheck: true };
         }
         case "action": {
            if (t.action || c.action) return { summary: L("EDRPG.turn.actionDone", { action: L(`EDRPG.vcombat.action.${c.action || t.action}`) }) };
            if (c.lostAction) return { summary: L("EDRPG.turn.lostAction"), lost: true };
            if (sys.isShip && sys.immobilised) return { summary: L("EDRPG.ship.immobilisedNote", { name: actor.name }), lost: true };
            return { summary: L("EDRPG.turn.actionHint", { zone: L(`EDRPG.craft.zone.${zone}`) }), ...this.#actionView(actor, zone) };
         }
      }
      return {};
   }

   /**
    * The Combat Action step: the craft that can be targeted (enemies first), and for the chosen one the actions open
    * from this zone, each allowed or not with the reason. Actions without a target are listed apart.
    *
    * @param {Actor} actor
    *
    * @param {string} zone
    *
    * @returns {object}
    */
   #actionView(actor, zone) {
      const open = actionsFor(actor, zone);
      const mine = actor.getActiveTokens?.()[0]?.document?.disposition ?? actor.prototypeToken?.disposition;
      const dispositionOf = (a) => a.getActiveTokens?.()[0]?.document?.disposition ?? a.prototypeToken?.disposition;
      const wrecks = open.includes("rescue") ? targetCandidates(actor, { wrecks: true }).filter((a) => a.system.stranded?.length) : [];
      const craft = [...targetCandidates(actor), ...wrecks];
      // null: nothing chosen yet (use a default); "": cleared on purpose.
      if (this.targetUuid !== "" && !craft.some((a) => a.uuid === this.targetUuid)) {
         // Default: the user's single targeted token, else the only enemy.
         const targeted = [...(game.user.targets ?? [])].map((tk) => tk.actor).filter((a) => craft.some((x) => x.uuid === a?.uuid));
         const enemies = craft.filter((a) => !a.system.destroyed && dispositionOf(a) !== mine);
         this.targetUuid = targeted.length === 1 ? targeted[0].uuid : enemies.length === 1 ? enemies[0].uuid : null;
      }
      const chip = (key) => ({ key, label: L(`EDRPG.vcombat.state.${key}`) });
      const targets = craft
         .map((a) => {
            const ts = a.system;
            const hostile = dispositionOf(a) !== mine;
            // Combined Scale Combat: people (and smaller craft) count as up-close for bigger craft.
            const scale = scaleOf(a);
            const person = scale === "individual";
            const states = ts.destroyed ? [{ key: "destroyed", label: L("EDRPG.turn.wreck") }] : ["fleeing", "disengaging", "sniping", "rammed", "hovering"].filter((k) => ts.combat?.[k]).map(chip);
            if (scale !== scaleOf(actor)) states.unshift({ key: "scale", label: L(`EDRPG.combined.scale.${scale}`) });
            return {
               uuid: a.uuid,
               name: a.name,
               img: a.img,
               hostile,
               selected: a.uuid === this.targetUuid,
               zone: person ? L("EDRPG.combined.groundZone") : L(`EDRPG.craft.zone.${zoneOf(a)}`),
               upClose: effectiveZone(actor, a) === "upClose",
               stats: person
                  ? L("EDRPG.combined.personStats", { dodge: defenceOf(a, "dodge").value, endurance: ts.endurance?.value ?? 0 })
                  : ts.destroyed
                    ? L("EDRPG.turn.stranded", { n: ts.stranded.length })
                    : L("EDRPG.turn.targetStats", { defence: ts.defence, pursuit: ts.pursuit, speed: ts.speed }),
               states,
               wreck: !!ts.destroyed,
            };
         })
         .sort((a, b) => Number(a.wreck) - Number(b.wreck) || Number(b.hostile) - Number(a.hostile) || Number(b.upClose === (zone === "upClose")) - Number(a.upClose === (zone === "upClose")) || a.name.localeCompare(b.name));
      const target = craft.find((a) => a.uuid === this.targetUuid) ?? null;
      const view = (key, reason) => ({ key, icon: ACTION_ICONS[key], label: L(`EDRPG.vcombat.action.${key}`), hint: L(`EDRPG.vcombat.actionHint.${key}`), reason, ok: !reason });
      const targeted = open.filter((k) => TARGETED_ACTIONS.includes(k) || k === "rescue");
      const against = target
         ? targeted
              .filter((k) => (target.system.destroyed ? k === "rescue" : k !== "rescue"))
              .map((k) => view(k, actionBlocked(actor, k) ?? actionTargetBlocked(actor, k, target)))
              .sort((a, b) => Number(b.ok) - Number(a.ok))
         : [];
      const untargeted = open.filter((k) => !targeted.includes(k)).map((k) => view(k, actionBlocked(actor, k)));
      return { targets, target: target ? { name: target.name, wreck: !!target.system.destroyed } : null, against, untargeted, noTargets: !craft.length };
   }

   /** Run a step's work once at a time, then re-render. */
   async #run(fn) {
      if (this.#busy) return;
      this.#busy = true;
      try {
         await fn();
      } finally {
         this.#busy = false;
         if (this.rendered) this.render();
      }
   }

   /** @this {VehicleTurnPanel} */
   static #onSpeed(event, target) {
      return this.#run(() => setVehicleSpeed(this.actor, Number(target.dataset.speed)));
   }

   /** @this {VehicleTurnPanel} Confirm the current step (speed, equipment). */
   static #onConfirm(event, target) {
      return this.#run(() => markStep(this.actor, target.dataset.step));
   }

   /** @this {VehicleTurnPanel} */
   static #onEquip(event, target) {
      return this.#run(() => equipmentAction(this.actor, target.dataset.which));
   }

   /** @this {VehicleTurnPanel} */
   static #onRecharge() {
      return this.#run(() => rechargeShields(this.actor));
   }

   /** @this {VehicleTurnPanel} GM: roll or choose the obstacle. */
   static #onObstacles() {
      return this.#run(() => checkObstacles(this.actor));
   }

   /** @this {VehicleTurnPanel} GM: nothing in the way this turn. */
   static #onNoObstacles() {
      return this.#run(() => markStep(this.actor, "obstacle", "done"));
   }

   /** @this {VehicleTurnPanel} */
   static #onPilotCheck(event, target) {
      const message = game.messages.get(target.dataset.message);
      if (!message) return void ui.notifications.warn("EDRPG.turn.cardMissing", { localize: true });
      return this.#run(() => rollPilotCheck(message));
   }

   /** @this {VehicleTurnPanel} Take an action; a targeted one goes against the chosen target. */
   static #onAction(event, button) {
      const key = button.dataset.vaction;
      const target = button.dataset.targeted ? fromUuidSync(this.targetUuid) : null;
      return this.#run(() => vehicleAction(this.actor, key, { target }));
   }

   /** @this {VehicleTurnPanel} Choose the target (click again to clear). */
   static #onSelectTarget(event, el) {
      const uuid = el.dataset.uuid;
      this.targetUuid = this.targetUuid === uuid ? "" : uuid;
      return this.render();
   }

   /** @this {VehicleTurnPanel} No combat action this turn. */
   static #onSkipAction() {
      return this.#run(() => markStep(this.actor, "action", true));
   }

   /** @this {VehicleTurnPanel} */
   static async #onEndTurn() {
      const t = turnState(this.actor);
      const left = t ? turnSteps(this.actor).filter((k) => !(k === "obstacle" ? ["done", "skip"].includes(t.obstacle) || this.actor.system.speed < 1 || this.actor.system.flying : t[k] || (k === "action" && this.actor.system.combat.action))) : [];
      if (left.length) {
         const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: L("EDRPG.turn.endTurn") },
            content: `<p>${L("EDRPG.turn.endEarly", { steps: left.map((k) => L(`EDRPG.turn.step.${k}`)).join(", ") })}</p>`,
            rejectClose: false,
         });
         if (!ok) return;
      }
      return this.#run(() => endVehicleTurn(this.actor));
   }

   /** @this {VehicleTurnPanel} */
   static #onOpenSheet() {
      return this.actor?.sheet.render(true);
   }

   /** @this {VehicleTurnPanel} GM: start the turn if it didn't start by itself. */
   static #onStartTurn() {
      if (!game.user.isGM) return;
      return this.#run(() => startVehicleTurn(this.actor, game.combat));
   }
}

/** The craft whose turn it is in the active combat, if any. */
function currentCraft(combat = game.combat) {
   const actor = combat?.started ? combat.combatant?.actor : null;
   return isCraft(actor) ? actor : null;
}

/** Hooks: open on each new turn for the GM and the craft's owners; refresh as things change. */
export function registerTurnPanel() {
   Hooks.on("updateCombat", (combat, changed) => {
      if (combat !== game.combat) return;
      if ("turn" in changed || "round" in changed || "active" in changed) VehicleTurnPanel.show(currentCraft(combat));
   });
   Hooks.on("deleteCombat", () => VehicleTurnPanel.show(null));
   Hooks.on("updateActor", (actor) => VehicleTurnPanel.refresh(actor));
   Hooks.on("createChatMessage", () => VehicleTurnPanel.instance?.rendered && VehicleTurnPanel.instance.render());
   // A reload mid-turn: reopen it.
   if (game.combat?.started) VehicleTurnPanel.show(currentCraft());
}

/** Open the panel for a craft (sheet button). */
export function openTurnPanel(actor) {
   if (!panelEnabled()) return void ui.notifications.info("EDRPG.turn.disabled", { localize: true });
   return VehicleTurnPanel.show(actor);
}
