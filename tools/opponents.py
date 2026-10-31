"""
Sample opponents for testing combat (Core Rules ch. 11). A small set only; the full opponent
compendium comes later. Stat-block numbers and mechanics only, no flavour text.

Run `python3 tools/opponents.py` (after tools/equipment.py and tools/karma-capabilities.py exist),
then `npm run packs`.
"""
import copy, hashlib, importlib.util, json, os, re

HERE = os.path.dirname(__file__)


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), os.path.join(HERE, f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


eq = load("equipment")
karma = load("karma-capabilities")
WEAPONS = {w["name"]: w for w in eq.WEAPONS}
ARMOUR = {a["name"]: a for a in eq.ARMOUR}
KARMA = {c[0]: c for c in karma.CAPABILITIES}


def oid(*parts):
    return hashlib.sha1(("edrpg-opponent-" + "-".join(parts)).encode()).hexdigest()[:16]


def weapon(name, **over):
    """A compendium weapon, equipped, with optional overrides of its system data."""
    doc = eq.weapon_doc(WEAPONS[name], 0)
    doc["system"]["equipped"] = True
    for k, v in over.items():
        if k == "name":
            doc["name"] = v
        else:
            doc["system"][k] = v
    return doc


def custom_weapon(name, skill, dtype, damage, *, finesse=None, ranges=None, toHit=None, burst=None, ammo=None, notes=""):
    """A natural or built-in attack that isn't in the equipment lists."""
    w = eq.W(name, skill, dtype, ranges or eq.NONE, damage, ammo, "", "common", finesse=finesse, burst=burst, notes=notes)
    return weapon_from(w, toHit)


def weapon_from(w, toHit=None):
    doc = eq.weapon_doc(w, 0)
    doc["system"].update(equipped=True, toHit=toHit, cost="", description="")
    return doc


def armour(name=None, **custom):
    if name:
        doc = eq.armour_doc(ARMOUR[name], 0)
    else:
        doc = eq.armour_doc(eq.A(custom.pop("label"), custom.pop("absorb"), "", "common", **custom), 0)
        doc["system"]["description"] = ""
    doc["system"]["worn"] = True
    return doc


def karma_item(name, uses=1):
    _, role, category, cost, _, _ = KARMA[name]
    boost = karma.BOOSTS.get(name, (0, "", 0, ""))
    return {
        "name": name, "type": "karma", "img": karma.ICONS[role],
        "system": {
            "description": "", "role": role, "category": category, "cost": 0 if cost == "all" else cost,
            "costAll": cost == "all", "free": False, "usedThisTurn": False,
            "attackBonus": boost[0], "attackApplies": boost[1], "defenceBonus": boost[2], "defenceApplies": boost[3],
            "preventsKnockdown": name == "Stay Standing", "usesPerBattle": uses, "timesUsed": 0,
        },
        "flags": {},
    }


def notes(*paras):
    return "".join(f"<p>{p}</p>" for p in paras)


SR = "kineticWeapons"
GROUP_ORDER = ["Soldier & Mercenary", "Criminal", "Police & Security", "Assassin", "Alien Animal", "Biomod", "Drone"]


def ranges_from(text):
    """'20m(5)/150m(6)/500m(9)' or 'No Short Range/500m(10)/3km(13)' → range bands."""
    if not text:
        return eq.NONE
    parts = [p.strip() for p in re.split(r"\s*[/,]\s*", text)]
    bands = []
    for p in parts[:3]:
        m = re.match(r"^([\d.]+k?m)\((\d+)\)$", p)
        bands.append((m.group(1), int(m.group(2))) if m else (p.replace("No Short Range", "No short range"), None))
    while len(bands) < 3:
        bands.append(("", None))
    return eq.bands(*bands)


def build_weapon(w):
    """A stat-block attack: the compendium weapon with the opponent's To Hit (and damage/ammo where they differ), or a
    natural/custom attack built from the stat block."""
    note = w.get("notes") or ""
    if w.get("compendium"):
        doc = weapon(w["compendium"], toHit=w["toHit"])
        sysd = doc["system"]
        if w["damage"] not in ("0", "", None) and not w["blast"]:
            sysd["damage"] = w["damage"]
        if w["burst"]:
            sysd["burst"] = {"kind": w["burst"][0], "max": w["burst"][1]}
        if w["ammo"]:
            sysd["ammo"] = {"value": w["ammo"], "max": w["ammo"]}
        if w["finesse"] is not None:
            sysd["finesse"] = w["finesse"]
        if note:
            sysd["description"] = f"<p>{note}</p>"
        return doc
    blast = None
    if w["blast"]:
        fr, ir = (w["blastRadius"] or (None, None))
        fr, ir = (float(str(x).rstrip("m")) if x else None for x in (fr, ir))
        fr, ir = (int(x) if x is not None and x == int(x) else x for x in (fr, ir))
        blast = (w["blast"][0], w["blast"][1], fr, ir)
    rd = w.get("rangeDamage") or {}
    ww = eq.W(w["name"], w["skill"], w["dtype"], ranges_from(w["range"]), w["damage"] if w["damage"] != "0" or not blast else "0",
              w["ammo"], "", "common", finesse=w["finesse"], burst=tuple(w["burst"]) if w["burst"] else None, blast=blast,
              range_damage=rd, notes=note)
    return weapon_from(ww, w["toHit"])


def build_armour(a):
    doc = eq.armour_doc(eq.A(a["name"], a["absorb"], "", "common", hardened=a.get("hardened"), toxic_all=a.get("toxicAll", False)), 0)
    doc["system"]["worn"] = True
    doc["system"]["description"] = ""
    return doc


def from_data():
    """Every individual-scale opponent in the Core Rules (pp.284–319), from tools/opponents-data.json."""
    data = json.load(open(os.path.join(HERE, "opponents-data.json"), encoding="utf-8"))
    out = []
    for o in data:
        items = []
        if o["armour"]:
            items.append(build_armour(o["armour"]))
        items += [build_weapon(w) for w in o["weapons"]]
        items += [karma_item(k, u) for k, u in o["karma"] if k in KARMA]
        out.append(dict(name=o["name"], rank=o["rank"], role=o["role"], dodge=o["dodge"], parry=o["parry"],
                        endurance=o["endurance"], initiative=o["initiative"], perception=o["perception"], speed=o["speed"],
                        toHit=o["toHit"], equipment=o["equipment"], skills=[tuple(x) for x in o["skills"]], items=items,
                        notes=notes(o["notes"]) if o["notes"] else "", group=o["group"]))
    return out


OPPONENTS = from_data()


def main():
    root = os.path.join(HERE, "..", "packs", "_source", "opponents")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    top = oid("folder", "individual")
    with open(os.path.join(root, f"_folder-individual-scale-opponents_{top}.json"), "w") as fh:
        json.dump({"_id": top, "_key": f"!folders!{top}", "name": "Individual-Scale Opponents", "type": "Actor", "folder": None,
                   "description": "", "sorting": "m", "sort": 0, "color": None, "flags": {}}, fh, indent=2)
        fh.write("\n")
    folders = {}
    for g in GROUP_ORDER:
        fid = oid("folder", g)
        folders[g] = fid
        with open(os.path.join(root, f"_folder-{re.sub(r'[^a-z0-9]+', '-', g.lower())}_{fid}.json"), "w") as fh:
            json.dump({"_id": fid, "_key": f"!folders!{fid}", "name": g, "type": "Actor", "folder": top, "description": "",
                       "sorting": "m", "sort": (GROUP_ORDER.index(g) + 1) * 100, "color": None, "flags": {}}, fh, indent=2)
            fh.write("\n")
    for sort, o in enumerate(OPPONENTS):
        _id = oid(o["name"])
        items = []
        for i, item in enumerate(o["items"]):
            item = copy.deepcopy(item)
            iid = oid(o["name"], item["name"])
            item.pop("sort", None)
            item["flags"] = {}
            items.append({"_id": iid, "_key": f"!actors.items!{_id}.{iid}", **item, "effects": [],
                          "folder": None, "sort": (i + 1) * 100, "ownership": {"default": 0}})
        doc = {
            "_id": _id, "_key": f"!actors!{_id}", "name": o["name"], "type": "opponent",
            "img": "icons/svg/mystery-man.svg",
            "system": {
                "rank": o["rank"], "role": o["role"], "dodge": o["dodge"], "parry": o["parry"],
                "initiative": o["initiative"], "perception": o["perception"], "toHit": o["toHit"], "speed": o["speed"],
                "endurance": {"value": o["endurance"], "max": o["endurance"]},
                "otherSkills": [{"skill": s, "bonus": b} for s, b in o.get("skills", [])],
                "equipment": o["equipment"], "notes": o.get("notes", ""),
            },
            "prototypeToken": {"name": o["name"], "actorLink": False, "disposition": -1,
                               "displayBars": 20, "bar1": {"attribute": "endurance"}, "bar2": {"attribute": None}},
            "items": items, "effects": [], "folder": folders.get(o.get("group")), "sort": (sort + 1) * 100,
            "ownership": {"default": 0}, "flags": {},
        }
        slug = re.sub(r"[^a-z0-9]+", "-", o["name"].lower()).strip("-")
        with open(os.path.join(root, f"{slug}_{_id}.json"), "w") as fh:
            json.dump(doc, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    drones = load("drones").write(root)
    craft = load("ships").write_opponents(root)
    print(f"{len(OPPONENTS)} opponents, {drones} vehicle-scale drones and {craft} spaceship/vehicle opponents written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
