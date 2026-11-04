/**
 * Star System Generator (Core Rules pp.330–337).
 *
 * 1. Stars: roll the Primary star (d100, then a d10 for its mass; 99 → Rare Main Sequence, 100 → Special Spectral).
 *    Roll again: a lower-mass star is a Companion; then on a D10 of 9–10 roll for another (at most five).
 * 2. Inner planets: one roll per 100ls out to 1,000ls (O, B and A stars: 2,000ls) on the star's row. Water, Earth-like
 *    and Ammonia worlds only form at the Goldilocks distance; elsewhere they are Rocky, High Metal Content or Metal
 *    Rich. Two No Planet results in a row end the star's inner planets.
 * 3. Outer planets: one roll per 1,000ls from 2,000ls to 10,000ls (O, B, A: 3,000ls to 20,000ls), stopping the same
 *    way. Gas giants and stars (not L-type or main sequence) may have rings. Gas giants and stars roll for moons.
 *    Other worlds roll for moons one after another (in a random order) until one has none.
 *    A rolled Star uses the Orbiting Stars table and can't outweigh the star it orbits.
 * 4. Companion stars get planets the same way.
 * 5. Civilisation (if inhabited): Space Stations, Outposts and Ground Settlements (+5 per Metal Rich planet and gas
 *    giant with metallic rings, +10 per Water World or Earth-like world), economy, government (security rating) and
 *    allegiance, and settlement names.
 *
 * Rulings:
 * - The Economy table skips 72–76: reroll.
 * - The Space Outposts table skips 95: it gives 5 (91–95).
 * - Overlapping ranges (A-type Inner 56–60 / 60–65, Outer 46–50 / 50–75) give the lower row its printed range and
 *   the next column starts one higher.
 * - Special spectral stars use their Planet Generation row's Goldilocks distance (T-Tauri: K-type, 200ls).
 * - A Metal Rich world outside the Goldilocks distance is worth the Metal Rich reward (2,000cr), not the 700cr the
 *   Inner Planet table prints in the Ammonia column.
 * - Outer ice worlds join the "pick a world" moon checks along with the inner planets.
 */

/** A random integer 1–n, from Foundry's generator when there is one. */
export function die(n, rng) {
   const r = rng ?? globalThis.CONFIG?.Dice?.randomUniform ?? Math.random;
   return Math.floor(r() * n) + 1;
}

/* -------------------------------------------- */
/*  Tables                                      */
/* -------------------------------------------- */

/** Mass by D10 (index 1–10). */
const M = (...pairs) => {
   const out = [];
   for (const [upTo, mass] of pairs) while (out.length < upTo) out.push(mass);
   return out;
};
const MASS_RED = M([2, 0.3], [5, 0.4], [7, 0.5], [8, 0.6], [9, 0.7], [10, 0.8]);
const MASS_G = M([2, 0.8], [4, 0.9], [6, 1.0], [8, 1.1], [10, 1.2]);
const MASS_K = M([1, 0.45], [3, 0.5], [5, 0.6], [8, 0.7], [10, 0.8]);
const MASS_A = M([2, 1.4], [6, 1.6], [8, 1.8], [9, 1.9], [10, 2.0]);

/**
 * Star types. row: the Inner/Outer Planet table row. gz: Goldilocks distance (ls) or null. main: main sequence.
 * reward: Discovery Reward (cr).
 */
