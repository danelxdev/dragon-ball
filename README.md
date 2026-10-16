# Dragon Ball Survivors

Fan game de supervivencia por hordas (estilo *Vampire Survivors* / *PokeSurvivor*) con temática de Dragon Ball Z.
Hecho con HTML5 Canvas y JavaScript puro: sin dependencias ni paso de compilación.

> Proyecto **no oficial y sin ánimo de lucro**. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation.
>
> - **Personajes y técnicas:** sprites hechos por fans (LukasAhl1, qsab101, MV95, thekrillmaster, Manikdx2000, PeculiarDoc y otros; la lista
>   completa está en `assets/credits.json` y en la pantalla de créditos), del pack «Dragon Ball Sagas» publicado en
>   [Internet Archive](https://archive.org/details/04-mangas-dragon-ball) y de las hojas de sprites de esos artistas en DeviantArt.
> - **Música:** original, compuesta para el juego.
> - **Escenarios, efectos, objetos e interfaz:** Dragon Ball Z: The Legacy of Goku y Buu's Fury (Webfoot Technologies / Atari, GBA), vía
>   [VGMaps](https://www.vgmaps.com/Atlas/GBA/), rips de The Spriters Resource (Mister Man, Omega, ApplePie) y los proyectos fan
>   [Legacy-of-Goku-Maker-Engine](https://github.com/Arikuvfx/Legacy-of-Goku-Maker-Engine),
>   [Dragon-Ball-Z-Buu-s-Fury](https://github.com/Chakib08/Dragon-Ball-Z-Buu-s-Fury),
>   [DBZ-Legacy-of-Goku-3](https://github.com/briansukhnandan/DBZ-Legacy-of-Goku-3) y
>   [TheLegacyOfGokuClone](https://github.com/enriquefdez5/TheLegacyOfGokuClone).
>
> No lo uses con fines comerciales.

## Cómo jugarlo

**Abre `index.html` con doble clic** y listo: usa la versión empaquetada de `dist/`, con las imágenes incrustadas, así que
funciona sin servidor. También funciona tal cual en **GitHub Pages** (*Settings → Pages → Deploy from branch → main*).

### Desarrollo

`dev.html` carga directamente los módulos de `src/`, pero necesita un servidor (`npm run dev` y abrir `http://localhost:8080/dev.html`).
Después de cambiar el código o los sprites, regenera la versión empaquetada con:

```bash
npm run build   # crea dist/assets-data.js y dist/game.js
```

## Controles

| Acción | Teclado | Móvil |
| --- | --- | --- |
| Moverse | WASD / flechas | Arrastrar el dedo |
| Cambiar de ranura de técnicas | 1-4 o Q / E | Tocar la ranura (abajo) |
| Ataque definitivo (barra de ki llena) | Espacio | Botón KI |
| Elegir mejora / deseo / vínculo | 1, 2, 3 o clic | Tocar la carta |
| Cambiar opciones | R | Botón |
| Pausa | Esc / P | Botón II |

## Contenido

**La partida avanza por fases, cada vez más difíciles**, de saga en saga: la llegada de Raditz, los Saiyajin (Nappa),
Vegeta, Namek (Zarbon), las Fuerzas Especiales Ginyu, Freezer, los androides (Cell semiperfecto), los Juegos de Cell,
Majin Buu, Broly, Golden Freezer, Goku Black (Zamasu fusionado), el Torneo del Poder (Jiren) y Bills. Cada fase termina al
derrotar a su jefe (con una entrada al estilo del anime) y la siguiente tiene enemigos más fuertes; tras Bills empieza otra
ronda aún más dura. Para llegar lejos hay que conseguir guerreros mejores, **entrenarlos** con Zeni y comprar mejoras:
cada guerrero tiene un **Poder de combate (PC)** que se compara con el recomendado para la siguiente fase.

Funciona como PokeSurvivor: coleccionas guerreros con un gacha por sagas y los llevas a sobrevivir a las hordas.

- **Solo empiezas con Goku.** Los demás se consiguen invocando.
- **56 guerreros en 6 sagas** con **más de 130 formas**, incluidos Goku niño, Goku GT, Ten Shin Han, Goten, Trunks niño,
  Gohan (La resurrección de F), Vegeta copia, Trunks del Futuro (Super), Broly (Super), Jaco y Super Janemba.
  Cada uno se transforma durante la partida al subir de nivel.
- **Ranuras de técnicas (formato PokeSurvivor):** cada técnica nueva ocupa una ranura (hasta 4) y **solo dispara la activa**.
  Al derrotar a un jefe ganas un **vínculo** para fusionar dos ranuras y lanzar hasta 4 técnicas a la vez (+12% de daño por técnica).
- **Ki y ataques definitivos:** la barra de ki se llena luchando; llena, lanzas el definitivo de tu guerrero (Super Kamehameha,
  Final Flash, Genkidama, Súper Kamikaze Fantasma...) con un corte de anime.
- **Técnicas con arte de verdad:** rayos con destello y cabeza, Kikoho en espiral, ondas de llamas, fantasmas de Gotenks,
  explosiones, discos y auras, sacados de hojas de sprites de la comunidad. Gemas de ki y Bolas de Dragón dibujadas en píxeles.
- **31 técnicas y 20 técnicas definitivas por evolución** (nuevas: Ráfaga Renzoku, Hellzone Grenade, Lluvia de meteoros,
  Teletransporte y Puño del Dragón): técnica al máximo + la habilidad adecuada = carta dorada con la técnica definitiva.
- **Invocación:** se paga con **Cristales de Ki** o **tickets** (x1 y x10); el **Zeni** es para mejoras y objetos. Rarezas Común,
  Raro, Épico y Legendario, brillantes (✦), x10 con Épico garantizado y **pity** (Legendario seguro a las 70). Animación de cápsula.
  Cristales y tickets se consiguen en las partidas (jefes, élites, cápsulas), en las misiones y con el regalo diario.
- **Objetos:** uno equipado por partida; los jefes sueltan otro y eliges si cambiarlo (queda desbloqueado).
- **Animaciones:** los guerreros vuelan inclinados con estela de imágenes residuales, adoptan su pose de lanzar ki al
  atacar y parpadean al recibir golpes; enemigos, élites y jefes también tienen pose de ataque y de vuelo.
- **Enemigos:** Saibaman (normales, de colores y kamikaze), soldados de Freezer (tres tipos), Appule, Cui, Bio-Men, Cell Jr.,
  guerreros Majin, copias de Zamasu y luchadores de los universos 6 y 11, según la fase. Algunos disparan, otros embisten
  (avisan con una línea roja) y otros son tanques; al morir salen despedidos. **Élites** con contorno dorado que lanzan ráfagas de ki: Nappa, Raditz, Dodoria, Zarbon, Ginyu, Burter,
  Babidi, Pui Pui, androides... Y **14 jefes** con ataques propios: embestidas, anillos y ráfagas de ki, rayos y lluvias de ki
  que avisan en el suelo, espirales de balas, discos que te persiguen, esferas gigantes, refuerzos y teletransporte.
- **Durante la partida:** cápsulas rompibles con potenciadores (furia, velocidad, recarga, radar) y Saibaman kamikaze que avisan
  con un círculo rojo.
- **Bolas de Dragón:** reúne las 7 y pide un deseo a Shenlong (también puede darte un vínculo o cristales).
- **Zonas:** Monte Paoz, Tierras yermas, Planeta Namek, Namek en destrucción, el ring de Cell, el planeta de los Kaio-shin,
  el Mundo del Vacío y el planeta de Bills. Al suelo y al decorado de GBA se les corrige el color al cargar
  (en la consola estaban muy saturados) y se les añade detalle: matas de hierba, flores, piedras, grietas y brasas.
- **Música original** compuesta para el juego (título, menús, cada zona, jefes, invocación, victoria y derrota) y ajustes de volumen.
- **38 misiones** con Zeni y Cristales de Ki (también por llegar a cada fase y por entrenar).

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
src/music.js    Música original tocada con WebAudio (secuenciador)
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
- **Animaciones del pack:** `python3 tools/build_anims.py "<carpeta Dragon Ball Sagas>" assets` busca en cada carpeta la pose
  de lanzar ki y la de vuelo (`tools/pose_detect.py`) y las guarda como `assets/heroes/<id>@atk.png` y `<id>@move.png`.
- **Personajes y técnicas de hojas de DeviantArt:** `python3 tools/build_extra.py <carpeta de hojas> assets` recorta los
  personajes (fila y fotogramas de cada hoja) y `python3 tools/build_fx.py <carpeta de hojas> assets` el arte de las técnicas,
  las Bolas de Dragón, las gemas y los iconos. Las instrucciones para descargar las hojas están en la cabecera de los scripts.
- **Nuevo personaje:** añade su carpeta en `HEROES` (`tools/build_sagas.py`) y una entrada en `ROSTER` (`src/data.js`) con su
  saga, rareza, técnica y formas.
- **Balance:** cada técnica define sus 5 niveles en `WEAPONS`, y la dificultad depende de `WAVES`, `BOSSES` y `BOSS_SCHEDULE`.
