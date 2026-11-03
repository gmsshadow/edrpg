"""
Ships compendium (Core Rules ch.5, pp.139–191) and spaceship/vehicle-scale GM opponents (pp.288–310).

The stat blocks were extracted from the rulebook into tools/ships-data.json (names, stats, components, equipment and
costs only). Run `python3 tools/ships.py` (and `python3 tools/opponents.py`, which calls write_opponents), then
`npm run packs`.

Conventions:
- Weapons' +5 vs Shields (lasers) and +5 vs Hull (cannons, multi-cannons, fragment cannons) follow the book's markers.
- Ship roster components keep their roster order; the variant's Bonuses line fills To Hit / Initiative / Dogfighting
  bonuses (Agility and Speed are already in the ratings) and adds to the 5-point shield recharge.
- GM opponents use the stat block (fixed Defence, Dogfighting, Pursuit, Initiative, Critical); each weapon's Accuracy
  holds its listed To Hit. Agility, Speed and size come from the matching ship variant.
"""
import hashlib, json, os, re

HERE = os.path.dirname(__file__)
DATA = json.load(open(os.path.join(HERE, "ships-data.json"), encoding="utf-8"))
# Supplement ships (Espionage, Exploration, Military, Super Traders), each with its "source" book.
SUPPLEMENT = json.load(open(os.path.join(HERE, "ships-supplements.json"), encoding="utf-8"))["ships"]
TOK = "systems/edrpg/assets/tokens"
TOKEN_SIZE = {"small": 1, "medium": 2, "large": 3, "huge": 4}

# Family → token images (cycled across variants); pirate/police variants get their own art where there is some.
FAMILY_TOKENS = {
    "Adder": ["explorer/adder", "explorer/adder-blue", "explorer/adder-orange", "explorer/adder-red"],
    "Anaconda": ["explorer/anaconda"],
    "Asp Explorer": ["explorer/asp-explorer"],
    "Cobra Mk III": ["combat/cobra-blue", "combat/cobra-red", "combat/cobra-yellow", "combat/cobra-orange", "combat/cobra-redblue", "combat/cobra-mk-iii-wireframe"],
    "Diamondback Scout": ["explorer/diamondback-scout-stock", "explorer/diamondback-scout-purple", "explorer/diamondback-scout-red", "explorer/diamondback-scout-red-2"],
    "Eagle Mk II": ["combat/eagle-blue", "combat/eagle-green", "combat/eagle-orange", "combat/eagle-red", "combat/eagle-yellow"],
    "Fer-de-Lance": ["combat/fdl-blue"],
    "Hauler": ["transport/hauler"],
    "Krait Lightspeeder": ["combat/krait-classic", "combat/krait-blue", "combat/krait-green", "combat/krait-red"],
    "Python": ["combat/python"],
    "Sidewinder": ["combat/sidewinder", "combat/sidewinder-whiteblue", "combat/sidewinder-whitegreen", "combat/sidewinder-whiteorange", "combat/sidewinder-whitepurple", "combat/sidewinder-black"],
    "Type-6 Transporter": ["transport/type-6"],
    "Type-7 Transporter": ["transport/type-7"],
    "Type-9 Heavy": ["transport/type-9"],
    "Viper Mk III": ["combat/viper-mk-iii", "combat/viper-blue", "combat/viper-red", "combat/viper-yellow"],
    "Vulture": ["combat/vulture", "combat/vulture-green", "combat/vulture-grey", "combat/vulture-purple", "combat/vulture-red"],
    # Supplements (no token art yet for the Imperial Explorer or Boa Mk III).
    "Mamba Mk II": ["combat/mamba-stock", "combat/mamba-blue", "combat/mamba-red", "combat/mamba-purple", "combat/mamba-yellow"],
    "Merlin": ["combat/merlin-stock", "combat/merlin-blue", "combat/merlin-red", "combat/merlin-green", "combat/merlin-purple", "combat/merlin-yellow"],
    "Mongoose": ["combat/mongoose-blue", "combat/mongoose-red", "combat/mongoose-yellow"],
    "Viper Mk IV": ["combat/viper-mk-iv"],
    "Asp Scout": ["explorer/asp-scout"],
    "Diamondback Explorer": ["explorer/diamondback-explorer-yellow", "explorer/diamondback-explorer-purple"],
    "Federal Assault Ship": ["federation/federal-assault-ship"],
    "Federal Corvette": ["federation/federal-corvette"],
    "Federal Dropship": ["federation/federal-dropship"],
    "Federal Gunship": ["federation/federal-gunship"],
    "Imperial Clipper": ["empire/imperial-clipper"],
    "Imperial Courier": ["empire/imperial-courier", "empire/imperial-courier-red", "empire/imperial-courier-black"],
    "Imperial Cutter": ["empire/imperial-cutter"],
    "Imperial Eagle": ["empire/imperial-eagle"],
    "Cobra Mk IV": ["combat/cobra-mk-iv-red"],
    "Keelback": ["transport/keelback"],
    "Imperial Explorer": [],
    "Boa Mk III": [],
}
PIRATE = {"Cobra Mk III": "pirate/cobra-pirate1", "Eagle Mk II": "pirate/eagle-pirate1", "Krait Lightspeeder": "pirate/krait-pirate1",
          "Sidewinder": "pirate/sidewinder-pirate1", "Viper Mk III": "pirate/viper-pirate1"}
