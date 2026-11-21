"""Build the standalone campaign. Python 3, standard library."""
import argparse
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODULES = (
    "world.js", "expansion-world.js", "continents.js",
    "sprites.js", "expansion-species.js", "expansion-art.js", "continental-species.js",
    "legendary-land.js", "legendary.js",
    "calendar.js", "inventory.js", "lantern.js", "growth.js", "world-life.js",
    "construction.js", "society.js", "guild.js", "trades-practice.js", "tradecraft.js",
    "daily-life.js", "trade-economy.js", "adaptive-combat.js", "reputation.js", "gear.js", "npc-conflicts.js", "engine.js", "audio.js",
    "practice-panel.js", "gear-panel.js", "npc-conflict-panel.js", "life-panels.js", "economy-panel.js", "panels.js", "interface.js",
)


def build(target):
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    artwork = base64.b64encode((ROOT / "cover.webp").read_bytes()).decode("ascii")
    styles = (ROOT / "style.css").read_text(encoding="utf-8").replace("__COVER__", "data:image/webp;base64," + artwork)
    scripts = [(ROOT / file).read_text(encoding="utf-8-sig") for file in MODULES]
    html = html.replace("/*__STYLE__*/", styles).replace("/*__SCRIPTS__*/", "\n\n".join(scripts))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera il gioco autonomo in formato HTML.")
    parser.add_argument("destinazione", nargs="?", type=Path, default=ROOT / "Reincarnation.html")
    args = parser.parse_args()
    build(args.destinazione)

