"""
Vehicle-scale drones for the Opponents compendium (Core Rules pp.318-319): the four skimmers, as drone Vehicle actors
in a "Vehicle-Scale Drones" folder. Each weapon's Accuracy holds the stat block's To Hit. Called by
tools/opponents.py (run that, then `npm run packs`).
"""
import hashlib, importlib.util, json, os, re

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("vehicles", os.path.join(HERE, "vehicles.py"))
veh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(veh)
W, table, weapon_item = veh.W, veh.table, veh.weapon_item

TOKENS = "systems/edrpg/assets/tokens/skimmer"
SKIMMER = table({4: 1, 5: 2}, {5: -1})
FLYING = "Flies: no obstacle checks; fixed-mount vehicle weapons can't target it."


def did(*parts):
    return hashlib.sha1(("edrpg-drone-" + "-".join(parts)).encode()).hexdigest()[:16]


def seeker(to_hit):
    return W("Seeker Missile Rack", "small", "fixed", to_hit, 25, vs_shields=10, ammo=6)


# (name, rank, defence, initiative, pursuit bonus, perception, hull, weapons, token, extra)
DRONES = [
    ("S4 Sentry Skimmer", "Harmless Drone", 2, 1, 1, 2, 25,
     [W("Multi-cannon", "small", "gimballed", 5, 5, burst=10, hull=5, ammo=15)], "skimmer-sentry-red", {}),
    ("S5LM Guardian Skimmer", "Mostly Harmless Drone", 3, 2, 1, 3, 30, [seeker(7)], "skimmer-guardian-red", {}),
    ("Stinger-2 Attack Skimmer", "Competent Drone", 5, 2, 1, 3, 15, [], "skimmer-attack-red",
     {"bomb": {"damage": 20, "vsShields": 10},
      "special": "Flying bomb: no weapons, but can Chicken and Ram. On a successful Ram or Chicken it explodes for 20 extra "
                 "Damage (10 if the target's shields are still up after the impact); a Chicken victim isn't stopped dead."}),
    ("S9 Goliath Skimmer", "Competent Drone", 4, 3, 2, 4, 50, [seeker(8), seeker(8)], "skimmer-goliath-red", {}),
]


def write(root, sort_base=1000):
    fid = did("folder")
    with open(os.path.join(root, f"_folder-vehicle-scale-drones_{fid}.json"), "w") as fh:
        json.dump({"_id": fid, "_key": f"!folders!{fid}", "name": "Vehicle-Scale Drones", "type": "Actor", "folder": None,
                   "description": "", "sorting": "m", "sort": sort_base, "color": None, "flags": {}}, fh, indent=2)
        fh.write("\n")
    for i, (name, rank, dfn, init, pursuit, perception, hull, weapons, token, extra) in enumerate(DRONES):
        vid = did(name)
        img = f"{TOKENS}/{token}.webp"
        special = ". ".join(x for x in [rank, extra.get("special", ""), FLYING] if x)
        doc = {
            "_id": vid, "_key": f"!actors!{vid}", "name": name, "type": "vehicle", "img": img,
            "system": {
                "category": "small", "manufacturer": "", "dimensions": "", "bays": 1, "crewSize": 0, "passengers": 0,
                "sensors": "500m", "cargo": "None", "cost": "", "special": special,
                "agility": 0, "maxSpeed": 5, "accelerate": 4, "decelerate": 3, "speedTable": SKIMMER,
                "hull": {"value": hull, "max": hull},
                "shields": {"value": 0, "max": 0, "recharge": 0, "down": False},
                "speed": 0, "zone": "atDistance", "pilot": "", "description": "",
                "drone": {"enabled": True, "defence": dfn, "initiative": init, "pursuit": pursuit, "perception": perception},
                "flying": True, "bomb": extra.get("bomb", {"damage": 0, "vsShields": 0}), "forwardRam": False,
            },
            "prototypeToken": {
                "name": name, "actorLink": False, "disposition": -1, "displayBars": 20, "width": 1, "height": 1,
                "texture": {"src": img}, "bar1": {"attribute": "hull"}, "bar2": {"attribute": None},
            },
            "items": [weapon_item(vid, j, w) for j, w in enumerate(weapons)],
            "effects": [], "folder": fid, "sort": (i + 1) * 100, "ownership": {"default": 0}, "flags": {},
        }
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{vid}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    return len(DRONES)