export const STAR_TYPES = {
   L: { masses: M([2, 0.02], [4, 0.03], [6, 0.04], [8, 0.06], [10, 0.08]), row: "L", gz: null, scoop: false, reward: 1200, main: true },
   M: { masses: M([2, 0.1], [4, 0.2], [6, 0.3], [8, 0.4], [10, 0.5]), row: "M", gz: 100, scoop: true, reward: 1300, main: true },
   K: { masses: MASS_K, row: "K", gz: 200, scoop: true, reward: 1400, main: true },
   G: { masses: MASS_G, row: "G", gz: 500, scoop: true, reward: 1400, main: true },
   F: { masses: M([2, 1.0], [4, 1.1], [6, 1.2], [8, 1.3], [10, 1.4]), row: "F", gz: 1000, scoop: true, reward: 1500, main: true },
   A: { masses: M([2, 1.4], [6, 1.6], [8, 1.8], [9, 2], [10, 2.1]), row: "A", gz: 2000, scoop: true, reward: 1500, main: true, rare: true },
   B: { masses: M([2, 3], [4, 6], [6, 10], [8, 13], [10, 16]), row: "B", gz: null, scoop: true, reward: 1500, main: true, rare: true },
   O: { masses: M([2, 20], [4, 35], [6, 50], [8, 70], [10, 90]), row: "O", gz: null, scoop: true, reward: 1500, main: true, rare: true },
   redGiant: { masses: MASS_RED, row: "Giant", gz: null, scoop: true, reward: 1200 },
   carbon: { masses: MASS_RED, row: "Giant", gz: null, scoop: false, reward: 1200 },
   yellowGiant: { masses: MASS_G, row: "Giant", gz: null, scoop: true, reward: 1400 },
   blueGiant: { masses: MASS_A, row: "Giant", gz: null, scoop: true, reward: 1500 },
   blackHole: { masses: M([1, 0.1], [2, 50], [3, 125], [4, 370], [5, 420], [7, 650], [9, 800], [10, 1000]), row: "Massive", gz: null, scoop: false, reward: 20000 },
   neutron: { masses: MASS_A, row: "Massive", gz: null, scoop: false, reward: 19000 },
   sType: { masses: MASS_RED, row: "L", gz: null, scoop: false, reward: 1200 },
   wolfRayet: { masses: MASS_G, row: "Giant", gz: null, scoop: false, reward: 1200 },
   whiteDwarf: { masses: MASS_G, row: "Massive", gz: null, scoop: false, reward: 10000 },
   tTauri: { masses: MASS_K, row: "K", gz: 200, scoop: false, reward: 1200 },
   tDwarf: { masses: M([2, 0.01], [4, 0.02], [6, 0.03], [8, 0.04], [10, 0.05]), row: "L", gz: null, scoop: false, reward: 1200 },
   yDwarf: { masses: M([2, 0.005], [4, 0.01], [6, 0.015], [8, 0.02], [10, 0.025]), row: "L", gz: null, scoop: false, reward: 1200 },
};

/** [highest roll, result] lists. */
const PRIMARY = [[16, "L"], [75, "M"], [87, "K"], [94, "G"], [98, "F"], [99, "rare"], [100, "special"]];
const RARE = [[65, "A"], [98, "B"], [100, "O"]];
const SPECIAL = [[25, "redGiant"], [35, "carbon"], [40, "yellowGiant"], [45, "blueGiant"], [46, "blackHole"], [48, "neutron"], [54, "sType"], [56, "wolfRayet"], [67, "whiteDwarf"], [88, "tTauri"], [98, "tDwarf"], [100, "yDwarf"]];
const ORBITING = [[2, "yDwarf"], [7, "tDwarf"], [9, "L"], [10, "main"]];

/** Inner Planet Table columns, and each row's highest roll per column (null: not on this row). */
const INNER_COLUMNS = ["none", "belt", "ice", "rocky", "hmc", "metalRich", "gzWater", "gzEarth", "gzAmmonia", "star"];
const INNER = {
   L: [50, 60, 90, 100, null, null, null, null, null, null],
   M: [40, 50, 60, 65, 85, 95, 97, 99, 100, null],
   K: [30, 40, 41, 50, 75, 85, 95, 99, 100, null],
   G: [30, 40, 41, 50, 60, 80, 90, 99, 100, null],
   F: [40, 50, 51, 60, 70, 85, 90, 95, 96, 100],
   A: [50, 55, 60, 65, 70, 90, 91, 92, 93, 100],
   B: [60, 65, 70, 75, 80, 90, null, null, null, 100],
   O: [65, 70, 75, 80, 85, 90, null, null, null, 100],
};
/** Goldilocks columns: [in the zone, elsewhere]. */
const GZ = { gzWater: ["water", "rocky"], gzEarth: ["earthLike", "hmc"], gzAmmonia: ["ammonia", "metalRich"] };

