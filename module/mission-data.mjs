/**
 * Mission Generator tables (Core Rules pp.338–347): each theme's D10 missions, each with a D10 detail (where it
 * happens) and a D10 twist. These are short summaries for the GM; the book has the full scenes.
 * Each entry: [highest roll, summary].
 */

/** Mission Income and Treasure Income per player, by rank (p.338). */
export const MISSION_REWARDS = {
   harmless: [80000, 80000],
   mostlyHarmless: [150000, 80000],
   novice: [200000, 120000],
   competent: [500000, 400000],
   expert: [1000000, 1000000],
   master: [3000000, 3000000],
   dangerous: [6000000, 6000000],
   deadly: [9000000, 9000000],
   elite: [12000000, 12000000],
};

export const MISSIONS = {
   military: [
      {
         max: 1, name: "Recon", page: 339,
         brief: "Scan an enemy installation and get the data home. At least as many guard ships as players; they may need drawing off first.",
         details: [[4, "A space installation (small or large outpost)."], [9, "A ground installation: approach on foot or by vehicle."], [10, "Deep underground: ships must land at least 50km away."]],
         twists: [[3, "A scan from outside isn't enough: they must get inside."], [5, "A trap: the site is empty and reinforcements try to capture the players."], [7, "One of three identical sites, and all three must be scanned."], [8, "The intel is wrong and the site isn't there (a suspicious ship may lead on)."], [10, "The site belongs to the employer's own side, who want its secrets."]],
      },
      {
         max: 2, name: "Disruption at Checkpoint Zulu", page: 339,
         brief: "Take out and replace a checkpoint's security detail, then destroy or disable the supply ships passing through to the front.",
         details: [[6, "A navigation beacon in space."], [10, "A surface railhead where freighters unload."]],
         twists: [[3, "It's also a staging post full of troops about to deploy."], [5, "Civilians are present and must be protected."], [8, "Another force attacks at the same time: friend and foe are hard to tell apart."], [10, "It's in lockdown after an attack by your allies."]],
      },
      {
         max: 3, name: "Raid", page: 339,
         brief: "A small elite team destroys a small communications installation.",
         details: [[4, "A small platform orbiting a moon."], [9, "On the moon's surface."], [10, "In the middle of a town or city."]],
         twists: [[2, "Biomods or alien creatures have overrun the base."], [5, "Enemy troops are using it as a rest stop."], [7, "Unmanned, and it starts a self-destruct countdown once they're inside."], [8, "Faulty air supply: hypoxia lowers their Skills until it's fixed."], [10, "The array has been moved somewhere else."]],
      },
      {
         max: 4, name: "Snatch Squad", page: 340,
         brief: "Capture a political agitator inside a station during a civil war, with a smash-and-grab.",
         details: [[4, "A base inside a Coriolis station."], [9, "An Orbis station at normal gravity."], [10, "An outpost or platform with no gravity."]],
         twists: [[2, "Enemies within try to kill the target; no pay if they succeed."], [4, "A rival team sent by a criminal mastermind wants the same target."], [6, "The target has been replaced by a lookalike."], [8, "Station security sides with the target."], [10, "The target tries to take their own life rather than be captured."]],
      },
      {
         max: 5, name: "Hostage Release", page: 340,
         brief: "Rescue hostages and neutralise the terrorists holding them.",
         details: [[2, "A freighter or passenger ship in space."], [4, "A ground outpost on an airless moon."], [6, "A small orbital platform or outpost."], [8, "A building in a Coriolis, Orbis or Ocellus station."], [10, "A ship that has just landed at a base."]],
         twists: [[2, "Explosives everywhere, and the terrorists wear them."], [4, "The terrorists fall out, and the hostages are in the crossfire."], [6, "Some terrorists are hiding among the hostages."], [8, "A hostage officer trades your side's procedures for their life."], [9, "A hostage goes into labour."], [10, "One terrorist starts harming hostages with no demands."]],
      },
      {
         max: 6, name: "Defensive Action", page: 340,
         brief: "Hold a strategic position against an enemy attack.",
         details: [[3, "A ridge or pass on a rocky or ice world."], [6, "An Earth-like or terraformed planet."], [9, "A checkpoint in space."], [10, "A Capital Class ship, or a position on a besieged one."]],
         twists: [[3, "The attackers are native creatures (ignore in space)."], [5, "An elite enemy force, bigger than expected."], [7, "The base is badly built: air, power and other systems fail."], [9, "A cyber-attack takes over base systems, including the defences."], [10, "The enemy offers the team money to walk away."]],
      },
      {
         max: 7, name: "Prisoner of War", page: 340,
         brief: "Escort captured enemy personnel to an allied prison for interrogation.",
         details: [[5, "The transport is a Lakon Type-7."], [9, "The transport is a Lakon Type-6."], [10, "The transport is a Lakon Type-9."]],
         twists: [[3, "The prisoners try to break out."], [6, "A deadly virus breaks out among the prisoners."], [9, "The badly maintained transport starts to fail."], [10, "The prisoners' allies have taken the prison and attack on landing."]],
      },
      {
         max: 8, name: "Denial Operations", page: 341,
         brief: "Destroy the power supply to the enemy's defences so a friendly force can attack.",
         details: [[4, "Power runs overground on pylons and transformers."], [9, "Power runs underground."], [10, "A generator near the defences."]],
         twists: [[3, "Backup generators must be disabled too."], [6, "The transformer site is full of refugees."], [9, "An old nuclear generator: shut it down in the right order; an air strike means a nuclear blast."], [10, "Soldiers are dug in around the main generator."]],
      },
      {
         max: 9, name: "Main Assault", page: 341,
         brief: "Clear a heavily fortified hill, full of dug-in positions and tunnels, section by section.",
         details: [[4, "On an ice world: hard terrain, hostile climate."], [8, "On a rocky world."], [10, "On a terraformed world; the GM picks the climate."]],
         twists: [[3, "The enemy uses suicide squads."], [6, "The lower tunnels hold native alien creatures."], [9, "The rock blocks all communications: messengers only."], [10, "All of the above."]],
      },
      {
         max: 10, name: "Military Transport", page: 341,
         brief: "Escort a supply convoy to a jump point and on to a surface base.",
         details: [[6, "The mission ends when the ships land."], [10, "Then escort a surface convoy to the front."]],
         twists: [[2, "A saboteur in the convoy crew."], [4, "Bought or sympathetic captains lead the convoy into a trap."], [6, "The drop-off is compromised; new coordinates are sent."], [8, "A ship breaks down: abandon it or defend it during repairs."], [10, "Slave soldiers aboard seize a ship and demand better gear."]],
      },
   ],
   espionage: [
      {
         max: 1, name: "Assassination", page: 342,
         brief: "Reconnoitre a conference and plan the assassination of its keynote speaker.",
         details: [[4, "A conference centre in a surface city in enemy territory."], [9, "In a space station."], [10, "On a Capital Class ship."]],
         twists: [[3, "A player's identity has been leaked to the secret police."], [6, "Rival teams are also there and sabotage the players."], [9, "Security hears of a threat and the venue changes."], [10, "Someone kidnaps the target first."]],
      },
      {
         max: 2, name: "Capture", page: 342,
         brief: "Intercept a ship with unknown cargo and deliver it, ship and cargo intact.",
         details: [[4, "A medium ship."], [9, "A large ship."], [10, "A Capital Class ship."]],
         twists: [[3, "It's carrying enemy soldiers."], [6, "Engineered alien creatures in the hold get loose."], [9, "Unstable biological or chemical weapons: damage risks a leak."], [10, "Slaves bound for experiments."]],
      },
      {
         max: 3, name: "Blueprint Acquisition", page: 342,
         brief: "Steal the physical and electronic blueprints for a new civilian ship from its design lab.",
         details: [[2, "A remote ground station on a rocky or ice moon."], [4, "A platform orbiting a deserted moon."], [6, "A bio-dome on a newly terraformed planet."], [8, "A space station."], [10, "A populated area of an Earth-like planet."]],
         twists: [[3, "It's really a military ship, and that navy will come looking."], [7, "The prototype is already built and on the pad."], [10, "The company goes bust mid-operation; everything is frozen by court order."]],
      },
      {
         max: 4, name: "Misinformation", page: 343,
         brief: "Promote a bogus wonder material until a rival company buys the worthless shares.",
         details: [[4, "The target has small offices on a local station."], [9, "Regional headquarters on a nearby planet."], [10, "A planet-wide company with a towering headquarters."]],
         twists: [[2, "Students try to reproduce the material and doubts spread."], [4, "The story leaks to others, some of them vengeful."], [6, "An employee steals the 'data' to sell it: a chase."], [8, "Disgruntled employees attack the building."], [10, "Counter-intelligence kidnaps one of the players."]],
      },
      {
         max: 5, name: "Kidnap", page: 343,
         brief: "Rescue a famous hacker held by a criminal gang.",
         details: [[2, "A remote base on an airless moon."], [4, "An Anaconda or similar large ship."], [6, "Deep inside an orbiting station."], [8, "An abandoned station in orbit."], [10, "Forests on an Earth-like planet, full of native creatures."]],
         twists: [[3, "The hacker is a collective; the gang has only one of them."], [6, "The hacker now sides with the gang."], [9, "The hacker is badly wounded and needs a medical facility fast."], [10, "Other celebrity captives: rewarding, but hard work."]],
      },
      {
         max: 6, name: "Contract Swap", page: 343,
         brief: "Replace pages of a takeover contract just before the signing.",
         details: [[4, "An office complex planetside."], [8, "An office complex in a space station."], [10, "A local dignitary's residence."]],
         twists: [[2, "Lawyers on both sides have copies."], [4, "The seller gets cold feet."], [6, "A lawyer plans to assassinate the seller."], [9, "The only copy is in a high-security vault."], [10, "The contract is on coloured paper: they need a new fake."]],
      },
      {
         max: 7, name: "Computer Virus", page: 343,
         brief: "Plant a data-mining virus in a data storage company suspected of serving criminals.",
         details: [[3, "Regional headquarters: a whole city block."], [6, "A relay on a small, well-guarded planetary base."], [9, "A data silo deep under a defended outpost."], [10, "An orbiting relay with its own fighter wing."]],
         twists: [[2, "The virus really steals money: the team were duped into a robbery."], [4, "The real targets are ordinary people."], [6, "The virus carries a kill order on the players."], [8, "It has been rewritten to kill everyone in the building."], [10, "It doesn't work and must be reprogrammed on site."]],
      },
      {
         max: 8, name: "Extracting a Spy", page: 344,
         brief: "Find and extract a legendary spy who vanished while infiltrating a crime gang.",
         details: [[3, "A hidden base on an airless moon."], [6, "A fort on a terraformed planet."], [9, "An abandoned station or platform."], [10, "A disguised large ship that keeps moving."]],
         twists: [[3, "A gang member poses as the spy to trap rescuers."], [6, "The spy is inside but can't make contact."], [9, "The spy has switched sides."], [10, "The stronghold has already been raided and the spy taken for trial."]],
      },
      {
         max: 9, name: "Determining Who the Mole Is", page: 344,
         brief: "Find who is leaking a medical research institute's secret projects.",
         details: [[4, "A campus on an Earth-like planet."], [7, "Bio-domes on a terraformed planet."], [10, "A small Ocellus station."]],
         twists: [[3, "The players are offered a bribe to frame someone."], [6, "Two moles: the second becomes an assassin."], [9, "The mole releases dangerous Biomods."], [10, "The institute is a front for a corporation."]],
      },
      {
         max: 10, name: "Expose Military Expansion Plans", page: 344,
         brief: "Infiltrate a military faction's headquarters and find its expansion plans.",
         details: [[3, "A planetside base with breathable air."], [6, "A command capital ship such as a Farragut or Majestic."], [9, "An orbiting platform."], [10, "The faction leader's palace grounds."]],
         twists: [[2, "The general is a stand-in."], [4, "The plans are already on their way to the troops."], [6, "A coup breaks out."], [8, "The generals are in a locked-down conclave."], [10, "A general will defect if his family is rescued."]],
      },
   ],
   exploration: [
      {
         max: 2, name: "Stellar Cartography", page: 345, cartography: true,
         brief: "Map star systems in a cluster far from the frontier, surveying Earth-like worlds on the ground.",
         details: [[4, "A single G-type star system with at least one Earth-like world.", { primary: "G", earthLike: true }], [8, "D10 star systems, rolled up or made by the GM.", { count: true }], [10, "A Special Spectral star with something unusual about it.", { special: true }]],
         twists: [[3, "Hyperdrives stop working: a difficult science Skill check finds the star's radiation is to blame. Fly far out, or find insulation on a Metal Rich planet."], [6, "A rival group plays friendly, then sabotages them."], [8, "The Earth-like world's vines and animals turn on them."], [9, "A secret pirate base on one of the planets."], [10, "A Metal Rich world's magnetic field drags ships down: each approach needs a difficult Spaceship Piloting check or the ship takes 2D10 Hull damage (Shields don't help). After five failures it crashes, killing the pilot."]],
      },
      {
         max: 3, name: "Exploration Feat", page: 346,
         brief: "Achieve a record-breaking exploration feat for a corporation, which takes the credit.",
         details: [[2, "Scan a red giant as it goes supernova, leaving at the last moment."], [4, "Find a safe SRV route through sinkholes and pits."], [6, "Trek on foot through a deadly valley to an anomaly."], [8, "Land on a storm-wracked Earth-like world."], [10, "Reach a distant companion star in a borrowed Type-9 full of fuel."]],
         twists: [[3, "The star's radiation drives people mad: a moderate check with their highest Intelligence Skill, or violent delusions."], [5, "Rivals spoiled their supplies and damaged their FSDs: survive for weeks."], [8, "Amateurs led by a senator's son race them."], [10, "Treasure tempts them away from the mission."]],
      },
      {
         max: 5, name: "Investigate Anomaly", page: 346,
         brief: "Analyse a strange, possibly dangerous anomaly in a distant system.",
         details: [[3, "A metal obelisk with runes; electronics fail within 3km."], [5, "An unknown ship in orbit with life aboard and no reply."], [8, "An abandoned structure with something in the vents."], [10, "An alien probe knocks them out; they wake far across the galaxy."]],
         twists: [[3, "A Federation capital ship claims it and wants no witnesses."], [5, "A half-mad survivor stranded there for decades."], [8, "A hungry alien creature gets aboard."], [10, "Criminals use the anomaly, and it harms them."]],
      },
      {
         max: 7, name: "Zoological Expedition", page: 347,
         brief: "Collect alien life from a newly discovered Earth-like world.",
         details: [[3, "Plants, which may not want to be picked."], [6, "Many small animals guarded by a large symbiotic beast."], [9, "A hyper-aggressive predator, alive."], [10, "Colonists mutated into savage animals."]],
         twists: [[3, "The world is dying: hurry."], [6, "Armed eco-terrorists."], [8, "Spores on the ships explode when heated."], [10, "Cunning alien animals hunt them."]],
      },
      {
         max: 9, name: "Search and Rescue", page: 347,
         brief: "Find lost travellers in uncharted space.",
         details: [[2, "One survivor in an escape pod; the system must be searched thoroughly."], [3, "An escape pod crashed on a dangerous airless planet."], [6, "A lost survey crew; their ship is intact near mysterious ruins."], [8, "Settlers on an Earth-like world who may not want to leave."], [10, "The survey base is destroyed and everyone seems dead."]],
         twists: [[3, "Pirates or fanatics hold the survivors."], [5, "A famed bounty hunter wants the survivors dead."], [8, "The survivors are trapped in a cave by predators."], [10, "The survivors have gone mad and attack."]],
      },
      {
         max: 10, name: "Found a Colony", page: 347,
         brief: "Help found a new colony on an Earth-like world.",
         details: [[3, "A large, well-funded corporate colony."], [6, "A small company venture: an outpost and experimental farm."], [9, "Under-funded enthusiasts who soon run out of supplies."], [10, "One rich backer: a town, farms and a lavish palace."]],
         twists: [[2, "The colony's leader becomes a tyrant."], [5, "A rival colony wants them gone."], [8, "The wildlife is ferocious and organised."], [10, "A disaster: lead the survivors out before the reactor goes critical."]],
      },
   ],
   // Super Traders Supplement pp.50–52.
   trade: [
      {
         max: 1, name: "Special Delivery", page: 50, book: "Super Traders",
         brief: "Deliver cargo for a company to a distant civilised system, with a long run in supercruise.",
         details: [[3, "60 tons of Auto Fabricators to Urata City, Bhatas."], [6, "100 tons of Crop Harvesters to Khayyam Gateway, LTT 8517."], [8, "80 tons of Gallite to Katzenstein Dock, 36 Ophiuchi."], [10, "40 tons of Advanced Catalysers to Hutton Orbital, Alpha Centauri."]],
         twists: [[3, "The delivery contact has been kidnapped and must be rescued to sign off."], [6, "The goods have just been banned here: sneak past the police and sell on the black market."], [8, "A tracking beacon in one canister brings a pirate gang after them; metallic asteroids might hide the signal while they search."], [10, "The canisters hold armed mercenaries who mean to take the station, or the players' ships."]],
      },
      {
         max: 2, name: "Drop Point Delivery", page: 50, book: "Super Traders",
         brief: "Deliver cargo to a planetary star port, then escort the truck overland to an isolated research base.",
         details: [[2, "12 tons of Titanium to the barren moon Merope 5C."], [5, "12 tons of Explosives to the metal-rich planetoid Taygeta 4."], [8, "12 tons of Mineral Extractors to the ice world Mukun A3A."], [10, "12 tons of Robotics to war-torn Waterloo, Reidquat."]],
         twists: [[3, "The Longhaul Truck is a wreck: patch it up, with breakdowns all the way."], [6, "Truck gangs demand a cut from anyone trading here."], [10, "The research base is deserted."]],
      },
      {
         max: 3, name: "Too Good to Pass Up", page: 50, book: "Super Traders",
         brief: "A rare good on sale at 1,000cr a ton sells for 20,000cr a ton on a certain world, if you get there first.",
         details: [[2, "Tauri Chimes to Snider Terminal, Rajukru."], [4, "Damna Carapaces to George Lucas Station, Zaonce."], [6, "Chateau De Aegaeon to Weaver Vision, Cubeo."], [8, "CD-75 Kitten Brand Coffee to Solo Orbiter, Altair."], [10, "Lavian Brandy to Azeban City, Eranin."]],
         twists: [[3, "Rival traders are racing to the same world: cut through pirate space, or stop them."], [6, "Only enough for half the holds; there's a store on the planet below, if it were raided."], [10, "The market has collapsed; a nearby system pays well, but the good is illegal there."]],
      },
      {
         max: 4, name: "Much in Demand", page: 51, book: "Super Traders",
         brief: "Fetch a quantity of a commodity from another world and bring it back to the employer.",
         details: [[3, "50 tons of Gold for Li Qing Jao, Sol."], [6, "80 tons of Superconductors for Chango Dock, I Bootis."], [10, "100 tons of Resonating Separators for Henke Orbital, Sorbago."]],
         twists: [[3, "In short supply at twice the average price, but a freighter full of it is just leaving."], [6, "Strikers blockade the star port on the way back."], [10, "Rival 'traders' plan to steal the players' cargo."]],
      },
      {
         max: 5, name: "Hell’s Space Trip", page: 51, book: "Super Traders",
         brief: "A standard delivery, hunted all the way by a ruthless agency of assassins.",
         details: [[3, "They hunt you in the space lanes, not near the station."], [6, "Space lanes, and an ambush at the star port."], [10, "Space lanes, the star port, and hired thugs while you load."]],
         twists: [[3, "The cargo is ethically dubious: maybe the assassins have a point."], [7, "One of the ships has been compromised: an attack mid-flight."], [10, "A bomb aboard goes off below 100m/s, with landing gear down, or with shields raised."]],
      },
      {
         max: 6, name: "It’s Legal if They Don’t See It", page: 51, book: "Super Traders",
         brief: "Smuggle illegal cargo into a station for a lot of money.",
         details: [[3, "10 tons of Narcotics into Freeholm, Artemis."], [6, "20 tons of Battle Weapons into Massimino Settlement, Wolf 393."], [8, "30 tons of Slaves into Ricardo Orbital, Kokomi."], [10, "40 tons of Combat Stims into Serre Point, Katta."]],
         twists: [[3, "Security has been tipped off and is hunting their ships: find another way in."], [6, "The contact is held hostage by a rival gang on an asteroid station."], [10, "Bounty hunters raid the handover."]],
      },
      {
         max: 7, name: "Second Hand Goods", page: 51, book: "Super Traders",
         brief: "Collect Imperial surplus from a freighter and deliver it to a Federation market.",
         details: [[3, "A Stalwart Trader with 72 tons of Liquor for Bates Horizons, Carener."], [6, "An Armoured Transport with 80 tons of Advanced Catalysers for Elder Works, Ross 154."], [8, "A Successful Trader with 300 tons of Fruit & Vegetables for Ford City, Groombridge 34."], [10, "A Bulk Cruiser with 600 tons of Consumer Goods for Paradiso Outpost, 17 Draconis."]],
         twists: [[3, "Pirates attack during the transfer; the trader helps, and the mission fails if it's destroyed."], [6, "Some canisters hold saboteurs (see the Saboteur encounter)."], [10, "Trackers lead Federation pirates to them."]],
      },
      {
         max: 8, name: "Traders’ Instincts", page: 51, book: "Super Traders",
         brief: "A hold full of rare goods and three possible markets: the longer it takes to find the right one, the less it pays.",
         details: [[3, "Ultra Compact Processors: CE Bootis, Wolf 406 or Leesti."], [6, "Centauri Mega Gin: Baldr, Summerland or Thule."], [8, "Altarian Skin: Trakath, Los or van Maanen's Star."], [10, "Shans Charis Orchids: Gamma Leporis, Tupa or Banki."]],
         twists: [[3, "Old Joe, a famous trader, is leaving with the same cargo: follow him?"], [6, "The first star port is blockaded by striking traders."], [10, "A passing trader offers a fair price for the lot. Is he what he seems?"]],
      },
      {
         max: 9, name: "Helping Old Joe", page: 52, book: "Super Traders",
         brief: "Old Joe, a much-loved trader, vanished on his last delivery. Find him.",
         details: [[3, "He was heard arguing with a corrupt docking official."], [6, "His Cobra sits intact on an airless moon; vehicle tracks lead away."], [10, "A cryptic message behind the bar in his hand."]],
         twists: [[3, "Federal authorities don't want him found, and act on it."], [6, "Other traders join the search; he must be freed from a criminal stronghold."], [10, "He faked his death to escape an Imperial assassin, and the players have led the assassin to him."]],
      },
      {
         max: 10, name: "Copycat Traders", page: 52, book: "Super Traders",
         brief: "Someone with the same ship and clothes trades in your name, just ahead of you.",
         details: [[10, "Wherever the players trade next."]],
         twists: [[3, "Revenge: the players ruined their earlier deals."], [6, "Newcomers borrowing a reputation; they might stop without violence."], [10, "A trap set by a crime boss the players offended."]],
      },
   ],
};
