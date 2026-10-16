"""Añade personajes recortados de hojas de sprites de DeviantArt (diseño libre) a assets/heroes/.

Las hojas se descargan con el RSS de DeviantArt de cada artista, p. ej.:
  https://backend.deviantart.com/rss.xml?type=deviation&q=gallery%3Aqsab101
(el enlace de descarga de cada imagen viene en <media:content url=...>). Guárdalas con el nombre
"<artista>__<título>.png" en una carpeta y ejecuta:

  python3 tools/build_extra.py <carpeta de hojas> assets

Cada entrada indica la hoja, la fila de sprites (contando solo las filas con sprites de tamaño de
personaje, de arriba abajo) y los fotogramas de esa fila. Ver tools/sheet_extract.py.
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sheet_extract import components, cut, compose_strip  # noqa: E402
from pose_detect import detect_poses  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

# id -> (hoja, fila, fotogramas de reposo, opciones)
# Opciones: "move" / "atk" = (fila, fotogramas) de la pose de vuelo / de lanzar ki; si no se indican se buscan
# solas (tools/pose_detect.py) y "none" las desactiva. "scale" agranda hojas dibujadas muy pequeñas. "by" = autor cuando la hoja no empieza por su nombre.
EXTRA = {
    "goku_kid": ("lukasahl1__Kid_Goku_Sheet.png", 0, [0, 1, 2], {}),
    "goku_gt_kid": ("lukasahl1__Goku_GT_Sheet.png", 1, [0, 1, 2], {}),
    "trunks_super": ("qsab101__Future_Trunks__Super__LSW_sheet.png", 0, [0, 1, 2], {}),
    "trunks_rage": ("lukasahl1__Super_Saiyan_Rage_Trunks_Sheet.png", 4, [0, 1, 2, 3], {}),
    "copy_vegeta": ("mv95__CopyVegeta_BASE_by_MV95.png", 0, [0, 1, 2], {}),
    "copy_vegeta_blue": ("mv95__CopyVegeta_SSJB_by_MV95.png", 0, [0, 1, 2], {}),
    "gohan_rof": ("mv95__Gohan_Rof_base_by_MV95.png", 0, [0, 1, 2], {}),
    "gohan_rof_ssj": ("mv95__Gohan_Rof_SSJ_by_MV95.png", 0, [0, 1, 2, 3], {}),
    "goten": ("qsab101__Gotenks_LSW.png", 0, [0, 1], {}),
    "trunks_kid": ("qsab101__Kid_Trunks_LSWI.png", 2, [0, 1, 2, 3], {}),
    "broly_dbs": ("qsab101__Restrained_SSJ_Broly_LSW.png", 0, [0, 2], {}),
    "janemba_super": ("qsab101__Super_Janemba_LSW.png", 0, [0, 1, 2], {}),
    "jaco": ("thekrillmaster__Jaco_sprite_sheet.png", 1, [0, 1], {}),
    "tien": ("thekrillmaster__Tien_Cell_Saga_Attire_1__Sprite_Sheet.png", 0, [1, 2, 3, 4], {"gap": 0, "tol": 90, "region": (2, 104, 200, 146)}),
    "bioman": ("thekrillmaster__Bio_Men_sprite_sheet.png", 2, [0, 1, 2], {"move": (3, [1, 2]), "atk": "none"}),
    # Enemigos (secuaces y élites)
    "celljr": ("celljr__arisrad.png", 1, [3, 4, 5, 6], {"move": (3, [1, 2]), "atk": (4, [5]), "by": "arisrad"}),
    "soldier": ("soldier__TheWarriorFF2.png", 0, [0, 1, 2, 3], {"move": (1, [1, 2]), "atk": (7, [1]), "by": "TheWarriorFF2"}),
    "appule": ("appule__Lsw-sprite.png", 0, [0, 1, 2], {"move": (0, [3, 4]), "atk": (4, [0]), "by": "Lsw-sprite"}),
    "cui": ("cui__TheWarriorFF2.png", 1, [0, 1, 3, 4], {"move": (2, [0, 1]), "atk": (7, [3]), "by": "TheWarriorFF2"}),
    "nappa": ("nappa2__EvilDragon84.png", 0, [0, 1], {"move": (0, [2, 3]), "atk": (3, [0]), "by": "EvilDragon84"}),
    "dodoria": ("dodoria__zitlezoan.png", 0, [0, 1, 2, 3], {"move": (0, [4, 5]), "atk": (5, [1]), "by": "zitlezoan"}),
    "zarbon": ("zarbon__arisrad.png", 1, [3, 4, 5, 6], {"move": (3, [1]), "atk": (6, [3]), "by": "arisrad", "scale": 2}),
    "ginyu": ("ginyu__arisrad.png", 0, [0, 2, 4], {"move": (1, [0, 1]), "atk": (2, [1]), "by": "arisrad"}),
    "burter": ("ginyu__arisrad.png", 8, [0, 1, 3], {"move": "none", "atk": "none", "by": "arisrad"}),
    "babidi": ("babidi__Lsw-sprite.png", 1, [0, 3], {"move": (1, [2]), "atk": (2, [0]), "by": "Lsw-sprite"}),
    "puipui": ("puipui__MrDryy.png", 1, [0, 1], {"move": (5, [0]), "atk": (4, [2]), "by": "MrDryy"}),
}

if len(sys.argv) > 3:
    EXTRA = {k: v for k, v in EXTRA.items() if k in sys.argv[3].split(",")}


def char_rows(im, gap, tol, region=None):
    boxes, bg = components(im, box=region, tol=tol, gap=gap, min_px=60)
    rows = []
    for b in boxes:
        h, w = b[3] - b[1], b[2] - b[0]
        if not (20 <= h <= 110 and 10 <= w <= 90):
            continue
        fr = cut(im, b, bg, tol)
        alpha = fr.getchannel("A").histogram()
        cov = 1 - alpha[0] / max(1, fr.width * fr.height)
        if cov > 0.8:  # retratos rectangulares
            continue
        cy = (b[1] + b[3]) / 2
        if rows and abs(cy - rows[-1][0]) < 12:
            rows[-1][1].append(b)
        else:
            rows.append([cy, [b]])
    return [sorted(r[1]) for r in rows], bg


def save_strip(key, frames, ref, legs=True, scale=1):
    if scale != 1:
        up = lambda f: f.resize((f.width * scale, f.height * scale), Image.NEAREST)  # noqa: E731
        frames = [up(f) for f in frames]
        ref = up(ref)
    out, fw, fh = compose_strip(frames, ref, legs)
    out.save(os.path.join(OUT, "heroes", key + ".png"))
    manifest["heroes"][key] = {"file": f"heroes/{key}.png", "fw": fw, "fh": fh, "frames": len(frames)}


manifest_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(manifest_path))
credits = json.load(open(os.path.join(OUT, "credits.json")))
cache = {}
allcache = {}
for hid, (sheet, row, pick, opt) in EXTRA.items():
    gap = opt.get("gap", 1)
    tol = opt.get("tol", 48)
    region = opt.get("region")
    flood = opt.get("flood", 90)
    key = (sheet, gap, tol, region)
    im = Image.open(os.path.join(SRC, sheet)).convert("RGBA")
    if key not in cache:
        cache[key] = char_rows(im, gap, tol, region)
    rows, bg = cache[key]
    frames = [cut(im, rows[row][i], bg, tol, flood_tol=flood) for i in pick]
    sc = opt.get("scale", 1)
    save_strip(hid, frames, frames[0], scale=sc)
    anims = {}
    auto = None
    for kind in ("move", "atk"):
        spec = opt.get(kind)
        if spec == "none":
            continue
        if spec:
            anims[kind] = [cut(im, rows[spec[0]][i], bg, tol, flood_tol=flood) for i in spec[1]]
        else:
            if auto is None:
                if sheet not in allcache:
                    boxes, _ = components(im, tol=tol, gap=gap, min_px=40)
                    allcache[sheet] = [cut(im, b, bg, tol, flood_tol=flood) for b in boxes]
                allf = allcache[sheet]
                auto = (allf, detect_poses(allf, frames))
            allf, poses = auto
            if poses[kind]:
                anims[kind] = [allf[i] for i in poses[kind]]
    for kind, fr in anims.items():
        save_strip(hid + "@" + kind, fr, frames[0], legs=kind == "atk", scale=sc)
    author = opt.get("by") or {"lukasahl1": "LukasAhl1", "mv95": "MV95", "qsab101": "qsab101",
                               "thekrillmaster": "thekrillmaster"}[sheet.split("__")[0]]
    credits[hid] = author
    print(hid, manifest["heroes"][hid]["fw"], manifest["heroes"][hid]["fh"], sorted(anims))

json.dump(manifest, open(manifest_path, "w"), indent=1)
json.dump(credits, open(os.path.join(OUT, "credits.json"), "w"), indent=1, ensure_ascii=False)
