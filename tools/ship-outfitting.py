"""
Ship Weapons and Ship Components compendia (Core Rules, Modifying Spacecraft, pp.192-216).

The tables were extracted from the rulebook into tools/ship-outfitting-data.json (names, numbers and costs only).
Run `python3 tools/ship-outfitting.py`, then `npm run packs`.

- Ship Weapons: every weapon in the Spacecraft Weapon List (pp.195-196) by size, with its power draw and ammunition costs
  (p.197) in the description, plus the supplements' ship weapons (Exploration Supplement), which used to sit in the
  Weapons compendium.
- Ship Components: bulkheads, the fixed components, utility mounts and every internal component, as `shipComponent`
  items. Each component's `special` is the short note the ship rosters use ("Range 15LY", "Capacity 16").

Markers on the weapon list: lasers (except mining lasers) +5 against shields; cannons, multi-cannons and fragment
cannons +5 against unshielded hulls; fragment cannons also +5 against medium ships and +10 against large ones (p.194).
"""
import importlib.util, json, os, re

HERE = os.path.dirname(__file__)
DATA = json.load(open(os.path.join(HERE, "ship-outfitting-data.json"), encoding="utf-8"))
CORE = "Core Rules"

spec = importlib.util.spec_from_file_location("equipment", os.path.join(HERE, "equipment.py"))
equipment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(equipment)

cr = lambda n: f"{n:,}cr"


# ---- Ship weapons -----------------------------------------------------------------------------------------------------
def ammo_key(name):
    """'Small Fixed Railgun' -> 'Small Railgun'; 'Medium Torpedo Pylon' -> 'Medium Torpedo Rack'."""
    key = re.sub(r" (Fixed|Gimballed|Turreted)", "", name).replace("Torpedo Pylon", "Torpedo Rack")
    return key


def ship_weapon(w, sort):
    name = w["name"]
    size = name.split()[0].lower()
    kind = "turret" if " Turreted " in name else "gimballed" if " Gimballed " in name else "fixed"
    dmg = w["damage"].strip()
    damage, burst, vs, special = 0, 0, None, []
    if m := re.match(r"^(\d+)\s*\+\s*Burst \(Max (\d+)\)$", dmg):
        damage, burst = int(m.group(1)), int(m.group(2))
    elif m := re.match(r"^(\d+) \((\d+) vs shields\)$", dmg):
        damage, vs = int(m.group(1)), int(m.group(2))
    elif m := re.match(r"^(\d+)/(\d+)/(\d+)$", dmg):
        damage = int(m.group(1))
        special.append(f"Damage {dmg} against small/medium/large ships. Up-close only")
    elif m := re.match(r"^(\d+) \(Mining Bonus (\d+)\)$", dmg):
        damage = int(m.group(1))
        special.append(f"Mining bonus {m.group(2)}")
    elif re.match(r"^\d+$", dmg):
        damage = int(dmg)
    else:
        raise SystemExit(f"unparsed damage {dmg!r} for {name}")
    accuracy = 0
    if w["toHit"].startswith("Diff"):
        special.append(f"Mines: difficulty {w['toHit'].split()[1]} to avoid")
    else:
        accuracy = int(w["toHit"])
    laser = re.search(r"(Pulse|Burst|Beam) Laser", name) is not None
    cannon = re.search(r"(Cannon|Multi-Cannon|Fragment Cannon)$", name) is not None
    html = f"<p>Power {w['power']}MW.</p>"
    if a := DATA["ammo"].get(ammo_key(name)):
        html += f"<p>Ammunition: {a['reload']:,}cr per reload ({a['unit']:,}cr per unit).</p>"
    html += f"<p><em>{CORE}</em></p>"
    return {
        "name": name, "type": "craftWeapon", "img": "icons/svg/lightning.svg" if laser else "icons/svg/target.svg",
        "system": {
            "description": html, "cost": w["cost"], "mount": {"size": size, "kind": kind}, "accuracy": accuracy, "damage": damage,
            "burst": {"perPoint": 5, "max": burst}, "damageVsShields": vs, "bonusVsHull": 5 if cannon else 0, "bonusVsShields": 5 if laser else 0,
            "ammo": {"value": w["ammo"] or 0, "max": w["ammo"]}, "special": ". ".join(special), "power": w["power"], "hardpoint": -1,
            "engineered": {"effects": [], "faults": []}, "destabilise": False,
            "ax": False, "flak": False, "gunner": "",
        },
        "flags": {"edrpg": {"group": f"{size.title()} Weapons"}}, "sort": sort,
    }


