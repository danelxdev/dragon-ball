# Dragon Ball Survivors

Fan game de supervivencia por hordas (estilo *Vampire Survivors* / *PokeSurvivor*) con temática de Dragon Ball Z.
Hecho con HTML5 Canvas y JavaScript puro: sin dependencias ni paso de compilación.

> Proyecto **no oficial y sin ánimo de lucro**. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation.
> Los gráficos son de **Dragon Ball Z: Buu's Fury** y **The Legacy of Goku I/II** (Webfoot Technologies / Atari, GBA):
>
> - Personajes jugables: rips de *Mister Man* para The Spriters Resource, vía [Dragon-Ball-Z-Buu-s-Fury](https://github.com/Chakib08/Dragon-Ball-Z-Buu-s-Fury).
> - Retratos: rip de *Omega*. Bolas de Dragón y objetos: rip de *ApplePie*.
> - Enemigos, jefes, ataques e interfaz: [Legacy-of-Goku-Maker-Engine](https://github.com/Arikuvfx/Legacy-of-Goku-Maker-Engine),
>   [DBZ-Legacy-of-Goku-3](https://github.com/briansukhnandan/DBZ-Legacy-of-Goku-3) y [TheLegacyOfGokuClone](https://github.com/enriquefdez5/TheLegacyOfGokuClone).
> - Suelos y decorado: extraídos de los mapas de Legacy of Goku publicados en [VGMaps](https://www.vgmaps.com/Atlas/GBA/).
>
> No lo uses con fines comerciales.

## Cómo jugarlo

Los módulos ES necesitan servirse por HTTP (no funciona abriendo `index.html` con doble clic):

```bash
npx http-server -c-1 .
# o
python3 -m http.server 8000
```

y abre `http://localhost:8080` (o el puerto que indique).

También funciona tal cual en **GitHub Pages**: *Settings → Pages → Deploy from branch*.

## Controles

| Acción | Teclado | Móvil |
| --- | --- | --- |
| Moverse | WASD / flechas | Arrastrar el dedo |
| Elegir mejora / deseo | 1, 2, 3 o clic | Tocar la carta |
| Cambiar opciones | R | Botón |
| Pausa | Esc / P | Botón II |

## Contenido

- **Guerreros:** Goku, Vegeta y Gohan. Goten y el Gran Saiyaman se desbloquean con Zeni.
- **Transformaciones** a los niveles 10, 20 y 30 con sus sprites y retratos reales: Super Saiyajin, SSJ2, **SSJ3**, Super Vegeta, Majin Vegeta, Gohan Definitivo…
- **12 técnicas** con 5 niveles cada una: Kamehameha, Galick Ho, Masenko, Makankosappo, Kienzan, Taiyoken, Genkidama, Bakuhatsuha, Ráfaga de Ki, Aura de Ki, Esferas de Energía y Espada de Energía.
- **10 habilidades pasivas**: Entrenamiento a 100G, Sala del Tiempo, Radar del Dragón, Técnica de Multiplicación…
- **Enemigos:** bandidos tigre, soldados, bandidos lobo que disparan y lanzacohetes, más élites doradas que sueltan cofres.
- **Jefes:** Pui Pui (2:00), Androides 17 y 18 (4:30), Freezer (7:30), Cell (10:30) y Majin Buu (13:30). Aguanta **15 minutos** para ganar.
- **Zonas:** Monte Paoz, Planeta Namek y Namek en destrucción, con el suelo y los decorados de Legacy of Goku (pinos, agujas de roca, árboles de Namek, volcanes…).
- **Bolas de Dragón** (las 7 reales, de 1 a 7 estrellas): el radar las señala en el borde de la pantalla. Reúne las 7 y Shenlong te concede un deseo.
- **Progreso permanente:** Zeni, tienda de mejoras y récords por personaje, guardados en `localStorage`.

## Estructura

```
index.html      HUD y contenedor de pantallas
style.css       Estilos de la interfaz
src/main.js     Menús, HUD, bucle principal y escalado del canvas
src/game.js     Lógica del juego: técnicas, enemigos, jefes, objetos y dibujo
src/data.js     Personajes, técnicas, pasivas, enemigos, oleadas y tienda
src/assets.js   Carga y dibujo de las hojas de sprites
assets/         Sprites normalizados + manifest.json (generados)
tools/          Scripts que extraen y normalizan los sprites
src/input.js    Teclado y joystick táctil
src/audio.js    Efectos de sonido sintetizados con WebAudio
src/storage.js  Guardado local
```

### Añadir o modificar contenido

- **Regenerar o ampliar los sprites:** sigue las instrucciones de la cabecera de `tools/build_assets.py`
  (clonar los repositorios y descargar tres mapas de VGMaps) y ejecuta `python3 tools/build_assets.py <carpeta> assets` (necesita Pillow).
  El suelo se genera con las baldosas de 8x8 reales de los mapas y el decorado se recorta quitando el suelo de alrededor (`tools/map_extract.py`). Todas las hojas de personaje salen con el mismo
  formato: fotogramas de 32x32, 4 filas (abajo, izquierda, derecha, arriba) y la animación de andar en columnas.
  Para hojas de Spriters Resource con cajas sobre fondo verde azulado usa `from_boxes` (ver `tools/slice_boxes.py`).
- **Nuevo personaje:** añade su hoja en `tools/build_assets.py` y una entrada en `CHARACTERS` (`src/data.js`).
- **Balance:** cada técnica define sus 5 niveles en `WEAPONS`, y la dificultad depende de `WAVES`, `BOSSES` y `BOSS_SCHEDULE`.
