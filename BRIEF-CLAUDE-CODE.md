# FUTDJM — Brief de traspaso para Claude Code

## 1. Contexto del proyecto

**Don Julio de Milán (DJM)** es un equipo amateur de fútbol 7 que juega la Liga Flash Futbolito en San Carlos de Apoquindo, Chile (cancha Fortín Cruzado). El grupo ya tiene una identidad de marca fuerte: gala anual "Don Julio de Oro" (premiación estilo Balón de Oro), una app de votación "VII Ideal" ya deployada en GitHub Pages, y ahora está construyendo **FUTDJM**: un juego tipo FUT Draft / Ultimate Team con cartas propias del plantel, pensado para uso interno del grupo de amigos (no comercial).

Identidad visual ya fijada: **negro, blanco y dorado**, tipografías Playfair Display (display/serif elegante) + Anton (números/impacto) + Inter (texto utilitario). El escudo real del club (obra artística estilo AC Milan con "DJM" y "2023") ya existe y está incluido en los assets — **usar ese escudo, no inventar uno nuevo**.

## 2. Qué es FUTDJM (visión del producto)

Una app tipo Ultimate Team para uso del grupo:
- Panel de administración donde se cargan jugadores/cartas manualmente (nombre, posición(es), media, tipo de carta, foto) — vía Google Sheets + Drive como backend.
- Sistema de cartas con **rareza automática según media** + **cartas especiales asignadas manualmente** (IF, MVP, TOTY, Shapeshifter, Future Star, Icono) y variantes para **parches** (jugadores invitados).
- **DJM Draft**: modo principal — elegís formación, luego capitán (se ubica solo en su posición natural), luego llenás el resto de la cancha tocando cada posición vacía, que te ofrece 3 opciones de jugadores válidos para ese puesto.
- **Sistema de Química**: cada titular aporta 10 si está jugando en una posición que realmente tiene, o 0 si no. Total sobre 70 (7 titulares × 10).
- Suplentes accesibles desde una pestaña "SUBS" en la cancha, con animación de despliegue.
- Funciones futuras ya con su lugar reservado en el home pero bloqueadas ("Packs", "Últimas Cartas", "Evoluciones", "Estadísticas").

## 3. Estado actual — ya construido y probado visualmente

Todo lo siguiente **ya está resuelto y funciona** en HTML/CSS/JS vanilla (ver carpeta `app-actual/`). No es necesario rediseñarlo desde cero — la idea es que Claude Code lo tome como base y lo lleve a una arquitectura de proyecto real (o lo mantenga simple si tiene sentido, a criterio de Claude Code).

### 3.1 Sistema de rareza de cartas

| Rareza | Umbral | Asignación |
|---|---|---|
| Plata | 74 | Automática según media |
| Oro | 75–79 | Automática según media |
| Oro raro | 80–90 | Automática según media |
| IF (In Form) | cualquier media | Manual |
| MVP | cualquier media | Manual |
| TOTY | cualquier media | Manual |
| Shapeshifter | cualquier media | Manual (jugador en posición distinta a la habitual) |
| Future Star | cualquier media | Manual (jugador joven con proyección) |
| Icono | cualquier media | Manual (leyenda del club) |
| Parche | cualquier media | Manual (jugador invitado) |
| Parche Estrella | cualquier media | Manual (jugador invitado destacado) |

Las cartas base (Plata/Oro/Oro raro) sí tienen 6 estadísticas (RIT, TIR, PAS, REG, DEF, FÍS para jugadores de cancha; EST, PAR, SAQ, REF, POS, MAN para arqueros). Las cartas especiales **no muestran estadísticas por ahora**.

### 3.2 Componente de carta (`fc-outer` / `fc-inner`)

Es el mismo componente que ya usa la app "VII Ideal" (`balon-de-oro-fortin.html`), reutilizado a propósito para mantener consistencia visual entre ambas apps del grupo. Forma vía `clip-path`:

```css
clip-path: polygon(50% 0%,88% 6%,100% 20%,100% 92%,90% 100%,10% 100%,0% 92%,0% 20%,12% 6%);
```