def write_weapons():
    docs = [ship_weapon(w, (i + 1) * 100) for i, w in enumerate(DATA["weapons"])]
    n = len(docs)
    supplement = [equipment.DESTABILISATION_BEAM] + equipment.AEGIS_WEAPONS
    docs += [{**w, "system": {"engineered": {"effects": [], "faults": []}, "ax": False, "flak": False, "power": None, "hardpoint": -1, **w["system"]},
              "sort": (n + i + 1) * 100}
             for i, w in enumerate(supplement)]
    equipment.write_pack("ship-weapons", docs, "weapon")


# ---- Ship components --------------------------------------------------------------------------------------------------
ICON = {"fixed": "icons/svg/anvil.svg", "internal": "icons/svg/item-bag.svg", "utility": "icons/svg/upgrade.svg"}
STATS = ["output", "range", "capacity", "shields", "hull", "hullBonus", "shieldBoost", "strengthBonus", "speed", "agility", "toHit",
         "initiative", "dogfighting", "shieldRecharge", "floating", "generalScan", "systems", "mining", "recharge", "duration"]


def component(name, category, slot, code, cost, group, *, power=None, strength=None, special="", stats=None, ammo=None, military=False,
              notes="", img=None, source=CORE):
    size, grade = (int(code[0]), code[1:]) if code else (0, "")
    html = (f"<p>{notes}</p>" if notes else "") + f"<p><em>{source}</em></p>"
    return {
        "name": name, "type": "shipComponent", "img": img or ICON[slot],
        "system": {
            "description": html, "cost": cr(cost) if isinstance(cost, int) else cost, "category": category, "slot": slot, "military": military,
            "size": size, "grade": grade, "power": power, "strength": strength, "ammo": {"value": ammo or 0, "max": ammo},
            "stats": {k: (stats or {}).get(k, 0) for k in STATS}, "special": special,
        },
        "flags": {"edrpg": {"group": group}},
    }


def bonuses(text):
    """'+2 Speed, +1 Agility' -> {'speed': 2, 'agility': 1}."""
    out = {}
    for n, what in re.findall(r"\+(\d+) (Speed|Agility|To Hit|Initiative|Dogfighting|shields)", text):
        out[{"Speed": "speed", "Agility": "agility", "To Hit": "toHit", "Initiative": "initiative", "Dogfighting": "dogfighting",
             "shields": "shieldRecharge"}[what]] = int(n)
    if m := re.search(r"(\d) Floating bonus", text):
        out["floating"] = int(m.group(1))
    return out


def life_support_time(t):
    m = re.match(r"(\d+)m(?: (\d+)s)?", t)
    return f"{m.group(1)} minutes" + (f" {m.group(2)} seconds" if m.group(2) else "")


UTILITY_NOTES = {
    "Chaff Launcher": ("+4 Defence against gimballed weapons and automated turrets until your next turn (Equipment Action)", {}),
    "ECM": ("+4 Defence against Seeker Missiles", {}),
    "Heat Sink Launcher": ("+2 Systems when Silent Running (Equipment Action)", {}),
    "Point Defence": ("A missile, torpedo or mine that would hit is destroyed on an even D10", {}),
}
GRADE_BONUS = {"E": 0, "D": 1, "C": 2, "B": 3, "A": 4}


