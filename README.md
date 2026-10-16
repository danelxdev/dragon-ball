# Dragon Ball Survivors

Fan game de supervivencia por hordas (estilo *Vampire Survivors* / *PokeSurvivor*) con temática de Dragon Ball Z.
Hecho con HTML5 Canvas y JavaScript puro: sin dependencias ni paso de compilación.

> Proyecto **no oficial y sin ánimo de lucro**. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation.
>
> - **Personajes:** sprites hechos por fans (LukasAhl1, qsab101, MV95, thekrillmaster, Manikdx2000, PeculiarDoc y otros; la lista
>   completa está en `assets/credits.json` y en la pantalla de créditos), del pack «Dragon Ball Sagas» publicado en
>   [Internet Archive](https://archive.org/details/04-mangas-dragon-ball).
> - **Escenarios, efectos, objetos e interfaz:** Dragon Ball Z: The Legacy of Goku y Buu's Fury (Webfoot Technologies / Atari, GBA), vía
>   [VGMaps](https://www.vgmaps.com/Atlas/GBA/), rips de The Spriters Resource (Mister Man, Omega, ApplePie) y los proyectos fan
>   [Legacy-of-Goku-Maker-Engine](https://github.com/Arikuvfx/Legacy-of-Goku-Maker-Engine),
>   [Dragon-Ball-Z-Buu-s-Fury](https://github.com/Chakib08/Dragon-Ball-Z-Buu-s-Fury),
>   [DBZ-Legacy-of-Goku-3](https://github.com/briansukhnandan/DBZ-Legacy-of-Goku-3) y
>   [TheLegacyOfGokuClone](https://github.com/enriquefdez5/TheLegacyOfGokuClone).
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

Funciona como PokeSurvivor: coleccionas guerreros con un gacha por sagas y los llevas a sobrevivir a las hordas.

- **46 guerreros en 6 sagas** (Saiyajin, Freezer, Cell, Buu, Películas y GT, Super), con **más de 80 formas**. Cada uno
  evoluciona durante la partida al subir de nivel: Goku pasa de SSJ Dios a Blue, Blue Kaioken, Ultra Instinto y Ultra Instinto
  dominado; Freezer de su primera forma a Golden Freezer; Majin Buu a Kid Buu; Broly a Legendario y SSJ4...
- **Invocación (gacha):** banner por saga o de todas, tiradas x1 y x10 (la x10 garantiza un Épico), rarezas Común, Raro, Épico y
  Legendario, y variante **brillante** (✦, más fuerte). Los duplicados **despiertan** al personaje (hasta ★★★★★) y dan **fragmentos**.
- **Mejoras por personaje** con fragmentos (poder, vitalidad, velocidad y concentración) y mejoras globales con Zeni.
- **35 técnicas**: las comunes (Kamehameha, Masenko, Kienzan, Genkidama...) y las exclusivas de cada guerrero (Rayo Mortal,
  Big Bang Attack, Supernova, Cañón Borrador, Hakai, Salto Temporal, Puño de Poder...).
- **Evoluciones de técnicas:** técnica al máximo + la habilidad adecuada = técnica definitiva (Kamehameha x10, Final Flash
  definitivo, Genkidama Universal, Kienzan Doble, Espada Z...).
- **12 objetos equipables** (uno por partida): Pesas de Piccolo, Nube Kinton, Radar del Dragón, Rastreador, Pendientes Potara,
  Agua Ultradivina, Cola de mono... Se compran o los sueltan los jefes.
- **25 misiones** con recompensas de Zeni.
- **Hordas** de Saibaman y sus variantes, **élites** (villanos con contorno dorado) y **jefes**: Raditz, Freezer, Cell, Kid Buu y Broly.
- **Bolas de Dragón** (las 7 reales): reúnelas y pide un deseo a Shenlong.
- **Zonas:** Monte Paoz, Planeta Namek y Namek en destrucción, con el suelo y los decorados de Legacy of Goku.

## Estructura

```
index.html      HUD y contenedor de pantallas
style.css       Estilos de la interfaz
src/main.js     Menús, HUD, bucle principal y escalado del canvas
src/game.js     Lógica del juego: técnicas, enemigos, jefes, objetos y dibujo
src/data.js     Sagas, personajes y formas, técnicas y evoluciones, objetos, misiones, enemigos
src/assets.js   Carga y dibujo de sprites (héroes de vista lateral, efectos, decorado)
src/meta.js     Gacha, colección, mejoras por personaje y misiones
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
- **Personajes:** `python3 tools/build_sagas.py "<carpeta Dragon Ball Sagas>" assets` (después de `build_assets.py`). Elige
  automáticamente los fotogramas de pose de cada carpeta (`tools/sagas_extract.py`) y guarda los créditos de cada artista.
- **Nuevo personaje:** añade su carpeta en `HEROES` (`tools/build_sagas.py`) y una entrada en `ROSTER` (`src/data.js`) con su
  saga, rareza, técnica y formas.
- **Balance:** cada técnica define sus 5 niveles en `WEAPONS`, y la dificultad depende de `WAVES`, `BOSSES` y `BOSS_SCHEDULE`.
