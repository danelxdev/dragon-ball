"""Construye la carpeta assets/ a partir de los sprites de Legacy of Goku / Buu's Fury.

Los sprites salen de proyectos fan públicos en GitHub que ya los incluyen:

  git clone --depth 1 https://github.com/Arikuvfx/Legacy-of-Goku-Maker-Engine
  git clone --depth 1 https://github.com/Chakib08/Dragon-Ball-Z-Buu-s-Fury
  git clone --depth 1 https://github.com/briansukhnandan/DBZ-Legacy-of-Goku-3
  git clone --depth 1 https://github.com/enriquefdez5/TheLegacyOfGokuClone

Uso:  python3 tools/build_assets.py <carpeta con los clones> <carpeta assets de salida>

Todas las hojas de personaje se normalizan al mismo formato: fotogramas de
FW x FH, 4 filas (abajo, izquierda, derecha, arriba) y N columnas de animación
de andar, con los pies alineados abajo y el cuerpo centrado.
"""
import json
import os
import shutil
import sys

from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(__file__))
from slice_boxes import crop_frame, find_boxes  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

ARIKU = os.path.join(SRC, "Arikuvfx_Legacy-of-Goku-Maker-Engine/assets")
CHAKIB = os.path.join(SRC, "Chakib08_Dragon-Ball-Z-Buu-s-Fury/Graphics")
BRIAN = os.path.join(SRC, "briansukhnandan_DBZ-Legacy-of-Goku-3/Club-Project/Assets")
ENRIQ = os.path.join(SRC, "enriquefdez5_TheLegacyOfGokuClone/res")

manifest = {"chars": {}, "fx": {}, "tiles": {}, "decor": {}, "items": {}}


