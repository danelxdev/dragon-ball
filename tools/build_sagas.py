"""Genera assets/heroes/ a partir del pack «Dragon Ball Sagas» (archive.org, item 04-mangas-dragon-ball).

  curl -L -o sagas.zip "https://archive.org/download/04-mangas-dragon-ball/Dragon%20Ball%20Sagas.zip"
  unzip sagas.zip

Uso:  python3 tools/build_sagas.py "<carpeta Dragon Ball Sagas>" assets

Cada personaje/forma sale como una tira horizontal de fotogramas de pose (reposo / vuelo)
del mismo tamaño, mirando a la derecha y con los pies abajo. Los créditos de cada
artista ("Hecho por ...txt") se guardan en assets/credits.json.
"""
import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sagas_extract import frames_in, load_clean, pick_idle  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

# id -> (carpeta, índices forzados o None)
HEROES = {
    # Saga Saiyajin
    "goku": ("GOKU fases/Goku", None),
    "goku_kaioken": ("GOKU fases/Goku kaioken", None),
    "krilin": ("Kuririn", None),
    "piccolo": ("Piccolo", None),
    "gohan_kid": ("GOHAN fases/Gohan", None),
    "vegeta_saiyan": ("VEGETA fases/Vegeta Sayajin Saga", None),
    "raditz": ("RADITZ fases/Raditz", None),
    "raditz_ssj": ("RADITZ fases/Raditz Ssj", None),
    "saibaman": ("Saibaman", None),
    "bardock": ("BARDOCK fases/Bardock", None),
    "bardock_ssj": ("BARDOCK fases/Bardock Ssj", None),
    "bardock_ssj4": ("BARDOCK fases/Bardock SSJ4", None),
    # Saga Freezer
    "goku_ssj_namek": ("GOKU fases/Goku Ssj (Saga Freeza)", None),
    "vegeta": ("VEGETA fases/Vegeta", None),
    "freezer_1": ("FREEZA formas/Freeza Primeira Forma", None),
    "freezer_3": ("FREEZA formas/Freeza Terceira Forma", None),
    "freezer_final": ("FREEZA formas/Freeza Forma Final", None),
    "freezer_fp": ("FREEZA formas/Freeza Full Power", None),
    "freezer_golden": ("FREEZA formas/Golden Freeza", None),
    "cooler": ("Cooler", None),
    "turles": ("Turles", None),
    # Saga Cell
    "goku_ssj": ("GOKU fases/Goku SSJ 1", None),
    "vegeta_ssj_grade": ("VEGETA fases/Vegeta Ssj Grade", None),
    "gohan_teen_ssj": ("GOHAN fases/Teen Gohan SSJ", None),
    "gohan_teen_ssj2": ("GOHAN fases/Teen Gohan SSJ2", None),
    "trunks": ("MIRAI TRUNKS fases/Mirai Trunks", None),
    "trunks_ssj": ("MIRAI TRUNKS fases/Super Mirai Trunks", None),
    "trunks_armor": ("Trunks Armadura", None),
    "a16": ("ANDROIDES/Androide 16", None),
    "a17": ("ANDROIDES/Androide 17", None),
    "a18": ("ANDROIDES/Androide 18", None),
    "cell_1": ("CELL formas/Cell Imperfeito", None),
    "cell_2": ("CELL formas/Cell Semi Perfeito", None),
    "cell_perfect": ("CELL formas/cell Perfeito", None),
    # Saga Buu
    "goku_ssj2": ("GOKU fases/Goku SSJ 2", None),
    "goku_ssj3": ("GOKU fases/Goku SSJ 3", None),
    "vegeta_buu": ("VEGETA fases/Vegeta Buu Saga", None),
    "vegeta_buu_ssj": ("VEGETA fases/Vegeta Saga Buu SSJ", None),
    "majin_vegeta": ("VEGETA fases/Majin Vegeta", None),
    "gohan_adult": ("GOHAN fases/Gohan Adulto", None),
    "gohan_mystic": ("GOHAN fases/Gohan Mistico", None),
    "gotenks": ("Gotenks Base", None),
    "buu_fat": ("MAJIN BUU formas/Majin Buu", None),
    "buu_evil": ("MAJIN BUU formas/Majin Buu(Flaco)", None),
    "buu_super": ("MAJIN BUU formas/Super Buu", None),
    "buu_gohan": ("MAJIN BUU formas/Majin Buu Gohan", None),
    "buu_kid": ("MAJIN BUU formas/Kid Buu", None),
    "vegito": ("VEGITO fases/Vegito", None),
    "vegito_ssj": ("VEGITO fases/Vegito Ssj1", None),
    "vegito_ssj2": ("VEGITO fases/Vegito Ssj2", None),
    "gogeta": ("Gogeta", None),
    # Películas y GT
    "broly_2": ("BROLY fases/Broly Segunda Forma", None),
    "broly_3": ("BROLY fases/Broly Terceira forma", None),
    "broly_lssj": ("BROLY fases/Broly Full Power", None),
    "broly_ssj4": ("BROLY fases/Broly Ssj4", None),
    "janemba": ("Janemba", None),
    "goku_ssj4": ("GOKU fases/Goku SSJ 4", None),
    "vegeta_ssj4": ("VEGETA fases/Vegeta SSJ 4", None),
    # Dragon Ball Super
    "goku_god": ("GOKU fases/Goku God", None),
    "goku_blue": ("GOKU fases/Goku Blue", None),
    "goku_blue_kaioken": ("GOKU fases/Goku Blue Kaioken Whis Gi", None),
    "goku_ui": ("GOKU fases/Goku Instinto Superior", None),
    "goku_mui": ("GOKU fases/Goku Instinto Superior Completo", None),
    "vegeta_god": ("VEGETA fases/Vegeta Ssj God", None),
    "vegeta_blue": ("VEGETA fases/Vegeta Blue", None),
    "vegeta_blue_fp": ("VEGETA fases/Vegeta Blue Full Power", None),
    "vegito_blue": ("VEGITO fases/Vegito SSJ Blue", None),
    "beerus": ("Bills", None),
    "hit": ("HITTO/Hitto", None),
    "goku_black": ("GOKU BLACK formas/Goku Black", None),
    "goku_black_rose": ("GOKU BLACK formas/Goku Black Rose", [0, 1, 2, 3]),
    "zamasu": ("ZAMASU formas/Zamasu", None),
    "zamasu_fused": ("ZAMASU formas/Zamasu e Black Fusion", None),
    "jiren": ("Jiren", None),
    "toppo": ("Toppo", None),
    "caulifla": ("Caulifla", None),
    "kale": ("KALE fases/Kale", None),
    "kale_ssj": ("KALE fases/Kale Ssj", None),
    "kefla": ("Kefla Super Sayajin", None),
    "cabba": ("KYABE fases/Kyabe", None),
    "cabba_ssj": ("KYABE fases/Kyabe ssj", None),
    "frost_1": ("Frost/Frost Primeira Forma", None),
    "frost_final": ("Frost/Frost Ultima Forma", None),
}