POLICE = {"Viper Mk III": "police/viper-mk-iii-police", "Viper Mk IV": "police/viper-mk-iv-police"}

ACRONYMS = {"Mk": "Mk", "Ii": "II", "Iii": "III", "Iv": "IV", "Dcc": "DCC", "Gti": "GTI", "Egx": "EGX", "Mr": "MR", "Fd-4": "FD-4",
            "Var": "VAR", "B3": "B3", "X4": "X4", "T21": "T21", "S-Type": "S-Type", "Cx": "CX", "A9": "A9", "Q": "Q", "De": "de", "Haz": "Haz", "Mp": "MP"}


def did(*parts):
    return hashlib.sha1(("edrpg-ship-" + "-".join(parts)).encode()).hexdigest()[:16]


def title(text):
    words = re.sub(r"\s+", " ", text.replace("‘", "'").replace("’", "'")).strip().title().split(" ")
    out = " ".join(ACRONYMS.get(w, w) for w in words)
    return out.replace("Fer-De-Lance", "Fer-de-Lance").replace("Viva!", "Viva!")


def family_name(raw):
    f = title(raw)
    return {"Cobra Mk III": "Cobra Mk III", "Eagle Mk II": "Eagle Mk II", "Viper Mk III": "Viper Mk III"}.get(f, f)


def variant_name(raw):
    family, _, variant = re.split(r"\s*([–-])\s*", raw.strip(), maxsplit=1)[0], None, re.split(r"\s+[–-]\s*", raw.strip(), maxsplit=1)[-1]
    head = re.split(r"\s+[–-]\s*", raw.strip(), maxsplit=1)[0]
    return f"{title(head)} – {title(variant)}"


def norm(text):
    return set(re.sub(r"[^a-z0-9 ]", " ", text.lower().replace("transporter", "transport").replace("explorer", "")).split()) - {"mk", "ii", "iii", "the"}


def weapon_mods(name):
    """+5 vs Shields for lasers, +5 vs Hull for kinetic cannons (the book's s and * markers)."""
    n = name.lower()
    if "laser" in n and "mining" not in n:
        return 0, 5
    if re.search(r"cannon|fragment", n) and "plasma" not in n:
        return 5, 0
    return 0, 0


def weapon_name(name):
    """One spelling for the book's variants: Multi-Cannon, Gimballed, Rail Gun."""
    name = re.sub(r"Multi[- ]?cannon", "Multi-Cannon", name, flags=re.I)
    name = re.sub(r"Gimbaled", "Gimballed", name)
    return re.sub(r"Railgun", "Rail Gun", name)


