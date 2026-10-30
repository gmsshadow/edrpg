"""
Premade scenes for the Combat Maps compendium: the EDRPG vehicle and space combat maps (zone maps: up-close inside
the circle, at-distance outside). Run `python3 tools/scenes.py`, then `npm run packs`.

The up-close circle is stored on each scene (flags.edrpg.combatMap) so the system can tell which zone a token is in.
"""
import hashlib, json, os

HERE = os.path.dirname(__file__)
W, H = 4969, 3517
UP_CLOSE = {"x": 2484, "y": 1765, "radius": 1200}

SCENES = [
    ("Vehicle Combat Map", "vehicle", "vehicle-combat-map"),
    ("Space Combat Map", "space", "space-combat-map"),
]


def doc_id(name):
    return hashlib.sha1(f"edrpg-scene-{name}".encode()).hexdigest()[:16]


def scene(name, kind, file, sort):
    _id = doc_id(name)
    return {
        "_id": _id, "_key": f"!scenes!{_id}", "name": name,
        "active": False, "navigation": False, "navOrder": 0, "navName": "",
        "thumb": f"systems/edrpg/assets/maps/{file}-thumb.webp",
        "width": W, "height": H, "padding": 0,
        "initial": {"x": W // 2, "y": H // 2, "scale": 0.25},
        "backgroundColor": "#000000",
        "background": {"src": f"systems/edrpg/assets/maps/{file}.webp", "tint": "#ffffff", "alphaThreshold": 0},
        "foreground": None,
        # Zone combat has no squares: gridless, with one "grid unit" sized for a small vehicle or ship token.
        "grid": {"type": 0, "size": 150, "style": "solidLines", "thickness": 1, "color": "#000000", "alpha": 0.2,
                 "distance": 1, "units": ""},
        "tokenVision": False,
        "fog": {"exploration": False, "overlay": None, "colors": {"explored": None, "unexplored": None}},
        "drawings": [], "tokens": [], "lights": [], "notes": [], "sounds": [], "regions": [], "templates": [],
        "tiles": [], "walls": [],
        "playlist": None, "playlistSound": None, "journal": None, "journalEntryPage": None, "weather": "",
        "folder": None, "sort": sort, "ownership": {"default": 0},
        "flags": {"edrpg": {"combatMap": {"kind": kind, "upClose": UP_CLOSE}}},
    }


LANDING = ("Landing", "landing", 2481, 1396)


def landing_scene(sort):
    """The title scene: imported and activated automatically on a new world."""
    name, file, w, h = LANDING
    doc = scene(name, None, file, sort)
    doc.update({
        "navigation": True, "navName": "Elite: Dangerous RPG",
        "thumb": f"systems/edrpg/assets/art/{file}-thumb.webp",
        "width": w, "height": h,
        "initial": {"x": w // 2, "y": h // 2, "scale": 0.5},
        "background": {"src": f"systems/edrpg/assets/art/{file}.webp", "tint": "#ffffff", "alphaThreshold": 0},
        "grid": {**doc["grid"], "alpha": 0},
        "flags": {"edrpg": {"landing": True}},
    })
    return doc


if __name__ == "__main__":
    root = os.path.join(HERE, "..", "packs", "_source", "combat-maps")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    for i, (name, kind, file) in enumerate(SCENES):
        doc = scene(name, kind, file, (i + 1) * 100)
        with open(os.path.join(root, f"{file}_{doc['_id']}.json"), "w") as fh:
            json.dump(doc, fh, indent=2)
            fh.write("\n")
    doc = landing_scene(0)
    with open(os.path.join(root, f"landing_{doc['_id']}.json"), "w") as fh:
        json.dump(doc, fh, indent=2)
        fh.write("\n")
    print(f"{len(SCENES) + 1} scenes written to {os.path.normpath(root)}")