const OUTER_COLUMNS = ["none", "ice", "gasGiant", "gasGiantAmmonia", "gasGiantWater", "star"];
const OUTER = {
   L: [90, 100, null, null, null, null],
   M: [85, 98, 100, null, null, null],
   K: [70, 75, 90, 95, 100, null],
   G: [70, 75, 90, 95, 100, null],
   F: [65, 70, 89, 94, 99, 100],
   A: [45, 50, 75, 80, 85, 100],
   B: [40, 45, 65, 70, 75, 100],
   O: [35, 40, 55, 60, 65, 100],
   Giant: [70, 75, 86, 88, 90, 100],
   Massive: [30, 35, 46, 48, 50, 100],
};

/** Planet types: Discovery Reward, and with metallic rings for gas giants. */
export const BODY_TYPES = {
   belt: { reward: 100, kind: "belt" },
   ice: { reward: 100, kind: "planet", solid: true },
   rocky: { reward: 200, kind: "planet", solid: true },
   hmc: { reward: 700, kind: "planet", solid: true },
   metalRich: { reward: 2000, kind: "planet", solid: true },
   water: { reward: 10000, kind: "planet", solid: true, life: true },
   earthLike: { reward: 20000, kind: "planet", solid: true, life: true },
   ammonia: { reward: 5000, kind: "planet", solid: true, life: true },
   gasGiant: { reward: 750, ringed: 4000, kind: "gasGiant" },
   gasGiantAmmonia: { reward: 2000, ringed: 5000, kind: "gasGiant", life: true },
   gasGiantWater: { reward: 3000, ringed: 6000, kind: "gasGiant", life: true },
   star: { reward: 0, kind: "star" },
};

/** Rings (D10), for gas giants and stars that aren't L-type or main sequence. */
const RINGS = [[4, ""], [5, "rocky"], [6, "metallic"], [7, "ice"], [8, "rockyMetallic"], [9, "iceMetallic"], [10, "iceRocky"]];
/** Moons (D10): [planet, gas giant or star]. */
const MOONS = [null, [0, 0], [0, 0], [0, 0], [0, 3], [0, 4], [1, 6], [1, 7], [2, 8], [2, 10], [3, 12]];
const MOON_TYPE = [[4, "ice"], [8, "rocky"], [9, "hmc"], [10, "metalRich"]];

const STATIONS = [[30, 0], [60, 1], [75, 2], [90, 3], [97, 4], [99, 5], [Infinity, 6]];
const OUTPOSTS = [[20, 0], [50, 1], [65, 2], [80, 3], [90, 4], [95, 5], [97, 6], [99, 7], [Infinity, 8]];
const SETTLEMENTS = [[15, 0], [40, 1], [50, 2], [65, 3], [80, 4], [90, 5], [93, 6], [95, 7], [97, 8], [99, 9], [Infinity, 10]];

/** Government (D100): society and security rating. */
export const GOVERNMENTS = {
   anarchy: "low", communism: "average", confederacy: "average", corporate: "high", cooperative: "high", democracy: "high",
   dictatorship: "average", feudal: "low", imperial: "average", patronage: "average", prisonColony: "high", theocracy: "average",
};
const GOVERNMENT = [[15, "anarchy"], [20, "communism"], [30, "confederacy"], [50, "corporate"], [55, "cooperative"], [70, "democracy"], [80, "dictatorship"], [85, "feudal"], [90, "imperial"], [95, "patronage"], [96, "prisonColony"], [100, "theocracy"]];
const ECONOMY = [[8, "colony"], [24, "highTech"], [40, "industrial"], [48, "military"], [71, "refinery"], [76, null], [84, "service"], [92, "terraforming"], [100, "tourism"]];
const ALLEGIANCE = [[1, "alliance"], [3, "empire"], [6, "federation"], [10, "independent"]];
export const ECONOMIES = ["agricultural", "extraction", "colony", "highTech", "industrial", "military", "refinery", "service", "terraforming", "tourism"];
export const ALLEGIANCES = ["alliance", "empire", "federation", "independent"];

