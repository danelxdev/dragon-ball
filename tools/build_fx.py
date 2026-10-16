"""Arte de técnicas (rayos, esferas, explosiones...) sacado de las hojas de DeviantArt + objetos dibujados a mano.

  python3 tools/build_fx.py <carpeta de hojas> assets

Usa las mismas hojas que tools/build_extra.py. Los índices son los de `components(im, tol=48, gap=1,
min_px=40)` sobre la hoja entera (ver tools/sheet_extract.py). Cada efecto con varios fotogramas se
guarda como tira horizontal (assets/fx/<id>.png); los rayos guardan también dónde acaba el destello
(`cap0`) y dónde empieza la cabeza (`cap1`) para estirar solo el cuerpo.

Además dibuja en píxeles las Bolas de Dragón grandes (1-7 estrellas), las gemas de ki (experiencia),
los iconos de cristales y tickets y la cápsula rompible.
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from sheet_extract import components, cut  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

TIEN = "thekrillmaster__Tien_Cell_Saga_Attire_1__Sprite_Sheet.png"
KIDGOKU = "lukasahl1__Kid_Goku_Sheet.png"
BROLY = "qsab101__Restrained_SSJ_Broly_LSW.png"
GOTENKS = "qsab101__Gotenks_LSW.png"
HIT = "mv95__Hitto_senshu.png"
BUU = "thekrillmaster__Majin_Buu_Universal_Survival_arc__Sprite_Sheet.png"
FTRUNKS = "qsab101__Future_Trunks__Super__LSW_sheet.png"
JACO = "thekrillmaster__Jaco_sprite_sheet.png"
BEERUS = "lukasahl1__Beerus_the_God_of_Destruction__WIP_.png"
JANEMBA = "qsab101__Super_Janemba_LSW.png"
GOGETA = "qsab101__Gogeta_LSW.png"

# id -> (hoja, índices de fotogramas, tipo[, píxeles a recortar por la izquierda])
FX = {
    "ki_blue": (TIEN, [64, 65], "anim"),
    "ki_yellow": (BROLY, [46, 47, 48], "anim"),
    "ki_purple": (BEERUS, [36, 37, 38, 39], "anim"),
    "ki_pink": (BUU, [53, 54], "anim"),
    "comet": (TIEN, [139], "anim"),
    "comet_cyan": (JANEMBA, [68], "anim"),
    "flame": (TIEN, [91], "anim"),
    "burst": (TIEN, [95], "anim"),
    "kikoho": (TIEN, [98], "beam"),
    "boom_orange": (TIEN, [129], "anim"),
    "sphere": (TIEN, [130], "anim"),
    "impact": (KIDGOKU, [115], "anim"),
    "kame_big": (KIDGOKU, [87], "beam"),
    "nimbus": (KIDGOKU, [9, 10, 11], "anim"),
    "cone": (BROLY, [54, 55, 66], "anim"),
    "star": (BROLY, [65], "anim"),
    "bigboom": (GOTENKS, [24, 25, 26, 27, 28], "anim"),
    "cloud": (GOTENKS, [103], "anim"),
    "ghost": (GOTENKS, [108, 109, 110, 111, 112, 113], "anim"),
    "timeburst": (HIT, [78, 80, 81], "anim"),
    "beam_pink": (BUU, [68], "beam"),
    "sparks": (BUU, [61, 63], "anim"),
    "beam_yellow": (FTRUNKS, [100], "beam", 27),  # recorta a Trunks, que está pegado al rayo
    "slash_green": (FTRUNKS, [103], "anim"),
    "cloud_green": (JACO, [56, 57], "anim"),
    "beam_cyan": (JACO, [62], "beam"),
    "ship": (JACO, [19], "anim"),
    "sun": (BEERUS, [29], "anim"),
    "beam_magenta": (JANEMBA, [47], "beam"),
    "slash_purple": (JANEMBA, [75], "anim"),
    "beam_white": (GOGETA, [85], "beam"),
}


def strip(frames):
    fw = max(f.width for f in frames)
    fh = max(f.height for f in frames)
    out = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * fw + (fw - f.width) // 2, (fh - f.height) // 2), f)
    return out, fw, fh


def beam_caps(im):
    """Columnas donde termina el destello inicial y empieza la cabeza del rayo."""
    a = im.getchannel("A").load()
    W, H = im.size
    hs = []
    for x in range(W):
        col = [y for y in range(H) if a[x, y] > 40]
        hs.append((max(col) - min(col) + 1) if col else 0)
    body = sorted(h for h in hs if h)[len([h for h in hs if h]) // 3]  # grosor típico del cuerpo
    lim = body * 1.25 + 1
    mid = W // 2
    c0 = mid
    while c0 > 0 and hs[c0 - 1] <= lim:
        c0 -= 1
    c1 = mid
    while c1 < W - 1 and hs[c1 + 1] <= lim:
        c1 += 1
    return c0, c1


# ---------------------------------------------------------------------------
# Objetos dibujados a mano
# ---------------------------------------------------------------------------
def dragonball(n, S=20):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    px = im.load()
    c = (S - 1) / 2
    R = S / 2 - 0.6
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - c, y - c)
            if d > R:
                continue
            if d > R - 1.2:
                px[x, y] = (122, 46, 0, 255)
                continue
            # sombreado: luz arriba a la izquierda
            l = 1 - (math.hypot(x - c + 3, y - c + 3) / (R * 1.6))
            r = int(min(255, 230 + 40 * l))
            g = int(max(60, min(220, 120 + 120 * l)))
            b = int(max(0, min(90, 10 + 70 * l)))
            px[x, y] = (r, g, b, 255)
    # brillo
    for (x, y) in [(5, 4), (6, 4), (4, 5), (5, 5), (4, 6), (7, 3), (8, 3)]:
        px[x * S // 20, y * S // 20] = (255, 250, 220, 255)
    star = [(0, -1), (-1, 0), (0, 0), (1, 0), (0, 1)]
    pos = {
        1: [(10, 11)],
        2: [(7, 9), (13, 13)],
        3: [(7, 8), (13, 9), (10, 14)],
        4: [(7, 8), (13, 8), (7, 14), (13, 14)],
        5: [(6, 8), (14, 8), (10, 11), (6, 15), (14, 15)],
        6: [(6, 7), (14, 7), (6, 11), (14, 11), (8, 15), (12, 15)],
        7: [(6, 7), (14, 7), (10, 9), (5, 12), (15, 12), (8, 15), (12, 15)],
    }[n]
    for (sx, sy) in pos:
        for (dx, dy) in star:
            x, y = (sx + dx) * S // 20, (sy + dy) * S // 20
            px[x, y] = (210, 20, 20, 255)
        px[sx * S // 20, sy * S // 20] = (255, 60, 40, 255)
    return im


def gem(color, size):
    """Gema de ki con 4 fotogramas de destello."""
    w, h = size
    frames = []
    dark = tuple(max(0, int(v * 0.45)) for v in color)
    light = tuple(min(255, int(v * 0.6 + 110)) for v in color)
    for f in range(4):
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        cx, cy = (w - 1) / 2, (h - 1) / 2
        pts = [(cx, 0), (w - 1, cy), (cx, h - 1), (0, cy)]
        d.polygon(pts, fill=color + (255,), outline=dark + (255,))
        d.polygon([(cx, 1), (w - 2, cy), (cx, cy)], fill=light + (255,))
        if f == 1:
            im.putpixel((int(cx), 1), (255, 255, 255, 255))
        if f == 2:
            im.putpixel((int(cx) - 1, int(cy) - 1), (255, 255, 255, 255))
            im.putpixel((int(cx), int(cy) - 2), (255, 255, 255, 255))
        frames.append(im)
    return frames


def crystal_icon():
    im = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(3, 1), (8, 1), (11, 4), (5.5, 11), (0, 4)], fill=(80, 220, 255, 255), outline=(20, 70, 130, 255))
    d.polygon([(3, 2), (8, 2), (5.5, 4)], fill=(200, 250, 255, 255))
    d.line([(1, 4), (10, 4)], fill=(40, 150, 220, 255))
    im.putpixel((4, 6), (255, 255, 255, 255))
    return im


def ticket_icon(gold=False):
    im = Image.new("RGBA", (16, 11), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body = (255, 200, 60, 255) if gold else (255, 120, 60, 255)
    edge = (130, 70, 0, 255) if gold else (120, 30, 10, 255)
    d.rounded_rectangle([0, 0, 15, 10], radius=2, fill=body, outline=edge)
    d.line([(4, 1), (4, 9)], fill=edge)
    d.ellipse([7, 3, 12, 8], fill=(255, 250, 230, 255), outline=edge)
    im.putpixel((9, 5), (220, 30, 30, 255))
    im.putpixel((10, 5), (220, 30, 30, 255))
    if gold:
        for p in [(1, 2), (2, 7), (14, 2)]:
            im.putpixel(p, (255, 255, 255, 255))
    return im


def capsule_pod():
    """Cápsula Corp rompible (vista lateral)."""
    im = Image.new("RGBA", (20, 15), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([3, 13, 17, 15], fill=(0, 0, 0, 70))
    d.rounded_rectangle([1, 2, 18, 13], radius=4, fill=(236, 240, 248, 255), outline=(40, 46, 70, 255))
    d.rectangle([2, 7, 17, 9], fill=(60, 120, 230, 255))
    d.line([(4, 3), (15, 3)], fill=(255, 255, 255, 255))
    d.rectangle([8, 6, 11, 10], fill=(255, 210, 60, 255), outline=(40, 46, 70, 255))
    im.putpixel((9, 8), (255, 255, 255, 255))
    return im


manifest_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(manifest_path))
credits = json.load(open(os.path.join(OUT, "credits.json")))
os.makedirs(os.path.join(OUT, "fx"), exist_ok=True)
os.makedirs(os.path.join(OUT, "items"), exist_ok=True)
os.makedirs(os.path.join(OUT, "ui"), exist_ok=True)

cache = {}
for fid, (sheet, idx, kind, *crop) in FX.items():
    if sheet not in cache:
        im = Image.open(os.path.join(SRC, sheet)).convert("RGBA")
        cache[sheet] = (im,) + components(im, tol=48, gap=1, min_px=40)
    im, boxes, bg = cache[sheet]
    frames = [cut(im, boxes[i], bg, 48, flood_tol=90, min_part=6) for i in idx]
    if crop:
        frames = [f.crop((crop[0], 0, f.width, f.height)) for f in frames]
        frames = [f.crop(f.getbbox()) for f in frames]
    out, fw, fh = strip(frames)
    out.save(os.path.join(OUT, "fx", fid + ".png"))
    entry = {"file": f"fx/{fid}.png", "w": out.width, "h": out.height, "fw": fw, "fh": fh, "frames": len(frames)}
    if kind == "beam":
        entry["cap0"], entry["cap1"] = beam_caps(frames[0])
    manifest["fx"][fid] = entry
    credits["fx:" + fid] = {"lukasahl1": "LukasAhl1", "mv95": "MV95", "qsab101": "qsab101",
                            "thekrillmaster": "thekrillmaster"}[sheet.split("__")[0]]
    print(fid, entry)

# Bolas de Dragón grandes
for n in range(1, 8):
    dragonball(n).save(os.path.join(OUT, "items", f"dball{n}.png"))
    manifest["items"][f"dball{n}"] = {"file": f"items/dball{n}.png", "w": 20, "h": 20}

# Gemas de ki (experiencia): pequeña azul, mediana verde, grande roja
for gid, col, size in [("gem_s", (70, 170, 255), (7, 9)), ("gem_m", (80, 230, 110), (9, 11)), ("gem_l", (255, 80, 90), (11, 13))]:
    out, fw, fh = strip(gem(col, size))
    out.save(os.path.join(OUT, "items", gid + ".png"))
    manifest["items"][gid] = {"file": f"items/{gid}.png", "w": out.width, "h": out.height, "fw": fw, "fh": fh}

for uid, im in [("crystal", crystal_icon()), ("ticket", ticket_icon()), ("ticket10", ticket_icon(True)), ("pod", capsule_pod())]:
    kind = "items" if uid == "pod" else "ui"
    im.save(os.path.join(OUT, kind, uid + ".png"))
    manifest[kind][uid] = {"file": f"{kind}/{uid}.png", "w": im.width, "h": im.height}

json.dump(manifest, open(manifest_path, "w"), indent=1)
json.dump(credits, open(os.path.join(OUT, "credits.json"), "w"), indent=1, ensure_ascii=False)
