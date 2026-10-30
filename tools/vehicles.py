"""
Source data for the Vehicles compendium (Core Rules pp.220-235): every vehicle and variant as a Vehicle actor with
its weapons (Craft Weapon items) and Speed Table. Stats and mechanics only. Run `python3 tools/vehicles.py`, then
`npm run packs`.
"""
import hashlib, json, os, re

HERE = os.path.dirname(__file__)


def doc_id(*parts):
    return hashlib.sha1(("edrpg-vehicle-" + "-".join(parts)).encode()).hexdigest()[:16]


def W(name, size, kind, acc, damage, burst=0, vs_shields=None, hull=0, shields=0, ammo=None, special=""):
    return dict(name=name, size=size, kind=kind, acc=acc, damage=damage, burst=burst, vs_shields=vs_shields,
                hull=hull, shields=shields, ammo=ammo, special=special)


# Common weapons as they appear in the stat blocks (* +5 vs Hull, s +5 vs Shields).
def multicannon(size, kind, base=5): return W("Multi-cannon", size, kind, 2, base, burst=10, hull=5, ammo=15)
def cannon(size, kind, dmg, acc=2, ammo=25): return W("Cannon", size, kind, acc, dmg, hull=5, ammo=ammo)
def pulse(size, kind, acc=2, dmg=10): return W("Pulse Laser", size, kind, acc, dmg, shields=5)
def burst_laser(size, kind, base=5): return W("Burst Laser", size, kind, 2, base, burst=10, shields=5)
def beam(size, kind, base=5): return W("Beam Laser", size, kind, 2, base, burst=20, shields=5)
def plasma_repeater(size, kind): return W("Plasma Repeater", size, kind, 2, 5, burst=15, ammo=50)
def seeker(size, kind, dmg, vs, ammo, name="Seeker Missile Rack"): return W(name, size, kind, 4, dmg, vs_shields=vs, ammo=ammo)


# Speed tables: {speed: (defence bonus, attack penalty)}
def table(defence, attack):
    return [{"defence": defence.get(i, 0), "attack": attack.get(i, 0)} for i in range(1, 11)]


SCARAB = table({4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 4}, {5: -1, 6: -1, 7: -1, 8: -1, 9: -2, 10: -2})
QUAD = table({4: 1, 5: 1, 6: 2, 7: 2, 8: 3}, {5: -1, 6: -1, 7: -1, 8: -2})
WANDERER = table({4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3}, {5: -1, 6: -1, 7: -1, 8: -2, 9: -2})
HEAVY7 = table({4: 1, 5: 1, 6: 2, 7: 2}, {3: -1, 4: -1, 5: -2, 6: -2, 7: -3})  # Battlecar, APC, Longhaul Truck
RAM_RAIDER = table({4: 1, 5: 1, 6: 2, 7: 2, 8: 3}, {3: -1, 4: -1, 5: -2, 6: -2, 7: -3, 8: -3})
LIGHT_TANK = table({4: 1, 5: 1, 6: 2}, {3: -1, 4: -1, 5: -2, 6: -2})
MISSILE_TANK = table({4: 1, 5: 1}, {2: -1, 3: -1, 4: -2, 5: -3})
AVENGER = table({4: 1, 5: 1, 6: 2}, {2: -1, 3: -1, 4: -2, 5: -3, 6: -4})
BARRACUDA = table({4: 1}, {4: -1})

TOKENS = "systems/edrpg/assets/tokens/vehicles"

# family: (category, manufacturer, dimensions, bays, crew, passengers, sensors, cargo, speed table, token)
FAMILIES = {
    "Scarab SRV": ("small", "Vodel", "L 4.8m x W 4.0m x H 2.5m", 1, 1, 0, "2km; can detect surface minerals", "2T", SCARAB, "scarab-blue"),
    "Garriot Quadbike SRV": ("small", "Garriot", "L 3.1m x W 1.8m x H 1.1m", 1, 1, 0, "1km", "None", QUAD, "garriot-shielded-recon-quadbike-blue"),
    "Gangland Battlecar": ("small", "Various manufacturers", "L 4.4m x W 1.7m x H 1.6m", 1, 3, 2, "None", "Minimal", HEAVY7, "gangland-battlecar-red"),
    "Borderworld APC": ("medium", "Procyon Crimson Advanced", "L 9.3m x W 3.1m x H 4.7m", 2, 1, 14, "2km", "8T with no passengers", HEAVY7, "borderworld-apc-yellow"),
    "Longhaul Truck": ("medium", "Magnus Transporting", "L 9.8m x W 3.0m x H 5.0m", 2, 1, 2, "1km", "12T", HEAVY7, None),
    "Federal Ram Raider": ("medium", "Kruger Defence Solutions", "L 8.9m x W 3.3m x H 4.4m", 2, 2, 8, "1km", "4T with no passengers", RAM_RAIDER, None),
    "Light Tank": ("medium", "Various", "L 9.0m x W 4.0m x H 4.7m", 2, 3, 0, "2km", "None", LIGHT_TANK, "light-tank-green"),
    "Eranin Missile Tank": ("large", "Eranin People's Party", "L 15m x W 9m x H 8.6m", 4, 3, 0, "4km", "None", MISSILE_TANK, None),
    "Imperial Avenger": ("large", "Paradigm", "L 15m x W 9.3m x H 7.5m", 4, 4, 0, "4km", "None", AVENGER, None),
    "Barracuda Submersible": ("small", "Sirius Aquanautics", "L 5.0m x W 3.5m x H 4.5m", 1, 1, 1, "2km; can detect surface minerals", "2T", BARRACUDA, None),
}