def weapon_item(owner, i, w, gm=False):
    _id = did(owner, "w", str(i), w["name"])
    hull, shields = weapon_mods(w["name"])
    special = w.get("special", "")
    return {
        "_id": _id, "_key": f"!actors.items!{owner}.{_id}", "name": weapon_name(w["name"]), "type": "craftWeapon", "img": "icons/svg/target.svg",
        "system": {
            "description": "", "cost": "", "mount": {"size": w["size"] if w["size"] in ("small", "medium", "large", "huge") else "small", "kind": w["kind"]},
            "accuracy": w["acc"], "damage": w["damage"], "burst": {"perPoint": 5, "max": w["burst"]}, "damageVsShields": w["vs"],
            "bonusVsHull": hull, "bonusVsShields": shields, "ammo": {"value": w["ammo"] or 0, "max": w["ammo"]}, "special": special, "gunner": "",
        },
        "effects": [], "folder": None, "sort": (i + 1) * 100, "ownership": {"default": 0}, "flags": {},
    }


def token_for(family, name, index):
    lname = name.lower()
    if family in POLICE and "police" in lname:
        return POLICE[family]
    if family in PIRATE and re.search(r"raider|pirate|jolly|annihilator|privateer|war totem|cutthroat", lname):
        return PIRATE[family]
    pool = FAMILY_TOKENS.get(family, ["combat/sidewinder"])
    return pool[index % len(pool)] if pool else None


def equipment(eq):
    return {
        "chaff": {"value": eq["chaff"], "max": eq["chaff"]},
        "mines": {"value": (eq["mines"] or {}).get("ammo", 0), "max": (eq["mines"] or {}).get("ammo", 0), "dn": (eq["mines"] or {}).get("dn", 15), "damage": (eq["mines"] or {}).get("damage", 10)},
        "pointDefence": {"value": eq["pd"], "max": eq["pd"]},
        "ecm": bool(eq["ecm"]),
        "floating": eq["floating"] or 0,
        "cellBanks": eq["banks"],
    }


def ship_doc(v, index, folder, sort):
    family = family_name(v["family"])
    name = variant_name(v["name"])
    vid = did(name)
    token = token_for(family, name, index)
    img = f"{TOK}/{token}.webp" if token else "icons/svg/wing.svg"
    b = v["base"]
    cat = b["category"]
    comps = [{"name": c["name"], "kind": c["kind"], "strength": {"value": c["str"], "max": c["str"]}, "notes": c["notes"], "item": ""} for c in v["components"]]
    weapons = [weapon_item(vid, i, w) for i, w in enumerate(v["weapons"])]
    return {
        "_id": vid, "_key": f"!actors!{vid}", "name": name, "type": "ship", "img": img,
        "system": {
            "category": cat, "manufacturer": b["manufacturer"], "dimensions": b["dimensions"], "landingPad": b["landingPad"],
            "crewSize": int(re.sub(r"\D", "", str(b["crew"])) or 1), "passengers": int(re.sub(r"\D", "", str(b["passengers"])) or 0),
            "utilityMounts": b["utility"], "cargo": v["cargo"], "range": v["range"], "fuel": v["fuel"], "cost": v["cost"],
            "sensors": "", "bays": 0, "special": "",
            "agility": v["agility"], "speed": v["speed"], "maxSpeed": v["speed"], "accelerate": 0, "decelerate": 0,
            "hull": {"value": v["hull"], "max": v["hull"]},
            "shields": {"value": v["shields"], "max": v["shields"], "recharge": 5 + v["bonus"]["recharge"], "down": False},
            "bonuses": {"toHit": v["bonus"]["toHit"], "initiative": v["bonus"]["initiative"], "dogfighting": v["bonus"]["dogfighting"]},
            "npc": {"enabled": False, "defence": 0, "dogfighting": 0, "pursuit": 0, "initiative": 0, "critical": 20},
            "components": comps, "equipment": equipment(v["equipment"]),
            "zone": "atDistance", "pilot": "", "description": f"<p><em>{v['source']}</em></p>" if v.get("source") else "",
        },
        "prototypeToken": {
            "name": name, "actorLink": False, "disposition": 0, "displayBars": 20, "width": TOKEN_SIZE[cat], "height": TOKEN_SIZE[cat],
            "texture": {"src": img}, "bar1": {"attribute": "hull"}, "bar2": {"attribute": "shields"},
        },
        "items": weapons, "effects": [], "folder": folder, "sort": sort, "ownership": {"default": 0}, "flags": {},
    }