- `.fc-outer`: marco/bisel oscuro constante (`linear-gradient(160deg,#3a3427,#151109 75%)`), mismo para todas las rarezas.
- `.fc-inner`: el fondo de color que define la rareza (degradados específicos por tier, ya definidos en `app-actual/futdjm-app-completa.html`).
- Contiene: media (`fc-rating`), posición (`fc-pos`), foto circular (`fc-photo`), nombre (`fc-name`).
- **Multi-posición**: cuando un jugador tiene más de una posición, la posición principal va en `fc-pos` (dentro de la carta) y las secundarias en una viñeta tipo banderín (`pos-badge`) que sobresale del borde derecho — **sin la etiqueta "También", solo las posiciones**.

### 3.3 ⚠️ Bugs ya encontrados — evitar repetirlos

1. **Selector CSS de rareza**: el color de fondo de la carta se define con `.fc-inner.tier-NOMBRE{...}` (clase compuesta en el mismo elemento). Si se escribe como `.tier-NOMBRE .fc-inner{...}` (selector descendiente) **no aplica nunca** y todas las cartas se ven iguales sin que salte error. Este bug se repitió más de una vez — verificar siempre con el selector correcto.
2. **`clip-path` recorta a los hijos posicionados afuera**: si `.fc-outer` tiene su propio `clip-path`, cualquier hijo absolutamente posicionado fuera de su caja (como el chip de química o la viñeta de posición) se corta, aunque visualmente debería sobresalir. Solución: esos elementos van como hermanos de `.fc-outer` dentro de un contenedor padre sin `clip-path` (ej. `.slot`), no como hijos de `.fc-outer`.
3. **Verificar visualmente, no a ciegas**: hay Playwright + Chromium instalado en el entorno de desarrollo — conviene renderizar y screenshotear antes de dar por buena cualquier vista, en vez de asumir que el CSS escrito se ve como se piensa.

### 3.4 Formaciones (fútbol 7, siempre 7 posiciones: 1 arquero + 6 de cancha)

```js
const FORMATIONS = {
  '1-3-2-1': {def:3, mc:2, del:1},
  '1-2-3-1': {def:2, mc:3, del:1},
  '1-2-2-2': {def:2, mc:2, del:2},
  '1-3-1-2': {def:3, mc:1, del:2},
};
```

Vocabulario de posiciones usado en todo el proyecto: **POR, DEF, MC, DEL** (no usar abreviaciones de 11 jugadores como CAM/CB/ST).

### 3.5 Sistema de Química

- Cada titular tiene un valor de química de 10 si la posición del **slot que ocupa** está incluida en su lista de posiciones válidas; si no, aporta 0.
- Total del equipo: suma de los 7 titulares, sobre 70.
- Se recalcula en cada cambio (capitán, selección de posición, swap con suplente).
- Se muestra como número (`X/70`) y como fila de 7 "pips" (puntitos), uno dorado por cada titular con química.

### 3.6 Flujo de Draft

1. **Formación**: grilla 2×2 con mini-cancha mostrando los puntos de cada formación (mismo algoritmo de posicionamiento que ya usa VII Ideal — `getSlotPositions`).
2. **Capitán**: 3 candidatos (cartas), al elegir uno se coloca automáticamente en su posición principal.
3. **Cancha**: el resto de los slots aparecen vacíos (borde punteado + posición). Tocar un slot vacío abre una hoja inferior (`sheet`) con 3 opciones de jugadores válidos para esa posición (sin repetir jugadores ya usados).
4. **Suplentes**: pestaña "SUBS" abajo a la izquierda de la cancha; al tocarla despliega (`max-height` animado) 3 cartas de suplentes debajo de la cancha.
5. Media del equipo y química se recalculan en vivo. "Guardar equipo" solo se habilita con las 7 posiciones llenas.

### 3.7 Panel de administración (`app-actual/admin-panel.html` + `backend-apps-script.gs`)

- Formulario: nombre, posición, media (1–99), tipo de carta (automática o especial), foto (con compresión client-side a JPEG antes de subir).
- Backend Google Apps Script: guarda metadata en una hoja "Cartas" de Google Sheets y la foto en una carpeta de Google Drive ("DJM - Fotos Cartas"), devolviendo una URL pública de la imagen.
- Ya incluye listado de cartas cargadas con botón de eliminar.
- Sigue el mismo patrón que el backend de VII Ideal (Apps Script + Sheets), para que el dueño del proyecto no tenga que aprender un sistema nuevo.

### 3.8 Home screen (`futdjm-app-completa.html`)

