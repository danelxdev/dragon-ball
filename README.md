# Dragon Ball Survivors

Fan game de supervivencia por hordas (estilo *Vampire Survivors* / *PokeSurvivor*) con temática de Dragon Ball Z.
Hecho con HTML5 Canvas y JavaScript puro: sin dependencias ni paso de compilación.

> Proyecto **no oficial y sin ánimo de lucro**. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation.
> Todo el pixel art del juego es **original**: se dibuja en código a partir de cuadrículas en `src/sprites.js`. No incluye sprites extraídos de juegos oficiales.

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

- **Guerreros:** Goku, Vegeta, Gohan y Piccolo. Krilin y Trunks se desbloquean con Zeni.
- **Transformaciones** a los niveles 10, 20 y 30: Super Saiyajin, SSJ2, SSJ3, Majin Vegeta, Gohan Definitivo, fusiones de Piccolo…
- **12 técnicas** con 5 niveles cada una: Kamehameha, Galick Ho, Masenko, Makankosappo, Kienzan, Taiyoken, Genkidama, Bakuhatsuha, Ráfaga de Ki, Aura de Ki, Esferas de Energía y Espada del Futuro.
- **10 habilidades pasivas**: Entrenamiento a 100G, Sala del Tiempo, Radar del Dragón, Técnica de Multiplicación…
- **Enemigos:** Saibaman, soldados de Freezer, Cell Jr. y esbirros Majin, más élites que sueltan Cápsulas Corp.
- **Jefes:** Raditz (2:00), Nappa (4:30), Freezer (7:30), Cell (10:30) y Majin Buu (13:30). Aguanta **15 minutos** para ganar.
- **Bolas de Dragón:** el radar las señala en el borde de la pantalla. Reúne las 7 y Shenlong te concede un deseo.
- **Progreso permanente:** Zeni, tienda de mejoras y récords por personaje, guardados en `localStorage`.

## Estructura

```
index.html      HUD y contenedor de pantallas
style.css       Estilos de la interfaz
src/main.js     Menús, HUD, bucle principal y escalado del canvas
src/game.js     Lógica del juego: técnicas, enemigos, jefes, objetos y dibujo
src/data.js     Personajes, técnicas, pasivas, enemigos, oleadas y tienda
src/sprites.js  Pixel art generado desde cuadrículas de texto
src/input.js    Teclado y joystick táctil
src/audio.js    Efectos de sonido sintetizados con WebAudio
src/storage.js  Guardado local
```

### Añadir o modificar contenido

- **Nuevo personaje:** añade una entrada a `CHARACTERS` en `src/data.js`. Si necesitas otro peinado, añade una capa en `HAIR` dentro de `src/sprites.js` (cada carácter es un píxel y `.` deja ver la base).
- **Balance:** cada técnica define sus 5 niveles en `WEAPONS`, y la dificultad depende de `WAVES`, `BOSSES` y `BOSS_SCHEDULE`.