/** Random Settlement Name (D100 in pairs; the first entry is the system's own name). */
const FIRST_NAMES = [null, "Amis", "Banks", "Bridger", "Cady", "Clement", "Conrad", "Cook", "Davis", "Dekker's", "Dobson", "Faraday", "Faris", "Ford", "Franklin", "Garan", "Haber", "Hooke", "Hutton", "Jones", "Kotzebue", "Locke", "Magnus", "McDaniel", "Napier", "O'Connor", "Patsayev", "Patterson", "Pavlov", "Perry", "Piccard", "Pythagoras", "Rashid", "Roosa", "Sagan", "Saker's", "Shaver", "Shiner", "Sinclair", "Singer", "Song", "Steiner", "Taylor", "Titan", "Tshang", "Wagner", "Waldeck", "Watts", "Wolcott's", "Yang"];
const SECOND_NAMES = ["Arsenal", "Base", "Bastion", "Beacon", "Camp", "City", "Claim", "Colony", "Co-operative", "Depot", "Dock", "Enterprise", "Escape", "Exchange", "Folly", "Freeport", "Gateway", "Hangar", "High", "Holdings", "Horizons", "Hub", "Inheritance", "Installation", "Keep", "Lab", "Landing", "Legacy", "Market", "Mine", "Oasis", "Orbital", "Palace", "Park", "Plant", "Platform", "Point", "Port", "Progress", "Prospect", "Reach", "Reformatory", "Relay", "Ring", "Station", "Survey", "Terminal", "Vision", "Vista", "Works"];

/** Look a roll up on a [highest, result] list. */
function pick(table, roll) {
   return table.find(([max]) => roll <= max)?.[1];
}

/** Look a roll up on a row of upper bounds (null = not on this row). */
function column(bounds, columns, roll) {
   let i = 0;
   for (const max of bounds) {
      if (max !== null && roll <= max) return columns[i];
      i++;
   }
   return columns[0];
}

/* -------------------------------------------- */
/*  Stars                                       */
/* -------------------------------------------- */

/**
 * Roll a star on the Primary Star Table (following Rare and Special), with its mass.
 *
 * @returns {{type: string, mass: number}}
 */
export function rollStar(rng) {
   let type = pick(PRIMARY, die(100, rng));
   if (type === "rare") type = pick(RARE, die(100, rng));
   else if (type === "special") type = pick(SPECIAL, die(100, rng));
   return { type, mass: STAR_TYPES[type].masses[die(10, rng) - 1] };
}

/**
 * A star from the Special Spectral Type table, with its mass.
 *
 * @returns {{type: string, mass: number}}
 */
export function rollSpecialStar(rng) {
   const type = pick(SPECIAL, die(100, rng));
   return { type, mass: STAR_TYPES[type].masses[die(10, rng) - 1] };
}

/**
 * An Orbiting Star, no heavier than its parent (rerolled until it fits; null if nothing can).
 *
 * @param {number} parentMass
 *
 * @returns {{type: string, mass: number}|null}
 */
export function rollOrbitingStar(parentMass, rng) {
   for (let i = 0; i < 30; i++) {
      const kind = pick(ORBITING, die(10, rng));
      const star = kind === "main" ? rollStar(rng) : { type: kind, mass: STAR_TYPES[kind].masses[die(10, rng) - 1] };
      if (star.mass <= parentMass) return star;
   }
   return null;
}

/** Can this star or gas giant have rings? Gas giants and stars that aren't L-type or main sequence. */
function ringable(body) {
   if (body.type === "star") return !STAR_TYPES[body.starType]?.main;
   return BODY_TYPES[body.type]?.kind === "gasGiant";
}