S, M, L = "small", "medium", "large"
FX, GB, TU = "fixed", "gimballed", "turret"

# (family, name, agility, max speed, accelerate, decelerate, hull, shields, weapons, cost, extras)
VEHICLES = [
    ("Scarab SRV", "Scarab SRV – Surveyor", 5, 10, 4, 2, 40, 30, [plasma_repeater(S, TU)], "5,270cr", {"notes": "Two small forward fixed mounts, empty."}),
    ("Scarab SRV", "Scarab SRV – Interceptor", 4, 10, 4, 2, 40, 30, [plasma_repeater(S, TU), multicannon(S, FX), multicannon(S, FX)], "10,600cr", {}),
    ("Scarab SRV", "Scarab SRV – Ranger", 5, 9, 4, 2, 40, 40, [plasma_repeater(S, TU)], "32,510cr", {"sensors": "4km; can detect surface minerals", "notes": "Two small forward fixed mounts, empty."}),
    ("Scarab SRV", "Scarab SRV – Prowler", 4, 9, 4, 2, 50, 40, [W("Seeker Missile System", S, TU, 4, 25, vs_shields=10, ammo=6), cannon(S, GB, 10, acc=3), cannon(S, GB, 10, acc=3)], "53,400cr", {}),
    ("Garriot Quadbike SRV", "Quadbike SRV – Reorte Type 1", 6, 8, 4, 3, 25, 25, [multicannon(S, FX), multicannon(S, FX)], "4,500cr", {}),
    ("Garriot Quadbike SRV", "Quadbike SRV – Lancer", 5, 7, 4, 3, 25, 30, [beam(S, FX), cannon(S, FX, 10)], "22,000cr", {"token": "garriot-shielded-recon-quadbike-red"}),
    ("Garriot Quadbike SRV", "Quadbike SRV – Wanderer", 7, 9, 4, 3, 25, 25, [], "3,200cr", {"table": WANDERER, "special": "Enhanced Performance (its own Speed Table)", "notes": "Two small forward fixed mounts, empty.", "token": "garriot-shielded-recon-quadbike-green"}),
    ("Garriot Quadbike SRV", "Quadbike SRV – Hunter", 6, 8, 4, 3, 30, 30, [W("Dumbfire Missiles", S, FX, 1, 25, vs_shields=10, ammo=8), W("Dumbfire Missiles", S, FX, 1, 25, vs_shields=10, ammo=8)], "32,000cr", {"token": "garriot-shielded-recon-quadbike-black"}),
    ("Gangland Battlecar", "Gangland Battlecar", 2, 7, 3, 2, 60, 0, [multicannon(S, TU), multicannon(S, TU)], "3,200cr", {"notes": "Not pressurised."}),
    ("Borderworld APC", "Borderworld APC", 2, 7, 2, 2, 130, 80, [cannon(M, TU, 20), multicannon(S, TU)], "65,730cr", {"notes": "Pressurised. Seats 2 in front and 12 in the back."}),
    ("Longhaul Truck", "Longhaul Truck", 2, 7, 2, 2, 70, 0, [pulse(S, TU), multicannon(S, FX), multicannon(S, FX)], "10,300cr", {"notes": "Pressurised."}),
    ("Federal Ram Raider", "Federal Ram Raider", 4, 8, 3, 2, 190, 100, [beam(M, TU, base=15), pulse(S, GB, acc=3), pulse(S, GB, acc=3)], "86,560cr",
     {"special": "Forward Ram: takes no Damage when its Ram hits a vehicle; half Damage when it collides in a Chicken action."}),
    ("Light Tank", "Light Tank – Enforcer GU9", 3, 6, 3, 2, 250, 130, [cannon(L, TU, 30, ammo=24), burst_laser(M, TU, base=15)], "198,460cr", {}),
    ("Light Tank", "Light Tank – Augustus III", 2, 6, 3, 2, 260, 140, [beam(L, TU, base=25), multicannon(M, TU, base=15)], "243,140cr", {"token": "light-tank-red"}),
    ("Light Tank", "Light Tank – Mongoose Missile Tank", 3, 6, 3, 2, 250, 130, [seeker(L, TU, 50, 25, 6), multicannon(M, TU, base=15)], "204,990cr", {}),
    ("Light Tank", "Light Tank – Bulldog Advanced", 3, 5, 3, 2, 280, 130, [W("Plasma Accelerator", L, TU, -1, 60, ammo=25), seeker(M, TU, 35, 15, 6)], "418,200cr", {"token": "light-tank-red"}),
    ("Eranin Missile Tank", "Eranin Missile Tank", 0, 5, 2, 1, 320, 200, [seeker(L, TU, 50, 25, 12), seeker(L, TU, 50, 25, 12)], "612,000cr", {}),
    ("Imperial Avenger", "Imperial Avenger Front Line Battle Tank", 1, 6, 2, 1, 460, 250,
     [cannon(L, TU, 30), cannon(L, TU, 30), burst_laser(M, TU, base=15), burst_laser(M, TU, base=15)], "1,040,310cr",
     {"special": "Defences: ECM, Point Defence Turret (Ammo 10)."}),
    ("Barracuda Submersible", "Barracuda – Alpha", 6, 4, 2, 1, 50, 30, [pulse(S, FX), pulse(S, FX)], "8,010cr", {}),
    ("Barracuda Submersible", "Barracuda – Focus", 6, 4, 2, 1, 50, 40, [burst_laser(S, FX), W("Micro Torpedo Rack", S, FX, 4, 20, vs_shields=10, ammo=6)], "27,670cr", {"sensors": "3km; can detect surface minerals"}),
    ("Barracuda Submersible", "Barracuda – Dream", 6, 4, 2, 1, 60, 50, [beam(S, FX), beam(S, FX)], "39,800cr", {}),
    ("Barracuda Submersible", "Barracuda – Halo", 7, 4, 2, 1, 50, 70, [burst_laser(S, FX), burst_laser(S, FX)], "62,000cr", {"recharge": 10, "sensors": "4km; can detect surface minerals"}),
]

