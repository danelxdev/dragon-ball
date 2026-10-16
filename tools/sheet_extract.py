"""Recorta fotogramas de hojas de sprites de diseño libre (DeviantArt: LukasAhl1, qsab101, MV95, thekrillmaster...).

Las hojas tienen los sprites sobre un fondo liso. Se quita ese color (el más frecuente de la zona indicada),
se buscan los componentes conexos (con una pequeña dilatación para unir pelo, aura y cuerpo) y se ordenan
por filas. `annotate` dibuja los números de cada componente para elegir los fotogramas a mano.
"""
from collections import Counter

from PIL import Image, ImageDraw


def bg_color(im, box=None):
    reg = im.crop(box) if box else im
    c = Counter(reg.convert("RGBA").getdata())
    return c.most_common(1)[0][0]


def mask_of(im, bg, tol=12):
    im = im.convert("RGBA")
    W, H = im.size
    px = im.load()
    m = bytearray(W * H)
    for y in range(H):
        for x in range(W):
            c = px[x, y]
            if c[3] < 40:
                continue
            if abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) <= tol:
                continue
            m[y * W + x] = 1
    return m


def components(im, bg=None, box=None, tol=12, gap=1, min_px=40):
    """Devuelve las cajas (x0, y0, x1, y1) de los sprites de `box`, en orden de lectura."""
    full = im.convert("RGBA")
    if box:
        full = full.crop(box)
    if bg is None:
        bg = bg_color(full)
    W, H = full.size
    m = mask_of(full, bg, tol)
    seen = bytearray(W * H)
    boxes = []
    for start in range(W * H):
        if not m[start] or seen[start]:
            continue
        stack = [start]
        seen[start] = 1
        x0 = y0 = 10**9
        x1 = y1 = -1
        n = 0
        while stack:
            i = stack.pop()
            x, y = i % W, i // W
            n += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            r = max(gap, 1)
            for dy in range(-r, r + 1):
                yy = y + dy
                if yy < 0 or yy >= H:
                    continue
                for dx in range(-r, r + 1):
                    if gap == 0 and dx and dy:
                        continue  # gap 0: solo vecinos ortogonales
                    xx = x + dx
                    if xx < 0 or xx >= W:
                        continue
                    j = yy * W + xx
                    if m[j] and not seen[j]:
                        seen[j] = 1
                        stack.append(j)
        if n >= min_px:
            boxes.append([x0, y0, x1 + 1, y1 + 1])
    ox, oy = (box[0], box[1]) if box else (0, 0)
    boxes = [(a + ox, b + oy, c + ox, d + oy) for a, b, c, d in boxes]
    # Orden por filas: agrupa por solape vertical del centro.
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if rows and abs(cy - rows[-1][0]) < 14:
            rows[-1][1].append(b)
        else:
            rows.append([cy, [b]])
    out = []
    for _, r in rows:
        out += sorted(r, key=lambda b: b[0])
    return out, bg


def cut(im, b, bg, tol=12, flood_tol=None, min_part=10):
    """Recorta la caja y vuelve transparente el fondo.

    El fondo se borra por inundación desde el borde de la caja (así los blancos interiores del sprite se
    conservan aunque el fondo sea blanco) y después se quitan las motas sueltas del JPEG.
    """
    ft = flood_tol if flood_tol is not None else tol
    x0, y0, x1, y1 = b
    c = im.convert("RGBA").crop((x0 - 1, y0 - 1, x1 + 1, y1 + 1))
    W, H = c.size
    px = c.load()

    def near(p, t):
        return p[3] < 40 or abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= t

    seen = bytearray(W * H)
    stack = [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + \
            [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        if not near(px[x, y], ft):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    # Pixeles del color exacto de fondo encerrados (huecos entre brazos, etc.)
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and near(px[x, y], 6):
                px[x, y] = (0, 0, 0, 0)
    # Motas: componentes de 8 vecinos más pequeños que min_part.
    lab = [0] * (W * H)
    parts = []
    for i in range(W * H):
        if lab[i] or not px[i % W, i // W][3]:
            continue
        lab[i] = len(parts) + 1
        st = [i]
        mem = []
        while st:
            j = st.pop()
            mem.append(j)
            x, y = j % W, j // W
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H:
                        k = yy * W + xx
                        if not lab[k] and px[xx, yy][3]:
                            lab[k] = len(parts) + 1
                            st.append(k)
        parts.append(mem)
    for mem in parts:
        if len(mem) < min_part:
            for j in mem:
                px[j % W, j // W] = (0, 0, 0, 0)
    bb = c.getbbox()
    return c.crop(bb) if bb else c


def annotate(im, boxes, path, scale=2):
    a = im.convert("RGBA").resize((im.width * scale, im.height * scale), Image.NEAREST)
    d = ImageDraw.Draw(a)
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        d.rectangle([x0 * scale, y0 * scale, x1 * scale - 1, y1 * scale - 1], outline=(255, 0, 0, 255))
        d.text((x0 * scale + 1, y0 * scale + 1), str(i), fill=(255, 0, 0, 255))
    a.save(path)


def anchor_x(im, legs=True):
    """Columna de referencia del cuerpo: centro de masa de las piernas (o de todo el sprite)."""
    a = im.getchannel("A").load()
    W, H = im.size
    y0 = int(H * 0.65) if legs else 0
    sx = n = 0
    for y in range(y0, H):
        for x in range(W):
            if a[x, y] > 40:
                sx += x
                n += 1
    return sx / n if n else W / 2


def compose_strip(frames, ref=None, legs=True):
    """Tira horizontal con los pies abajo y el cuerpo alineado con el fotograma de referencia `ref`
    (el de reposo), para que al cambiar de pose el personaje no se desplace."""
    from PIL import Image
    off = (anchor_x(ref, legs) - ref.width / 2) if ref is not None else 0
    ax = [anchor_x(f, legs) for f in frames]
    half = max(max(a - off, f.width - a + off) for a, f in zip(ax, frames))
    fw = int(2 * half + 2)
    fh = max(f.height for f in frames)
    out = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, (f, a) in enumerate(zip(frames, ax)):
        out.paste(f, (int(round(i * fw + fw / 2 + off - a)), fh - f.height), f)
    return out, fw, fh