/* -------------------------------------------- */
/*  Planets                                     */
/* -------------------------------------------- */

/**
 * Orbits checked for a star: inner every 100ls, outer every 1,000ls.
 *
 * @param {string} starType
 *
 * @returns {{inner: number[], outer: number[]}}
 */
export function orbitsFor(starType) {
   const t = STAR_TYPES[starType];
   const rare = ["A", "B", "O"].includes(t.row);
   const inner = INNER[t.row] ? Array.from({ length: rare ? 20 : 10 }, (_, i) => (i + 1) * 100) : [];
   const outer = rare ? Array.from({ length: 18 }, (_, i) => (i + 3) * 1000) : Array.from({ length: 9 }, (_, i) => (i + 2) * 1000);
   return { inner, outer };
}

/**
 * Roll one orbit.
 *
 * @param {object} star       {type, mass}
 *
 * @param {"inner"|"outer"} zone
 *
 * @param {number} distance
 *
 * @returns {object|null}  A body, or null for No Planet.
 */
export function rollOrbit(star, zone, distance, rng) {
   const t = STAR_TYPES[star.type];
   const roll = die(100, rng);
   let type = zone === "inner" ? column(INNER[t.row], INNER_COLUMNS, roll) : column(OUTER[t.row], OUTER_COLUMNS, roll);
   if (type === "none") return null;
   if (GZ[type]) type = GZ[type][distance === t.gz ? 0 : 1];
   const body = { zone, distance, type, starType: "", mass: 0, rings: "", moons: [] };
   if (type === "star") {
      const s = rollOrbitingStar(star.mass, rng);
      if (!s) return null;
      body.starType = s.type;
      body.mass = s.mass;
   }
   return body;
}

/**
 * Rings and moons for a star's bodies (in place).
 *
 * @param {object[]} bodies
 */
export function rollRingsAndMoons(bodies, rng) {
   const moonsOf = (count) => Array.from({ length: count }, () => pick(MOON_TYPE, die(10, rng)));
   for (const b of bodies) {
      if (ringable(b)) b.rings = pick(RINGS, die(10, rng));
      if (b.type === "star" || BODY_TYPES[b.type]?.kind === "gasGiant") b.moons = moonsOf(MOONS[die(10, rng)][1]);
   }
   // Other worlds: pick one at a time (in a random order) until one has no moons.
   const worlds = bodies.filter((b) => BODY_TYPES[b.type]?.kind === "planet");
   for (let i = worlds.length - 1; i > 0; i--) {
      const j = die(i + 1, rng) - 1;
      [worlds[i], worlds[j]] = [worlds[j], worlds[i]];
   }
   for (const w of worlds) {
      const n = MOONS[die(10, rng)][0];
      if (!n) break;
      w.moons = moonsOf(n);
   }
}

/**
 * Every orbit of one star: inner then outer, each stopping after two No Planet results in a row.
 *
 * @param {object} star  {type, mass}
 *
 * @param {object} [options]
 *
 * @param {boolean} [options.stopAfterTwo=true]
 *
 * @returns {object[]}
 */
export function rollPlanets(star, { stopAfterTwo = true } = {}, rng) {
   const bodies = [];
   const { inner, outer } = orbitsFor(star.type);
   for (const [zone, distances] of [["inner", inner], ["outer", outer]]) {
      let misses = 0;
      for (const d of distances) {
         const body = rollOrbit(star, zone, d, rng);
         if (body) {
            bodies.push(body);
            misses = 0;
         } else if (++misses >= 2 && stopAfterTwo) break;
      }
   }
   rollRingsAndMoons(bodies, rng);
   return bodies;
}

/* -------------------------------------------- */
/*  Civilisation                                */
/* -------------------------------------------- */

/** A settlement name: First Name (01–02: the system's name) + Second Name. */
export function settlementName(systemName, rng) {
   const first = FIRST_NAMES[Math.ceil(die(100, rng) / 2) - 1] ?? systemName;
   return `${first} ${SECOND_NAMES[Math.ceil(die(100, rng) / 2) - 1]}`;
}

