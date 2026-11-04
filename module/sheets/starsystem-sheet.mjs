import {
   STAR_TYPES,
   BODY_TYPES,
   GOVERNMENTS,
   ECONOMIES,
   ALLEGIANCES,
   generateSystem,
   rollPlanets,
   rollOrbit,
   rollRingsAndMoons,
   rollEconomy,
   rollGovernment,
   rollInstallations,
   names,
   bodyReward,
   systemReward,
   securityOf,
   metallic,
} from "../starsystem.mjs";
import { openMarket } from "../trading.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cr = (n) => `${Number(n || 0).toLocaleString()}cr`;
const RINGS = ["", "rocky", "metallic", "ice", "rockyMetallic", "iceMetallic", "iceRocky"];
const MOON_TYPES = ["ice", "rocky", "hmc", "metalRich"];

/** Options for the generator dialog, then the generated data. */
async function generatorDialog({ name = "", title } = {}) {
   const starOptions = Object.keys(STAR_TYPES).map((k) => `<option value="${k}">${L(`EDRPG.star.type.${k}`)}</option>`).join("");
   const allegiance = ALLEGIANCES.map((k) => `<option value="${k}">${L(`EDRPG.star.allegiance.${k}`)}</option>`).join("");
   const row = (label, field, hint = "") => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div>${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
   const input = await foundry.applications.api.DialogV2.input({
      window: { title: title ?? L("EDRPG.star.generate"), icon: "fa-solid fa-sun" },
      classes: ["edrpg", "edrpg-dialog"],
      content:
         row(L("EDRPG.star.systemName"), `<input type="text" name="name" value="${esc(name)}" required>`) +
         row(L("EDRPG.star.primary"), `<select name="primary"><option value="">${L("EDRPG.star.roll")}</option>${starOptions}</select>`, L("EDRPG.star.primaryHint")) +
         row(L("EDRPG.star.companions"), `<input type="checkbox" name="companions" checked>`) +
         row(L("EDRPG.star.inhabited"), `<input type="checkbox" name="inhabited" checked>`, L("EDRPG.star.inhabitedHint")) +
         row(L("EDRPG.star.allegianceLabel"), `<select name="allegiance"><option value="">${L("EDRPG.star.roll")}</option>${allegiance}</select>`),
      ok: { label: "EDRPG.star.generateButton", icon: "fa-solid fa-dice-d20" },
      rejectClose: false,
   });
   if (!input) return null;
   const sysName = String(input.name || "").trim() || L("EDRPG.star.newSystem");
   const data = generateSystem({ name: sysName, primary: input.primary || undefined, companions: !!input.companions, inhabited: !!input.inhabited, allegiance: input.allegiance || undefined });
   return { name: sysName, data };
}

/**
 * Generate a new Star System actor (GM button / macro) and open it.
 *
 * @returns {Promise<Actor|null>}
 */
export async function createStarSystem() {
   const result = await generatorDialog();
   if (!result) return null;
   const actor = await Actor.implementation.create({ name: result.name, type: "starSystem", img: "icons/svg/sun.svg", system: { stars: result.data.stars, civ: result.data.civ } });
   actor?.sheet.render(true);
   return actor;
}

/**
 * Generate and create a Star System actor without a dialog (missions, macros).
 *
 * @param {object} options  generateSystem options, plus earthLike: keep rolling until there is an Earth-like world, and
 *                          folder: a folder id.
 *
 * @returns {Promise<Actor>}
 */
export async function makeStarSystem({ earthLike = false, folder = null, ...options } = {}) {
   let data = generateSystem(options);
   const hasEarth = (d) => d.stars.some((s) => s.bodies.some((b) => b.type === "earthLike"));
   for (let i = 0; earthLike && !hasEarth(data) && i < 1000; i++) data = generateSystem(options);
   if (earthLike && !hasEarth(data)) {
      // Very unlikely: place one at the Primary's Goldilocks distance.
      const gz = STAR_TYPES[data.stars[0].type].gz ?? 500;
      data.stars[0].bodies.push({ zone: "inner", distance: gz, type: "earthLike", starType: "", mass: 0, rings: "", moons: [], name: "" });
   }
   return Actor.implementation.create({ name: options.name ?? L("EDRPG.star.newSystem"), type: "starSystem", img: "icons/svg/sun.svg", folder, system: { stars: data.stars, civ: data.civ } });
}

/**
 * The Star System sheet: stars, what orbits them, and the civilisation. Every value can be edited or rerolled.
 */
export default class EDStarSystemSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
   /** @override */
   static DEFAULT_OPTIONS = {
      classes: ["edrpg", "edrpg-sheet", "starsystem"],
      position: { width: 760, height: 820 },
      window: { resizable: true },
      form: { submitOnChange: true },
      actions: {
         generate: EDStarSystemSheet.#onGenerate,
         rerollStar: EDStarSystemSheet.#onRerollStar,
         addStar: EDStarSystemSheet.#onAddStar,
         deleteStar: EDStarSystemSheet.#onDeleteStar,
         rerollBody: EDStarSystemSheet.#onRerollBody,
         rerollMoons: EDStarSystemSheet.#onRerollMoons,
         addBody: EDStarSystemSheet.#onAddBody,
         deleteBody: EDStarSystemSheet.#onDeleteBody,
         addMoon: EDStarSystemSheet.#onAddMoon,
         deleteMoon: EDStarSystemSheet.#onDeleteMoon,
         rerollCiv: EDStarSystemSheet.#onRerollCiv,
         addInstallation: EDStarSystemSheet.#onAddInstallation,
         deleteInstallation: EDStarSystemSheet.#onDeleteInstallation,
         addEconomy: EDStarSystemSheet.#onAddEconomy,
         deleteEconomy: EDStarSystemSheet.#onDeleteEconomy,
         market: EDStarSystemSheet.#onMarket,
         spaceLane: EDStarSystemSheet.#onSpaceLane,
         planetEncounter: EDStarSystemSheet.#onPlanetEncounter,
      },
   };

   /** @override */
   static PARTS = {
      sheet: { template: "systems/edrpg/templates/starsystem/sheet.hbs", scrollable: [""] },
   };

   /** @override */
   async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const actor = this.document;
      const src = actor.system._source;
      const stars = src.stars;
      const n = names(actor.name, stars);
      const at = {};
      src.civ.installations.forEach((x, i) => (at[x.at] ??= []).push({ ...x, index: i }));
      const opts = (keys, prefix, selected) => keys.map((k) => ({ value: k, label: L(`${prefix}.${k}`), selected: k === selected }));
      const bodyTypes = Object.keys(BODY_TYPES);
      const starTypes = Object.keys(STAR_TYPES);

      const starViews = stars.map((s, si) => {
         const t = STAR_TYPES[s.type] ?? {};
         const bodies = s.bodies
            .map((b, bi) => {
               const bt = BODY_TYPES[b.type] ?? {};
               return {
                  si,
                  bi,
                  name: n.bodies[si][bi],
                  custom: b.name,
                  distance: b.distance,
                  zone: b.zone,
                  type: b.type,
                  isStar: b.type === "star",
                  starType: b.starType,
                  mass: b.mass,
                  typeOptions: opts(bodyTypes, "EDRPG.star.body", b.type),
                  starTypeOptions: opts(starTypes, "EDRPG.star.type", b.starType),
                  rings: b.rings,
                  ringOptions: RINGS.map((r) => ({ value: r, label: L(`EDRPG.star.rings.${r || "none"}`), selected: r === b.rings })),
                  canRing: bt.kind === "gasGiant" || b.type === "star",
                  metallicRings: metallic(b.rings),
                  moons: b.moons.map((m, mi) => ({ mi, name: n.moons[si][bi][mi], type: m, options: opts(MOON_TYPES, "EDRPG.star.body", m), here: at[`${si}.${bi}.${mi}`] ?? [] })),
                  reward: cr(bodyReward(b)),
                  life: !!bt.life,
                  here: at[`${si}.${bi}`] ?? [],
               };
            })
            .sort((a, b) => a.distance - b.distance);
         return {
            si,
            name: n.stars[si],
            custom: s.name,
            primary: si === 0,
            type: s.type,
            typeOptions: opts(starTypes, "EDRPG.star.type", s.type),
            mass: s.mass,
            gz: t.gz ? `${t.gz}ls` : "—",
            scoop: L(t.scoop ? "EDRPG.star.yes" : "EDRPG.star.no"),
            reward: cr(t.reward),
            bodies,
         };
      });

      // Where each installation can be: every body and moon, by name.
      const places = [{ value: "", label: L("EDRPG.star.unplaced") }];
      stars.forEach((s, si) =>
         s.bodies.forEach((b, bi) => {
            places.push({ value: `${si}.${bi}`, label: n.bodies[si][bi] });
            b.moons.forEach((_, mi) => places.push({ value: `${si}.${bi}.${mi}`, label: n.moons[si][bi][mi] }));
         }),
      );
      const civ = src.civ;
      const security = securityOf(civ.government);
      Object.assign(context, {
         actor,
         system: actor.system,
         source: src,
         editable: this.isEditable,
         isGM: game.user.isGM,
         stars: starViews,
         canAddStar: stars.length < 6,
         reward: cr(systemReward(stars)),
         bodyCount: stars.reduce((k, s) => k + s.bodies.length, 0),
         moonCount: stars.reduce((k, s) => k + s.bodies.reduce((m, b) => m + b.moons.length, 0), 0),
         civ: {
            inhabited: civ.inhabited,
            economies: civ.economies.map((e, i) => ({ index: i, key: e, label: L(`EDRPG.trade.economy.${e}`) })),
            economyOptions: opts(ECONOMIES, "EDRPG.trade.economy", ""),
            governmentOptions: [{ value: "", label: "—", selected: !civ.government }, ...opts(Object.keys(GOVERNMENTS), "EDRPG.star.government", civ.government)],
            allegianceOptions: [{ value: "", label: "—", selected: !civ.allegiance }, ...opts(ALLEGIANCES, "EDRPG.star.allegiance", civ.allegiance)],
            security,
            securityLabel: security ? L(`EDRPG.star.security.${security}`) : "—",
            installations: civ.installations.map((x, i) => ({
               ...x,
               index: i,
               kindLabel: L(`EDRPG.star.installation.${x.kind}`),
               icon: { station: "fa-satellite", outpost: "fa-tower-broadcast", settlement: "fa-city" }[x.kind] ?? "fa-location-dot",
               places: places.map((p) => ({ ...p, selected: p.value === x.at })),
            })),
            kinds: ["station", "outpost", "settlement"].map((k) => ({ value: k, label: L(`EDRPG.star.installation.${k}`) })),
         },
      });
      context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(actor.system.notes, { secrets: actor.isOwner, relativeTo: actor });
      context.notesField = actor.system.schema.getField("notes");
      return context;
   }

   /** @override */
   _onRender(context, options) {
      super._onRender?.(context, options);
      // Fields inside the stars/civ arrays: edit a copy of the array and save it whole.
      for (const el of this.element.querySelectorAll("[data-path]")) {
         el.addEventListener("change", (event) => {
            event.stopPropagation();
            const path = el.dataset.path;
            const value = el.type === "checkbox" ? el.checked : el.dataset.dtype === "Number" ? Number(el.value) || 0 : el.value;
            this.#edit(path, value);
         });
      }
   }

   /**
    * Change one value inside system.stars or system.civ.
    *
    * @param {string} path   e.g. "stars.0.bodies.2.type"
    *
    * @param {*} value
    */
   async #edit(path, value) {
      const [root] = path.split(".");
      const data = { stars: this.document.system.toObject().stars, civ: this.document.system.toObject().civ };
      foundry.utils.setProperty(data, path, value);
      // A body that becomes an orbiting star needs a star type; one that stops being one drops it.
      const m = path.match(/^stars\.(\d+)\.bodies\.(\d+)\.type$/);
      if (m) {
         const b = data.stars[m[1]].bodies[m[2]];
         if (value === "star" && !b.starType) Object.assign(b, { starType: "tDwarf", mass: 0.02 });
         if (value !== "star") Object.assign(b, { starType: "", mass: 0 });
         if (!["gasGiant", "gasGiantAmmonia", "gasGiantWater", "star"].includes(value)) b.rings = "";
      }
      const s = path.match(/^stars\.(\d+)\.type$/);
      if (s) data.stars[s[1]].mass = STAR_TYPES[value]?.masses[4] ?? data.stars[s[1]].mass;
      await this.document.update({ [`system.${root}`]: data[root] });
   }

   /** Indexes from the clicked row. */
   static #idx(target) {
      const el = target.closest("[data-si]") ?? target;
      return { si: Number(el.dataset.si), bi: Number(el.dataset.bi), mi: Number(target.closest("[data-mi]")?.dataset.mi), xi: Number(target.closest("[data-xi]")?.dataset.xi), ei: Number(target.closest("[data-ei]")?.dataset.ei) };
   }

   /** Save stars (and civ, if given). */
   async #save(stars, civ) {
      const update = { "system.stars": stars };
      if (civ) update["system.civ"] = civ;
      return this.document.update(update);
   }

   /** @this {EDStarSystemSheet} */
   static async #onGenerate() {
      const sys = this.document.system;
      if (sys.stars.length) {
         const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: L("EDRPG.star.generate") }, content: `<p>${L("EDRPG.star.replaceWarning")}</p>`, rejectClose: false });
         if (!ok) return;
      }
      const result = await generatorDialog({ name: this.document.name, title: L("EDRPG.star.regenerate") });
      if (!result) return;
      await this.document.update({ name: result.name, "system.stars": result.data.stars, "system.civ": result.data.civ });
   }

   /** @this {EDStarSystemSheet} Reroll a star's planets. */
   static async #onRerollStar(event, target) {
      const { si } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      stars[si].bodies = rollPlanets(stars[si]);
      // Installations on that star's bodies lose their place.
      const civ = this.document.system.toObject().civ;
      for (const x of civ.installations) if (x.at.split(".")[0] === String(si)) x.at = "";
      await this.#save(stars, civ);
   }

   /** @this {EDStarSystemSheet} */
   static async #onAddStar() {
      const stars = this.document.system.toObject().stars;
      if (stars.length >= 6) return;
      stars.push({ type: "M", mass: 0.1, name: "", bodies: [] });
      await this.#save(stars);
   }

   /** @this {EDStarSystemSheet} */
   static async #onDeleteStar(event, target) {
      const { si } = EDStarSystemSheet.#idx(target);
      if (si === 0) return;
      const stars = this.document.system.toObject().stars;
      stars.splice(si, 1);
      const civ = this.document.system.toObject().civ;
      civ.installations = civ.installations.map((x) => {
         const [s, ...rest] = x.at.split(".");
         if (x.at === "" || Number(s) < si) return x;
         return { ...x, at: Number(s) === si ? "" : [Number(s) - 1, ...rest].join(".") };
      });
      await this.#save(stars, civ);
   }

   /** @this {EDStarSystemSheet} Reroll one orbit (No Planet removes it), with its rings and moons. */
   static async #onRerollBody(event, target) {
      const { si, bi } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      const old = stars[si].bodies[bi];
      const fresh = rollOrbit(stars[si], old.zone, old.distance);
      const civ = this.document.system.toObject().civ;
      if (!fresh) {
         stars[si].bodies.splice(bi, 1);
         ui.notifications.info(L("EDRPG.star.noPlanet", { distance: old.distance }));
         civ.installations = shiftInstallations(civ.installations, si, bi);
      } else {
         rollRingsAndMoons([fresh]);
         stars[si].bodies[bi] = fresh;
         for (const x of civ.installations) if (x.at.startsWith(`${si}.${bi}.`) && Number(x.at.split(".")[2]) >= fresh.moons.length) x.at = `${si}.${bi}`;
      }
      await this.#save(stars, civ);
   }

   /** @this {EDStarSystemSheet} */
   static async #onRerollMoons(event, target) {
      const { si, bi } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      const b = stars[si].bodies[bi];
      const keepRings = b.rings;
      b.moons = [];
      rollRingsAndMoons([b]);
      b.rings = keepRings;
      await this.#save(stars);
   }

   /** @this {EDStarSystemSheet} */
   static async #onAddBody(event, target) {
      const { si } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      const far = Math.max(0, ...stars[si].bodies.map((b) => b.distance));
      const distance = far < 1000 ? far + 100 : far + 1000;
      stars[si].bodies.push({ zone: distance <= 1000 ? "inner" : "outer", distance, type: "rocky", starType: "", mass: 0, rings: "", moons: [], name: "" });
      await this.#save(stars);
   }

   /** @this {EDStarSystemSheet} */
   static async #onDeleteBody(event, target) {
      const { si, bi } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      stars[si].bodies.splice(bi, 1);
      const civ = this.document.system.toObject().civ;
      civ.installations = shiftInstallations(civ.installations, si, bi);
      await this.#save(stars, civ);
   }

   /** @this {EDStarSystemSheet} */
   static async #onAddMoon(event, target) {
      const { si, bi } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      stars[si].bodies[bi].moons.push("rocky");
      await this.#save(stars);
   }

   /** @this {EDStarSystemSheet} */
   static async #onDeleteMoon(event, target) {
      const { si, bi, mi } = EDStarSystemSheet.#idx(target);
      const stars = this.document.system.toObject().stars;
      stars[si].bodies[bi].moons.splice(mi, 1);
      const civ = this.document.system.toObject().civ;
      for (const x of civ.installations) {
         const p = x.at.split(".").map(Number);
         if (p.length === 3 && p[0] === si && p[1] === bi) {
            if (p[2] === mi) x.at = `${si}.${bi}`;
            else if (p[2] > mi) x.at = `${si}.${bi}.${p[2] - 1}`;
         }
      }
      await this.#save(stars, civ);
   }

   /** @this {EDStarSystemSheet} Reroll economy, government, allegiance and installations. */
   static async #onRerollCiv() {
      const sys = this.document.system.toObject();
      const all = sys.stars.flatMap((s) => s.bodies);
      const civ = { inhabited: true, economies: rollEconomy(all), ...rollGovernment(), installations: rollInstallations(this.document.name, sys.stars) };
      await this.document.update({ "system.civ": civ });
   }

   /** @this {EDStarSystemSheet} */
   static async #onAddInstallation(event, target) {
      const civ = this.document.system.toObject().civ;
      const kind = target.dataset.kind ?? "station";
      civ.installations.push({ kind, name: "", at: "" });
      await this.document.update({ "system.civ": civ });
   }

   /** @this {EDStarSystemSheet} */
   static async #onDeleteInstallation(event, target) {
      const { xi } = EDStarSystemSheet.#idx(target);
      const civ = this.document.system.toObject().civ;
      civ.installations.splice(xi, 1);
      await this.document.update({ "system.civ": civ });
   }

   /** @this {EDStarSystemSheet} */
   static async #onAddEconomy(event, target) {
      const select = target.closest(".ed-ss-economies")?.querySelector("select.ed-ss-addecon");
      const value = select?.value;
      if (!value) return;
      const civ = this.document.system.toObject().civ;
      if (!civ.economies.includes(value)) civ.economies.push(value);
      await this.document.update({ "system.civ": civ });
   }

   /** @this {EDStarSystemSheet} */
   static async #onDeleteEconomy(event, target) {
      const { ei } = EDStarSystemSheet.#idx(target);
      const civ = this.document.system.toObject().civ;
      civ.economies.splice(ei, 1);
      await this.document.update({ "system.civ": civ });
   }

   /** @this {EDStarSystemSheet} Open the Commodity Market for this system and economy. */
   static async #onMarket(event, target) {
      const civ = this.document.system.civ;
      const economy = target.dataset.economy || civ.economies[0] || "";
      const port = civ.installations.find((x) => x.kind === "station")?.name || this.document.name;
      return openMarket({ port, economy: civ.government === "prisonColony" ? "prison" : economy });
   }

   /** @this {EDStarSystemSheet} Draw a Space Lane Encounter for the system's security rating. */
   static async #onSpaceLane() {
      const security = securityOf(this.document.system.civ.government) || "low";
      return drawTable(`Space Lane Encounters – ${{ high: "High", average: "Average", low: "Low" }[security]} Security`);
   }

   /** @this {EDStarSystemSheet} Draw a Planet Encounter (life-bearing or lifeless). */
   static async #onPlanetEncounter(event, target) {
      const { si, bi } = EDStarSystemSheet.#idx(target);
      const b = this.document.system.stars[si]?.bodies[bi];
      return drawTable(`Planet Encounters – ${BODY_TYPES[b?.type]?.life ? "Life-Bearing Planet" : "Lifeless Planet"}`);
   }
}

/**
 * Installations after a body is removed: those on it lose their place, later bodies of the same star move up.
 *
 * @param {object[]} list
 *
 * @param {number} si
 *
 * @param {number} bi
 *
 * @returns {object[]}
 */
function shiftInstallations(list, si, bi) {
   return list.map((x) => {
      const p = x.at.split(".").map(Number);
      if (x.at === "" || p[0] !== si || p[1] < bi) return x;
      if (p[1] === bi) return { ...x, at: "" };
      p[1] -= 1;
      return { ...x, at: p.join(".") };
   });
}

/**
 * Draw from a Roll Tables compendium table by name.
 *
 * @param {string} name
 */
async function drawTable(name) {
   const pack = game.packs.get("edrpg.roll-tables");
   const entry = (await pack?.getIndex())?.find((e) => e.name === name);
   if (!entry) return ui.notifications.warn(L("EDRPG.star.noTable", { name }));
   const table = await pack.getDocument(entry._id);
   return table.draw();
}
