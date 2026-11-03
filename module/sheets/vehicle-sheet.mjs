import { craftSizes, mountKinds, mountSizes, combatZones } from "../data/vehicle.mjs";
import { zoneOfToken } from "../zones.mjs";
import { componentKinds } from "../data/vehicle.mjs";
import { equipmentAction } from "../vehicle-combat.mjs";
import { engineerDialog, labels as engLabels } from "../engineering.mjs";
import { hangarEntries, dock, undock, recover } from "../hangar.mjs";
import { actionsFor, ACTION_ICONS, vehicleAction, setVehicleSpeed, checkObstacles, startVehicleTurn, inCombat } from "../vehicle-combat.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** "Engineered: Fleet, Boosted; fault: Drag". */
function engText(e) {
   if (!e?.effects?.length && !e?.faults?.length) return "";
   const parts = [];
   if (e.effects?.length) parts.push(engLabels(e.effects, "effect"));
   if (e.faults?.length) parts.push(game.i18n.format("EDRPG.engineering.faultList", { list: engLabels(e.faults, "fault") }));
   return game.i18n.format("EDRPG.engineering.engineeredList", { list: parts.join("; ") });
}

/** Actor types that can crew a vehicle. */
const CREW_TYPES = ["character", "npcIndividual", "partner", "opponent"];

/**
 * Vehicle Data Sheet (Core Rules p.363): model, pilot, handling, Defence / Initiative / Pursuit, Hull and Shields,
 * weapons and the Speed Table. Drag a character onto the sheet to make them the pilot.
 */