def ensure(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def trim(fr):
    bbox = fr.getbbox()
    return fr.crop(bbox) if bbox else fr


def place(fr, fw, fh):
    """Coloca un fotograma recortado centrado y con los pies abajo."""
    fr = trim(fr)
    if fr.width > fw or fr.height > fh:
        raise ValueError(f"fotograma {fr.size} no cabe en {fw}x{fh}")
    cell = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    cell.paste(fr, ((fw - fr.width) // 2, fh - fr.height - 1), fr)
    return cell


def write_sheet(cid, rows, fw=32, fh=32):
    """rows: lista de 4 listas de fotogramas (abajo, izquierda, derecha, arriba)."""
    n = max(len(r) for r in rows)
    sheet = Image.new("RGBA", (fw * n, fh * 4), (0, 0, 0, 0))
    for ri, frames in enumerate(rows):
        for ci, fr in enumerate(frames):
            sheet.paste(place(fr, fw, fh), (ci * fw, ri * fh))
    path = os.path.join(OUT, "chars", cid + ".png")
    ensure(path)
    sheet.save(path)
    manifest["chars"][cid] = {"file": f"chars/{cid}.png", "fw": fw, "fh": fh, "frames": n}


def split_grid(img, fw, fh):
    img = img.convert("RGBA")
    return [[img.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)) for c in range(img.width // fw)]
            for r in range(img.height // fh)]


def from_ariku(cid, rel, fw=32, fh=32):
    grid = split_grid(Image.open(os.path.join(ARIKU, "sprites", rel)), fw, fh)
    write_sheet(cid, grid[:4], fw, fh)


def from_boxes(cid, rel, row_down, row_side, row_up, cols):
    """Hojas de Spriters Resource (cajas sobre fondo verde azulado)."""
    im = Image.open(os.path.join(CHAKIB, rel))
    bg = im.convert("RGB").getpixel((0, 0))
    rows = find_boxes(im, bg)
    box = (0, 64, 64)

    def take(r):
        return [crop_frame(im, rows[r][c], box) for c in cols]

    side = take(row_side)  # mira a la derecha
    write_sheet(cid, [take(row_down), [ImageOps.mirror(f) for f in side], side, take(row_up)])


def from_files(cid, down, left, right, up, scale=1, fw=32, fh=32):
    def load(files):
        out = []
        for f in files:
            im = Image.open(f).convert("RGBA")
            if scale != 1:
                im = im.resize((round(im.width * scale), round(im.height * scale)), Image.NEAREST)
            out.append(im)
        return out

    rows = [load(down), load(left) if left else None, load(right) if right else None, load(up)]
    if rows[1] is None:
        rows[1] = [ImageOps.mirror(f) for f in rows[2]]
    if rows[2] is None:
        rows[2] = [ImageOps.mirror(f) for f in rows[1]]
    write_sheet(cid, rows, fw, fh)


def from_strip(path, n, scale=1):
    im = Image.open(path).convert("RGBA")
    w = im.width // n
    frames = [im.crop((i * w, 0, (i + 1) * w, im.height)) for i in range(n)]
    if scale != 1:
        frames = [f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.NEAREST)
                  for f in frames]
    return frames


def copy(kind, key, rel_path, base=ARIKU, **meta):
    src = os.path.join(base, rel_path)
    ext = os.path.splitext(src)[1].lower()
    dst = os.path.join(OUT, kind, key + ext)
    ensure(dst)
    Image.open(src).convert("RGBA").save(dst)
    im = Image.open(dst)
    manifest[kind][key] = {"file": f"{kind}/{key}{ext}", "w": im.width, "h": im.height, **meta}


# ---------------------------------------------------------------------------
# Personajes jugables
# ---------------------------------------------------------------------------
from_ariku("goku", "player/goku/base/walk.png")
from_ariku("goku_ssj", "player/goku/base/transformations/ssj/walk.png")
from_ariku("gohan", "player/gohan/base/walk.png")
from_ariku("gohan_ssj", "player/gohan/base/transformations/ssj/walk.png")
from_boxes("vegeta", "assets/vegeta/vegeta.png", 0, 1, 2, [2, 3, 4, 5])
from_boxes("vegeta_ssj", "assets/vegeta/vegeta.png", 4, 5, 6, [2, 3, 4, 5])
from_boxes("goten", "assets/goten/goten.png", 0, 1, 2, [2, 3, 4, 5])
from_boxes("goten_ssj", "assets/goten/goten.png", 5, 6, 7, [2, 3, 4, 5])

# ---------------------------------------------------------------------------
# Enemigos
# ---------------------------------------------------------------------------
from_ariku("tiger", "enemies/tiger_bandit/walk.png")
from_ariku("soldier", "enemies/shooter/walk.png")
from_ariku("wolf", "enemies/shooter/variants/gunner/walk.png")
from_ariku("mohawk", "enemies/shooter/variants/rocketlauncher/walk.png")

# Jefes
from_ariku("puipui", "enemies/boss/pui_pui/walk.png", 64, 64)
from_ariku("a17", "enemies/boss/android_17/walk.png")
from_ariku("a18", "enemies/boss/android_18/walk.png")
fz = os.path.join(BRIAN, "Frieza Sprites")
from_files(
    "freezer",
    [os.path.join(fz, "walk_south", f"{i}.png") for i in (2, 3, 4, 5)],
    None,
    [os.path.join(fz, "walk_east", f"{i}.png") for i in (26, 27, 28, 29)],
    [os.path.join(fz, "walk_north", f"{i}.png") for i in (49, 50, 51, 52)],
)
bu = os.path.join(BRIAN, "Buu Sprites")
from_files(
    "buu",
    [os.path.join(bu, "Flying South", f"{i}.png") for i in (0, 1, 2)],
    [os.path.join(bu, "Flying West", f"{i}.png") for i in (4, 5, 6)],
    [os.path.join(bu, "Flying East", f"{i}.png") for i in (3, 4, 5)],
    [os.path.join(bu, "Flying North", f"{i}.png") for i in (6, 7, 8)],
)
write_sheet("cell", [
    from_strip(os.path.join(ENRIQ, "cell_movimiento_abajo.png"), 4, 0.5),
    from_strip(os.path.join(ENRIQ, "cell_movimiento_izquierda.png"), 4, 0.5),
    from_strip(os.path.join(ENRIQ, "cell_movimiento_derecha.png"), 4, 0.5),
    from_strip(os.path.join(ENRIQ, "cell_movimiento_arriba.png"), 4, 0.5),
])

# ---------------------------------------------------------------------------
# Efectos, objetos y escenario
# ---------------------------------------------------------------------------
A = "sprites/attacks/"
copy("fx", "kiblast", A + "ki_blast/ki_blast.png", fw=16, fh=16)
copy("fx", "kihit", A + "ki_blast/explosion.png")
copy("fx", "masenko", A + "masenko/masenko_ball.png", fw=16, fh=16)
copy("fx", "masenko_boom", A + "masenko/masenko_explosion.png", fw=32, fh=32)
copy("fx", "genkidama", A + "genkidama/state5.png")
copy("fx", "genki_hit", A + "genkidama/hit.png", fw=32, fh=32)
copy("fx", "bigbang", A + "big_bang_attack/state1.png")
copy("fx", "boom", "sprites/enemies/shooter/bomb_explosion.png", fw=32, fh=32)
copy("fx", "kame_begin", A + "kamehameha/begin_kamehameha.png", fw=16, fh=16)
copy("fx", "kame_mid", A + "kamehameha/middle_kamehameha.png")
copy("fx", "kame_end", A + "kamehameha/end_kamehameha.png", fw=16, fh=16)
copy("fx", "sword", A + "energy_sword/sword_cardinal.png")
copy("fx", "bullet", A + "bullet/bullet.png", fw=16, fh=8)
rocket = trim(Image.open(os.path.join(ARIKU, A + "rocket/rocket.png")).convert("RGBA").crop((0, 0, 26, 16)))
dst = os.path.join(OUT, "fx", "rocket.png")
ensure(dst)
rocket.save(dst)
manifest["fx"]["rocket"] = {"file": "fx/rocket.png", "w": rocket.width, "h": rocket.height}
copy("fx", "shadow", "sprites/universal/shadow.png")
copy("fx", "shadowbig", "sprites/universal/shadowbig.png")

copy("items", "senzu", "sprites/items/senzu_bean.png")
copy("items", "zeni", "sprites/items/small_gold_zeni.png", fw=8, fh=8)
copy("items", "chest", "objects/chest/wooden_chest.png")
db = Image.open(os.path.join(BRIAN, "Buu Sprites/2star.png")).convert("RGBA")
db = trim(db).resize((14, 14), Image.LANCZOS)
dst = os.path.join(OUT, "items", "dragonball.png")
ensure(dst)
db.save(dst)
manifest["items"]["dragonball"] = {"file": "items/dragonball.png", "w": 14, "h": 14}

T = "tilesets/animated_tiles/"
copy("tiles", "grass", T + "spr_OV_grass1.png")
copy("tiles", "field", T + "spr_field_filler.png")
sand = Image.open(os.path.join(ARIKU, T + "spr_sand_filler.png")).convert("RGBA").crop((0, 0, 64, 64))
dirt = Image.open(os.path.join(ARIKU, T + "spr_dirt_filler.png")).convert("RGBA")
buu = Image.open(os.path.join(ARIKU, T + "spr_buu_filler.png")).convert("RGBA").crop((0, 64, 64, 128))
for key, im in (("sand", sand), ("buu", buu)):
    dst = os.path.join(OUT, "tiles", key + ".png")
    ensure(dst)
    im.save(dst)
    manifest["tiles"][key] = {"file": f"tiles/{key}.png", "w": im.width, "h": im.height}

copy("decor", "tree", "objects/decorations/tree/Tree.png", fw=80, fh=92)
copy("decor", "stone_big", "objects/stones/big_stone.png")
copy("decor", "stone_med", "objects/stones/medium_stone.png")
copy("decor", "stone_small", "objects/stones/small_stone.png")
# Piezas sueltas del tileset (meseta, bloque de roca y arbusto)
ts = Image.open(os.path.join(ARIKU, "tilesets/tileset_test.png")).convert("RGBA")
for key, box in {
    "mesa": (592, 142, 688, 232),
    "bush": (348, 568, 434, 626),
}.items():
    im = trim(ts.crop(box))
    dst = os.path.join(OUT, "decor", key + ".png")
    ensure(dst)
    im.save(dst)
    manifest["decor"][key] = {"file": f"decor/{key}.png", "w": im.width, "h": im.height}

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)

print("personajes:", ", ".join(manifest["chars"]))
print("efectos:", len(manifest["fx"]), "objetos:", len(manifest["items"]), "decorado:", len(manifest["decor"]))
