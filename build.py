"""Build the standalone campaign. Python 3, standard library."""
import argparse
import base64
import gzip
import json
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODULES = (
    "world.js", "expansion-world.js", "continents.js",
    "sprites.js", "expansion-species.js", "expansion-art.js", "continental-species.js", "legendary-land.js",
    "tiled-maps.js", "urban-exterior.js", "urban-interiors.js", "urban-world.js",
    "calendar.js", "inventory.js", "lantern.js", "growth.js", "world-life.js",
    "construction.js", "society.js", "guild.js", "trades-practice.js", "tradecraft.js",
    "daily-life.js", "market-flows.js", "trade-economy.js", "gear.js", "adaptive-combat.js", "legendary.js",
    "npc-conflicts.js", "reputation.js", "urban-services.js", "urban-life.js", "engine.js", "audio.js",
    "practice-panel.js", "life-panels.js", "economy-panel.js", "gear-panel.js",
    "npc-conflict-panel.js", "panels.js", "interface.js",
)
MAPS = ROOT / "mappe"


class MapError(Exception):
    """Errore leggibile in una mappa di Tiled."""


def _properties(raw):
    """Tiled salva le proprietà come elenco [{name,type,value}]: le trasforma in un oggetto semplice."""
    out = {}
    for item in raw or []:
        if isinstance(item, dict) and "name" in item:
            out[item["name"]] = item.get("value")
    return out


def _tileset(entry, folder):
    """Risolve un tileset (incorporato o esterno .tsj/.json) e tiene solo ciò che serve al gioco."""
    data = entry
    if "source" in entry:
        source = (folder / entry["source"]).resolve()
        if source.suffix.lower() not in (".tsj", ".json"):
            raise MapError(f"il tileset {entry['source']} deve essere salvato in formato JSON (.tsj)")
        if not source.is_file():
            raise MapError(f"tileset non trovato: {entry['source']}")
        data = json.loads(source.read_text(encoding="utf-8"))
    tiles = {}
    for tile in data.get("tiles", []) or []:
        tiles[str(tile["id"])] = {
            "properties": _properties(tile.get("properties")),
            "image": tile.get("image"),
            "imagewidth": tile.get("imagewidth"),
            "imageheight": tile.get("imageheight"),
        }
    return {"firstgid": entry["firstgid"], "name": data.get("name", ""), "tilecount": data.get("tilecount", 0), "tiles": tiles}


def _tile_data(layer):
    """Restituisce le celle di un livello di piastrelle come elenco di numeri (CSV, base64, zlib o gzip)."""
    data = layer.get("data", [])
    if isinstance(data, list):
        return data
    raw = base64.b64decode(data)
    compression = layer.get("compression", "")
    if compression == "zlib":
        raw = zlib.decompress(raw)
    elif compression == "gzip":
        raw = gzip.decompress(raw)
    elif compression:
        raise MapError(f"compressione «{compression}» non supportata: in Tiled usa la codifica CSV")
    return [int.from_bytes(raw[i:i + 4], "little") for i in range(0, len(raw), 4)]


def _layers(raw, dx=0, dy=0):
    """Appiattisce i gruppi di livelli e tiene solo i campi usati dal gioco."""
    out = []
    for layer in raw or []:
        ox, oy = dx + layer.get("offsetx", 0), dy + layer.get("offsety", 0)
        kind = layer.get("type")
        if kind == "group":
            out.extend(_layers(layer.get("layers"), ox, oy))
            continue
        if "chunks" in layer:
            raise MapError("i livelli di una mappa infinita non sono supportati")
        item = {"name": layer.get("name", ""), "type": kind, "offsetx": ox, "offsety": oy}
        if kind == "tilelayer":
            item.update(width=layer.get("width"), height=layer.get("height"), data=_tile_data(layer))
        elif kind == "objectgroup":
            objects = []
            for o in layer.get("objects", []):
                keys = ("id", "gid", "name", "x", "y", "width", "height", "rotation", "point", "ellipse", "polygon", "polyline")
                entry = {key: o[key] for key in keys if key in o}
                entry["x"] = entry.get("x", 0) + ox
                entry["y"] = entry.get("y", 0) + oy
                entry["properties"] = _properties(o.get("properties"))
                objects.append(entry)
            item["objects"] = objects
        out.append(item)
    return out


def load_map(path):
    """Legge una mappa .tmj e la normalizza. Solleva MapError con un messaggio in italiano."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise MapError(f"{path.name}: file JSON non leggibile ({error})")
    if raw.get("type") != "map":
        raise MapError(f"{path.name}: non è una mappa di Tiled in formato JSON")
    try:
        return {
            "file": path.name,
            "orientation": raw.get("orientation"),
            "infinite": bool(raw.get("infinite")),
            "width": raw.get("width"), "height": raw.get("height"),
            "tilewidth": raw.get("tilewidth"), "tileheight": raw.get("tileheight"),
            "properties": _properties(raw.get("properties")),
            "tilesets": [_tileset(t, path.parent) for t in raw.get("tilesets", [])],
            "layers": _layers(raw.get("layers")),
        }
    except (MapError, KeyError, ValueError, json.JSONDecodeError) as error:
        raise MapError(f"{path.name}: {error}")


def collect_maps(folder):
    """Mappe attive (proprietà «attiva» = vero) della cartella indicata, in ordine di nome."""
    folder = Path(folder)
    if not folder.is_dir():
        return []
    maps = [load_map(p) for p in sorted(folder.glob("*.tmj"))]
    return [m for m in maps if m["properties"].get("attiva") is True]


def build(target, maps_folder=MAPS):
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    artwork = base64.b64encode((ROOT / "cover.webp").read_bytes()).decode("ascii")
    styles = (ROOT / "style.css").read_text(encoding="utf-8").replace("__COVER__", "data:image/webp;base64," + artwork)
    maps = collect_maps(maps_folder)
    # Le mappe di Tiled entrano nella build come dati: nessun file esterno, il gioco resta autonomo e offline.
    data = json.dumps(maps, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    scripts = ["window.TILED_MAPS=" + data + ";"] + [(ROOT / file).read_text(encoding="utf-8-sig") for file in MODULES]
    html = html.replace("/*__STYLE__*/", styles).replace("/*__SCRIPTS__*/", "\n\n".join(scripts))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")
    return maps


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera il gioco autonomo in formato HTML.")
    parser.add_argument("destinazione", nargs="?", type=Path, default=ROOT / "Reincarnation.html")
    parser.add_argument("--mappe", type=Path, default=MAPS, help="cartella delle mappe di Tiled (predefinita: mappe)")
    parser.add_argument("--mappe-json", action="store_true", help="stampa le mappe attive normalizzate ed esce (per i test)")
    args = parser.parse_args()
    try:
        if args.mappe_json:
            sys.stdout.write(json.dumps(collect_maps(args.mappe), ensure_ascii=False))
        else:
            active = build(args.destinazione, args.mappe)
            for m in active:
                print(f"Mappa di Tiled incorporata: {m['file']} ({m['properties'].get('nome', '')})")
    except MapError as error:
        sys.exit(f"Errore nella mappa di Tiled: {error}")