if len(sys.argv) > 3:
    HEROES = {k: v for k, v in HEROES.items() if k in sys.argv[3].split(",")}

manifest_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
manifest["heroes"] = manifest.get("heroes", {}) if len(sys.argv) > 3 else {}
credits = json.load(open(os.path.join(OUT, "credits.json"))) if os.path.exists(os.path.join(OUT, "credits.json")) else {}

os.makedirs(os.path.join(OUT, "heroes"), exist_ok=True)
for hid, (folder, pick) in HEROES.items():
    path = os.path.join(SRC, folder)
    frames = pick_idle(path, 4, pick)
    fw = max(f.width for f in frames)
    fh = max(f.height for f in frames)
    sheet = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * fw + (fw - f.width) // 2, fh - f.height), f)
    sheet.save(os.path.join(OUT, "heroes", hid + ".png"))
    manifest["heroes"][hid] = {"file": f"heroes/{hid}.png", "fw": fw, "fh": fh, "frames": len(frames)}
    author = [re.sub(r"(?i)^.*hecho por\s*", "", os.path.splitext(f)[0]).strip()
              for f in os.listdir(path) if f.lower().endswith(".txt")]
    credits[hid] = author[0] if author else ""

json.dump(manifest, open(manifest_path, "w"), indent=1)
json.dump(credits, open(os.path.join(OUT, "credits.json"), "w"), indent=1, ensure_ascii=False)
print(len(HEROES), "héroes")