def folder_doc(fid, name, sort, parent=None):
    return {"_id": fid, "_key": f"!folders!{fid}", "name": name, "type": "Actor", "folder": parent, "description": "",
            "sorting": "m", "sort": sort, "color": None, "flags": {}}


def dump(root, doc, slug):
    with open(os.path.join(root, f"{slug}_{doc['_id']}.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def write_ships():
    root = os.path.join(HERE, "..", "packs", "_source", "ships")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    folders = {}
    counts = {}
    for i, v in enumerate(DATA["ships"]):
        family = family_name(v["family"])
        if family not in folders:
            folders[family] = did("folder", family)
            dump(root, folder_doc(folders[family], family, len(folders) * 100), "_folder-" + slugify(family))
        counts[family] = counts.get(family, 0)
        doc = ship_doc(v, counts[family], folders[family], (i + 1) * 100)
        counts[family] += 1
        dump(root, doc, slugify(doc["name"]))
    # Supplement ships: a folder per book, with a family folder inside.
    books = {}
    for i, v in enumerate(SUPPLEMENT):
        book = v["source"]
        if book not in books:
            books[book] = did("folder", book)
            dump(root, folder_doc(books[book], book, 10000 + len(books) * 100), "_folder-" + slugify(book))
        family = family_name(v["family"])
        key = f"{book}/{family}"
        if key not in folders:
            folders[key] = did("folder", key)
            dump(root, folder_doc(folders[key], family, len(folders) * 100, books[book]), "_folder-" + slugify(key))
        counts[key] = counts.get(key, 0)
        doc = ship_doc(v, counts[key], folders[key], (i + 1) * 100)
        counts[key] += 1
        dump(root, doc, slugify(doc["name"]))
    return len(DATA["ships"]) + len(SUPPLEMENT)


def match_variant(text):
    want = norm(text)
    best, score = None, 0
    for v in DATA["ships"]:
        s = len(want & norm(v["name"]))
        if s > score:
            best, score = v, s
    return best


def write_opponents(root, sort_base=2000):
    """GM opponents at spaceship and vehicle scale, into the Opponents pack (root = its source folder)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("vehicles", os.path.join(HERE, "vehicles.py"))
    veh = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(veh)
    vehicles = {v[1]: v for v in veh.VEHICLES}
    top = did("folder", "spaceship-opponents")
    dump(root, folder_doc(top, "Spaceship-Scale Opponents", sort_base), "_folder-spaceship-scale-opponents")
    vtop = did("folder", "vehicle-opponents")
    dump(root, folder_doc(vtop, "Vehicle-Scale Opponents", sort_base + 100), "_folder-vehicle-scale-opponents")
    groups = {}
    n = 0
    for i, o in enumerate(DATA["opponents"]):
        st = {k: v for k, v in o["stats"].items()}
        num = lambda k, d=0: int(re.sub(r"[^\d-]", "", st.get(k, str(d))) or d)
        name = title(o["name"])
        oid = did("opp", name)
        if o["kind"] == "vehicle":
            match = next((v for k, v in vehicles.items() if norm(k) == norm(o["ship"]) or norm(o["ship"]) <= norm(k)), None)
            fam, vname, ag, sp, acc, dec, hull, shields, _, _, extra = match
            table = extra.get("table", veh.FAMILIES[fam][8])
            cat = veh.FAMILIES[fam][0]
            token = extra.get("token", veh.FAMILIES[fam][9])
            img = f"{veh.TOKENS}/{token}.webp" if token else "icons/svg/wing.svg"
            doc = {
                "_id": oid, "_key": f"!actors!{oid}", "name": name, "type": "vehicle", "img": img,
                "system": {
                    "category": cat, "manufacturer": "", "dimensions": "", "bays": 1, "crewSize": 0, "passengers": 0, "sensors": "",
                    "cargo": "", "cost": "", "special": f"{o['rank']}. Vehicle: {o['ship']}.",
                    "agility": 0, "maxSpeed": num("Max Speed", sp), "accelerate": num("Accelerate", acc), "decelerate": num("Decelerate", dec),
                    "speedTable": table, "hull": {"value": num("Hull", hull), "max": num("Hull", hull)},
                    "shields": {"value": num("Shields", shields), "max": num("Shields", shields), "recharge": num("Shield Recharge", 5), "down": False},
                    "drone": {"enabled": True, "defence": num("Defence"), "initiative": num("Initiative"), "pursuit": num("Pursuit"), "perception": num("Perception")},
                    "flying": False, "bomb": {"damage": 0, "vsShields": 0}, "forwardRam": False,
                    "speed": 0, "zone": "atDistance", "pilot": "", "description": "",
                },
                "prototypeToken": {"name": name, "actorLink": False, "disposition": -1, "displayBars": 20, "width": 1, "height": 1,
                                   "texture": {"src": img}, "bar1": {"attribute": "hull"}, "bar2": {"attribute": "shields"}},
                "items": [weapon_item(oid, j, w) for j, w in enumerate(o["weapons"])],
                "effects": [], "folder": vtop, "sort": (i + 1) * 100, "ownership": {"default": 0}, "flags": {},
            }
            dump(root, doc, slugify(name))
            n += 1
            continue
        g = o["group"]
        if g not in groups:
            groups[g] = did("folder", "opp", g)
            dump(root, folder_doc(groups[g], g, len(groups) * 100, top), "_folder-" + slugify(g))
        v = match_variant(o["ship"])
        family = family_name(v["family"]) if v else "Sidewinder"
        cat = v["base"]["category"] if v else "small"
        img = f"{TOK}/{token_for(family, o['ship'] + ' ' + name, i)}.webp"
        eq = {"chaff": 0, "pd": 0, "ecm": False, "mines": None, "floating": 0, "banks": []}
        for u in o["utility"]:
            am = re.search(r"Ammo\s*(\d+)", u)
            if "Chaff" in u: eq["chaff"] += int(am.group(1)) if am else 6
            if "Point" in u and "efence" in u: eq["pd"] += int(am.group(1)) if am else 10
            if re.match(r"^ECM\b", u): eq["ecm"] = True
        if st.get("Shield Cell Bank"):
            b, d = (int(x) for x in st["Shield Cell Bank"].split("/"))
            eq["banks"].append({"name": "Shield Cell Bank", "boost": b, "duration": d, "uses": 3})
        doc = {
            "_id": oid, "_key": f"!actors!{oid}", "name": name, "type": "ship", "img": img,
            "system": {
                "category": cat, "manufacturer": v["base"]["manufacturer"] if v else "", "dimensions": "", "landingPad": v["base"]["landingPad"] if v else "",
                "crewSize": 1, "passengers": 0, "utilityMounts": "", "cargo": "", "range": "", "fuel": "", "cost": "",
                "sensors": "", "bays": 0, "special": f"{o['rank']}. Spaceship: {o['ship']}.",
                "agility": v["agility"] if v else 0, "speed": v["speed"] if v else 0, "maxSpeed": v["speed"] if v else 0, "accelerate": 0, "decelerate": 0,
                "hull": {"value": num("Hull"), "max": num("Hull")},
                "shields": {"value": num("Shields"), "max": num("Shields"), "recharge": num("Shield Recharge", 5), "down": False},
                "bonuses": {"toHit": 0, "initiative": 0, "dogfighting": 0},
                "npc": {"enabled": True, "defence": num("Defence"), "dogfighting": num("Dogfighting"), "pursuit": num("Pursuit"),
                        "initiative": num("Initiative"), "critical": num("Critical", 20)},
                "components": [], "equipment": equipment(eq),
                "zone": "atDistance", "pilot": "", "description": "",
            },
            "prototypeToken": {"name": name, "actorLink": False, "disposition": -1, "displayBars": 20, "width": TOKEN_SIZE[cat], "height": TOKEN_SIZE[cat],
                               "texture": {"src": img}, "bar1": {"attribute": "hull"}, "bar2": {"attribute": "shields"}},
            "items": [weapon_item(oid, j, w, gm=True) for j, w in enumerate(o["weapons"])],
            "effects": [], "folder": groups[g], "sort": (i + 1) * 100, "ownership": {"default": 0}, "flags": {},
        }
        dump(root, doc, slugify(name))
        n += 1
    return n


if __name__ == "__main__":
    print(f"{write_ships()} ships written")