export default class EDVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "vehicle"],
      position: { width: 820, height: 760 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         setSpeed: EDVehicleSheet.#onSetSpeed,
         clearPilot: EDVehicleSheet.#onClearPilot,
         openActor: EDVehicleSheet.#onOpenActor,
         rollWeapon: EDVehicleSheet.#onRollWeapon,
         reloadWeapon: EDVehicleSheet.#onReloadWeapon,
         createItem: EDVehicleSheet.#onCreateItem,
         editItem: EDVehicleSheet.#onEditItem,
         deleteItem: EDVehicleSheet.#onDeleteItem,
         rollInitiative: EDVehicleSheet.#onRollInitiative,
         setZone: EDVehicleSheet.#onSetZone,
         vehicleAction: EDVehicleSheet.#onVehicleAction,
         checkObstacles: EDVehicleSheet.#onCheckObstacles,
         startTurn: EDVehicleSheet.#onStartTurn,
         clearCombat: EDVehicleSheet.#onClearCombat,
         equip: EDVehicleSheet.#onEquip,
         addRow: EDVehicleSheet.#onAddRow,
         deleteRow: EDVehicleSheet.#onDeleteRow,
         engineer: EDVehicleSheet.#onEngineer,
         undock: EDVehicleSheet.#onUndock,
         recover: EDVehicleSheet.#onRecover,
      },
   };

   /** @override */
   static PARTS = {
      header: { template: "systems/edrpg/templates/vehicle/header.hbs" },
      tabs: { template: "systems/edrpg/templates/actor/tabs.hbs" },
      sheet: { template: "systems/edrpg/templates/vehicle/sheet.hbs", scrollable: [""] },
      details: { template: "systems/edrpg/templates/vehicle/details.hbs", scrollable: [""] },
   };

   /** @override */
   static TABS = {
      primary: {
         tabs: [
            { id: "sheet", label: "EDRPG.vehicle.tab.sheet" },
            { id: "details", label: "EDRPG.vehicle.tab.details" },
         ],
         initial: "sheet",
      },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const actor = this.document;
      const system = actor.system;
      const pilot = system.pilotActor;
      const token = actor.getActiveTokens?.()[0]?.document ?? null;
      const mapZone = token ? zoneOfToken(token) : null;

      Object.assign(context, {
         actor,
         system,
         source: system._source,
         editable: this.isEditable,
         owner: actor.isOwner,
         tabs: this._prepareTabs("primary"),
         craftSizes,
         combatZones,
         pilot: pilot ? { uuid: pilot.uuid, name: pilot.name, img: pilot.img } : null,
         pilotMissing: !!system.pilot && !pilot,
         pilotChoices: this.#crewChoices(),
         stats: {
            dogfight: system.dogfight,
            defence: system.defence,
            initiative: system.initiative,
            pursuit: system.pursuit,
            piloting: system.piloting,
         },
         shieldState: !system.shields.max ? "none" : system.shields.down ? "down" : "up",
         zone: mapZone ?? system.zone,
         zoneFromMap: !!mapZone,
      });

      // Combat turn: speed limits, state, and the actions open in this zone.
      const range = system.speedRange;
      const c = system.combat ?? {};
      const zone = context.zone;
      context.isGM = game.user.isGM;
      context.speedRange = range;
      context.speedLocked = !range && inCombat(actor);
      context.combatChips = [
         ["escaped", c.escaped],
         ["fleeing", c.fleeing],
         ["disengaging", c.disengaging],
         ["sniping", c.sniping],
         ["rammed", c.rammed],
         ["lostAction", c.lostAction],
         ["pass", c.pass > 0],
      ]
         .filter(([, on]) => on)
         .map(([key]) => ({ key, label: game.i18n.localize(`EDRPG.vcombat.state.${key}`), hint: game.i18n.localize(`EDRPG.vcombat.stateHint.${key}`) }));
      context.destroyed = system.destroyed;
      context.strandedNames = (system.stranded ?? []).map((u) => fromUuidSync(u)?.name).filter(Boolean).join(", ");
      // Rescue only shows while someone on the scene is waiting to be picked up.
      const strandedNearby = (globalThis.canvas?.scene?.tokens ?? []).some((t) => ["vehicle", "ship"].includes(t.actor?.type) && t.actor.system.destroyed && t.actor.system.stranded?.length);
      context.isShip = system.isShip;
      context.npcShip = !!system.npc?.enabled;
      context.componentKinds = componentKinds;
      if (system.isShip) {
         const eq = system.equipment;
         const c = system.combat;
         context.components = system.components.map((x, i) => ({ ...x, index: i, kindLabel: game.i18n.localize(componentKinds[x.kind] ?? x.kind), broken: x.strength.value <= 0 }));
         context.componentRows = system._source.components.map((x, i) => ({ ...x, index: i, engineeredText: engText(x.engineered) }));
         context.bulkheadText = engText(system.bulkhead);
         // Hangar: docked craft and capacity.
         const cap = system.hangarCapacity;
         context.hangar = {
            show: cap.fighters > 0 || cap.ships > 0 || (system.hangar ?? []).length > 0,
            capacity: cap,
            entries: hangarEntries(actor).map((e) => ({ ...e, name: e.actor?.name ?? game.i18n.localize("EDRPG.hangar.missing"), img: e.actor?.img })),
         };
         context.carrierName = system.carrier ? (fromUuidSync(system.carrier)?.name ?? "") : "";
         context.cellBankRows = system._source.equipment.cellBanks.map((x, i) => ({ ...x, index: i }));
         const bank = eq.cellBanks[c.cellBank.index];
         context.equip = {
            chaff: eq.chaff.max > 0 ? { ...eq.chaff, active: c.chaff } : null,
            mines: eq.mines.max > 0 ? { ...eq.mines, active: c.mines } : null,
            pd: eq.pointDefence.max > 0 ? eq.pointDefence : null,
            ecm: eq.ecm,
            floating: eq.floating ? { n: eq.floating, list: ["engines", "weapons", "shields"].filter((k) => c.floating[k]).map((k) => game.i18n.localize(`EDRPG.equip.floating.${k}`)).join(", ") } : null,
            banks: eq.cellBanks.length ? { uses: eq.cellBanks.reduce((n, b) => n + b.uses, 0), running: bank && c.cellBank.rounds >= 0 && c.cellBank.index >= 0 ? `${bank.name} (+${bank.boost})` : "" } : null,
            recharge: system.rechargeNow,
         };
         context.equip.launch = context.hangar.entries.some((e) => !e.launched && e.actor);
         context.hasEquip = !!(context.equip.launch || context.equip.chaff || context.equip.mines || context.equip.pd || context.equip.ecm || context.equip.floating || context.equip.banks);
      }
      context.vactions = actionsFor(actor, zone).filter((key) => key !== "rescue" || strandedNearby).map((key) => ({
         key,
         icon: ACTION_ICONS[key],
         label: game.i18n.localize(`EDRPG.vcombat.action.${key}`),
         hint: game.i18n.localize(`EDRPG.vcombat.actionHint.${key}`),
         taken: c.action === key,
      }));
      context.lastAction = c.action ? game.i18n.localize(`EDRPG.vcombat.action.${c.action}`) : "";

      context.speedCells = Array.from({ length: 10 }, (_, i) => {
         const row = system.speedTable[i] ?? { defence: 0, attack: 0 };
         return {
            locked: !!range && (i + 1 < range.min || i + 1 > range.max),
            speed: i + 1,
            defence: row.defence ? `+${row.defence}` : "",
            attack: row.attack ? `${row.attack}` : "",
            current: system.speed === i + 1,
            beyond: i + 1 > system.maxSpeed,
         };
      });
      context.speedRows = Array.from({ length: 10 }, (_, i) => ({ index: i, speed: i + 1, ...(system._source.speedTable[i] ?? { defence: 0, attack: 0 }) }));

      const weapons = [...actor.itemTypes.craftWeapon].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      context.weapons = weapons.map((w) => {
         const s = w.system;
         const gun = system.gunnery(w);
         return {
            id: w.id,
            name: w.name,
            mount: `${game.i18n.localize(mountSizes[s.mount.size])} ${game.i18n.localize(mountKinds[s.mount.kind])}`,
            toHit: system.toHit(w),
            damage: s.damageLabel,
            usesAmmo: s.usesAmmo,
            ammo: s.ammo,
            special: [s.specialLabel, engText(s.engineered)].filter(Boolean).join(". "),
            turret: s.mount.kind === "turret",
            gunner: s.gunner,
            gunnerLabel: gun.auto ? game.i18n.format("EDRPG.vehicle.autoTurret", { bonus: gun.bonus }) : (gun.gunner?.name ?? ""),
         };
      });

      context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.description, {
         secrets: actor.isOwner,
         relativeTo: actor,
      });
      context.descriptionField = system.schema.getField("description");
      return context;
   }

   /** @override */
   async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      if (context.tabs?.[partId]) context.tab = context.tabs[partId];
      return context;
   }

   /**
    * Actors who can crew the vehicle: individuals and opponents in the world.
    *
    * @returns {Record<string, string>}
    */
   #crewChoices() {
      const choices = {};
      for (const a of game.actors ?? []) {
         if (CREW_TYPES.includes(a.type) && a.testUserPermission(game.user, "OBSERVER")) choices[a.uuid] = a.name;
      }
      return choices;
   }

   /** @override */
   async _onRender(context, options) {
      await super._onRender(context, options);
      // Turret gunners are chosen inline on the weapons table.
      for (const select of this.element.querySelectorAll("[data-gunner-select]")) {
         select.addEventListener("change", async (event) => {
            event.stopPropagation();
            const item = this.document.items.get(select.closest("[data-item-id]")?.dataset.itemId);
            await item?.update({ "system.gunner": select.value });
         });
      }
      for (const input of this.element.querySelectorAll("[data-item-field]")) {
         input.addEventListener("change", async (event) => {
            event.stopPropagation();
            const item = this.document.items.get(input.closest("[data-item-id]")?.dataset.itemId);
            const value = input.type === "number" ? Number(input.value) : input.value;
            await item?.update({ [input.dataset.itemField]: value });
         });
      }
   }

   /**
    * Dropping a character (or opponent) on the sheet makes them the pilot.
    *
    * @override
    */
   async _onDropActor(event, actor) {
      if (!this.isEditable) return;
      // A fighter or small ship dropped on a carrier docks in its hangar.
      if (actor?.type === "ship" && this.document.system.isShip) return dock(this.document, actor);
      if (!CREW_TYPES.includes(actor?.type)) return;
      await this.document.update({ "system.pilot": actor.uuid });
   }

   /**
    * `system.speedTable.<n>.<key>` arrives as an object; store an array.
    *
    * @override
    */
   _processFormData(event, form, formData) {
      const data = super._processFormData(event, form, formData);
      // Ship rosters arrive as { "0": {...}, "1": {...} }: merge into the stored arrays.
      const toArray = (incoming, current) => current.map((row, i) => foundry.utils.mergeObject(row, incoming[i] ?? {}, { inplace: false }));
      if (data.system?.components && !Array.isArray(data.system.components)) {
         data.system.components = toArray(data.system.components, this.document.system.toObject().components);
      }
      const banks = data.system?.equipment?.cellBanks;
      if (banks && !Array.isArray(banks)) data.system.equipment.cellBanks = toArray(banks, this.document.system.toObject().equipment.cellBanks);
      const table = data.system?.speedTable;
      if (table && !Array.isArray(table)) {
         const current = this.document.system.toObject().speedTable;
         data.system.speedTable = current.map((row, i) => ({ ...row, ...(table[i] ?? {}) }));
      }
      return data;
   }

   /* -------------------------------------------- */
   /*  Actions                                     */
   /* -------------------------------------------- */

   /** @this {EDVehicleSheet} */
   static async #onSetSpeed(event, target) {
      if (!this.isEditable) return;
      const speed = Number(target.dataset.speed);
      const sys = this.document.system;
      return setVehicleSpeed(this.document, speed === sys.speed ? 0 : speed);
   }

   /** @this {EDVehicleSheet} */
   static async #onVehicleAction(event, target) {
      if (this.isEditable) return vehicleAction(this.document, target.dataset.vaction);
   }

   /** @this {EDVehicleSheet} */
   static async #onCheckObstacles() {
      return checkObstacles(this.document);
   }

   /** @this {EDVehicleSheet} */
   static async #onStartTurn() {
      if (game.user.isGM) return startVehicleTurn(this.document, game.combat?.started ? game.combat : null);
   }

   /** @this {EDVehicleSheet} */
   static async #onEquip(event, target) {
      if (this.isEditable) return equipmentAction(this.document, target.dataset.equip);
   }

   /** @this {EDVehicleSheet} */
   static async #onEngineer(event, target) {
      if (this.isEditable) return engineerDialog(this.document, target.dataset.key);
   }

   /** @this {EDVehicleSheet} */
   static async #onUndock(event, target) {
      if (this.isEditable) return undock(this.document, Number(target.closest("[data-index]")?.dataset.index));
   }

   /** @this {EDVehicleSheet} */
   static async #onRecover(event, target) {
      if (this.isEditable) return recover(this.document, Number(target.closest("[data-index]")?.dataset.index));
   }

   /** @this {EDVehicleSheet} */
   static async #onAddRow(event, target) {
      if (!this.isEditable) return;
      const src = this.document.system.toObject();
      if (target.dataset.list === "components") {
         const components = [...src.components, { name: "", kind: "internal", strength: { value: 10, max: 10 }, notes: "", item: "" }];
         return this.document.update({ "system.components": components });
      }
      const cellBanks = [...src.equipment.cellBanks, { name: game.i18n.localize("EDRPG.equip.cellBank"), boost: 5, duration: 1, uses: 3 }];
      return this.document.update({ "system.equipment.cellBanks": cellBanks });
   }

   /** @this {EDVehicleSheet} */
   static async #onDeleteRow(event, target) {
      if (!this.isEditable) return;
      const src = this.document.system.toObject();
      const i = Number(target.closest("[data-index]")?.dataset.index);
      if (target.dataset.list === "components") return this.document.update({ "system.components": src.components.filter((_, j) => j !== i) });
      return this.document.update({ "system.equipment.cellBanks": src.equipment.cellBanks.filter((_, j) => j !== i) });
   }

   /** @this {EDVehicleSheet} */
   static async #onClearCombat() {
      if (!game.user.isGM) return;
      return this.document.update({
         "system.combat": {
            turnSpeed: null, action: "", sniping: false, fleeing: false, disengaging: false, rammed: false, lostAction: false, pass: 0, escaped: false,
            faOff: false, outOfControl: 0, chaff: false, mines: false, cellBank: { index: -1, rounds: 0 },
         },
      });
   }

   /** @this {EDVehicleSheet} */
   static async #onSetZone(event, target) {
      if (!this.isEditable) return;
      return this.document.update({ "system.zone": target.dataset.zone });
   }

   /** @this {EDVehicleSheet} */
   static async #onClearPilot() {
      if (this.isEditable) return this.document.update({ "system.pilot": "" });
   }

   /** @this {EDVehicleSheet} */
   static async #onOpenActor(event, target) {
      (await fromUuid(target.dataset.uuid))?.sheet.render({ force: true });
   }

   /** @this {EDVehicleSheet} */
   static async #onRollInitiative() {
      return this.document.rollInitiative({ createCombatants: true });
   }

   /** @this {EDVehicleSheet} */
   static async #onRollWeapon(event, target) {
      const item = this.#getItem(target);
      if (item) return game.edrpg.rollCraftAttack?.(this.document, item, { prompt: !event.shiftKey });
   }

   /** @this {EDVehicleSheet} */
   static async #onReloadWeapon(event, target) {
      const item = this.#getItem(target);
      if (item?.system.usesAmmo) return item.update({ "system.ammo.value": item.system.ammo.max });
   }

   /** @this {EDVehicleSheet} */
   static async #onCreateItem() {
      const name = game.i18n.format("DOCUMENT.New", { type: game.i18n.localize("TYPES.Item.craftWeapon") });
      const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type: "craftWeapon" }]);
      item?.sheet.render({ force: true });
   }

   /** @this {EDVehicleSheet} */
   static #onEditItem(event, target) {
      this.#getItem(target)?.sheet.render({ force: true });
   }

   /** @this {EDVehicleSheet} */
   static async #onDeleteItem(event, target) {
      return this.#getItem(target)?.deleteDialog();
   }

   /**
    * @param {HTMLElement} target
    *
    * @returns {Item|undefined}
    */
   #getItem(target) {
      return this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
   }
}