def utility_doc(u):
    name = u["name"]
    grade = (re.search(r"– ([EDCBA]) grade", name) or [None, "E"])[1] if "grade" in name else ""
    stats, notes = {}, ""
    if name in UTILITY_NOTES:
        special, stats = UTILITY_NOTES[name]
        if a := DATA["ammo"].get(name):
            notes = f"Ammunition: {a['reload']:,}cr per reload ({a['unit']:,}cr per unit)."
    elif name.startswith("Manifest Scanner"):
        stats = {"systems": GRADE_BONUS[grade]}
        special = "Scan nearby ships' cargo" + (f" (+{GRADE_BONUS[grade]} Systems)" if GRADE_BONUS[grade] else "")
    elif name.startswith("Frame Shift Wake Scanner"):
        stats = {"systems": GRADE_BONUS[grade]}
        special = "Find the hyperspace destination of a ship that has just jumped" + (f" (+{GRADE_BONUS[grade]} Systems)" if GRADE_BONUS[grade] else "")
    elif name.startswith("Kill Warrant Scanner"):
        special = f"+{(GRADE_BONUS[grade] + 1) * 20}% bounty reward"
    elif name.startswith("Shield Booster"):
        boost = {"E": 5, "D": 10, "C": 15, "B": 20, "A": 25}[grade]
        stats, special = {"shieldBoost": boost}, f"+{boost}% shields"
    else:
        raise SystemExit(f"unknown utility mount {name}")
    return component(name, "utility", "utility", f"0{grade}" if grade else "", u["cost"], "Utility Mounts", power=u["power"], strength=10,
                     special=special, stats=stats, ammo=u["ammo"], notes=notes)


