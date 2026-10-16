"""Construye la carpeta assets/ con los sprites de Buu's Fury y Legacy of Goku.

Fuentes (clónalas/descárgalas dentro de una misma carpeta <SRC>):

  git clone --depth 1 https://github.com/Chakib08/Dragon-Ball-Z-Buu-s-Fury
  git clone --depth 1 https://github.com/Arikuvfx/Legacy-of-Goku-Maker-Engine
  git clone --depth 1 https://github.com/briansukhnandan/DBZ-Legacy-of-Goku-3
  git clone --depth 1 https://github.com/enriquefdez5/TheLegacyOfGokuClone
  mkdir vgmaps && cd vgmaps && for m in "Wasteland&City&MilitaryBase" "BattleWithFrieza" "Forest&Town"; do
      curl -o "DragonBallZ-LegacyOfGoku-$m.png" "https://www.vgmaps.com/Atlas/GBA/DragonBallZ-LegacyOfGoku-$m.png"; done

Uso:  python3 tools/build_assets.py <SRC> assets

- Los personajes salen de tools/build_sagas.py (ejecútalo después de este script).
- Suelos y decorado: sacados de los mapas completos de Legacy of Goku (VGMaps).
- Bolas de Dragón y objetos (rip de ApplePie) de Buu's Fury.
- Interfaz y números: Legacy of Goku Maker Engine.

Las hojas de personaje salen con fotogramas de 32x32, 4 filas (abajo, izquierda,
derecha, arriba) y la animación de andar en columnas, con los pies abajo.
"""
import json
import os
import sys

from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(__file__))
from map_extract import build_ground, collect_pure_tiles, cutout, cutout_pred  # noqa: E402
from slice_boxes import crop_frame, find_boxes  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

ARIKU = os.path.join(SRC, "Arikuvfx_Legacy-of-Goku-Maker-Engine/assets")
CHAKIB = os.path.join(SRC, "Chakib08_Dragon-Ball-Z-Buu-s-Fury/Graphics")
BRIAN = os.path.join(SRC, "briansukhnandan_DBZ-Legacy-of-Goku-3/Club-Project/Assets")
ENRIQ = os.path.join(SRC, "enriquefdez5_TheLegacyOfGokuClone/res")
VGMAPS = os.path.join(SRC, "vgmaps")

manifest = {"fx": {}, "tiles": {}, "decor": {}, "items": {}, "ui": {}}


def ensure(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def trim(fr):
    bbox = fr.getbbox()
    return fr.crop(bbox) if bbox else fr


def save(kind, key, im, **meta):
    path = os.path.join(OUT, kind, key + ".png")
    ensure(path)
    im.save(path)
    manifest[kind][key] = {"file": f"{kind}/{key}.png", "w": im.width, "h": im.height, **meta}


def drop_specks(im, min_px=24, largest=False):
    """Quita motas sueltas (componentes opacos pequeños) de un recorte.

    Con largest=True deja solo el componente más grande."""
    im = im.copy()
    W, H = im.size
    px = im.load()
    seen = bytearray(W * H)
    comps = []
    for y in range(H):
        for x in range(W):
            if seen[y * W + x] or px[x, y][3] == 0:
                continue
            comp = []
            stack = [(x, y)]
            seen[y * W + x] = 1
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny][3]:
                        seen[ny * W + nx] = 1
                        stack.append((nx, ny))
            comps.append(comp)
    biggest = max((len(c) for c in comps), default=0)
    for comp in comps:
        if len(comp) < min_px or (largest and len(comp) < biggest):
            for cx, cy in comp:
                px[cx, cy] = (0, 0, 0, 0)
    return trim(im)


