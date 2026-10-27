# RampForge — Atlas Studio

SPA de escritorio para diseñar, previsualizar y exportar **texture atlases de degradados** destinados a materiales 3D estilizados, hand-painted y cel-shading.

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

- **Plantillas de material**
  - 17 presets (madera, metales, cristal, cuero, piedra, tela, piel, hielo, neón y estilos Toon).
  - Filtros por categoría y vista previa real de cada degradado.
  - Aplicación sobre la rampa activa conservando nombre, altura y orientación.

- **Proyecto y exportación**
  - Exportación PNG a la resolución activa del atlas.
  - Guardado/carga del proyecto completo en JSON (`* .rampforge.json`).
  - Autoguardado en `localStorage`.
  - Restauración de la demo desde el pie del panel izquierdo.

## Atajos

| Atajo | Acción |
| --- | --- |
| `Ctrl / Cmd + S` | Descargar proyecto JSON |
| `Ctrl / Cmd + Shift + E` | Exportar atlas PNG |
| `Esc` | Cerrar drawers o diálogos |

## Estructura

```text
.
├── index.html              Markup, controles y sprite SVG
├── css/styles.css          Sistema visual, layout responsive y controles
├── js/
│   ├── app.js              Estado, UI, interacciones, exportación e importación
│   ├── atlas.js            Rasterizador de rampas y atlas
│   ├── presets.js          Biblioteca de materiales
│   ├── project.js          Modelo, defaults y normalización JSON
│   ├── three-viewer.js     Visor Three.js, luces y remapeo de UV
│   └── utils.js            Color, curvas, fechas, descargas y helpers
├── assets/favicon.svg
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
        "stops": [
          { "id": "stop_...", "color": "#160c08", "pos": 0 }
        ]
      }
    ]
  }
}
```

La carga normaliza valores, valida colores e IDs y tolera proyectos serializados previamente.

## Créditos

- [Three.js](https://threejs.org/) — MIT. Copia local en `vendor/three/`.
- [Manrope](https://fonts.google.com/specimen/Manrope) e [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — SIL Open Font License. Licencias en `fonts/`.