- Header con escudo real + wordmark "FUT**DJM**".
- Botón hero grande "DJM DRAFT" (único activo) con mini-stack de 3 cartas decorativas (sin fotos).
- 4 botones bloqueados con cinta "PRÓXIMAMENTE": Packs, Últimas Cartas, Evoluciones, Estadísticas.
- Todo en un solo archivo HTML con un state machine simple (`state.screen`) que ya incluye home → formación → capitán → cancha.

## 4. Assets incluidos en este traspaso

```
assets/
  escudo/
    escudo_djm_real.png              ← escudo oficial del club, usar tal cual
  referencias/
    referencia_01_cartas_fc27_plantillas_vacias_por_rareza.png
    referencia_02_cartas_fc27_llenas_ejemplo_river_plate.png
    referencia_03_madfut_grid_plantel_completo.jpg
    referencia_04_madfut_home_pantalla_draft.jpg
    referencia_05_pantalla_elegir_formacion.png
    referencia_06_cancha_quimica_plantel_completo.png
  jugadores_sin_identificar/
    00_contacto_todas_las_fotos.png  ← hoja de contacto para ver todo de un vistazo
    jugador_sinid_01 a 13            ← fotos de partidos, sin identificar a qué jugador corresponde cada una
    foto_prueba_usada_en_mockups.jpg ← foto usada solo como placeholder en las pruebas de diseño, NO es la foto final de nadie
app-actual/
  futdjm-app-completa.html           ← la app completa tal como está probada (home + draft + química)
  admin-panel.html                   ← panel de carga de cartas
  backend-apps-script.gs             ← backend Google Apps Script (Sheets + Drive)
  prototipo-quimica-standalone.html  ← prototipo aislado del sistema de química con swap de cartas
```

### Qué falta (pendiente del dueño del proyecto, no de Claude Code)

- **Roster real** (nombres, posiciones, media, tipo de carta) — hay un Excel (`DJM JUEGO.xlsx`) en OneDrive que no pudo descargarse automáticamente por restricciones de acceso; hay que subirlo directo al chat o exportarlo a CSV.
- **Fotos individuales limpias** por jugador — las 13 fotos en `jugadores_sin_identificar/` son de partidos (varias tienen a más de una persona en cuadro) y no están vinculadas a ningún nombre todavía. Falta que el dueño del proyecto las identifique una por una, o suba fotos individuales nuevas por jugador.
- Confirmar si el juego debe seguir siendo un único HTML (como el resto de las apps del grupo, para mantener el mismo patrón de deploy en GitHub Pages) o pasar a un proyecto con build (React/Vite) — se deja a criterio de Claude Code según lo que sea más mantenible a medida que el juego crezca.

## 5. Prompt sugerido para pegar en Claude Code

```
Estoy retomando el desarrollo de FUTDJM, un juego tipo FUT Draft/Ultimate Team
para mi equipo amateur de fútbol 7 (Don Julio de Milán). Te adjunto un brief
completo (este archivo) más los assets y el código ya funcional que armamos
en otra herramienta.

Quiero que:
1. Leas el brief completo antes de tocar nada.
2. Uses app-actual/futdjm-app-completa.html, admin-panel.html y
   backend-apps-script.gs como punto de partida real, no como referencia
   a ignorar — ya están probados visualmente.
3. Prestes especial atención a la sección "Bugs ya encontrados" antes de
   tocar CSS de las cartas.
4. Me preguntes por el roster real y las fotos identificadas antes de
   inventar datos de jugadores.
5. Propongas la arquitectura de proyecto (single-file vs. proyecto con
   build) según lo que sea más mantenible, explicando el trade-off.

El objetivo inmediato es dejar el Draft completo (formación → capitán →
cancha → guardar equipo) funcionando contra datos reales del plantel,
antes de avanzar a Packs/Evoluciones/Estadísticas.
```

## 6. Principios de diseño a mantener

- Negro + blanco + dorado siempre; las cartas especiales pueden salirse de esa paleta (holográfico, rojo de parches) pero el **chrome de la app** (headers, botones, fondo) se mantiene fiel a la identidad DJM.
- Nada de reproducir literalmente assets con copyright de EA/FC — todo lo construido es "inspirado en", con arte propio (gradientes CSS, no imágenes robadas).
- Verificar siempre con screenshot real antes de dar algo por terminado.