def components():
    docs = []
    add = docs.append
    F, I = "Fixed Components", "Internal Components"

    # Bulkheads (p.199-200): the bonus is on the ship's starting Hull; the cost depends on the hull.
    add(component("Lightweight Alloys", "bulkhead", "fixed", "", "", "Bulkheads", special="No bonus", img="icons/svg/shield.svg"))
    for kind, label, bonus in (("reinforced", "Reinforced Alloys", 50), ("military", "Military Grade Composites", 100)):
        for ship, costs in DATA["bulkheads"].items():
            add(component(f"{label} ({ship})", "bulkhead", "fixed", "", costs[kind], f"Bulkheads/{label}", special=f"+{bonus}% Hull",
                          stats={"hullBonus": bonus}, img="icons/svg/shield.svg"))
    # The supplements' hulls (each book's Spaceships chapter), in a folder per book.
    for book, hulls in DATA["supplementBulkheads"].items():
        for kind, label, bonus in ((0, "Reinforced Alloys", 50), (1, "Military Grade Composites", 100)):
            for ship, costs in hulls.items():
                add(component(f"{label} ({ship})", "bulkhead", "fixed", "", costs[kind], f"{book}/Bulkheads/{label}", special=f"+{bonus}% Hull",
                              stats={"hullBonus": bonus}, img="icons/svg/shield.svg", source=book))

    for r in DATA["powerPlant"]:
        add(component(f"Power Plant {r['code']}", "powerPlant", "fixed", r["code"], r["cost"], f"{F}/Power Plants", strength=r["strength"],
                      special=f"{r['output']:g}MW output", stats={"output": r["output"]}))
    for r in DATA["thrusters"]:
        add(component(f"Thrusters {r['code']}", "thrusters", "fixed", r["code"], r["cost"], f"{F}/Thrusters", power=r["power"],
                      strength=r["strength"], special=r["effect"], stats=bonuses(r["effect"])))
    for r in DATA["fsd"]:
        add(component(f"Frame Shift Drive {r['code']}", "fsd", "fixed", r["code"], r["cost"], f"{F}/Frame Shift Drives", power=r["power"],
                      strength=r["strength"], special=f"Range {r['range']}LY", stats={"range": r["range"]}))
    for r in DATA["lifeSupport"]:
        add(component(f"Life Support {r['code']}", "lifeSupport", "fixed", r["code"], r["cost"], f"{F}/Life Support", power=r["power"],
                      strength=r["strength"], special=f"Emergency Life Support {life_support_time(r['time'])}",
                      notes="Strength is the canopy's."))
    for r in DATA["powerDistributor"]:
        add(component(f"Power Distributor {r['code']}", "powerDistributor", "fixed", r["code"], r["cost"], f"{F}/Power Distributors",
                      power=r["power"], strength=r["strength"], special=r["effect"], stats=bonuses(r["effect"])))
    for r in DATA["sensors"]:
        parts = ([f"+{r['scan']} General Scan"] if r["scan"] else []) + ([r["effect"]] if r["effect"] != "No bonuses" else [])
        add(component(f"Sensors {r['code']}", "sensors", "fixed", r["code"], r["cost"], f"{F}/Sensors", power=r["power"], strength=r["strength"],
                      special=", ".join(parts) or "No bonuses", stats={**bonuses(r["effect"]), "generalScan": r["scan"]}))
    for r in DATA["fuelTank"]:
        add(component(f"Fuel Tank {r['code']}", "fuelTank", "internal", r["code"], r["cost"], f"{I}/Fuel Tanks",
                      special=f"{r['tons']}T ({r['tons'] * 10}LY)", stats={"capacity": r["tons"]},
                      notes="An extra fuel tank in an internal slot. One ton of fuel gives ten light years of range."))
    h = DATA["cargoHatch"]
    add(component(f"Cargo Hatch {h['code']}", "cargoHatch", "fixed", h["code"], "", f"{F}/Cargo Hatch", power=h["power"], strength=h["strength"],
                  notes="Every ship has one. Critically damaged, it ejects 1D10 (small ship), 2D10 (medium) or 3D10 (large) canisters and jams."))

    for u in DATA["utility"]:
        add(utility_doc(u))

    for r in DATA["shieldGenerator"]:
        add(component(f"{r['code']} Shield Generator", "shieldGenerator", "internal", r["code"], r["cost"], f"{I}/Shield Generators",
                      power=r["power"], strength=r["strength"], special=f"Shield Power {r['shields']}", stats={"shields": r["shields"]},
                      img="icons/svg/shield.svg"))
    for r in DATA["shieldCellBank"]:
        add(component(f"{r['code']} Shield Cell Bank", "shieldCellBank", "internal", r["code"], r["cost"], f"{I}/Shield Cell Banks", power=r["power"],
                      strength=r["strength"], special=f"+{r['recharge']} shield recharge for {r['duration']} round{'s' if r['duration'] > 1 else ''}",
                      stats={"recharge": r["recharge"], "duration": r["duration"]}, ammo=3, military=True, img="icons/svg/shield.svg",
                      notes=f"Three uses before new cells are needed ({int(r['code'][0]) * 100:,}cr per use to refill)."))
    for r in DATA["hullReinforcement"]:
        add(component(f"{r['code']} Hull Reinforcement Package", "hullReinforcement", "internal", r["code"], r["cost"], f"{I}/Hull Reinforcement Packages",
                      special=f"+{r['hull']} Hull", stats={"hull": r["hull"]}, military=True, notes="Not multiplied by bulkheads."))
    for r in DATA["moduleReinforcement"]:
        scope = "every component" if r["groups"] == "All" else "one module group (weapons, utilities, fixed or internal)"
        add(component(f"{r['code']} Module Reinforcement Package", "moduleReinforcement", "internal", r["code"], r["cost"],
                      f"{I}/Module Reinforcement Packages", special=f"+{r['strength']} Strength to {scope}", stats={"strengthBonus": r["strength"]},
                      military=True, notes="A component only benefits from the strongest package covering it."))
    for r in DATA["cargoRack"]:
        add(component(f"{r['code']} Cargo Rack", "cargoRack", "internal", r["code"], r["cost"], f"{I}/Cargo Racks", power=0, strength=r["strength"],
                      special=f"Capacity {r['capacity']}", stats={"capacity": r["capacity"]}))
    for r in DATA["afmu"]:
        add(component(f"{r['code']} Auto Field Maintenance Unit", "afmu", "internal", r["code"], r["cost"], f"{I}/Auto Field Maintenance Units",
                      power=r["power"], strength=r["strength"], special=f"Repairs components up to Strength {r['maxRepair']}; Supply {r['supply']}"))
    for r in DATA["collector"]:
        n = r["canisters"]
        add(component(f"{r['code']} Collector Limpet Controller", "collector", "internal", r["code"], r["cost"], f"{I}/Limpet Controllers/Collector",
                      power=r["power"], strength=r["strength"], special=f"Mining bonus {r['mining']}; {n} canister{'s' if n > 1 else ''} per round",
                      stats={"mining": r["mining"]}))
    for r in DATA["prospector"]:
        n = r["drones"]
        add(component(f"{r['code']} Prospector Limpet Controller", "prospector", "internal", r["code"], r["cost"], f"{I}/Limpet Controllers/Prospector",
                      power=r["power"], strength=r["strength"], special=f"Mining bonus {r['mining']}; {n} active drone{'s' if n > 1 else ''}",
                      stats={"mining": r["mining"]}))
    for r in DATA["hatchBreaker"]:
        add(component(f"{r['code']} Hatch Breaker Limpet Controller", "hatchBreaker", "internal", r["code"], r["cost"],
                      f"{I}/Limpet Controllers/Hatch Breaker", power=r["power"], strength=r["strength"],
                      special=f"Accuracy +{r['accuracy']}; Override {r['override']} ({r['dice'].upper()} canisters)"))
    d = DATA["dockingComputer"]
    add(component(f"{d['code']} Docking Computer", "dockingComputer", "internal", d["code"], d["cost"], f"{I}/Docking Computers", power=d["power"],
                  strength=d["strength"], special="Docks at any station with flight control (99%)"))
    for r in DATA["fsdInterdictor"]:
        mod = f"{r['modifier']:+d}" if r["modifier"] else "+0"
        add(component(f"{r['code']} FSD Interdictor", "fsdInterdictor", "internal", r["code"], r["cost"], f"{I}/FSD Interdictors", power=r["power"],
                      strength=r["strength"], special=f"{mod} Spaceship Piloting to interdict; up to {r['limit']} ships (larger: -5)"))
    for r in DATA["fuelScoop"]:
        add(component(f"{r['code']} Fuel Scoop", "fuelScoop", "internal", r["code"], r["cost"], f"{I}/Fuel Scoops", power=r["power"],
                      strength=r["strength"], special=f"Safe scoop {r['safe']}; Emergency scoop {r['emergency']}"))
    for r in DATA["planetaryScanner"]:
        special = f"Detects all planetary bodies within {r['range']}" if r["range"] else "Upgrades a Discovery Scanner: +50% discovery award"
        add(component(f"{r['code']} {r['name']}", "planetaryScanner", "internal", r["code"], r["cost"], f"{I}/Planetary Scanners",
                      strength=r["strength"], special=special, notes="One Discovery Scanner (Basic, Intermediate or Advanced) and one Detailed Surface Scanner per ship."))
    for r in DATA["refinery"]:
        add(component(f"{r['code']} Refinery", "refinery", "internal", r["code"], r["cost"], f"{I}/Refineries", power=r["power"], strength=r["strength"],
                      special=f"Mining bonus {r['mining']}", stats={"mining": r["mining"]}))
    for r in DATA["vehicleHangar"]:
        n = r["bays"]
        add(component(f"{r['code']} Planetary Vehicle Hangar", "vehicleHangar", "internal", r["code"], r["cost"], f"{I}/Planetary Vehicle Hangars",
                      power=r["power"], strength=r["strength"], special=f"{n} Vehicle Bay{'s' if n > 1 else ''}", stats={"capacity": n}))
    # Super Traders Supplement (New Internal Components, pp.29-30).
    ST = "Super Traders Supplement"
    carriers = ", ".join(DATA["fighterCarriers"])
    for r in DATA["fighterHangar"]:
        n = r["bays"]
        add(component(f"{r['code']} Fighter Hangar", "fighterHangar", "internal", r["code"], r["cost"], f"{ST}/Fighter Hangars", power=r["power"],
                      strength=r["strength"], special=f"Fighter Bays {n}", stats={"capacity": n}, source=ST,
                      notes=f"Only these ships can install one: {carriers}. Fighters are bought separately."))
    for r in DATA["spaceshipHangar"]:
        add(component(f"{r['code']} Spaceship Hangar", "spaceshipHangar", "internal", r["code"], r["cost"], f"{ST}/Spaceship Hangars", power=r["power"],
                      strength=r["strength"], special=f"Hangar Size: {r['size']}", stats={"capacity": 1}, source=ST,
                      notes="Only Huge ships can install one. It carries one small ship."))
    return docs


def write_components():
    docs = [{**d, "sort": (i + 1) * 100} for i, d in enumerate(components())]
    equipment.write_pack("ship-components", docs, "shipComponent")


if __name__ == "__main__":
    write_weapons()
    write_components()
