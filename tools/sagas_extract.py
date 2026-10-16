"""Selecciona y limpia fotogramas del pack «Dragon Ball Sagas» (sprites de vista lateral hechos por fans).

Cada carpeta trae fotogramas sueltos con fondo de color sólido. Para cada personaje:
- se quita el fondo por inundación desde los bordes (color de la esquina),
- se elige la primera secuencia de poses "de pie" de altura parecida (reposo / vuelo),
- y opcionalmente se fuerzan índices concretos con `pick`.
"""
import os
import re

from PIL import Image


def natural_key(path):
    name = os.path.basename(path)
    nums = re.findall(r"\d+", name)
    return (int(nums[-1]) if nums else 0, name)


def frames_in(folder):
    fs = [os.path.join(folder, f) for f in os.listdir(folder) if f.lower().endswith((".png", ".gif"))]
    return sorted(fs, key=natural_key)


def remove_bg(im):
    im = im.convert("RGBA")
    W, H = im.size
    px = im.load()
    corners = [px[0, 0], px[W - 1, 0], px[0, H - 1], px[W - 1, H - 1]]
    bg = max(set(corners), key=corners.count)
    if bg[3] == 0:
        return im
    seen = bytearray(W * H)
    stack = [(i, 0) for i in range(W)] + [(i, H - 1) for i in range(W)] + \
            [(0, j) for j in range(H)] + [(W - 1, j) for j in range(H)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        c = px[x, y]
        if c[3] == 0 or abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) > 6:
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def trim(im):
    b = im.getbbox()
    return im.crop(b) if b else im


def stats(im):
    w, h = im.size
    if not w or not h:
        return 0, 0, 0, 0, 1
    px = [p for p in im.getdata() if p[3] > 0]
    cov = len(px) / (w * h)
    colors = len(set(px))
    white = sum(1 for p in px if p[0] + p[1] + p[2] > 650) / max(1, len(px))
    return w, h, cov, colors, white


def hist(im):
    from collections import Counter
    c = Counter((p[0] >> 5, p[1] >> 5, p[2] >> 5) for p in im.getdata() if p[3] > 0)
    tot = sum(c.values()) or 1
    return {k: v / tot for k, v in c.items()}


def sim(a, b):
    return sum(min(v, b.get(k, 0)) for k, v in a.items())


def load_clean(path):
    return trim(remove_bg(Image.open(path)))


def pick_idle(folder, n=4, pick=None):
    files = frames_in(folder)
    if pick:
        return [load_clean(files[i]) for i in pick]
    clean = [load_clean(f) for f in files]
    info = [stats(c) for c in clean]
    good = [
        (w <= h * 0.95 and h >= 30 and cov >= 0.33 and colors >= 10 and white < 0.4)
        for w, h, cov, colors, white in info
    ]
    heights = sorted(info[k][1] for k in range(min(len(clean), 24)) if good[k])
    ref = heights[len(heights) // 2] if heights else 0
    ok = [good[k] and abs(info[k][1] - ref) <= max(3, ref * 0.1) for k in range(len(clean))]
    # descarta fotogramas con colores muy distintos de la pose más típica (auras, destellos, otros personajes)
    cand = [k for k in range(len(clean)) if ok[k]][:24]
    if len(cand) >= 3:
        hs = {k: hist(clean[k]) for k in cand}
        typical = max(cand, key=lambda k: sum(sim(hs[k], hs[j]) for j in cand))
        href = hs[typical]
        for k in range(len(clean)):
            if ok[k] and sim(hist(clean[k]), href) < 0.55:
                ok[k] = False
    for i in range(len(clean)):
        seq = []
        for j in range(i, len(clean)):
            if not ok[j]:
                break
            if seq and abs(info[j][0] - info[seq[0]][0]) > info[seq[0]][0] * 0.35:
                break
            seq.append(j)
            if len(seq) == n:
                return [clean[k] for k in seq]
    idx = [k for k, g in enumerate(ok) if g][:n]
    return [clean[k] for k in idx] or clean[:n]
