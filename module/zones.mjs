/**
 * Combat zones for vehicle and space combat (Core Rules p.63): up-close inside the circle on the combat maps,
 * at-distance outside it. Scenes from the Combat Maps compendium carry the circle in flags.edrpg.combatMap.
 */

/**
 * The combat map settings of a scene, if it is one.
 *
 * @param {Scene} [scene]
 *
 * @returns {{kind: string, upClose: {x: number, y: number, radius: number}}|null}
 */
export function combatMapOf(scene = canvas?.scene) {
   return scene?.getFlag("edrpg", "combatMap") ?? null;
}

/**
 * Which zone a token is in on a combat map.
 *
 * @param {TokenDocument} token
 *
 * @returns {"upClose"|"atDistance"|null}  Null when the scene isn't a combat map.
 */
export function zoneOfToken(token) {
   const map = combatMapOf(token?.parent);
   if (!map?.upClose) return null;
   const size = token.parent.grid?.size ?? 100;
   const cx = token.x + (token.width * size) / 2;
   const cy = token.y + (token.height * size) / 2;
   return Math.hypot(cx - map.upClose.x, cy - map.upClose.y) <= map.upClose.radius ? "upClose" : "atDistance";
}

/**
 * A vehicle's current zone: from its token's position on a combat map, otherwise its recorded zone.
 *
 * @param {Actor} actor
 *
 * @returns {"upClose"|"atDistance"}
 */
export function zoneOf(actor) {
   const token = actor?.getActiveTokens?.()[0]?.document;
   return (token && zoneOfToken(token)) ?? actor?.system.zone ?? "atDistance";
}

/**
 * Put a vehicle in a zone: records it and, on a combat map, moves its token into (or out of) the up-close circle —
 * next to `near` when given.
 *
 * @param {Actor} actor
 *
 * @param {"upClose"|"atDistance"} zone
 *
 * @param {Actor} [near]
 */
export async function moveToZone(actor, zone, near = null) {
   if (actor.system.zone !== zone) await actor.update({ "system.zone": zone });
   const token = actor.getActiveTokens?.()[0]?.document;
   const map = combatMapOf(token?.parent);
   if (!token || !map?.upClose || zoneOfToken(token) === zone) return;
   const scene = token.parent;
   const size = scene.grid?.size ?? 100;
   const { x: cx, y: cy, radius } = map.upClose;
   const half = (token.width * size) / 2;
   const centre = { x: token.x + half, y: token.y + half };
   let target;
   if (zone === "upClose") {
      const other = near?.getActiveTokens?.()[0]?.document;
      const anchor = other && other.parent === scene && zoneOfToken(other) === "upClose"
         ? { x: other.x + (other.width * size) / 2, y: other.y + (other.width * size) / 2 }
         : { x: cx, y: cy };
      // Beside the anchor, on the side facing where the token came from, kept inside the circle.
      const a = Math.atan2(centre.y - anchor.y, centre.x - anchor.x);
      target = { x: anchor.x + Math.cos(a) * size * 1.2, y: anchor.y + Math.sin(a) * size * 1.2 };
      const d = Math.hypot(target.x - cx, target.y - cy);
      const limit = radius - half - size * 0.25;
      if (d > limit) target = { x: cx + ((target.x - cx) / d) * limit, y: cy + ((target.y - cy) / d) * limit };
   } else {
      const a = centre.x === cx && centre.y === cy ? Math.random() * Math.PI * 2 : Math.atan2(centre.y - cy, centre.x - cx);
      const r = radius + half + size * 0.75;
      target = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
   }
   const w = scene.width ?? scene.dimensions?.sceneWidth ?? Infinity;
   const h = scene.height ?? scene.dimensions?.sceneHeight ?? Infinity;
   const x = Math.round(Math.min(Math.max(target.x - half, 0), w - half * 2));
   const y = Math.round(Math.min(Math.max(target.y - half, 0), h - half * 2));
   await token.update({ x, y });
}
