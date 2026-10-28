/**
 * Lightweight bilingual UI layer (Spanish / English).
 * Messages are stored as [es, en] pairs so both languages stay in sync.
 */

const STORAGE_KEY = "rampforge.language";
const SUPPORTED_LANGUAGES = ["es", "en"];
const LANGUAGE_INDEX = { es: 0, en: 1 };
const LOCALES = { es: "es-ES", en: "en-US" };

const MESSAGES = {
  "app.metaDescription": [
    "RampForge Atlas Studio — Diseña, ajusta y exporta texture atlases de degradados para proyectos 3D estilizados.",
    "RampForge Atlas Studio — Design, tune and export gradient texture atlases for stylized 3D projects.",
  ],
  "app.homeAria": ["RampForge, inicio", "RampForge, home"],
  "app.untitledProject": ["Proyecto sin título", "Untitled project"],
  "app.workspaceAria": ["Área de trabajo", "Workspace"],

  "common.cancel": ["Cancelar", "Cancel"],
  "common.close": ["Cerrar", "Close"],
  "common.undo": ["Deshacer", "Undo"],
  "common.download": ["Descargar", "Download"],
  "common.delete": ["Eliminar", "Delete"],
  "common.rampWordOne": ["rampa", "ramp"],
  "common.rampWordMany": ["rampas", "ramps"],

  "header.project": ["PROYECTO", "PROJECT"],
  "header.projectNameAria": ["Nombre del proyecto", "Project name"],
  "header.autosaving": ["Autoguardando…", "Autosaving…"],
  "header.autosaved": ["Autoguardado", "Autosaved"],
  "header.autosaveError": ["Sin autoguardado", "Autosave unavailable"],
  "header.autosavingTitle": ["Guardando cambios en este navegador", "Saving changes in this browser"],
  "header.autosavedTitle": ["Autoguardado en este navegador a las {time}", "Autosaved in this browser at {time}"],
  "header.autosaveErrorTitle": ["No se pudo guardar en este navegador", "Could not save in this browser"],
  "header.load": ["Cargar", "Load"],
  "header.loadTitle": ["Cargar proyecto JSON", "Load JSON project"],
  "header.saveJson": ["Guardar JSON", "Save JSON"],
  "header.saveJsonTitle": ["Guardar proyecto como archivo JSON (Ctrl+S)", "Save project as a JSON file (Ctrl+S)"],
  "header.openLibrary": ["Abrir panel de rampas", "Open ramps panel"],
  "header.openInspector": ["Abrir inspector", "Open inspector"],
  "header.languageSwitch": ["Cambiar idioma a inglés", "Switch language to Spanish"],

  "sidebar.aria": ["Rampas y configuración del atlas", "Ramps and atlas settings"],
  "sidebar.eyebrow": ["CONFIGURACIÓN", "CONFIGURATION"],
  "sidebar.title": ["Atlas", "Atlas"],
  "sidebar.close": ["Cerrar panel", "Close panel"],
  "sidebar.canvas": ["Lienzo", "Canvas"],
  "sidebar.square": ["CUADRADO", "SQUARE"],
  "sidebar.sizeAria": ["Tamaño del atlas", "Atlas size"],
  "sidebar.columns": ["Columnas", "Columns"],
  "sidebar.columnsAria": ["Número de columnas del atlas", "Number of atlas columns"],
  "sidebar.columnTitleOne": ["Una columna, bandas a ancho completo", "One column, full-width bands"],
  "sidebar.columnTitleMany": ["{count} columnas con alturas independientes", "{count} columns with independent heights"],
  "sidebar.columnsActiveOne": ["1 ACTIVA", "1 ACTIVE"],
  "sidebar.columnsActiveMany": ["{count} ACTIVAS", "{count} ACTIVE"],
  "sidebar.columnsPartial": ["{active} DE {requested}", "{active} OF {requested}"],
  "sidebar.columnsNoRamps": ["SIN RAMPAS", "NO RAMPS"],
  "sidebar.columnsHintEmpty": ["Añade rampas para distribuir el atlas en columnas.", "Add ramps to distribute the atlas into columns."],
  "sidebar.columnsHintInsufficient": ["Faltan rampas para usar {requested} columnas. Ahora mismo se muestran {active}.", "Not enough ramps for {requested} columns. Currently showing {active}."],
  "sidebar.columnsHintSingle": ["Alturas independientes. Una sola pila a ancho completo.", "Independent heights. A single full-width stack."],
  "sidebar.columnsHintMany": ["Pilas independientes. Cada columna reparte sus propias alturas.", "Independent stacks. Each column distributes its own heights."],
  "sidebar.resolution": ["Resolución", "Resolution"],
  "sidebar.format": ["Formato", "Format"],
  "sidebar.memory": ["Memoria", "Memory"],
  "sidebar.ramps": ["Rampas", "Ramps"],
  "sidebar.reorderHint": ["Arrastra para ordenar · ajusta alturas en el inspector.", "Drag to reorder · adjust heights in the inspector."],
  "sidebar.addRamp": ["Añadir rampa", "Add ramp"],
  "sidebar.libraryEyebrow": ["BIBLIOTECA", "LIBRARY"],
  "sidebar.libraryTitle": ["Plantillas de materiales", "Material templates"],
  "sidebar.librarySubtitle": ["Madera, metales, cristal y más", "Wood, metals, glass and more"],
  "sidebar.emptyTitle": ["Aún no hay rampas", "No ramps yet"],
  "sidebar.emptyText": ["Añade tu primera franja de degradado.", "Add your first gradient strip."],
  "sidebar.autosaveNote": ["Autoguardado en este navegador", "Autosaved in this browser"],
  "sidebar.resetDemo": ["Restaurar demo", "Restore demo"],
  "sidebar.resetDemoTitle": ["Restaurar proyecto de demostración", "Restore demo project"],

  "viewer.meshAria": ["Malla de prueba", "Test mesh"],
  "viewer.meshCube": ["Cubo", "Cube"],
  "viewer.meshSphere": ["Esfera", "Sphere"],
  "viewer.meshCylinder": ["Cilindro", "Cylinder"],
  "viewer.meshPlane": ["Plano", "Plane"],
  "viewer.meshCubeTitle": ["Cubo biselado", "Beveled cube"],
  "viewer.meshSphereTitle": ["Esfera", "Sphere"],
  "viewer.meshCylinderTitle": ["Cilindro", "Cylinder"],
  "viewer.meshPlaneTitle": ["Malla plana", "Flat mesh"],
  "viewer.shadingAria": ["Tipo de sombreado", "Shading type"],
  "viewer.pbrTitle": ["Sombreado PBR", "PBR shading"],
  "viewer.toonTitle": ["Sombreado cel-shading", "Cel shading"],
  "viewer.autoRotate": ["Rotación automática", "Auto-rotate"],
  "viewer.resetView": ["Restablecer cámara", "Reset camera"],
  "viewer.canvasAria": ["Vista previa 3D interactiva del atlas", "Interactive 3D atlas preview"],
  "viewer.livePreview": ["VISTA EN VIVO", "LIVE PREVIEW"],
  "viewer.uvMap": ["MAPA UV", "UV MAP"],
  "viewer.uvPillTitle": ["Región del atlas muestreada por los UV del objeto", "Atlas region sampled by object UVs"],
  "viewer.testMesh": ["MALLA DE PRUEBA", "TEST MESH"],
  "viewer.orbitHint": ["Arrastra para orbitar · scroll para zoom", "Drag to orbit · scroll to zoom"],
  "viewer.loader": ["Preparando visor 3D", "Preparing 3D viewer"],
  "viewer.webglTitle": ["El visor 3D no está disponible", "The 3D viewer is unavailable"],
  "viewer.webglText": ["Activa WebGL en tu navegador para previsualizar el atlas sobre las mallas.", "Enable WebGL in your browser to preview the atlas on the meshes."],
  "viewer.lighting": ["ILUMINACIÓN", "LIGHTING"],
  "viewer.studioLight": ["Luz de estudio", "Studio light"],
  "viewer.intensity": ["Intensidad", "Intensity"],
  "viewer.direction": ["Dirección", "Direction"],
  "viewer.height": ["Altura", "Height"],
  "viewer.resetLight": ["Restablecer iluminación", "Reset lighting"],

  "atlas.title": ["Atlas generado", "Generated atlas"],
  "atlas.rampOne": ["{count} rampa", "{count} ramp"],
  "atlas.rampMany": ["{count} rampas", "{count} ramps"],
  "atlas.columnMeta": [" · {count} col.", " · {count} cols."],
  "atlas.expandTitle": ["Ampliar atlas y editar la región UV", "Expand atlas and edit UV region"],
  "atlas.uvAria": ["Región UV del objeto en el visor 3D", "Object UV region in the 3D viewer"],
  "atlas.uvTooltip": ["Región del atlas mapeada en los UV del objeto", "Atlas region mapped to the object UVs"],
  "atlas.modeFull": ["Atlas", "Atlas"],
  "atlas.modeRamp": ["Rampa", "Ramp"],
  "atlas.modeFree": ["Libre", "Free"],
  "atlas.modeFullTitle": ["Mapear todo el atlas sobre el objeto", "Map the entire atlas onto the object"],
  "atlas.modeRampTitle": ["Mapear la celda de la rampa activa sobre el objeto", "Map the active ramp cell onto the object"],
  "atlas.modeRampTitleNamed": ["Mapear la celda de “{name}” sobre el objeto", "Map the “{name}” cell onto the object"],
  "atlas.modeFreeTitle": ["Dibuja una región rectangular sobre el atlas para mapearla al objeto", "Draw a rectangular atlas region to map onto the object"],
  "atlas.canvasAria": ["Atlas de degradados de {ramps}, {resolution} píxeles", "Gradient atlas with {ramps}, {resolution} pixels"],
  "atlas.modalCanvasAria": ["Vista ampliada del atlas, {resolution} píxeles", "Enlarged atlas view, {resolution} pixels"],
  "atlas.empty": ["Sin rampas todavía", "No ramps yet"],
  "atlas.uvOverlayAria": ["Región UV sobre el atlas", "UV region on the atlas"],
  "atlas.uvOverlayAriaExpanded": ["Región UV sobre el atlas ampliado", "UV region on the enlarged atlas"],
  "atlas.uvHint": ["Arrastra para redibujar · esquinas para ajustar", "Drag to redraw · corners to resize"],
  "atlas.uvSelectionRamp": ["RAMPA", "RAMP"],
  "atlas.infoEyebrow": ["TEXTURA FINAL", "FINAL TEXTURE"],
  "atlas.infoTitle": ["Lista para tu pipeline.", "Ready for your pipeline."],
  "atlas.infoDescription": ["Color, curvas y ajustes de paleta aplanados en una sola textura sRGB de alta precisión.", "Color, curves and palette adjustments flattened into one high-precision sRGB texture."],
  "atlas.statsRamps": ["Rampas", "Ramps"],
  "atlas.statsResolution": ["Resolución", "Resolution"],
  "atlas.statsFormat": ["Formato", "Format"],
  "atlas.exportColor": ["Color PNG", "Color PNG"],
  "atlas.exportColorTitle": ["Descargar el atlas de color (sRGB)", "Download the color atlas (sRGB)"],
  "atlas.exportMask": ["Máscara PBR", "PBR mask"],
  "atlas.exportMaskTitle": ["Descargar la máscara PBR lineal RGBA", "Download the linear RGBA PBR mask"],
  "atlas.modalEyebrow": ["INSPECCIÓN DE TEXTURA", "TEXTURE INSPECTION"],
  "atlas.modalTitle": ["Atlas a tamaño completo", "Atlas at full size"],
  "atlas.modalClose": ["Cerrar atlas", "Close atlas"],
  "atlas.modalDownload": ["Descargar PNG", "Download PNG"],
  "atlas.uvPillFull": ["Atlas completo", "Full atlas"],
  "atlas.uvPillRamp": ["Rampa · {name}", "Ramp · {name}"],
  "atlas.uvPillRampFallback": ["Rampa activa", "Active ramp"],
  "atlas.uvPillFree": ["Libre · {summary}", "Free · {summary}"],
  "atlas.uvPillNone": ["Sin atlas", "No atlas"],
  "atlas.uvPillTitle": ["Región UV: {summary} · {position}", "UV region: {summary} · {position}"],
  "atlas.uvPillNoAtlasTitle": ["Añade una rampa para muestrear el atlas", "Add a ramp to sample the atlas"],
  "atlas.uvRegionTitle": ["Región UV · {summary} · {position}", "UV region · {summary} · {position}"],
  "atlas.modeLabelFull": ["atlas completo", "full atlas"],
  "atlas.modeLabelRamp": ["rampa activa", "active ramp"],
  "atlas.modeLabelFree": ["región libre ({summary})", "free region ({summary})"],
  "atlas.modalMeta": ["{resolution} px · PNG sRGB", "{resolution} px · PNG sRGB"],
  "atlas.modalMetaUv": ["{resolution} px{columns} · UV: {mode}", "{resolution} px{columns} · UV: {mode}"],

  "inspector.aria": ["Inspector de rampa y ajustes globales", "Ramp and global adjustments inspector"],
  "inspector.eyebrow": ["EDICIÓN", "EDIT"],
  "inspector.title": ["Inspector", "Inspector"],
  "inspector.close": ["Cerrar inspector", "Close inspector"],
  "inspector.tabsAria": ["Secciones del inspector", "Inspector sections"],
  "inspector.tabRamp": ["Rampa", "Ramp"],
  "inspector.tabPbr": ["PBR", "PBR"],
  "inspector.tabGlobal": ["Ajustes", "Adjustments"],
  "inspector.tabGlobalTitle": ["Ajustes globales", "Global adjustments"],
  "inspector.emptyTitle": ["Sin rampa activa", "No active ramp"],
  "inspector.emptyText": ["Añade una franja de degradado para empezar a dar forma a tu paleta.", "Add a gradient strip to start shaping your palette."],
  "inspector.emptyAdd": ["Nueva rampa", "New ramp"],

  "ramp.counter": ["RAMPA {index} / {total}", "RAMP {index} / {total}"],
  "ramp.moveUp": ["Mover arriba", "Move up"],
  "ramp.moveDown": ["Mover abajo", "Move down"],
  "ramp.moveUpAria": ["Mover rampa arriba", "Move ramp up"],
  "ramp.moveDownAria": ["Mover rampa abajo", "Move ramp down"],
  "ramp.duplicate": ["Duplicar rampa", "Duplicate ramp"],
  "ramp.delete": ["Eliminar rampa", "Delete ramp"],
  "ramp.name": ["Nombre", "Name"],
  "ramp.direction": ["Dirección del degradado", "Gradient direction"],
  "ramp.inAtlas": ["EN EL ATLAS", "IN THE ATLAS"],
  "ramp.directionAria": ["Dirección del degradado", "Gradient direction"],
  "ramp.horizontal": ["Horizontal", "Horizontal"],
  "ramp.vertical": ["Vertical", "Vertical"],
  "ramp.gradient": ["Degradado", "Gradient"],
  "ramp.stops": ["{count} PARADAS", "{count} STOPS"],
  "ramp.editNodes": ["EDITA LOS NODOS", "EDIT THE NODES"],
  "ramp.selectedStop": ["Parada seleccionada", "Selected stop"],
  "ramp.stopCounter": ["{index} / {total}", "{index} / {total}"],
  "ramp.chooseColor": ["Elegir color", "Choose color"],
  "ramp.colorAria": ["Color de la parada", "Stop color"],
  "ramp.hexAria": ["Código hexadecimal de la parada", "Stop hex code"],
  "ramp.removeStop": ["Eliminar parada", "Remove stop"],
  "ramp.position": ["Posición", "Position"],
  "ramp.positionAria": ["Posición de la parada", "Stop position"],
  "ramp.addStop": ["Añadir parada", "Add stop"],
  "ramp.dragHint": ["CLIC + ARRASTRA", "CLICK + DRAG"],
  "ramp.stopMarker": ["Parada {index} · {percentage}%", "Stop {index} · {percentage}%"],
  "ramp.stopAria": ["Parada {index}, color {color}, posición {percentage} por ciento", "Stop {index}, color {color}, position {percentage} percent"],
  "ramp.itemColumnAria": [", columna {column} de {columns}", ", column {column} of {columns}"],
  "ramp.itemColumnTitle": [" · Columna {column} de {columns}", " · Column {column} of {columns}"],
  "ramp.curveShadow": ["SOMBRA", "SHADOW"],
  "ramp.curveLight": ["LUZ", "LIGHT"],
  "ramp.interpolation": ["Interpolación", "Interpolation"],
  "ramp.interpLinear": ["Lineal", "Linear"],
  "ramp.interpSmooth": ["Suave", "Smooth"],
  "ramp.interpSteps": ["Pasos", "Steps"],
  "ramp.interpolationAria": ["Modo de interpolación", "Interpolation mode"],
  "ramp.modeLinear": ["LINEAL", "LINEAR"],
  "ramp.modeSmooth": ["BÉZIER", "BÉZIER"],
  "ramp.modeSteps": ["POSTERIZADO", "POSTERIZED"],
  "ramp.linearNote": ["Transición directa entre paradas. Elige Suave para editar la curva Bézier.", "Direct transition between stops. Choose Smooth to edit the Bézier curve."],
  "ramp.steps": ["Bandas de color", "Color bands"],
  "ramp.stepsAria": ["Número de pasos", "Number of steps"],
  "ramp.stepsNote": ["Posterización en {count} niveles. Perfecta para cel-shading y looks de cómic.", "Posterized into {count} levels. Perfect for cel shading and comic-book looks."],
  "ramp.curveHead": ["Curva Bézier · arrastra los nodos", "Bézier curve · drag the nodes"],
  "ramp.resetCurve": ["Restablecer curva suave", "Reset smooth curve"],
  "ramp.resetCurveLabel": ["Suave", "Smooth"],
  "ramp.curveAria": ["Editor de curva de transición", "Transition curve editor"],
  "ramp.curveIn": ["Entrada", "In"],
  "ramp.curveOut": ["Salida", "Out"],
  "ramp.presence": ["Presencia en el atlas", "Atlas presence"],
  "ramp.fullWidth": ["ANCHO COMPLETO", "FULL WIDTH"],
  "ramp.columnShort": ["COL {column} / {columns}", "COL {column} / {columns}"],
  "ramp.cellHeight": ["Altura de la celda", "Cell height"],
  "ramp.weightAria": ["Altura relativa de la rampa dentro de su columna", "Relative ramp height inside its column"],
  "ramp.cellHint": ["{width}px de ancho · {percentage}% de su columna. El resto de la pila se redistribuye.", "{width}px wide · {percentage}% of its column. The rest of the stack is redistributed."],
  "ramp.singleColumnHint": ["Ancho completo · {percentage}% del atlas. El resto de rampas se redistribuye.", "Full width · {percentage}% of the atlas. The other ramps are redistributed."],
  "ramp.templates": ["Aplicar plantilla", "Apply template"],
  "ramp.templatesSubtitle": ["{count} looks de material listos para usar", "{count} ready-to-use material looks"],
  "ramp.emptyTitle": ["Sin rampa activa", "No active ramp"],
  "ramp.emptyText": ["Añade una franja de degradado para empezar a dar forma a tu paleta.", "Add a gradient strip to start shaping your palette."],
  "ramp.new": ["Nueva rampa", "New ramp"],
  "ramp.newName": ["Nueva rampa {number}", "New ramp {number}"],
  "ramp.copySuffix": ["{name} copia", "{name} copy"],
  "ramp.fallback": ["Rampa {index}", "Ramp {index}"],
  "ramp.untitled": ["Rampa sin nombre", "Untitled ramp"],

  "pbr.eyebrow": ["MATERIAL PBR · C{column} / {columns}", "PBR MATERIAL · C{column} / {columns}"],
  "pbr.intro": ["Valores constantes para esta celda. La máscara replica exactamente la cuadrícula del atlas y usa los mismos UV.", "Constant values for this cell. The mask mirrors the atlas grid exactly and uses the same UVs."],
  "pbr.surfaceParams": ["Parámetros de superficie", "Surface parameters"],
  "pbr.constantRgba": ["CONSTANTES · RGBA8", "CONSTANT · RGBA8"],
  "pbr.roughness": ["Rugosidad", "Roughness"],
  "pbr.metallic": ["Metálico", "Metallic"],
  "pbr.emission": ["Emisión", "Emission"],
  "pbr.opacity": ["Opacidad", "Opacity"],
  "pbr.smooth": ["LISO", "SMOOTH"],
  "pbr.rough": ["MATE", "ROUGH"],
  "pbr.dielectric": ["DIELÉCTRICO", "DIELECTRIC"],
  "pbr.metal": ["METAL", "METAL"],
  "pbr.noEmission": ["SIN EMISIÓN", "NO EMISSION"],
  "pbr.transparent": ["TRANSPARENTE", "TRANSPARENT"],
  "pbr.opaque": ["OPACO", "OPAQUE"],
  "pbr.packedMask": ["Máscara empaquetada", "Packed mask"],
  "pbr.linearNoSrgb": ["LINEAL · NO sRGB", "LINEAR · NOT sRGB"],
  "pbr.channelR": ["Rugosidad", "Roughness"],
  "pbr.channelG": ["Metálico", "Metallic"],
  "pbr.channelB": ["Emisión", "Emission"],
  "pbr.channelA": ["Opacidad", "Opacity"],
  "pbr.preview": ["PREVIEW DE CANALES", "CHANNEL PREVIEW"],
  "pbr.previewAria": ["Vista previa de la máscara PBR", "PBR mask preview"],
  "pbr.channelAria": ["Canal de la máscara a previsualizar", "Mask channel to preview"],
  "pbr.export": ["Exportación de máscara", "Mask export"],
  "pbr.pngLinear": ["PNG · LINEAL", "PNG · LINEAR"],
  "pbr.resolution": ["Resolución", "Resolution"],
  "pbr.emissionScale": ["Escala de emisión", "Emission scale"],
  "pbr.note": ["El canal B se normaliza: B = emisión / {scale}. Multiplica B por {scale} en Godot para recuperar la intensidad. No importes esta máscara como sRGB.", "The B channel is normalized: B = emission / {scale}. Multiply B by {scale} in Godot to recover the intensity. Do not import this mask as sRGB."],
  "pbr.download": ["Descargar máscara PBR", "Download PBR mask"],
  "pbr.exportNote": ["La máscara sigue la misma cuadrícula y UV que el atlas de color. El alpha se exporta sin premultiplicar para no alterar los datos.", "The mask follows the same grid and UVs as the color atlas. Alpha is exported unpremultiplied so the data stays intact."],
  "pbr.maxEmission": ["{value}×", "{value}×"],

  "global.heroTitle": ["Ajustes de paleta", "Palette adjustments"],
  "global.heroText": ["Un grade global aplicado a cada parada, en tiempo real, sin destruir tus colores originales.", "A global grade applied to every stop in real time without destroying your original colors."],
  "global.hue": ["Tono", "Hue"],
  "global.saturation": ["Saturación", "Saturation"],
  "global.brightness": ["Brillo", "Brightness"],
  "global.contrast": ["Contraste", "Contrast"],
  "global.warmth": ["Temperatura", "Temperature"],
  "global.tint": ["Tinte", "Tint"],
  "global.soft": ["SUAVE", "SOFT"],
  "global.strong": ["INTENSO", "STRONG"],
  "global.cool": ["FRÍO", "COOL"],
  "global.warm": ["CÁLIDO", "WARM"],
  "global.green": ["VERDE", "GREEN"],
  "global.magenta": ["MAGENTA", "MAGENTA"],
  "global.splitTitle": ["Split toning incluido.", "Split toning included."],
  "global.splitText": ["La temperatura calienta las luces y enfría las sombras para integrar la paleta en tu escena.", "Temperature warms the highlights and cools the shadows to integrate the palette into your scene."],
  "global.reset": ["Restablecer ajustes", "Reset adjustments"],
  "global.resetTitle": ["Paleta restablecida", "Palette reset"],
  "global.resetMessage": ["Todos los ajustes globales volvieron a cero.", "All global adjustments were reset to zero."],

  "presets.eyebrow": ["BIBLIOTECA DE MATERIALES", "MATERIAL LIBRARY"],
  "presets.title": ["Plantillas de degradado", "Gradient templates"],
  "presets.subtitle": ["Selecciona un look para {name}.", "Select a look for {name}."],
  "presets.defaultSubtitle": ["Aplica un look a la rampa seleccionada.", "Apply a look to the selected ramp."],
  "presets.close": ["Cerrar biblioteca", "Close library"],
  "presets.filterAria": ["Filtrar plantillas", "Filter templates"],
  "presets.footer": ["Se conservan el nombre, la dirección y la altura de tu rampa.", "Your ramp name, direction and height are preserved."],
  "presets.countOne": ["{count} look", "{count} look"],
  "presets.countMany": ["{count} looks", "{count} looks"],
  "presets.applyTitle": ["Aplicar {name}", "Apply {name}"],
  "presets.appliedTitle": ["Plantilla aplicada", "Template applied"],
  "presets.appliedMessage": ["{preset} → {strip}", "{preset} → {strip}"],
  "presets.noRampTitle": ["Selecciona una rampa", "Select a ramp"],
  "presets.noRampMessage": ["Abre o crea una rampa antes de aplicar una plantilla.", "Open or create a ramp before applying a template."],
  "presets.saveCurrent": ["Guardar rampa actual", "Save current ramp"],
  "presets.saveCurrentTitle": ["Añadir la rampa actual a la biblioteca", "Add the current ramp to the library"],
  "presets.saveEyebrow": ["NUEVO PRESET", "NEW PRESET"],
  "presets.saveTitle": ["Añadir a la biblioteca", "Add to the library"],
  "presets.saveName": ["Nombre", "Name"],
  "presets.saveNamePlaceholder": ["Nombre del preset", "Preset name"],
  "presets.saveDescription": ["Descripción", "Description"],
  "presets.saveDescriptionPlaceholder": ["Descripción opcional", "Optional description"],
  "presets.saveConfirm": ["Guardar preset", "Save preset"],
  "presets.savedInline": ["«{name}» añadido a la biblioteca.", "“{name}” added to the library."],
  "presets.customDefaultDescription": ["Rampa personal guardada desde el proyecto.", "Custom ramp saved from the project."],
  "presets.customUntitled": ["Preset personal", "Custom preset"],
  "presets.limitReached": ["Has alcanzado el límite de presets personalizados.", "You have reached the custom preset limit."],
  "presets.storageError": ["No se pudo guardar la biblioteca en este navegador.", "The library could not be saved in this browser."],
  "presets.delete": ["Eliminar preset", "Delete preset"],
  "presets.deleteNamed": ["Eliminar «{name}»", "Delete “{name}”"],
  "presets.deleteConfirm": ["¿Eliminar el preset «{name}»? Esta acción no afecta a las rampas del proyecto.", "Delete the preset “{name}”? This does not affect the project ramps."],
  "presets.deletedInline": ["«{name}» eliminado de la biblioteca.", "“{name}” removed from the library."],
  "presets.categoryAll": ["Todos", "All"],
  "presets.categoryOrganic": ["Orgánico", "Organic"],
  "presets.categoryMetallic": ["Metálico", "Metallic"],
  "presets.categoryMineral": ["Mineral", "Mineral"],
  "presets.categoryFantasy": ["Fantasía", "Fantasy"],
  "presets.categoryStylized": ["Estilizado", "Stylized"],
  "presets.categoryCustom": ["Personalizados", "Custom"],

  "presets.wood-warm.name": ["Madera cálida", "Warm wood"],
  "presets.wood-warm.description": ["Ámbar, corteza y madera cepillada al sol.", "Amber, bark and sun-brushed timber."],
  "presets.leather-worn.name": ["Cuero envejecido", "Worn leather"],
  "presets.leather-worn.description": ["Cuero curtido con rozaduras y reflejos tibios.", "Tanned leather with scuffs and warm highlights."],
  "presets.fabric-olive.name": ["Tela oliva", "Olive fabric"],
  "presets.fabric-olive.description": ["Lino militar con volumen suave y sombras verdosas.", "Military linen with soft volume and green shadows."],
  "presets.moss-ancient.name": ["Musgo antiguo", "Ancient moss"],
  "presets.moss-ancient.description": ["Verdes húmedos, liquen y piedra sombreada.", "Damp greens, lichen and shadowed stone."],
  "presets.clay-rose.name": ["Arcilla rosada", "Rose clay"],
  "presets.clay-rose.description": ["Terracota mate con una luz polvorienta.", "Matte terracotta with dusty light."],
  "presets.skin-sun.name": ["Piel cálida", "Warm skin"],
  "presets.skin-sun.description": ["Tonos de piel para personajes estilizados.", "Skin tones for stylized characters."],
  "presets.gold-polished.name": ["Oro pulido", "Polished gold"],
  "presets.gold-polished.description": ["Reflejos brillantes y sombra profunda de alto contraste.", "Bright highlights and a deep, high-contrast shadow."],
  "presets.copper-patina.name": ["Cobre pátina", "Patina copper"],
  "presets.copper-patina.description": ["Cobre oxidado con verdes minerales y luces de bronce.", "Oxidized copper with mineral greens and bronze highlights."],
  "presets.steel-cold.name": ["Acero frío", "Cold steel"],
  "presets.steel-cold.description": ["Metal cepillado con reflejos fríos y limpios.", "Brushed metal with cool, clean reflections."],
  "presets.volcanic-stone.name": ["Piedra volcánica", "Volcanic stone"],
  "presets.volcanic-stone.description": ["Basalto poroso, ceniza y vetas de lava apagada.", "Porous basalt, ash and muted lava veins."],
  "presets.ice-polar.name": ["Hielo polar", "Polar ice"],
  "presets.ice-polar.description": ["Cristal de hielo con núcleos turquesa.", "Ice crystal with turquoise cores."],
  "presets.crystal-prism.name": ["Cristal prismático", "Prismatic glass"],
  "presets.crystal-prism.description": ["Refracción iridiscente con destellos rosados.", "Iridescent refraction with rosy highlights."],
  "presets.arcane-elixir.name": ["Elixir arcano", "Arcane elixir"],
  "presets.arcane-elixir.description": ["Líquido mágico entre esmeralda y luz dorada.", "Magical liquid between emerald and golden light."],
  "presets.neon-synth.name": ["Neón sintético", "Synthetic neon"],
  "presets.neon-synth.description": ["Magenta eléctrico, violeta profundo y un golpe solar.", "Electric magenta, deep violet and a solar accent."],
  "presets.toon-cyan.name": ["Toon cian", "Cyan toon"],
  "presets.toon-cyan.description": ["Cuatro bandas planas para cel-shading limpio.", "Four flat bands for clean cel shading."],
  "presets.pop-arcade.name": ["Pop arcade", "Pop arcade"],
  "presets.pop-arcade.description": ["Posterización agresiva en clave rosa, amarillo y cian.", "Aggressive posterization in pink, yellow and cyan."],
  "presets.rose-silk.name": ["Seda carmesí", "Crimson silk"],
  "presets.rose-silk.description": ["Satén rosado con pliegues profundos y cálidos.", "Rose satin with deep, warm folds."],

  "demo.projectName": ["Paleta de Estudio", "Studio Palette"],

  "save.projectType": ["Proyecto RampForge", "RampForge project"],

  "toast.dismiss": ["Cerrar aviso", "Dismiss notification"],
  "toast.jsonSavedTitle": ["Archivo JSON guardado", "JSON file saved"],
  "toast.jsonSavedMessage": ["{filename} · ubicación elegida en el diálogo del sistema.", "{filename} · location chosen in the system dialog."],
  "toast.downloadStartedTitle": ["Descarga de proyecto iniciada", "Project download started"],
  "toast.downloadStartedMessage": ["{filename} va a la carpeta de descargas configurada en tu navegador.", "{filename} is being saved to your browser's download folder."],
  "toast.colorEmptyTitle": ["Atlas vacío", "Empty atlas"],
  "toast.colorEmptyMessage": ["Añade al menos una rampa para exportar el PNG.", "Add at least one ramp to export the PNG."],
  "toast.colorExportedTitle": ["PNG exportado", "PNG exported"],
  "toast.colorExportedMessage": ["{resolution} × {resolution} px · {size} · sRGB", "{resolution} × {resolution} px · {size} · sRGB"],
  "toast.exportErrorTitle": ["Error de exportación", "Export error"],
  "toast.colorExportErrorMessage": ["No se pudo generar el archivo PNG.", "The PNG file could not be generated."],
  "toast.maskEmptyTitle": ["Máscara vacía", "Empty mask"],
  "toast.maskEmptyMessage": ["Añade al menos una rampa para exportar la máscara PBR.", "Add at least one ramp to export the PBR mask."],
  "toast.maskExportedTitle": ["Máscara PBR exportada", "PBR mask exported"],
  "toast.maskExportedMessage": ["{width} × {height} · RGBA8 lineal · R rough / G metal / B emission / A opacity", "{width} × {height} · linear RGBA8 · R rough / G metal / B emission / A opacity"],
  "toast.maskErrorMessage": ["No se pudo generar la máscara PBR.", "The PBR mask could not be generated."],
  "toast.projectLoadedTitle": ["Proyecto cargado", "Project loaded"],
  "toast.projectLoadedMessage": ["{count} {rampWord} · {name}", "{count} {rampWord} · {name}"],
  "toast.invalidJsonTitle": ["JSON no válido", "Invalid JSON"],
  "toast.invalidJsonMessage": ["El archivo no contiene un proyecto RampForge reconocible.", "The file does not contain a recognizable RampForge project."],
  "toast.demoRestoredTitle": ["Demo restaurada", "Demo restored"],
  "toast.demoRestoredMessage": ["La paleta de estudio original está de vuelta.", "The original studio palette is back."],
  "toast.rampDeletedTitle": ["Rampa eliminada", "Ramp deleted"],
  "toast.rampDeletedMessage": ["“{name}” salió del atlas.", "“{name}” was removed from the atlas."],
  "toast.uvFreeTitle": ["Región UV libre", "Free UV region"],
  "toast.uvFreeMessage": ["Arrastra sobre el atlas para dibujar la región. Usa las esquinas para afinarla; amplía el atlas para más precisión.", "Drag on the atlas to draw the region. Use the corners to refine it; enlarge the atlas for more precision."],
  "toast.noAtlasTitle": ["Sin atlas", "No atlas"],
  "toast.noAtlasMessage": ["Añade al menos una rampa para definir la región UV del visor.", "Add at least one ramp to define the viewer UV region."],
  "toast.emissionClippedTitle": ["Emisión ajustada", "Emission adjusted"],
  "toast.emissionClippedMessage": ["Las emisiones superiores a {scale}× se han limitado a la nueva escala.", "Emissions above {scale}× were clamped to the new scale."],
  "toast.webglTitle": ["Visor 3D no disponible", "3D viewer unavailable"],
  "toast.webglMessage": ["La app funciona, pero este navegador no pudo iniciar WebGL.", "The app still works, but this browser could not start WebGL."],
  "toast.noRampTitle": ["Sin rampa activa", "No active ramp"],
  "toast.noRampMessage": ["Selecciona una rampa para aplicar una plantilla.", "Select a ramp to apply a template."],
  "confirm.restoreDemo": ["¿Restaurar el proyecto de demostración? Los cambios actuales se reemplazarán.", "Restore the demo project? Current changes will be replaced."],
};

