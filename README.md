# RampForge — Atlas Studio

SPA de escritorio para diseñar, previsualizar y exportar **texture atlases de degradados** destinados a materiales 3D estilizados, hand-painted y cel-shading.

La interfaz está disponible en **español e inglés** y se puede cambiar en cualquier momento desde el botón de idioma de la cabecera.

La aplicación funciona sin build step. Three.js, las fuentes y todos los recursos están incluidos localmente.

## Ejecutar

En Windows, haz doble clic en **`start.cmd`**. Comprueba Node.js, inicia el servidor y abre el navegador automáticamente.

También puedes ejecutar:

```bash
npm run dev
```

Abre `http://127.0.0.1:5173`.

No requiere `npm install` porque no hay dependencias externas. También puedes servir la carpeta con cualquier servidor estático:

```bash
python -m http.server 5173
```

> Es necesario usar un servidor HTTP para respetar las restricciones de módulos ES6 del navegador. Abrir `index.html` con doble clic puede bloquear los imports.

## Publicar en GitHub Pages

El repositorio está preparado para publicarse como sitio estático:

- Repositorio: <https://github.com/shintarillo/rampforge-atlas-studio>
- URL prevista: <https://shintarillo.github.io/rampforge-atlas-studio/>

### Activar la publicación

1. Abre **Settings → Pages** en el repositorio.
2. En **Build and deployment**, elige **Deploy from a branch**.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. Pulsa **Save**.
5. Espera uno o dos minutos y abre la URL.

No hay build step. GitHub Pages sirve directamente `index.html`, `css/`, `js/`, `fonts/` y `vendor/`. El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll y garantiza que se publiquen todas las carpetas, incluida `vendor/`.

Cada push a `main` vuelve a publicar el sitio automáticamente. `start.cmd` y `server.mjs` solo se usan para desarrollo local y no afectan a GitHub Pages.

## Idioma

- El botón **ES / EN** de la cabecera alterna entre español e inglés sin recargar la página.
- Al arrancar, la app usa el idioma guardado en `localStorage` (`rampforge.language`). Si no existe, usa **inglés por defecto**, independientemente del idioma del navegador.
- Los textos generados (nombre del proyecto demo, rampas nuevas, plantillas) se crean en el idioma activo. Los nombres de proyecto y de rampa escritos por el usuario se conservan tal cual.
- Las rampas que mantienen el nombre de un preset integrado se traducen automáticamente al cambiar de idioma. Los presets guardados por el usuario conservan su nombre y descripción originales.
- La preferencia de idioma es independiente del proyecto JSON y del autoguardado; los archivos guardados no incluyen ajustes de idioma.

## Funciones principales

- **Gestión de atlas y rampas**
  - Crear, duplicar, renombrar, borrar, reordenar y redimensionar franjas.
  - Drag & drop en la lista o controles de orden en el inspector.
  - Orientación horizontal o vertical por rampa.
  - Tamaños de atlas: 256², 512², 1024² y 2048².
  - Diseño de **1 a 4 columnas independientes**.
  - Cada columna apila sus rampas y normaliza sus alturas de forma independiente, llenando el atlas sin huecos.
  - La distribución es alterna por orden de rampa; el número de columnas se limita automáticamente si todavía no hay suficientes rampas.
  - Altura proporcional por franja dentro de su columna.
  - Los proyectos antiguos sin `atlasColumns` se cargan con una columna; la demo inicial usa dos.

- **Editor de degradados**
  - Paradas de color arrastrables sobre el degradado.
  - Color picker nativo y edición hexadecimal.
  - Interpolación lineal, suave (Bézier editable) o posterizada por pasos.
  - Curva de transición con dos nodos verticales interactivos.
  - Añadir y eliminar paradas.

- **Grade global de paleta**
  - Tono, saturación, brillo, contraste, temperatura split-tone y tinte.
  - Los ajustes no destruyen los colores base del proyecto.
  - Aplicación en tiempo real al atlas, las miniaturas y el visor 3D.

- **Preview 3D con Three.js**
  - Cubo biselado, esfera, cilindro y plano.
  - Cámara orbital, zoom, rotación automática y reset de vista.
  - Sombreado PBR o Toon en tiempo real.
  - Luz direccional ajustable en intensidad, ángulo y altura.
  - Iluminación de estudio con sombras y environment local.

- **Región UV del preview**
  - El visor puede muestrear el atlas completo, la celda de la rampa activa o una región libre.
  - Selección directa sobre el atlas arrastrando un rectángulo; las cuatro esquinas permiten redimensionarlo.
  - La misma edición está disponible en la vista ampliada del atlas.
  - La implementación **remapela las coordenadas UV originales de cada malla**, sin recortar la textura ni perder calidad de filtrado.
  - La región UV es independiente del PNG exportado: es una herramienta de inspección del material.

- **Máscara PBR empaquetada**
  - Pestaña **PBR** en el inspector con roughness, metallic, emission y opacity constantes por rampa.
  - Segunda textura RGB(A) alineada con las mismas celdas y UV que el atlas de color.
  - Canales: `R = roughness`, `G = metallic`, `B = emission normalizada`, `A = opacity`.
  - Vista previa por canal (RGBA / R / G / B / A).
  - Resolución independiente de la máscara: 128², 256², 512² o 1024².
  - Escala de emisión configurable (`1×`, `2×`, `4×`, `8×`) para recuperar valores HDR en el shader.
  - Exportación PNG lineal con alpha directo, sin premultiplicar.
  - El visor Three.js usa la máscara en tiempo real para roughness, metalness, emisión y transparencia.
  - [Guía de integración con Godot 4 y shader de ejemplo](./examples/godot/README.md).

