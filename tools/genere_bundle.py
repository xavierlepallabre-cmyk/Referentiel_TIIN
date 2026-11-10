"""Regroupe les fichiers JSON de data/ dans data/referentiel.js.

L'application charge ce fichier par une balise <script>, ce qui lui permet de
fonctionner aussi en ouvrant index.html directement (file://), sans serveur.

Usage : python3 tools/genere_bundle.py   (après toute modification d'un JSON)
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
ac = json.loads((DATA / "activites_competences.json").read_text(encoding="utf-8"))
sv = json.loads((DATA / "savoirs.json").read_text(encoding="utf-8"))
bundle = {**ac, "savoirs": sv}
js = "// Fichier généré par tools/genere_bundle.py — ne pas modifier à la main.\n"
js += "window.REFERENTIEL = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";\n"
(DATA / "referentiel.js").write_text(js, encoding="utf-8")
print(f"data/referentiel.js écrit ({len(js)//1024} Ko)")