let currentLanguage = detectInitialLanguage();

function isSupported(language) {
  return SUPPORTED_LANGUAGES.includes(language);
}

function detectInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // Private browsing or storage disabled.
  }
  const browserLanguage = (navigator.languages?.[0] || navigator.language || "es")
    .toLowerCase()
    .split("-")[0];
  return browserLanguage === "en" ? "en" : "es";
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  ));
}

export function getLanguage() {
  return currentLanguage;
}

export function getLocale() {
  return LOCALES[currentLanguage];
}

export function setLanguage(language) {
  if (!isSupported(language)) return currentLanguage;
  currentLanguage = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The language still applies to this session.
  }
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent("rampforge:languagechange", {
    detail: { language },
  }));
  return currentLanguage;
}

export function toggleLanguage() {
  return setLanguage(currentLanguage === "es" ? "en" : "es");
}

export function t(key, params = {}, fallback = null) {
  const message = MESSAGES[key];
  let value = message ? message[LANGUAGE_INDEX[currentLanguage]] : null;
  if (!value) value = message?.[0] ?? fallback ?? key;
  return interpolate(value, params);
}

export function tPlural(count, singularKey, pluralKey, params = {}) {
  return t(count === 1 ? singularKey : pluralKey, { count, ...params });
}

export function applyTranslations(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
}

export function initLanguage() {
  document.documentElement.lang = currentLanguage;
  applyTranslations(document);
}

export function translatePresetCategory(category) {
  const map = {
    Todos: "presets.categoryAll",
    Orgánico: "presets.categoryOrganic",
    Metálico: "presets.categoryMetallic",
    Mineral: "presets.categoryMineral",
    Fantasía: "presets.categoryFantasy",
    Estilizado: "presets.categoryStylized",
    Personalizados: "presets.categoryCustom",
  };
  return t(map[category] || "presets.categoryAll");
}

export function getPresetNameVariants(id) {
  const message = MESSAGES[`presets.${id}.name`];
  return message ? [...new Set(message.filter(Boolean))] : [];
}

export function translatePreset(preset) {
  return {
    ...preset,
    name: t(`presets.${preset.id}.name`, {}, preset.name),
    description: t(`presets.${preset.id}.description`, {}, preset.description),
    categoryLabel: translatePresetCategory(preset.category),
  };
}
