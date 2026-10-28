# RampForge — Atlas Studio

English | [Español](./README_es.md)

Desktop SPA for designing, previewing and exporting **gradient texture atlases** for stylized, hand-painted and cel-shaded 3D materials.

The interface is available in **Spanish and English** and can be switched at any time from the language button in the header.

The application runs without a build step. Three.js, fonts and all assets are bundled locally.

## Run

On Windows, double-click **`start.cmd`**. It checks Node.js, starts the server and opens the browser automatically.

Alternatively, run:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

No `npm install` is required because there are no external dependencies. You can also serve the folder with any static server:

```bash
python -m http.server 5173
```

> You must use an HTTP server to satisfy browser ES module restrictions. Opening `index.html` directly may block imports.

## Deploy to GitHub Pages

The repository is ready to be published as a static site:

- Repository: <https://github.com/shintarillo/rampforge-atlas-studio>
- Expected URL: <https://shintarillo.github.io/rampforge-atlas-studio/>

### Enable deployment

1. Open **Settings → Pages** in the repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder.
4. Click **Save**.
5. Wait one or two minutes and open the URL.

There is no build step. GitHub Pages serves `index.html`, `css/`, `js/`, `fonts/` and `vendor/` directly. The `.nojekyll` file prevents GitHub from processing the site with Jekyll and ensures every folder, including `vendor/`, is published.

Every push to `main` redeploys the site automatically. `start.cmd` and `server.mjs` are only used for local development and do not affect GitHub Pages.

## Language

- The **ES / EN** button in the header switches between Spanish and English without reloading the page.
- On startup, the app uses the language stored in `localStorage` (`rampforge.language`). If none exists, it uses **English by default**, regardless of the browser language.
- Generated text (demo project name, new ramps, presets) is created in the active language. Project and ramp names entered by the user are kept as-is.
- Ramps that keep the name of a built-in preset are translated automatically when the language changes. User-saved presets keep their original name and description.
- Language preference is independent of the JSON project and autosave; saved files do not include language settings.

## Main features

- **Atlas and ramp management**
  - Create, duplicate, rename, delete, reorder and resize strips.
  - Drag & drop in the list or use the reorder controls in the inspector.
  - Horizontal or vertical orientation per ramp.
  - Atlas sizes: 256², 512², 1024² and 2048².
  - **1 to 4 independent columns**.
  - Each column stacks its ramps and normalizes their heights independently, filling the atlas without gaps.
  - Layout alternates by ramp order; the number of columns is automatically limited if there are not enough ramps yet.
  - Proportional height per strip within its column.
  - Older projects without `atlasColumns` load with one column; the initial demo uses two.

- **Gradient editor**
  - Draggable color stops along the gradient.
  - Native color picker and hex editing.
  - Linear, smooth (editable Bézier) or stepped posterized interpolation.
  - Transition curve with two interactive vertical nodes.
  - Add and remove stops.

- **Global palette grade**
  - Hue, saturation, brightness, contrast, split-tone temperature and tint.
  - Adjustments do not destroy the project's base colors.
  - Real-time application to the atlas, thumbnails and 3D viewer.

- **3D preview with Three.js**
  - Beveled cube, sphere, cylinder and plane.
  - Orbital camera, zoom, auto-rotate and view reset.
  - Real-time PBR or Toon shading.
  - Directional light adjustable in intensity, angle and height.
  - Studio lighting with shadows and a local environment.

- **Preview UV region**
  - The viewer can sample the full atlas, the active ramp cell or a free region.
  - Direct selection on the atlas by dragging a rectangle; the four corners resize it.
  - The same editing is available in the enlarged atlas view.
  - The implementation **remaps each mesh's original UV coordinates**, without cropping the texture or losing filtering quality.
  - The UV region is independent of the exported PNG: it is a material inspection tool.

- **Packed PBR mask**
  - **PBR** tab in the inspector with constant roughness, metallic, emission and opacity per ramp.
  - Second RGB(A) texture aligned to the same cells and UVs as the color atlas.
  - Channels: `R = roughness`, `G = metallic`, `B = normalized emission`, `A = opacity`.
  - Per-channel preview (RGBA / R / G / B / A).
  - Independent mask resolution: 128², 256², 512² or 1024².
  - Configurable emission scale (`1×`, `2×`, `4×`, `8×`) to recover HDR values in the shader.
  - Linear PNG export with straight alpha, not premultiplied.
  - The Three.js viewer uses the mask in real time for roughness, metalness, emission and transparency.
  - [Godot 4 integration guide and example shader](./examples/godot/README.md).