# ---------------------------------------------------------------------------
# Hojas de personaje
# ---------------------------------------------------------------------------
def place(fr, fw, fh):
    fr = trim(fr)
    if fr.width > fw or fr.height > fh:
        raise ValueError(f"fotograma {fr.size} no cabe en {fw}x{fh}")
    cell = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    cell.paste(fr, ((fw - fr.width) // 2, fh - fr.height - 1), fr)
    return cell


def write_sheet(cid, rows, fw=32, fh=32):
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
    write_sheet(cid, split_grid(Image.open(os.path.join(ARIKU, "sprites", rel)), fw, fh)[:4], fw, fh)


_box_cache = {}


def from_boxes(cid, rel, row_down, row_side, row_up, cols=(2, 3, 4, 5)):
    """Hojas de Buu's Fury de Spriters Resource: cajas sobre fondo verde azulado."""
    if rel not in _box_cache:
        im = Image.open(os.path.join(CHAKIB, rel))
        _box_cache[rel] = (im, find_boxes(im, im.convert("RGB").getpixel((0, 0))))
    im, rows = _box_cache[rel]

    def take(r):
        return [crop_frame(im, rows[r][c], (0, 64, 64)) for c in cols]

    side = take(row_side)  # mira a la derecha
    write_sheet(cid, [take(row_down), [ImageOps.mirror(f) for f in side], side, take(row_up)])


def from_files(cid, down, left, right, up):
    def load(files):
        return [Image.open(f).convert("RGBA") for f in files]

    rows = [load(down), load(left) if left else None, load(right), load(up)]
    if rows[1] is None:
        rows[1] = [ImageOps.mirror(f) for f in rows[2]]
    write_sheet(cid, rows)


def from_strip(path, n, scale=1):
    im = Image.open(path).convert("RGBA")
    w = im.width // n
    frames = [im.crop((i * w, 0, (i + 1) * w, im.height)) for i in range(n)]
    if scale != 1:
        frames = [f.resize((round(f.width * scale), round(f.height * scale)), Image.NEAREST) for f in frames]
    return frames


# ---------------------------------------------------------------------------
# Objetos de Buu's Fury: Bolas de Dragón 1-7, semilla y cápsula
# ---------------------------------------------------------------------------
extras = Image.open(os.path.join(CHAKIB, "assets/goku/GokuSS1.png")).convert("RGBA").crop((10, 95, 330, 185))
items = []
for r in find_boxes(extras, (0, 128, 0)):
    for b in r:
        if 4 <= b[2] <= 20 and 6 <= b[3] <= 24:
            items.append(b)
items.sort(key=lambda b: (b[0] // 60, b[1]))  # por columnas, de arriba abajo


def grab(b):
    x, y, w, h = b
    fr = extras.crop((x, y, x + w, y + h))
    px = fr.load()
    for j in range(h):
        for i in range(w):
            if px[i, j][:3] == (0, 128, 0):
                px[i, j] = (0, 0, 0, 0)
    return trim(fr)


# columna 1: DB1, DB2, DB3, cápsula; columna 2: DB4, DB5, DB6; columna 3: DB7, pendiente Potara, semilla
names = {}
for b in items:
    x, y = b[0], b[1]
    if x < 60:
        col = [k for k in items if k[0] < 60]
        names[b] = ["db1", "db2", "db3", "capsule"][col.index(b)]
    elif x < 200:
        col = [k for k in items if 60 <= k[0] < 200]
        names[b] = ["db4", "db5", "db6"][col.index(b)]
    else:
        names[b] = "db7" if y < 20 else ("senzu" if y > 40 else "potara")
for b, key in names.items():
    if key != "potara":
        save("items", key, grab(b))
# la cápsula es demasiado estrecha para find_boxes: se recorta a mano
save("items", "capsule", grab((4, 62, 18, 26)))

save("items", "zeni", Image.open(os.path.join(ARIKU, "sprites/items/small_gold_zeni.png")).convert("RGBA"), fw=8, fh=8)

# ---------------------------------------------------------------------------
# Efectos (Legacy of Goku Maker Engine)
# ---------------------------------------------------------------------------
A = os.path.join(ARIKU, "sprites/attacks/")


def fx(key, rel, **meta):
    save("fx", key, Image.open(os.path.join(ARIKU, rel)).convert("RGBA"), **meta)


fx("kiblast", "sprites/attacks/ki_blast/ki_blast.png", fw=16, fh=16)
fx("kihit", "sprites/attacks/ki_blast/explosion.png")
fx("masenko", "sprites/attacks/masenko/masenko_ball.png", fw=16, fh=16)
fx("genkidama", "sprites/attacks/genkidama/state5.png")
fx("boom", "sprites/enemies/shooter/bomb_explosion.png", fw=32, fh=32)
fx("kame_begin", "sprites/attacks/kamehameha/begin_kamehameha.png", fw=16, fh=16)
fx("kame_mid", "sprites/attacks/kamehameha/middle_kamehameha.png")
fx("kame_end", "sprites/attacks/kamehameha/end_kamehameha.png", fw=16, fh=16)
fx("sword", "sprites/attacks/energy_sword/sword_cardinal.png")
fx("bullet", "sprites/attacks/bullet/bullet.png", fw=16, fh=8)
fx("shadow", "sprites/universal/shadow.png")
fx("shadowbig", "sprites/universal/shadowbig.png")
save("fx", "rocket", trim(Image.open(A + "rocket/rocket.png").convert("RGBA").crop((0, 0, 26, 16))))

# Interfaz: números de daño y del cronómetro
UI = os.path.join(ARIKU, "ui/")
for font, key in (("dmg_font", "dmg"), ("timer", "timer")):
    digits = [Image.open(os.path.join(UI, "fonts", font, f"{i}.png")).convert("RGBA") for i in range(10)]
    if font == "timer":
        digits.append(Image.open(os.path.join(UI, "fonts/timer/colon.png")).convert("RGBA"))
    cw = max(d.width for d in digits)
    ch = max(d.height for d in digits)
    strip = Image.new("RGBA", (cw * len(digits), ch), (0, 0, 0, 0))
    for i, d in enumerate(digits):
        strip.paste(d, (i * cw + (cw - d.width) // 2, 0), d)
    save("ui", key, strip, fw=cw, fh=ch)

# ---------------------------------------------------------------------------
# Escenarios: suelo generado con las baldosas reales y decorado recortado
# ---------------------------------------------------------------------------
W = Image.open(os.path.join(VGMAPS, "DragonBallZ-LegacyOfGoku-Wasteland&City&MilitaryBase.png")).convert("RGB")
F = Image.open(os.path.join(VGMAPS, "DragonBallZ-LegacyOfGoku-BattleWithFrieza.png")).convert("RGB")
FO = Image.open(os.path.join(VGMAPS, "DragonBallZ-LegacyOfGoku-Forest&Town.png")).convert("RGB")


def green(p):
    return p[1] > 150 and p[1] > p[0] + 40 and p[1] > p[2] + 60


def blue(p):
    return p[2] > 200 and p[2] > p[0] + 80 and p[1] > 140


def beige(p):
    return p[0] > 150 and p[1] > 115 and p[2] > 100 and p[0] >= p[2] and p[0] - p[2] < 70


t_earth = collect_pure_tiles(FO, (2700, 0, 800, 832), green, 0.95) + \
    collect_pure_tiles(W, (16, 2090, 700, 560), green, 0.95)
t_namek = collect_pure_tiles(F, (200, 30, 1000, 620), blue, 0.98)
t_namekd = collect_pure_tiles(F, (1250, 30, 950, 620), beige, 0.97)
for key, t in (("earth", t_earth), ("namek", t_namek), ("namekd", t_namekd)):
    save("tiles", key, build_ground(t, min_count=2).convert("RGBA"))


def colors(counter):
    s = set()
    for k in counter:
        s.update(Image.frombytes("RGB", (8, 8), k).getdata())
    return s


ge, gn, gd = colors(t_earth), colors(t_namek), colors(t_namekd)


def grass_px(p):
    return p[1] > 120 and p[1] > p[0] + 30 and p[1] > p[2] + 50


def path_px(p):
    # hierba o camino de tierra (para objetos que tocan el camino)
    return grass_px(p) or (p[0] > 140 and p[1] > 110 and p[2] > 90 and p[0] >= p[2] and p[0] - p[2] < 80)


def bei_px(p):
    return beige(p) or (p[0] > 120 and p[1] > 95 and p[2] > 85 and p[0] >= p[2] and p[0] - p[2] < 60) or \
        (p[2] > 150 and p[2] > p[0] + 40)


def bgrass_px(p):
    return p[2] > 150 and p[2] > p[0] + 60 and p[1] > 100


decor_pred = {
    # Tierra (Monte Paoz y el campo donde se lucha contra Nappa)
    "pine": (FO, (2740, 446, 2788, 530), grass_px), "pine2": (FO, (2878, 246, 2934, 322), grass_px),
    "spire": (FO, (2790, 376, 2850, 474), path_px), "spire2": (FO, (2932, 519, 2994, 618), path_px),
    "stump": (W, (196, 2266, 244, 2340), grass_px), "stump2": (W, (276, 2141, 316, 2212), grass_px),
    "stumps": (W, (156, 2156, 212, 2228), grass_px), "pillar": (W, (508, 2406, 530, 2490), grass_px),
    "boulder": (W, (533, 2318, 606, 2394), grass_px), "rock": (W, (205, 2126, 244, 2154), grass_px),
    "rock2": (W, (213, 2535, 252, 2562), grass_px), "dirt": (W, (458, 2263, 520, 2324), grass_px),
    "dirt2": (W, (146, 2362, 204, 2418), grass_px), "dirt3": (W, (248, 2385, 350, 2470), grass_px),
    # Namek
    "volcano": (F, (338, 138, 718, 322), bgrass_px), "nrock": (F, (391, 117, 419, 138), bgrass_px),
    "nrock2": (F, (303, 336, 329, 362), bgrass_px), "sand": (F, (734, 125, 818, 202), bgrass_px),
    "nplant": (F, (535, 518, 555, 537), bgrass_px),
    # Namek destruido
    "lavavolcano": (F, (1305, 175, 1700, 306), bei_px), "drock": (F, (1366, 117, 1394, 137), bei_px),
    "drock2": (F, (1278, 338, 1302, 362), bei_px),
}
decor_set = {
    # Los árboles de Namek tienen bolas azules: se recortan por colores exactos del suelo
    "ntree": (F, (416, 432, 456, 538), gn), "ntree2": (F, (331, 122, 363, 218), gn),
    "dtree": (F, (1308, 124, 1338, 218), gd),
}
for key, (im, box, pred) in decor_pred.items():
    single = key in ("spire", "spire2", "pine", "pine2", "pillar", "boulder", "stump", "stump2")
    cut = cutout_pred(im, box, pred)
    if key in ("spire", "spire2"):
        # el camino de tierra toca la esquina superior izquierda de las agujas
        cut.paste((0, 0, 0, 0), (0, 0, 14, 24))
    save("decor", key, drop_specks(cut, 40, largest=single))
for key, (im, box, g) in decor_set.items():
    save("decor", key, drop_specks(cutout(im, box, g, tol=14)))

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)

print("decorado:", ", ".join(manifest["decor"]))
print("objetos:", ", ".join(manifest["items"]), "| ui:", len(manifest["ui"]))