/** Metallic rings? */
export function metallic(rings) {
   return /metallic/i.test(rings ?? "");
}

/**
 * The +5/+10 bonus to the installation rolls.
 *
 * @param {object[]} bodies  Every star's bodies.
 *
 * @returns {number}
 */
export function civBonus(bodies) {
   let bonus = 0;
   for (const b of bodies) {
      if (b.type === "metalRich") bonus += 5;
      if (BODY_TYPES[b.type]?.kind === "gasGiant" && metallic(b.rings)) bonus += 5;
      if (b.type === "water" || b.type === "earthLike") bonus += 10;
   }
   return bonus;
}

/**
 * The system's economy: Agricultural with a Water World or Earth-like world, Extraction with two or more Metal Rich
 * planets and/or gas giants with metallic rings; otherwise (or as well, if asked) roll on the Economy table.
 *
 * @param {object[]} bodies
 *
 * @param {boolean} [extra=false]  Roll on the table even if the planets give an economy.
 *
 * @returns {string[]}
 */
export function rollEconomy(bodies, extra = false, rng) {
   const out = [];
   if (bodies.some((b) => b.type === "water" || b.type === "earthLike")) out.push("agricultural");
   const metal = bodies.filter((b) => b.type === "metalRich" || (BODY_TYPES[b.type]?.kind === "gasGiant" && metallic(b.rings))).length;
   if (metal >= 2) out.push("extraction");
   if (!out.length || extra) {
      let e = null;
      while (!e) e = pick(ECONOMY, die(100, rng));
      if (!out.includes(e)) out.push(e);
   }
   return out;
}

/**
 * Government and allegiance: only the Empire has Imperial governments, the Empire has no Democracies and the
 * Federation no Patronages.
 *
 * @param {string} [allegiance]  Rolled if not given.
 *
 * @returns {{government: string, allegiance: string}}
 */
export function rollGovernment(allegiance, rng) {
   allegiance ||= pick(ALLEGIANCE, die(10, rng));
   let government;
   for (let i = 0; i < 100; i++) {
      government = pick(GOVERNMENT, die(100, rng));
      if (government === "imperial" && allegiance !== "empire") continue;
      if (government === "democracy" && allegiance === "empire") continue;
      if (government === "patronage" && allegiance === "federation") continue;
      break;
   }
   return { government, allegiance };
}

/**
 * Space Stations, Outposts and Ground Settlements, named and placed. Settlements need solid ground (planets and
 * moons, not gas giants, stars or belts); stations and outposts may orbit anything.
 *
 * @param {string} systemName
 *
 * @param {object[]} stars  With their bodies.
 *
 * @returns {object[]}  {kind, name, at} — at: "s.b" or "s.b.m" (star, body, moon indexes), or "".
 */
export function rollInstallations(systemName, stars, rng) {
   const all = stars.flatMap((s) => s.bodies);
   const bonus = civBonus(all);
   const refs = { any: [], ground: [] };
   stars.forEach((s, si) =>
      s.bodies.forEach((b, bi) => {
         refs.any.push(`${si}.${bi}`);
         if (BODY_TYPES[b.type]?.solid) refs.ground.push(`${si}.${bi}`);
         b.moons.forEach((_, mi) => {
            refs.ground.push(`${si}.${bi}.${mi}`);
            refs.any.push(`${si}.${bi}.${mi}`);
         });
      }),
   );
   const place = (list) => (list.length ? list[die(list.length, rng) - 1] : "");
   const out = [];
   for (const [kind, table, where] of [["station", STATIONS, "any"], ["outpost", OUTPOSTS, "any"], ["settlement", SETTLEMENTS, "ground"]]) {
      const n = pick(table, die(100, rng) + bonus);
      for (let i = 0; i < n; i++) out.push({ kind, name: settlementName(systemName, rng), at: place(refs[where]) });
   }
   return out;
}

/* -------------------------------------------- */
/*  The whole system                            */
/* -------------------------------------------- */

