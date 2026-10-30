import { useKarmaCapability } from "./karma.mjs";

/**
 * Partners (Core Rules pp.27–30). See {@link PartnerData} for the rules.
 */

/**
 * Partners can chain three deep — a partner (Endurance −5), their partner (−10) and theirs (−15); any further
 * partner "starts off dead" (Core Rules p.27).
 */
export const PARTNER_MAX_DEPTH = 3;

/** Distance (metres) within which a partner can use the host's Karma, if they can see them. */
export const PARTNER_KARMA_RANGE = 30;

/**
 * Is this background the Partner background?
 *
 * @param {Item} item
 *
 * @returns {boolean}
 */
export function isPartnerBackground(item) {
   return item?.type === "background" && (item.getFlag("edrpg", "partner") || item.name.trim().toLowerCase() === "partner");
}

/**
 * A partner's direct host.
 *
 * @param {Actor} actor
 *
 * @returns {Actor|null}
 */
export function partnerHost(actor) {
   if (actor?.type !== "partner" || !actor.system.host) return null;
   return fromUuidSync(actor.system.host) ?? null;
}

/**
 * Whose Karma a partner uses: every partner in the chain uses the owning character's — up the chain to the first actor
 * that isn't a partner.
 *
 * @param {Actor} actor
 *
 * @returns {Actor|null}
 */
export function karmaHost(actor) {
   let host = partnerHost(actor);
   for (let i = 0; host?.type === "partner" && i < PARTNER_MAX_DEPTH; i++) host = partnerHost(host);
   return host?.type === "partner" ? null : host;
}

/**
 * Partners linked to an actor (world actors only).
 *
 * @param {Actor} actor
 *
 * @returns {Actor[]}
 */
export function partnersOf(actor) {
   return game.actors?.filter((a) => a.type === "partner" && a.system.host === actor.uuid) ?? [];
}

/**
 * Why a partner can't use the host's Karma right now, if they can't.
 *
 * @param {Actor} partner
 *
 * @returns {{host: Actor|null, blocked: string|null, distance: number|null}}
 *   `blocked` is a localisation key; `distance` is metres between their tokens on the viewed scene (null if unknown).
 */
export function partnerKarmaStatus(partner) {
   const host = karmaHost(partner);
   if (!host) return { host: null, blocked: "EDRPG.partner.noHost", distance: null };
   if (host.system.partnerKarma === false) return { host, blocked: "EDRPG.partner.hostRefuses", distance: null };
   if (partner.itemTypes.cybernetic?.some((c) => !c.system.discreet)) return { host, blocked: "EDRPG.partner.visibleCybernetics", distance: null };
   let distance = null;
   const a = partner.getActiveTokens?.()[0];
   const b = host.getActiveTokens?.()[0];
   if (a && b && canvas?.grid) distance = Math.round(canvas.grid.measurePath([a.center, b.center]).distance);
   return { host, blocked: null, distance };
}

/**
 * A partner uses one of the host's Karma Capabilities, paid from the host's Karma.
 *
 * @param {Actor} partner
 *
 * @param {Item|object} capability  One of the host's capabilities (or the built-in Escape Death).
 *
 * @returns {Promise<ChatMessage|null>}
 */
export async function usePartnerKarma(partner, capability) {
   const { host, blocked, distance } = partnerKarmaStatus(partner);
   if (blocked) {
      ui.notifications.warn(game.i18n.format(blocked, { name: partner.name, host: host?.name ?? "" }));
      return null;
   }
   if (!host.isOwner) {
      ui.notifications.warn(game.i18n.format("EDRPG.partner.notHostOwner", { host: host.name }));
      return null;
   }
   // Within 30m and in sight: checked from the tokens where possible, otherwise the player confirms.
   if (distance === null || distance > PARTNER_KARMA_RANGE) {
      const key = distance === null ? "EDRPG.partner.confirmUnknown" : "EDRPG.partner.confirmFar";
      const ok = await foundry.applications.api.DialogV2.confirm({
         window: { title: game.i18n.localize("EDRPG.partner.karmaTitle") },
         content: `<p>${game.i18n.format(key, { name: foundry.utils.escapeHTML(partner.name), host: foundry.utils.escapeHTML(host.name), distance, range: PARTNER_KARMA_RANGE })}</p>`,
         rejectClose: false,
      });
      if (!ok) return null;
   }
   const message = await useKarmaCapability(host, capability);
   if (message) {
      await ChatMessage.create({
         speaker: ChatMessage.getSpeaker({ actor: partner }),
         content: `<div class="edrpg edrpg-chat"><p>${game.i18n.format("EDRPG.partner.usedKarma", {
            name: foundry.utils.escapeHTML(partner.name),
            capability: foundry.utils.escapeHTML(capability.name),
            host: foundry.utils.escapeHTML(host.name),
         })}</p></div>`,
      });
   }
   return message;
}

/**
 * The actor whose Karma pays for an actor's capabilities: themselves, or a partner's host if allowed.
 *
 * @param {Actor} actor
 *
 * @returns {Actor|null}
 */
export function karmaPayer(actor) {
   if (actor?.type !== "partner") return actor;
   const { host, blocked } = partnerKarmaStatus(actor);
   return blocked ? null : host;
}

/**
 * Create a partner for a host who has the Partner background.
 *
 * @param {Actor} host
 *
 * @returns {Promise<Actor|null>}
 */
export async function createPartner(host) {
   const depth = host.type === "partner" ? host.system.depth + 1 : 1;
   if (depth > PARTNER_MAX_DEPTH) {
      ui.notifications.warn(game.i18n.localize("EDRPG.partner.tooDeep"));
      return null;
   }
   const actor = await Actor.implementation.create({
      name: game.i18n.format("EDRPG.partner.defaultName", { host: host.name }),
      type: "partner",
      img: "icons/svg/mystery-man.svg",
      folder: host.folder?.id ?? null,
      ownership: foundry.utils.deepClone(host.ownership),
      system: {
         host: host.uuid,
         depth,
         rankPoints: host.system.rankPoints,
         advancement: { rank: host.system.rank.key },
         creation: { complete: false },
      },
      prototypeToken: { actorLink: true, disposition: host.prototypeToken?.disposition ?? 1 },
   });
   if (actor) {
      await actor.update({ "system.endurance.value": actor.system.endurance.max });
      actor.sheet.render({ force: true });
   }
   return actor;
}

/**
 * Keep partners' Rank Points in step with their host (rank follows the host); cascades down the chain.
 *
 * @param {Actor} host
 */
export async function syncPartnerRank(host) {
   for (const partner of partnersOf(host)) {
      if (partner.system.rankPoints !== host.system.rankPoints && partner.isOwner) {
         await partner.update({ "system.rankPoints": host.system.rankPoints });
         if (partner.system.pendingRanks?.length) {
            ui.notifications.info(game.i18n.format("EDRPG.partner.ranksUp", { name: partner.name }));
         }
      }
   }
}
