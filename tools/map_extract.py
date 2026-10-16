"""Utilidades para sacar suelos y decorados limpios de mapas completos (VGMaps).

- find_tile: busca el periodo con el que se repite el suelo y devuelve una baldosa sin costuras.
- cutout: recorta un objeto y vuelve transparente el suelo que lo rodea (relleno desde los bordes).
"""
from PIL import Image


def find_tile(im, x, y, size=96, periods=(8, 16, 24, 32, 48, 64)):
    im = im.convert("RGB")
    px = im.load()
    best = None
    for p in periods:
        same = total = 0
        for j in range(size):
            for i in range(size):
                c = px[x + i, y + j]
                same += (c == px[x + i + p, y + j]) + (c == px[x + i, y + j + p])
                total += 2
        ratio = same / total
        if best is None or ratio > best[1] + 0.002:
            best = (p, ratio)
        if ratio > 0.995:
            best = (p, ratio)
            break
    p = best[0]
    return im.crop((x, y, x + p, y + p)), best


def ground_colors(tile):
    return set(tile.convert("RGB").getdata())


def cutout(im, box, ground, extra=(), tol=0):
    """Recorta box y elimina por inundación desde el borde los colores de suelo."""
    fr = im.convert("RGBA").crop(box)
    W, H = fr.size
    px = fr.load()
    keys = set(ground) | set(extra)

    def is_ground(c):
        if c[:3] in keys:
            return True
        if tol:
            r, g, b = c[:3]
            return any(abs(r - k[0]) + abs(g - k[1]) + abs(b - k[2]) <= tol for k in keys)
        return False

    seen = bytearray(W * H)
    stack = [(i, 0) for i in range(W)] + [(i, H - 1) for i in range(W)] + \
            [(0, j) for j in range(H)] + [(W - 1, j) for j in range(H)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        if not is_ground(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    bbox = fr.getbbox()
    return fr.crop(bbox) if bbox else fr


def collect_tiles(im, rects, size=8):
    """Cuenta las baldosas de 8x8 (alineadas a la rejilla del mapa) dentro de varios rectángulos."""
    from collections import Counter
    im = im.convert("RGB")
    c = Counter()
    for x, y, w, h in rects:
        x0 = (x + size - 1) // size * size
        y0 = (y + size - 1) // size * size
        for ty in range(y0, y + h - size + 1, size):
            for tx in range(x0, x + w - size + 1, size):
                c[im.crop((tx, ty, tx + size, ty + size)).tobytes()] += 1
    return c


def build_ground(counter, out_size=256, size=8, seed=1, min_count=2):
    """Genera una textura repetible colocando al azar las baldosas según su frecuencia."""
    import random
    rnd = random.Random(seed)
    items = [(k, v) for k, v in counter.items() if v >= min_count] or list(counter.items())
    keys = [Image.frombytes("RGB", (size, size), k) for k, _ in items]
    weights = [v for _, v in items]
    out = Image.new("RGB", (out_size, out_size))
    for ty in range(0, out_size, size):
        for tx in range(0, out_size, size):
            out.paste(rnd.choices(keys, weights)[0], (tx, ty))
    return out


def collect_pure_tiles(im, region, pred, min_ratio=0.97, size=8):
    """Baldosas de 8x8 de una región cuyos píxeles cumplen pred casi todos."""
    from collections import Counter
    im = im.convert("RGB")
    x, y, w, h = region
    c = Counter()
    for ty in range(y // size * size, y + h - size + 1, size):
        for tx in range(x // size * size, x + w - size + 1, size):
            t = im.crop((tx, ty, tx + size, ty + size))
            data = list(t.getdata())
            if sum(1 for p in data if pred(p)) >= min_ratio * len(data):
                c[t.tobytes()] += 1
    return c


def cutout_pred(im, box, pred):
    """Como cutout, pero elimina desde el borde los píxeles que cumplen pred(rgb)."""
    fr = im.convert("RGBA").crop(box)
    W, H = fr.size
    px = fr.load()
    seen = bytearray(W * H)
    stack = [(i, 0) for i in range(W)] + [(i, H - 1) for i in range(W)] + \
            [(0, j) for j in range(H)] + [(W - 1, j) for j in range(H)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        if not pred(px[x, y][:3]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    bbox = fr.getbbox()
    return fr.crop(bbox) if bbox else fr
