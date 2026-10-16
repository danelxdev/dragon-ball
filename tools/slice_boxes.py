"""Detecta los fotogramas de una hoja ripeada de Spriters Resource.

Cada fotograma está dentro de una caja de color `box` sobre un fondo `bg`.
Devuelve una lista de filas, cada una con las cajas (x, y, w, h) ordenadas.
"""
from PIL import Image


def find_boxes(im, bg):
    im = im.convert("RGB")
    W, H = im.size
    px = im.load()
    seen = bytearray(W * H)
    boxes = []
    for y in range(H):
        for x in range(W):
            if seen[y * W + x] or px[x, y] == bg:
                continue
            # relleno por inundación de la región que no es fondo
            stack = [(x, y)]
            seen[y * W + x] = 1
            x0 = x1 = x
            y0 = y1 = y
            while stack:
                cx, cy = stack.pop()
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny] != bg:
                        seen[ny * W + nx] = 1
                        stack.append((nx, ny))
            if (x1 - x0) >= 8 and (y1 - y0) >= 8:
                boxes.append((x0, y0, x1 - x0 + 1, y1 - y0 + 1))
    # agrupar en filas por solape vertical
    boxes.sort(key=lambda b: (b[1], b[0]))
    rows = []
    for b in boxes:
        for r in rows:
            ry = r[0][1]
            rh = r[0][3]
            if abs(b[1] - ry) < rh * 0.5:
                r.append(b)
                break
        else:
            rows.append([b])
    for r in rows:
        r.sort(key=lambda b: b[0])
    rows.sort(key=lambda r: r[0][1])
    return rows


def crop_frame(im, box, boxcol, extra_transparent=()):
    """Recorta una caja y vuelve transparente el color de la caja."""
    x, y, w, h = box
    fr = im.convert("RGBA").crop((x, y, x + w, y + h))
    px = fr.load()
    kill = {boxcol, *extra_transparent}
    for j in range(h):
        for i in range(w):
            if px[i, j][:3] in kill:
                px[i, j] = (0, 0, 0, 0)
    return fr