SIZE_TOKEN = {"small": 1, "medium": 1, "large": 2}


def weapon_item(vid, i, w):
    _id = doc_id(vid, str(i), w["name"])
    return {
        "_id": _id, "_key": f"!actors.items!{vid}.{_id}", "name": w["name"], "type": "craftWeapon",
        "img": "icons/svg/target.svg",
        "system": {
            "description": "", "cost": "", "mount": {"size": w["size"], "kind": w["kind"]}, "accuracy": w["acc"],
            "damage": w["damage"], "burst": {"perPoint": 5, "max": w["burst"]}, "damageVsShields": w["vs_shields"],
            "bonusVsHull": w["hull"], "bonusVsShields": w["shields"],
            "ammo": {"value": w["ammo"] or 0, "max": w["ammo"]}, "special": w["special"], "gunner": "",
        },
        "effects": [], "folder": None, "sort": (i + 1) * 100, "ownership": {"default": 0}, "flags": {},
    }


def main():
    root = os.path.join(HERE, "..", "packs", "_source", "vehicles")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    folders = {}
    for fam in FAMILIES:
        fid = doc_id("folder", fam)
        folders[fam] = fid
        with open(os.path.join(root, f"_folder-{re.sub(r'[^a-z0-9]+', '-', fam.lower())}_{fid}.json"), "w") as fh:
            json.dump({"_id": fid, "_key": f"!folders!{fid}", "name": fam, "type": "Actor", "folder": None, "description": "",
                       "sorting": "m", "sort": len(folders) * 100, "color": None, "flags": {}}, fh, indent=2)
            fh.write("\n")
    for sort, (fam, name, ag, sp, acc, dec, hull, shields, weapons, cost, extra) in enumerate(VEHICLES):
        cat, maker, dims, bays, crew, pax, sensors, cargo, speed_table, token = FAMILIES[fam]
        token = extra.get("token", token)
        img = f"{TOKENS}/{token}.webp" if token else "icons/svg/wing.svg"
        vid = doc_id(name)
        notes = extra.get("notes", "")
        doc = {
            "_id": vid, "_key": f"!actors!{vid}", "name": name, "type": "vehicle", "img": img,
            "system": {
                "category": cat, "manufacturer": maker, "dimensions": dims, "bays": bays, "crewSize": crew,
                "passengers": pax, "sensors": extra.get("sensors", sensors), "cargo": cargo, "cost": cost,
                "special": extra.get("special", ""),
                "agility": ag, "maxSpeed": sp, "accelerate": acc, "decelerate": dec,
                "speedTable": extra.get("table", speed_table),
                "hull": {"value": hull, "max": hull},
                "shields": {"value": shields, "max": shields, "recharge": extra.get("recharge", 5), "down": False},
                "speed": 0, "zone": "atDistance", "pilot": "",
                "description": f"<p>{notes}</p>" if notes else "",
            },
            "prototypeToken": {
                "name": name, "actorLink": False, "disposition": 0, "displayBars": 20,
                "width": SIZE_TOKEN[cat], "height": SIZE_TOKEN[cat],
                "texture": {"src": img},
                "bar1": {"attribute": "hull"}, "bar2": {"attribute": "shields"},
            },
            "items": [weapon_item(vid, i, w) for i, w in enumerate(weapons)],
            "effects": [], "folder": folders[fam], "sort": (sort + 1) * 100, "ownership": {"default": 0}, "flags": {},
        }
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{vid}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"{len(VEHICLES)} vehicles written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
