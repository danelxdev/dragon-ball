"""Busca poses de animación (lanzar ki y volar hacia delante) en una secuencia de fotogramas sueltos.

Las hojas de los fans (LSW y similares) siguen casi siempre el mismo orden: postura, movimiento, golpes,
daño, ki y técnicas. La pose de ataque es el fotograma del personaje justo antes del efecto de una bola o
un rayo de ki; la de vuelo es una pose inclinada (más ancha y más baja que la de reposo) del principio.
`overrides` permite fijar los índices a mano cuando la detección falla.
"""
from sagas_extract import hist, sim


def _info(im):
    px = [p for p in im.getdata() if p[3] > 40]
    w, h = im.size
    bright = sum(1 for p in px if max(p[:3]) >= 200 and (max(p[:3]) - min(p[:3]) > 60 or min(p[:3]) > 200)) / max(1, len(px))
    return w, h, len(px), bright


def detect_poses(frames, idle):
    h0 = sorted(f.height for f in idle)[len(idle) // 2]
    w0 = sorted(f.width for f in idle)[len(idle) // 2]
    m0 = sorted(_info(f)[2] for f in idle)[len(idle) // 2]
    b0 = sorted(_info(f)[3] for f in idle)[len(idle) // 2]
    href = hist(idle[0])
    info = [_info(f) for f in frames]
    same = [sim(hist(f), href) for f in frames]

    def is_char(i):
        w, h, m, _ = info[i]
        return 0.72 * h0 <= h <= 1.3 * h0 and w <= 2.0 * w0 and m >= 0.45 * m0 and same[i] >= 0.5

    def is_idle(i):
        w, h, _, _ = info[i]
        return abs(h - h0) <= 2 and abs(w - w0) <= 2

    def is_shot(i):
        # bola o rayo de ki: poco alto, brillante y distinto del personaje (las estelas de movimiento no cuentan)
        w, h, m, br = info[i]
        return not is_char(i) and h < 0.75 * h0 and m > 12 and same[i] < 0.5 and br > max(0.45, b0 + 0.25)

    n = len(frames)
    atk = None
    best = -1
    for i in range(n - 1):
        if not is_char(i) or is_idle(i):
            continue
        if not any(is_shot(j) for j in range(i + 1, min(n, i + 3))):
            continue
        w, h = info[i][0], info[i][1]
        score = w / w0 + (0.5 if any(info[j][0] > 2.2 * w0 for j in range(i + 1, min(n, i + 3))) else 0)
        if w >= 1.1 * w0 and h >= 0.88 * h0 and same[i] >= 0.6 and score > best:
            best = score
            atk = i
    move = []
    for i in range(min(n, max(12, n // 2))):
        if not is_char(i) or is_idle(i) or i == atk:
            continue
        w, h, _, _ = info[i]
        if w / h > 1.15 * (w0 / h0) and h < 0.95 * h0 and same[i] >= 0.6:
            if move and i != move[-1] + 1:
                break
            move.append(i)
            if len(move) == 2:
                break
    return {"atk": [atk] if atk is not None else [], "move": move}
