"""
Roll Tables compendium: the supplements' Random Generation System tables (opponent types by Tier, number of
opponents, space lane and planet encounters, infiltration challenges, base rooms and corridors, travel, random cargo,
alien items). Results name the outcome and the page to read; opponents link to the Opponents compendium where they
are in it.

tools/rolltables-data.json holds the tables as extracted (book, name, columns, rows of [name, range per column]).
A table with several columns (Tiers, security ratings, planet types, cargo kinds) becomes one Roll Table per column.
Run `python3 tools/rolltables.py` after tools/opponents.py, then `npm run packs`.
"""
import glob, hashlib, json, os, re

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..", "packs", "_source")
DATA = json.load(open(os.path.join(HERE, "rolltables-data.json"), encoding="utf-8"))
ICON = "icons/svg/d20-grey.svg"


def did(*parts):
    return hashlib.sha1(("edrpg-table-" + "-".join(parts)).encode()).hexdigest()[:16]


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


# Opponents by name → compendium UUID.
OPPONENTS = {}
for f in glob.glob(os.path.join(ROOT, "opponents", "*.json")):
    d = json.load(open(f, encoding="utf-8"))
    if d.get("_key", "").startswith("!actors!"):
        OPPONENTS[norm(d["name"])] = (d["name"], f"Compendium.edrpg.opponents.Actor.{d['_id']}")
# The tables' names for opponents filed under another name.
ALIASES = {"imperial interdictor": "imperial interceptor", "corporate scout vehicle": "corporate scout",
           "heavy police viper": "heavy police fighter", "panther hound": "pantherhound",
           "private military contractor": "private military contractor pmc", "s 4 sentry skimmer": "s4 sentry skimmer",
           "stinger 2 attack drone": "stinger 2 attack skimmer"}


def link(name):
    """The opponent a result names (ignoring '*', '(defence only)', '(Military)' etc.), if it's a single one."""
    if " or " in name:
        return None
    base = norm(re.sub(r"\*|\((?:[^)]*)\)", "", name))
    base = ALIASES.get(base, base)
    return OPPONENTS.get(base)


def span(cell):
    cell = cell.strip()
    if cell in ("-", "–", ""):
        return None
    lo, _, hi = cell.partition("-")
    lo = int(lo)
    hi = int(hi) if hi else lo
    if hi == 0:
        hi = 100
    if hi < lo:
        hi = lo
    return [lo, hi]


def folder(fid, name, parent, sort):
    return {"_id": fid, "_key": f"!folders!{fid}", "name": name, "type": "RollTable", "folder": parent, "description": "",
            "sorting": "m", "sort": sort, "color": None, "flags": {}}


def dump(doc, slug):
    with open(os.path.join(ROOT, "roll-tables", f"{slug}_{doc['_id']}.json"), "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    root = os.path.join(ROOT, "roll-tables")
    os.makedirs(root, exist_ok=True)
    for f in os.listdir(root):
        os.remove(os.path.join(root, f))
    folders = {}

    def folder_for(path):
        if path in folders:
            return folders[path]
        parent, _, name = path.rpartition("/")
        pid = folder_for(parent) if parent else None
        folders[path] = did("folder", path)
        dump(folder(folders[path], name, pid, len(folders) * 100), "_folder-" + slugify(path))
        return folders[path]

    n = 0
    for t in DATA:
        book = t["book"] or "Random Generation"
        columns = t.get("tiers") or t.get("columns") or [""]
        group = t["name"] if len(columns) > 1 else None
        for ci, col in enumerate(columns):
            name = f"{t['name']} – {col}" if col else t["name"]
            tid = did(book, name)
            results = []
            for ri, r in enumerate(t["rows"]):
                rng = span(r["cells"][ci] if ci < len(r["cells"]) else "-")
                if not rng:
                    continue
                rid = did(book, name, str(ri), r["name"])
                target = link(r["name"]) if t["kind"] == "opponents" else None
                page = r.get("page") or t.get("page")
                desc = f"<p>{book}, p.{page}</p>" if page and t["kind"] != "opponents" else ""
                if "*" in r["name"]:
                    desc += "<p>High Threat: counts as three opponents.</p>"
                res = {"_id": rid, "_key": f"!tables.results!{tid}.{rid}", "type": "document" if target else "text",
                       "name": r["name"], "description": desc, "img": None, "weight": 1, "range": rng, "drawn": False, "flags": {}}
                if target:
                    res["documentUuid"] = target[1]
                results.append(res)
            if not results:
                continue
            top = max(r["range"][1] for r in results)
            formula = t.get("formula") or ("1d100" if top > 10 else "1d10")
            desc = []
            if t.get("page"):
                desc.append(f"{book}, p.{t['page']}.")
            if t["kind"] == "opponents":
                desc.append("Roll once per opponent. High Threat opponents (*) count as three; unique ones appear once per group.")
            if t.get("note"):
                desc.append(t["note"])
            doc = {"_id": tid, "_key": f"!tables!{tid}", "name": name, "img": ICON, "description": "".join(f"<p>{d}</p>" for d in desc),
                   "results": results, "formula": formula, "replacement": True, "displayRoll": True,
                   "folder": folder_for(f"{book}/{group}" if group else book), "sort": (n + 1) * 100, "ownership": {"default": 0}, "flags": {}}
            dump(doc, slugify(name))
            n += 1
    print(f"{n} roll tables written to {os.path.normpath(root)}")


if __name__ == "__main__":
    main()