- **Plantillas de material**
  - 17 presets integrados (madera, metales, cristal, cuero, piedra, tela, piel, hielo, neón y estilos Toon).
  - Nombres, descripciones y categorías se traducen con la interfaz. Las rampas que conservan el nombre de un preset integrado también se traducen al cambiar de idioma; los nombres personalizados se respetan.
  - **Guardar rampa actual** añade la rampa activa a la biblioteca con su nombre, descripción, paradas, interpolación, curva, pasos y valores PBR.
  - Los presets personalizados (hasta 80) se guardan en `localStorage` (`rampforge.presets.v1`), aparecen en la categoría **Personalizados** y se pueden eliminar desde su tarjeta.
  - Filtros por categoría y vista previa real de cada degradado.
  - Aplicación sobre la rampa activa conservando nombre, altura y orientación. Los presets integrados respetan los parámetros PBR actuales; los personalizados aplican los suyos.

- **Proyecto y exportación**
  - Exportación del atlas de color PNG a la resolución activa.
  - Exportación de la máscara PBR lineal RGBA a la resolución elegida.
  - Guardado/carga del proyecto completo en JSON (`* .rampforge.json`), incluidos los valores PBR.
  - **Guardar JSON** abre el diálogo nativo de guardado en navegadores compatibles (Chrome/Edge); si no está disponible, descarga el archivo.
  - Autoguardado en `localStorage`, independiente del archivo JSON.
  - Restauración de la demo desde el pie del panel izquierdo.

## Guardado

- **Guardar JSON** está en la cabecera y escribe el proyecto en disco. En Chrome/Edge se abre el diálogo nativo para elegir la ubicación; en navegadores sin File System Access se inicia una descarga.
- **Cargar** está en la cabecera y abre un selector de archivo JSON.
- La exportación de texturas está en el panel **Atlas generado**: **Color PNG** y **Máscara PBR**.
- El indicador **Autoguardado** de la cabecera se refiere únicamente a la copia de seguridad del proyecto en el `localStorage` del navegador. No crea archivos.
- Los presets personalizados se guardan aparte en `localStorage` (`rampforge.presets.v1`) y no forman parte del JSON del proyecto.

## Atajos

| Atajo | Acción |
| --- | --- |
| `Ctrl / Cmd + S` | Guardar proyecto JSON en disco |
| `Ctrl / Cmd + Shift + E` | Exportar atlas de color PNG |
| `Esc` | Cerrar drawers o diálogos |

## Estructura

```text
.
├── index.html              Markup, controles y sprite SVG
├── css/styles.css          Sistema visual, layout responsive y controles
├── js/
│   ├── app.js              Estado, UI, interacciones, exportación e importación
│   ├── atlas.js            Rasterizador de rampas y atlas
│   ├── i18n.js             Mensajes ES/EN, preferencia y traducción de la UI
│   ├── presets.js          Biblioteca de materiales
│   ├── project.js          Modelo, defaults y normalización JSON
│   ├── three-viewer.js     Visor Three.js, luces, PBR y remapeo de UV
│   ├── user-presets.js     Presets personalizados y persistencia local
│   └── utils.js            Color, curvas, encoder PNG RGBA y helpers
├── assets/favicon.svg
├── examples/godot/         Shader Godot 4 + guía de importación
├── fonts/                  Manrope + IBM Plex Mono (OFL)
├── vendor/three/           Three.js r180 + addons (MIT)
└── server.mjs              Servidor estático local sin dependencias
```

## Formato de proyecto

El archivo exportado incluye el proyecto completo:

```json
{
  "format": "rampforge-atlas-project",
  "version": 1,
  "savedAt": "2026-10-27T12:00:00.000Z",
  "project": {
    "name": "Paleta de Estudio",
    "atlasSize": 1024,
    "atlasColumns": 2,
    "pbrMaskSize": 256,
    "emissionScale": 4,
    "globalAdjust": {
      "hue": 0,
      "saturation": 0,
      "brightness": 0,
      "contrast": 0,
      "warmth": 0,
      "tint": 0
    },
    "strips": [
      {
        "id": "ramp_...",
        "name": "Madera cálida",
        "orientation": "horizontal",
        "weight": 1.12,
        "interpolation": "smooth",
        "curve": { "in": 0.14, "out": 0.9 },
        "steps": 4,
        "pbr": {
          "roughness": 0.8,
          "metallic": 0,
          "emission": 0,
          "opacity": 1
        },
        "stops": [
          { "id": "stop_...", "color": "#160c08", "pos": 0 }
        ]
      }
    ]
  }
}
```

La carga normaliza valores, valida colores e IDs y tolera proyectos serializados previamente. Los proyectos antiguos reciben valores PBR por defecto y una máscara de 256².

## Máscara PBR y Godot

La máscara se exporta como PNG RGBA lineal, con la misma cuadrícula y los mismos UV que el atlas de color:

```text
R = roughness       G = metallic
B = emisión / escala  A = opacidad
```

La emisión se normaliza para que quepa en 8 bits. Con la escala por defecto `4×`, una emisión `2.0` se guarda como `B = 0.5` (`128/255`) y el shader la recupera multiplicando por `4.0`. Esto genera valores HDR mayores que 1 sin tocar el albedo.

La guía completa de importación, el shader y la conexión equivalente en VisualShader están en [`examples/godot/README.md`](./examples/godot/README.md).

## Créditos

- [Three.js](https://threejs.org/) — MIT. Copia local en `vendor/three/`.
- [Manrope](https://fonts.google.com/specimen/Manrope) e [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — SIL Open Font License. Licencias en `fonts/`.
