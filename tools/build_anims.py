"""Añade a assets/heroes las poses de animación de los personajes del pack «Dragon Ball Sagas»:
`<id>@move` (volar hacia delante) y `<id>@atk` (lanzar ki), alineadas con el fotograma de reposo.

  python3 tools/build_anims.py "<carpeta Dragon Ball Sagas>" assets

Ejecútalo después de tools/build_sagas.py (los personajes de DeviantArt hacen lo mismo en build_extra.py).
Las poses se buscan solas (tools/pose_detect.py); en OVERRIDES se corrigen a mano las que fallan.
"""
import ast
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sagas_extract import frames_in, load_clean, pick_idle  # noqa: E402
from sheet_extract import compose_strip  # noqa: E402
from pose_detect import detect_poses  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]

src = open(os.path.join(os.path.dirname(__file__), "build_sagas.py")).read()
start = src.index("HEROES = {") + len("HEROES = ")
HEROES = ast.literal_eval(src[start: src.index("\n}\n", start) + 2])

# Correcciones: lista vacía = sin esa pose (se anima por código); índices = fotogramas de la carpeta
OVERRIDES = {
    "beerus": {"move": []},
    "kefla": {"move": []},
    "gogeta": {"move": []},
}

manifest_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(manifest_path))
for hid, (folder, pick) in HEROES.items():
    path = os.path.join(SRC, folder)
    frames = [load_clean(f) for f in frames_in(path)]
    idle = pick_idle(path, 4, pick)
    poses = detect_poses(frames, idle)
    poses.update(OVERRIDES.get(hid, {}))
    for kind in ("move", "atk"):
        key = hid + "@" + kind
        manifest["heroes"].pop(key, None)
        if not poses[kind]:
            continue
        out, fw, fh = compose_strip([frames[i] for i in poses[kind]], idle[0], legs=kind == "atk")
        out.save(os.path.join(OUT, "heroes", key + ".png"))
        manifest["heroes"][key] = {"file": f"heroes/{key}.png", "fw": fw, "fh": fh, "frames": len(poses[kind])}
    print(hid, poses)

json.dump(manifest, open(manifest_path, "w"), indent=1)