/**
 * Generate a star system.
 *
 * @param {object} [options]
 *
 * @param {string} [options.name="New System"]
 *
 * @param {string} [options.primary]       A star type to use instead of rolling ("special": roll a Special Spectral type).
 *
 * @param {boolean} [options.companions=true]
 *
 * @param {boolean} [options.inhabited=true]
 *
 * @param {string} [options.allegiance]    Instead of rolling.
 *
 * @param {boolean} [options.stopAfterTwo=true]
 *
 * @param {Function} [rng]  Random 0–1 (tests).
 *
 * @returns {{stars: object[], civ: object}}
 */
export function generateSystem({ name = "New System", primary, companions = true, inhabited = true, allegiance, stopAfterTwo = true } = {}, rng) {
   const first = primary === "special" ? rollSpecialStar(rng) : primary ? { type: primary, mass: STAR_TYPES[primary].masses[die(10, rng) - 1] } : rollStar(rng);
   const stars = [first];
   if (companions) {
      let next = rollStar(rng);
      while (next.mass < first.mass && stars.length < 6) {
         stars.push(next);
         if (die(10, rng) < 9) break;
         next = rollStar(rng);
      }
   }
   for (const s of stars) s.bodies = rollPlanets(s, { stopAfterTwo }, rng);
   const civ = { inhabited, economies: [], government: "", allegiance: "", installations: [] };
   if (inhabited) {
      const all = stars.flatMap((s) => s.bodies);
      civ.economies = rollEconomy(all, false, rng);
      Object.assign(civ, rollGovernment(allegiance, rng));
      civ.installations = rollInstallations(name, stars, rng);
   }
   return { stars, civ };
}

/* -------------------------------------------- */
/*  Names and values                            */
/* -------------------------------------------- */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Names by the book's convention: stars "Wyrd A", "Wyrd B" (a lone star is just "Wyrd"); planets and orbiting stars
 * numbered by closeness ("Wyrd A 5"); asteroid belts lettered ("Wyrd B A"); moons lettered after their planet
 * ("Wyrd A 5 A").
 *
 * @param {string} systemName
 *
 * @param {object[]} stars  With bodies (sorted by distance).
 *
 * @returns {{stars: string[], bodies: string[][], moons: string[][][]}}
 */
export function names(systemName, stars) {
   const multi = stars.length > 1;
   const starNames = stars.map((_, i) => (multi ? `${systemName} ${LETTERS[i]}` : systemName));
   const bodies = [];
   const moons = [];
   stars.forEach((s, si) => {
      let planet = 0;
      let belt = 0;
      const order = s.bodies.map((b, i) => [b, i]).sort((a, b) => a[0].distance - b[0].distance);
      const bn = [];
      const mn = [];
      for (const [b, i] of order) {
         bn[i] = b.name || (b.type === "belt" ? `${starNames[si]} ${LETTERS[belt++] ?? belt}` : `${starNames[si]} ${++planet}`);
         mn[i] = b.moons.map((_, m) => `${bn[i]} ${LETTERS[m] ?? m + 1}`);
      }
      bodies.push(bn);
      moons.push(mn);
   });
   return { stars: starNames, bodies, moons };
}

/** A body's Discovery Reward (with its moons). */
export function bodyReward(b) {
   const t = BODY_TYPES[b.type];
   let r = b.type === "star" ? (STAR_TYPES[b.starType]?.reward ?? 0) : t?.ringed && metallic(b.rings) ? t.ringed : (t?.reward ?? 0);
   for (const m of b.moons ?? []) r += BODY_TYPES[m]?.reward ?? 0;
   return r;
}

/** The whole system's Discovery Reward. */
export function systemReward(stars) {
   return stars.reduce((n, s) => n + (STAR_TYPES[s.type]?.reward ?? 0) + s.bodies.reduce((m, b) => m + bodyReward(b), 0), 0);
}

/** Security rating from the government ("" if none). */
export function securityOf(government) {
   return GOVERNMENTS[government] ?? "";
}