- **Material templates**
  - 17 built-in presets (wood, metals, glass, leather, stone, fabric, skin, ice, neon and Toon styles).
  - Names, descriptions and categories are translated with the interface. Ramps that keep a built-in preset name are also translated when switching languages; custom names are respected.
  - **Save current ramp** adds the active ramp to the library with its name, description, stops, interpolation, curve, steps and PBR values.
  - Custom presets (up to 80) are stored in `localStorage` (`rampforge.presets.v1`), appear under the **Custom** category, and can be deleted from their card.
  - Category filters and a real preview of each gradient.
  - Applying to the active ramp preserves its name, height and orientation. Built-in presets respect current PBR values; custom presets apply their own.

- **Project and export**
  - Export the color atlas as PNG at the active resolution.
  - Export the linear RGBA PBR mask at the selected resolution.
  - Save/load the complete project as JSON (`*.rampforge.json`), including PBR values.
  - **Save JSON** opens the native save dialog in supported browsers (Chrome/Edge); if unavailable, it downloads the file.
  - Autosave in `localStorage`, independent of the JSON file.
  - Restore the demo from the bottom of the left panel.

## Saving

- **Save JSON** is in the header and writes the project to disk. In Chrome/Edge a native dialog lets you choose the location; browsers without File System Access start a download.
- **Load** is in the header and opens a JSON file picker.
- Texture export is in the **Generated atlas** panel: **Color PNG** and **PBR mask**.
- The **Autosaved** indicator in the header refers only to the project backup in the browser's `localStorage`. It does not create files.
- Custom presets are stored separately in `localStorage` (`rampforge.presets.v1`) and are not part of the project JSON.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl / Cmd + S` | Save the JSON project to disk |
| `Ctrl / Cmd + Shift + E` | Export the color atlas as PNG |
| `Esc` | Close drawers or dialogs |

## Structure

```text
.
├── index.html              Markup, controls and SVG sprite
├── css/styles.css          Visual system, responsive layout and controls
├── js/
│   ├── app.js              State, UI, interactions, export and import
│   ├── atlas.js            Ramp and atlas rasterizer
│   ├── i18n.js             ES/EN messages, preference and UI translation
│   ├── presets.js          Material library
│   ├── project.js          Model, defaults and JSON normalization
│   ├── three-viewer.js     Three.js viewer, lights, PBR and UV remapping
│   ├── user-presets.js     Custom presets and local persistence
│   └── utils.js            Color, curves, RGBA PNG encoder and helpers
├── assets/favicon.svg
├── examples/godot/         Godot 4 shader + import guide
├── fonts/                  Manrope + IBM Plex Mono (OFL)
├── vendor/three/           Three.js r180 + addons (MIT)
└── server.mjs              Local static server with no dependencies
```

## Project format

The exported file includes the complete project:

```json
{
  "format": "rampforge-atlas-project",
  "version": 1,
  "savedAt": "2026-10-27T12:00:00.000Z",
  "project": {
    "name": "Studio Palette",
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
        "name": "Warm wood",
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

Loading normalizes values, validates colors and IDs, and tolerates previously serialized projects. Older projects receive default PBR values and a 256² mask.

## PBR mask and Godot

The mask is exported as a linear RGBA PNG, with the same grid and UVs as the color atlas:

```text
R = roughness       G = metallic
B = emission / scale  A = opacity
```

Emission is normalized to fit in 8 bits. With the default `4×` scale, an emission of `2.0` is stored as `B = 0.5` (`128/255`) and the shader recovers it by multiplying by `4.0`. This produces HDR values greater than 1 without affecting albedo.

The full import guide, the shader and the equivalent VisualShader setup are in [`examples/godot/README.md`](./examples/godot/README.md).

## Credits

- [Three.js](https://threejs.org/) — MIT. Local copy in `vendor/three/`.
- [Manrope](https://fonts.google.com/specimen/Manrope) and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — SIL Open Font License. Licenses in `fonts/`.
