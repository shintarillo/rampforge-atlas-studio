import {
  adjustedHex,
  clamp,
  deepClone,
  downloadBlob,
  escapeHTML,
  formatBytes,
  formatSigned,
  getLargestGap,
  icon,
  normalizeHex,
  pad2,
  rgbaToPngBlob,
  slugify,
} from "./utils.js";
import {
  EMISSION_SCALES,
  PBR_MASK_SIZES,
  buildProjectPayload,
  cloneStrip,
  createBlankStrip,
  createDefaultProject,
  makeStop,
  normalizePbr,
  normalizeProject,
  stripFromPreset,
} from "./project.js";
import { PRESET_CATEGORIES, RAMPS_PRESETS, getPreset } from "./presets.js";
import {
  CUSTOM_PRESET_CATEGORY,
  MAX_USER_PRESETS,
  createUserPreset,
  loadUserPresets,
  persistUserPresets,
} from "./user-presets.js";
import {
  MAX_ATLAS_COLUMNS,
  createPbrMaskData,
  getBandHeightForStrip,
  getBandMetrics,
  getEffectiveAtlasColumns,
  paintCanvasFromCanvas,
  renderAtlasToCanvas,
  renderPbrMaskToCanvas,
  renderRampToCanvas,
  sampleStripColor,
} from "./atlas.js";
import { ThreePreview } from "./three-viewer.js";
import {
  applyTranslations,
  getLanguage,
  getLocale,
  getPresetNameVariants,
  initLanguage,
  t,
  tPlural,
  toggleLanguage,
  translatePreset,
  translatePresetCategory,
} from "./i18n.js";

const STORAGE_KEY = "rampforge.atlas.project.v1";
const DEFAULT_LIGHT = Object.freeze({ intensity: 3.2, azimuth: -35, elevation: 48 });
const DEFAULT_ADJUST = Object.freeze({
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  warmth: 0,
  tint: 0,
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const els = {
  projectName: $("#project-name"),
  saveState: $("#save-state"),
  saveLabel: $("#save-label"),
  btnLanguage: $("#btn-language"),
  languageLabel: $("#language-label"),
  metaDescription: $("#meta-description"),
  sizeSwitcher: $("#size-switcher"),
  columnsSwitcher: $("#columns-switcher"),
  columnsActive: $("#columns-active"),
  columnsHint: $("#columns-hint"),
  rampList: $("#ramp-list"),
  rampCount: $("#ramp-count"),
  emptyLibrary: $("#empty-library"),
  factResolution: $("#fact-resolution"),
  factSize: $("#fact-size"),
  libraryPanel: $("#library-panel"),
  inspectorPanel: $("#inspector-panel"),
  inspectorScroll: $("#inspector-scroll"),
  inspectorContent: $("#inspector-content"),
  inspectorTabs: $$(".inspector-tab"),
  globalIndicator: $("#global-indicator"),
  viewport: $("#viewport"),
  threeCanvas: $("#three-canvas"),
  viewerLoader: $("#viewer-loader"),
  webglFallback: $("#webgl-fallback"),
  meshTabs: $("#mesh-tabs"),
  currentMeshLabel: $("#current-mesh-label"),
  shadingSwitcher: $("#shading-switcher"),
  btnAutoRotate: $("#btn-autorotate"),
  btnResetView: $("#btn-reset-view"),
  orbitHint: $("#orbit-hint"),
  atlasCanvas: $("#atlas-canvas"),
  atlasVisual: $("#atlas-visual"),
  atlasCardMeta: $("#atlas-card-meta"),
  atlasSizeTag: $("#atlas-size-tag"),
  atlasCornerTag: $("#atlas-corner-tag"),
  atlasEmpty: $("#atlas-empty"),
  atlasStats: $("#atlas-stats"),
  statRamps: $("#stat-ramps"),
  statResolution: $("#stat-resolution"),
  viewportUvPill: $("#viewport-uv-pill"),
  viewportUvLabel: $("#viewport-uv-label"),
  btnExportAtlas: $("#btn-export-atlas"),
  btnExportAtlasModal: $("#btn-export-atlas-modal"),
  btnExportPbrAtlas: $("#btn-export-pbr-atlas"),
  btnSave: $("#btn-save"),
  btnImport: $("#btn-import"),
  importFile: $("#import-file"),
  btnAddRamp: $("#btn-add-ramp"),
  btnOpenPresets: $("#btn-open-presets"),
  btnExpandAtlas: $("#btn-expand-atlas"),
  btnExpandAtlas2: $("#btn-expand-atlas-2"),
  btnResetProject: $("#btn-reset-project"),
  presetModal: $("#preset-modal"),
  presetFilters: $("#preset-filters"),
  presetGrid: $("#preset-grid"),
  presetCount: $("#preset-count"),
  presetStatus: $("#preset-status"),
  presetSubtitle: $("#preset-modal-subtitle"),
  presetSavebar: $("#preset-savebar"),
  presetNameInput: $("#preset-name-input"),
  presetDescriptionInput: $("#preset-description-input"),
  btnSaveCurrentPreset: $("#btn-save-current-preset"),
  btnConfirmSavePreset: $("#btn-confirm-save-preset"),
  btnCancelSavePreset: $("#btn-cancel-save-preset"),
  atlasModal: $("#atlas-modal"),
  atlasModalMeta: $("#atlas-modal-meta"),
  atlasModalCanvas: $("#atlas-modal-canvas"),
  toastStack: $("#toast-stack"),
  backdrop: $("#drawer-backdrop"),
  lightIntensity: $("#light-intensity"),
  lightAzimuth: $("#light-azimuth"),
  lightElevation: $("#light-elevation"),
  lightIntensityValue: $("#light-intensity-value"),
  lightAzimuthValue: $("#light-azimuth-value"),
  lightElevationValue: $("#light-elevation-value"),
  btnResetLight: $("#btn-reset-light"),
  btnMobileLibrary: $("#btn-mobile-library"),
  btnMobileInspector: $("#btn-mobile-inspector"),
};

const appState = {
  project: null,
  selectedStripId: null,
  selectedStopId: null,
  inspectorTab: "ramp",
  inspectorScrollPositions: { ramp: 0, pbr: 0, global: 0 },
  presetCategory: "Todos",
  userPresets: [],
  mesh: "cube",
  shading: "pbr",
  autoRotate: false,
  light: { ...DEFAULT_LIGHT },
  uvMode: "ramp",
  uvCustom: null,
  uvRegion: null,
  uvDrag: null,
  uvHintShown: false,
  pbrChannelView: "rgba",
  stopDrag: null,
  curveDrag: null,
  paletteFrame: null,
  pbrFrame: null,
  saveTimer: null,
  isExporting: false,
  isPbrExporting: false,
  isSavingFile: false,
  isAutosaving: false,
  autosaveError: false,
};

let viewer = null;
let pbrMaskCanvas = null;
let toastId = 0;
let presetStatusTimer = null;

const MESH_LABEL_KEYS = {
  cube: "viewer.meshCubeTitle",
  sphere: "viewer.meshSphereTitle",
  cylinder: "viewer.meshCylinderTitle",
  plane: "viewer.meshPlaneTitle",
};

function meshLabel(type) {
  return t(MESH_LABEL_KEYS[type] || MESH_LABEL_KEYS.cube);
}

/* =========================================================
   Boot & project state
   ========================================================= */
function readStoredProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeProject(JSON.parse(raw));
  } catch (error) {
    console.warn("Could not restore the local project.", error);
    return null;
  }
}

function activeStrip() {
  return appState.project?.strips.find((strip) => strip.id === appState.selectedStripId) || null;
}

function findStop(strip, id) {
  return strip?.stops.find((stop) => stop.id === id) || null;
}

function sortedStops(strip) {
  return [...(strip?.stops || [])].sort((a, b) => a.pos - b.pos);
}

function interestingStop(strip) {
  const stops = sortedStops(strip);
  if (stops.length === 0) return null;
  return stops[Math.floor((stops.length - 1) / 2)] || stops[0];
}

function ensureSelections() {
  if (!appState.project) return;
  const strips = appState.project.strips;
  if (strips.length === 0) {
    appState.selectedStripId = null;
    appState.selectedStopId = null;
    return;
  }

  if (!strips.some((strip) => strip.id === appState.selectedStripId)) {
    appState.selectedStripId = strips[0].id;
    appState.selectedStopId = interestingStop(strips[0])?.id || null;
  }

  const strip = activeStrip();
  if (!strip) return;
  if (!strip.stops.some((stop) => stop.id === appState.selectedStopId)) {
    appState.selectedStopId = interestingStop(strip)?.id || slideFirstStop(strip);
  }
}

function slideFirstStop(strip) {
  return sortedStops(strip)[0]?.id || null;
}

function commitProjectName(value, { save = true } = {}) {
  const name = String(value || "").trim().slice(0, 64) || t("app.untitledProject");
  appState.project.name = name;
  document.title = `RampForge — ${name}`;
  if (els.projectName.value !== name && document.activeElement !== els.projectName) {
    els.projectName.value = name;
  }
  if (save) queueAutosave();
}

function setProject(project, { selectFirst = true, save = true } = {}) {
  appState.project = normalizeProject(project);
  const presetNamesChanged = localizePresetRampNames();
  appState.inspectorTab = "ramp";
  appState.uvMode = "ramp";
  appState.uvCustom = null;
  appState.uvHintShown = false;
  if (selectFirst && appState.project.strips.length > 0) {
    appState.selectedStripId = appState.project.strips[0].id;
    appState.selectedStopId = interestingStop(appState.project.strips[0])?.id || null;
  } else {
    appState.selectedStripId = null;
    appState.selectedStopId = null;
  }
  ensureSelections();
  renderAll();
  if (save || presetNamesChanged) queueAutosave();
}

/* =========================================================
   Main render
   ========================================================= */
function renderAll() {
  if (!appState.project) return;
  ensureSelections();
  if (document.activeElement !== els.projectName) {
    els.projectName.value = appState.project.name;
  }
  document.title = `RampForge — ${appState.project.name}`;
  updateSizeSwitcher();
  updateColumnsControl();
  renderRampList();
  renderInspector({ preserveScroll: false });
  updateGlobalIndicator();
  updateAtlasMeta();
  refreshAtlas();
}

function updateSizeSwitcher() {
  $$(".size-switcher button", els.sizeSwitcher).forEach((button) => {
    const active = Number(button.dataset.size) === appState.project.atlasSize;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateColumnsControl() {
  const strips = appState.project.strips;
  const requested = clamp(Math.round(Number(appState.project.atlasColumns) || 1), 1, MAX_ATLAS_COLUMNS);
  const active = getEffectiveAtlasColumns(appState.project);

  $$("[data-columns]", els.columnsSwitcher).forEach((button) => {
    const value = Number(button.dataset.columns);
    const isActive = value === requested;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.title = value === 1
      ? t("sidebar.columnTitleOne")
      : t("sidebar.columnTitleMany", { count: value });
  });

  if (strips.length === 0) {
    els.columnsActive.textContent = t("sidebar.columnsNoRamps");
    els.columnsHint.textContent = t("sidebar.columnsHintEmpty");
  } else if (active < requested) {
    els.columnsActive.textContent = t("sidebar.columnsPartial", { active, requested });
    els.columnsHint.textContent = t("sidebar.columnsHintInsufficient", { active, requested });
  } else {
    els.columnsActive.textContent = t(active === 1 ? "sidebar.columnsActiveOne" : "sidebar.columnsActiveMany", { count: active });
    els.columnsHint.textContent = active === 1
      ? t("sidebar.columnsHintSingle")
      : t("sidebar.columnsHintMany");
  }
}

function renderRampList() {
  const strips = appState.project.strips;
  const metrics = getBandMetrics(appState.project);
  const metricMap = new Map(metrics.map((metric) => [metric.id, metric]));
  const activeColumns = getEffectiveAtlasColumns(appState.project);
  els.rampCount.textContent = String(strips.length);
  els.emptyLibrary.hidden = strips.length > 0;
  els.btnOpenPresets.disabled = strips.length === 0;

  els.rampList.innerHTML = strips
    .map((strip, index) => {
      const metric = metricMap.get(strip.id) || { width: 0, height: 0, column: 0, percentage: 0 };
      const selected = strip.id === appState.selectedStripId;
      const orientationIcon = strip.orientation === "vertical" ? "arrow-downline" : "arrow-right";
      const orientationLabel = strip.orientation === "vertical" ? t("ramp.vertical") : t("ramp.horizontal");
      const dimensionLabel = `${metric.width}×${metric.height}px`;
      const columnLabel = activeColumns > 1 ? ` · C${(metric.column || 0) + 1}` : "";
      const columnAria = activeColumns > 1
        ? t("ramp.itemColumnAria", { column: (metric.column || 0) + 1, columns: activeColumns })
        : "";
      const columnTitle = activeColumns > 1
        ? t("ramp.itemColumnTitle", { column: (metric.column || 0) + 1, columns: activeColumns })
        : "";
      return `
        <div class="ramp-item${selected ? " is-selected" : ""}"
          role="button"
          tabindex="0"
          draggable="true"
          aria-pressed="${selected ? "true" : "false"}"
          aria-label="${escapeHTML(strip.name)}, ${orientationLabel}, ${dimensionLabel}${columnAria}"
          data-strip-id="${escapeHTML(strip.id)}"
          title="${orientationLabel}${columnTitle} · ${dimensionLabel}">
          <span class="ramp-item__grip" aria-hidden="true">${icon("grip")}</span>
          <span class="ramp-item__thumb"><canvas width="74" height="74" data-strip-swatch="${escapeHTML(strip.id)}"></canvas></span>
          <span class="ramp-item__body">
            <span class="ramp-item__name">${escapeHTML(strip.name)}</span>
            <span class="ramp-item__meta">${icon(orientationIcon)}<span>${dimensionLabel}${columnLabel}</span></span>
          </span>
          <span class="ramp-item__order">${pad2(index + 1)}</span>
        </div>`;
    })
    .join("");

  $$("[data-strip-swatch]", els.rampList).forEach((canvas) => {
    const strip = strips.find((item) => item.id === canvas.dataset.stripSwatch);
    if (strip) {
      renderRampToCanvas(canvas, strip, appState.project.globalAdjust, {
        width: 74,
        height: 74,
      });
    }
  });
}

function syncRampThumbnails() {
  $$("[data-strip-swatch]", els.rampList).forEach((canvas) => {
    const strip = appState.project.strips.find((item) => item.id === canvas.dataset.stripSwatch);
    if (strip) {
      renderRampToCanvas(canvas, strip, appState.project.globalAdjust, {
        width: 74,
        height: 74,
      });
    }
  });
}

/* =========================================================
   UV preview region
   ========================================================= */
const FULL_UV_REGION = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const MIN_UV_SIZE = 0.012;

function normalizeUvRegion(region, fallback = FULL_UV_REGION) {
  const source = region && typeof region === "object" ? region : fallback;
  const read = (value, fallbackValue) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallbackValue;
  };
  const width = clamp(read(source.width, fallback.width), MIN_UV_SIZE, 1);
  const height = clamp(read(source.height, fallback.height), MIN_UV_SIZE, 1);
  return {
    x: clamp(read(source.x, fallback.x), 0, 1 - width),
    y: clamp(read(source.y, fallback.y), 0, 1 - height),
    width,
    height,
  };
}

function activeRampUvRegion() {
  const strip = activeStrip();
  if (!strip) return null;
  const metric = getBandMetrics(appState.project).find((band) => band.id === strip.id);
  if (!metric || metric.width <= 0 || metric.height <= 0) return null;
  const size = appState.project.atlasSize;
  return normalizeUvRegion({
    x: metric.left / size,
    y: metric.top / size,
    width: metric.width / size,
    height: metric.height / size,
  });
}

function resolvedUvRegion() {
  if (appState.uvMode === "ramp") {
    return activeRampUvRegion() || { ...FULL_UV_REGION };
  }
  if (appState.uvMode === "custom") {
    return normalizeUvRegion(
      appState.uvCustom || activeRampUvRegion() || { x: 0.12, y: 0.12, width: 0.76, height: 0.76 },
    );
  }
  return { ...FULL_UV_REGION };
}

function uvRegionSummary(region) {
  return `${Math.round(region.width * 100)}% × ${Math.round(region.height * 100)}%`;
}

function updateUvPreview() {
  const hasStrips = appState.project.strips.length > 0;
  if (!hasStrips) {
    appState.uvMode = "full";
  } else if (appState.uvMode === "custom" && !appState.uvCustom) {
    appState.uvCustom = activeRampUvRegion() || { x: 0.12, y: 0.12, width: 0.76, height: 0.76 };
  }

  const region = resolvedUvRegion();
  appState.uvRegion = region;
  viewer?.setUvRegion(region);

  $$("[data-uv-mode]").forEach((button) => {
    const mode = button.dataset.uvMode;
    const disabled = !hasStrips && mode !== "full";
    button.disabled = disabled;
    button.classList.toggle("is-active", mode === appState.uvMode);
    button.setAttribute("aria-pressed", mode === appState.uvMode ? "true" : "false");
    if (mode === "ramp") {
      const strip = activeStrip();
      button.title = hasStrips && strip
        ? t("atlas.modeRampTitleNamed", { name: strip.name })
        : t("atlas.modeRampTitle");
    }
  });

  const summary = uvRegionSummary(region);
  const position = `x ${Math.round(region.x * 100)}% · y ${Math.round(region.y * 100)}%`;
  const rampStrip = activeStrip();
  $$("[data-uv-overlay]").forEach((overlay) => {
    const visible = hasStrips && appState.uvMode !== "full";
    const editing = appState.uvMode === "custom";
    overlay.hidden = !visible;
    overlay.classList.toggle("is-editing", editing);
    overlay.classList.toggle("is-ramp", appState.uvMode === "ramp");
    const host = overlay.closest("[data-uv-host]");
    host?.classList.toggle("is-uv-editing", editing);
    const selection = overlay.querySelector("[data-uv-selection]");
    if (!selection) return;
    selection.style.left = `${region.x * 100}%`;
    selection.style.top = `${region.y * 100}%`;
    selection.style.width = `${region.width * 100}%`;
    selection.style.height = `${region.height * 100}%`;
    const label = appState.uvMode === "ramp" ? t("atlas.uvSelectionRamp") : "UV";
    const labelNode = selection.querySelector(".uv-selection__label");
    if (labelNode) labelNode.textContent = label;
    const overlayTitle = t("atlas.uvRegionTitle", { summary, position });
    overlay.title = overlayTitle;
    selection.title = overlayTitle;
  });

  if (els.viewportUvLabel && els.viewportUvPill) {
    let label = t("atlas.uvPillFull");
    if (!hasStrips) {
      label = t("atlas.uvPillNone");
    } else if (appState.uvMode === "ramp" && rampStrip) {
      label = t("atlas.uvPillRamp", { name: rampStrip.name });
    } else if (appState.uvMode === "ramp") {
      label = t("atlas.uvPillRampFallback");
    } else if (appState.uvMode === "custom") {
      label = t("atlas.uvPillFree", { summary });
    }
    els.viewportUvLabel.textContent = label;
    els.viewportUvPill.classList.toggle("is-active", hasStrips && appState.uvMode !== "full");
    els.viewportUvPill.title = hasStrips
      ? t("atlas.uvPillTitle", { summary, position })
      : t("atlas.uvPillNoAtlasTitle");
  }

  if (els.atlasModal.open) {
    const activeColumns = getEffectiveAtlasColumns(appState.project);
    const columnMeta = activeColumns > 1 ? t("atlas.columnMeta", { count: activeColumns }) : "";
    const modeLabel = appState.uvMode === "full"
      ? t("atlas.modeLabelFull")
      : appState.uvMode === "ramp"
        ? t("atlas.modeLabelRamp")
        : t("atlas.modeLabelFree", { summary });
    const resolution = `${appState.project.atlasSize} × ${appState.project.atlasSize}`;
    els.atlasModalMeta.textContent = t("atlas.modalMetaUv", { resolution, columns: columnMeta, mode: modeLabel });
  }
}

function setUvMode(mode) {
  if (!["full", "ramp", "custom"].includes(mode)) return;
  const hasStrips = appState.project.strips.length > 0;
  if (!hasStrips && mode !== "full") {
    showToast({
      type: "error",
      title: t("toast.noAtlasTitle"),
      message: t("toast.noAtlasMessage"),
    });
    return;
  }

  if (mode === "custom") {
    if (appState.uvMode === "ramp" || !appState.uvCustom) {
      appState.uvCustom = activeRampUvRegion() || { ...FULL_UV_REGION };
    }
    if (!appState.uvHintShown) {
      appState.uvHintShown = true;
      showToast({
        type: "info",
        title: t("toast.uvFreeTitle"),
        message: t("toast.uvFreeMessage"),
        duration: 5600,
      });
    }
  }

  appState.uvMode = mode;
  updateUvPreview();
}

function normalizeUvPoint(event, overlay) {
  const bounds = overlay.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1),
    y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0, 1),
  };
}

function startUvRegionDrag(event, overlay) {
  if (appState.uvDrag) return;
  if (appState.uvMode !== "custom" || appState.project.strips.length === 0) return;
  if (event.button !== undefined && event.button !== 0) return;
  const selection = overlay.querySelector("[data-uv-selection]");
  if (!selection) return;
  event.preventDefault();
  event.stopPropagation();

  const handle = event.target.closest("[data-uv-handle]")?.dataset.uvHandle || null;
  const insideSelection = Boolean(event.target.closest("[data-uv-selection]"));
  const action = handle ? "resize" : insideSelection ? "move" : "draw";
  const start = normalizeUvPoint(event, overlay);
  const initial = normalizeUvRegion(appState.uvRegion || appState.uvCustom || FULL_UV_REGION);

  appState.uvDrag = {
    overlay,
    action,
    handle,
    start,
    initial,
    moved: false,
    pointerId: event.pointerId,
  };
  window.addEventListener("pointermove", handleUvRegionDrag);
  window.addEventListener("pointerup", finishUvRegionDrag, { once: true });
  window.addEventListener("pointercancel", finishUvRegionDrag, { once: true });
}

function handleUvRegionDrag(event) {
  const drag = appState.uvDrag;
  if (!drag) return;
  if (event.pointerId !== drag.pointerId) return;
  event.preventDefault();
  const point = normalizeUvPoint(event, drag.overlay);
  const dx = point.x - drag.start.x;
  const dy = point.y - drag.start.y;
  if (Math.hypot(dx, dy) > 0.002) drag.moved = true;

  let next = { ...drag.initial };

  if (drag.action === "move") {
    if (!drag.moved) return;
    next.x = clamp(drag.initial.x + dx, 0, 1 - drag.initial.width);
    next.y = clamp(drag.initial.y + dy, 0, 1 - drag.initial.height);
  } else if (drag.action === "resize") {
    if (!drag.moved) return;
    const handle = drag.handle || "se";
    const initial = drag.initial;
    let left = initial.x;
    let top = initial.y;
    let right = initial.x + initial.width;
    let bottom = initial.y + initial.height;

    if (handle.includes("w")) left = clamp(initial.x + dx, 0, right - MIN_UV_SIZE);
    if (handle.includes("e")) right = clamp(initial.x + initial.width + dx, left + MIN_UV_SIZE, 1);
    if (handle.includes("n")) top = clamp(initial.y + dy, 0, bottom - MIN_UV_SIZE);
    if (handle.includes("s")) bottom = clamp(initial.y + initial.height + dy, top + MIN_UV_SIZE, 1);

    next = { x: left, y: top, width: right - left, height: bottom - top };
  } else {
    if (!drag.moved) return;
    const left = Math.min(drag.start.x, point.x);
    const right = Math.max(drag.start.x, point.x);
    const top = Math.min(drag.start.y, point.y);
    const bottom = Math.max(drag.start.y, point.y);
    if (right - left < MIN_UV_SIZE || bottom - top < MIN_UV_SIZE) return;
    next = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  appState.uvCustom = normalizeUvRegion(next);
  updateUvPreview();
}

function finishUvRegionDrag() {
  window.removeEventListener("pointermove", handleUvRegionDrag);
  window.removeEventListener("pointerup", finishUvRegionDrag);
  window.removeEventListener("pointercancel", finishUvRegionDrag);
  appState.uvDrag = null;
}

function updateGlobalIndicator() {
  const grade = appState.project?.globalAdjust || DEFAULT_ADJUST;
  const isAdjusted = Object.keys(DEFAULT_ADJUST).some((key) => Number(grade[key]) !== 0);
  els.globalIndicator.hidden = !isAdjusted;
}

function updateAtlasMeta() {
  const project = appState.project;
  const size = project.atlasSize;
  const hasStrips = project.strips.length > 0;
  const activeColumns = getEffectiveAtlasColumns(project);
  const rampCount = project.strips.length;
  const ramps = String(rampCount);
  const rampsLabel = tPlural(rampCount, "atlas.rampOne", "atlas.rampMany", { count: rampCount });
  const resolution = `${size} × ${size}`;
  const memory = formatBytes(size * size * 4);
  const columnMeta = activeColumns > 1 ? t("atlas.columnMeta", { count: activeColumns }) : "";

  els.factResolution.textContent = resolution;
  els.factSize.textContent = `~${memory} RGBA`;
  els.atlasCardMeta.textContent = `${resolution} px · ${rampsLabel}${columnMeta}`;
  els.atlasSizeTag.textContent = `${size}²`;
  els.atlasCornerTag.textContent = `${size} × ${size}`;
  els.statRamps.textContent = ramps;
  els.statResolution.textContent = `${size}²`;
  els.atlasEmpty.hidden = hasStrips;
  els.atlasModalMeta.textContent = `${t("atlas.modalMeta", { resolution })}${columnMeta}`;
  [els.btnExportAtlas, els.btnExportAtlasModal].forEach((button) => {
    if (button) button.disabled = !hasStrips || appState.isExporting;
  });
  if (els.btnExportPbrAtlas) {
    els.btnExportPbrAtlas.disabled = !hasStrips || appState.isPbrExporting;
  }
  els.atlasCanvas.setAttribute("aria-label", t("atlas.canvasAria", { ramps: rampsLabel, resolution }));
  els.atlasModalCanvas.setAttribute("aria-label", t("atlas.modalCanvasAria", { resolution }));
}

function refreshAtlas() {
  if (!appState.project) return;
  const hasStrips = appState.project.strips.length > 0;
  renderAtlasToCanvas(els.atlasCanvas, appState.project);
  updateAtlasMeta();
  viewer?.refreshTexture(hasStrips);
  updateUvPreview();
  refreshPbrMask();
  if (els.atlasModal.open) {
    paintCanvasFromCanvas(els.atlasModalCanvas, els.atlasCanvas);
  }
}

function ensurePbrMaskCanvas() {
  if (!pbrMaskCanvas) pbrMaskCanvas = document.createElement("canvas");
  return pbrMaskCanvas;
}

function refreshPbrMask() {
  if (!appState.project) return;
  const hasStrips = appState.project.strips.length > 0;
  const canvas = ensurePbrMaskCanvas();
  const emissionScale = appState.project.emissionScale;
  renderPbrMaskToCanvas(canvas, appState.project, {
    size: appState.project.pbrMaskSize,
    view: "raw",
  });

  const hasAlpha = appState.project.strips.some((strip) => {
    const opacity = Number.isFinite(Number(strip.pbr?.opacity))
      ? Number(strip.pbr.opacity)
      : 1;
    return opacity < 0.999;
  });
  viewer?.setPbrMask(canvas, {
    enabled: hasStrips,
    emissionScale,
    hasAlpha,
  });

  if (appState.inspectorTab === "pbr") {
    drawPbrPreview();
  }
}

function schedulePbrRefresh() {
  if (appState.pbrFrame) return;
  appState.pbrFrame = requestAnimationFrame(() => {
    appState.pbrFrame = null;
    refreshPbrMask();
  });
}

function schedulePaletteRefresh() {
  if (appState.paletteFrame) return;
  appState.paletteFrame = requestAnimationFrame(() => {
    appState.paletteFrame = null;
    refreshAtlas();
    syncRampThumbnails();
    if (els.atlasModal.open) {
      paintCanvasFromCanvas(els.atlasModalCanvas, els.atlasCanvas);
    }
  });
}

function pushPaletteChange() {
  schedulePaletteRefresh();
  queueAutosave();
}

/* =========================================================
   Inspector rendering
   ========================================================= */
function setInspectorTab(tab) {
  if (!["ramp", "pbr", "global"].includes(tab) || tab === appState.inspectorTab) return;
  appState.inspectorScrollPositions[appState.inspectorTab] = els.inspectorScroll.scrollTop;
  appState.inspectorTab = tab;
  renderInspector({ preserveScroll: false });
  els.inspectorScroll.scrollTop = appState.inspectorScrollPositions[tab] || 0;
}

function renderInspector({ preserveScroll = true } = {}) {
  const scrollTop = preserveScroll ? els.inspectorScroll.scrollTop : 0;
  ensureInspectorTab();
  els.inspectorTabs.forEach((button) => {
    const active = button.dataset.tab === appState.inspectorTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  if (appState.inspectorTab === "global") {
    renderGlobalTab();
  } else if (appState.inspectorTab === "pbr") {
    renderPbrTab();
  } else {
    renderRampTab();
  }

  els.inspectorScroll.scrollTop = scrollTop;
  syncRangeFills(els.inspectorContent);
  updateGlobalIndicator();
}

function ensureInspectorTab() {
  if (!["ramp", "pbr", "global"].includes(appState.inspectorTab)) {
    appState.inspectorTab = "ramp";
  }
}

function rampTabMarkup(strip) {
  const project = appState.project;
  const stripIndex = project.strips.findIndex((item) => item.id === strip.id);
  const stops = sortedStops(strip);
  if (!stops.some((stop) => stop.id === appState.selectedStopId)) {
    appState.selectedStopId = stops[Math.floor((stops.length - 1) / 2)]?.id || stops[0]?.id || null;
  }
  const selectedStop = findStop(strip, appState.selectedStopId) || stops[0];
  const selectedIndex = stops.findIndex((stop) => stop.id === selectedStop?.id);
  const metric = getBandMetrics(project).find((band) => band.id === strip.id);
  const activeColumns = getEffectiveAtlasColumns(project);
  const columnNumber = (metric?.column || 0) + 1;
  const percentage = Math.round(metric?.percentage || 0);
  const pixelWidth = metric?.width || project.atlasSize;
  const pixelHeight = metric?.height || getBandHeightForStrip(project, strip.id);
  const markers = stops
    .map((stop, index) => {
      const selected = stop.id === selectedStop?.id;
      const color = adjustedHex(stop.color, project.globalAdjust);
      return `<button type="button"
        class="stop-marker${selected ? " is-selected" : ""}"
        style="left:${(stop.pos * 100).toFixed(3)}%; --stop-color:${color}"
        data-stop-id="${escapeHTML(stop.id)}"
        title="${t("ramp.stopMarker", { index: index + 1, percentage: Math.round(stop.pos * 100) })}"
        aria-label="${t("ramp.stopAria", { index: index + 1, color: stop.color, percentage: Math.round(stop.pos * 100) })}"></button>`;
    })
    .join("");

  const interpolationButtons = [
    ["linear", t("ramp.interpLinear")],
    ["smooth", t("ramp.interpSmooth")],
    ["steps", t("ramp.interpSteps")],
  ]
    .map(
      ([value, label]) =>
        `<button type="button" data-interpolation="${value}" class="${strip.interpolation === value ? "is-active" : ""}" aria-pressed="${strip.interpolation === value}">${label}</button>`,
    )
    .join("");

  let modeExtra = "";
  if (strip.interpolation === "linear") {
    modeExtra = `
      <div class="control-note">
        ${icon("arrow-right")}
        <span>${t("ramp.linearNote")}</span>
      </div>`;
  } else if (strip.interpolation === "steps") {
    modeExtra = `
      <div class="slider-field" style="margin-top:11px">
        <div class="slider-field__head">
          <span>${t("ramp.steps")}</span>
          <output id="steps-value">${strip.steps}</output>
        </div>
        <input class="range" id="strip-steps" type="range" min="2" max="16" step="1" value="${strip.steps}" data-step-count="true" aria-label="${t("ramp.stepsAria")}">
      </div>
      <div class="control-note">
        ${icon("grid")}
        <span>${t("ramp.stepsNote", { count: strip.steps })}</span>
      </div>`;
  } else {
    modeExtra = `
      <div class="curve-panel">
        <div class="curve-panel__head">
          <span>${t("ramp.curveHead")}</span>
          <button type="button" data-action="reset-curve" title="${t("ramp.resetCurve")}">${icon("reset")} ${t("ramp.resetCurveLabel")}</button>
        </div>
        <div class="curve-canvas-wrap">
          <canvas id="curve-canvas" width="600" height="200" aria-label="${t("ramp.curveAria")}"></canvas>
        </div>
        <div class="curve-panel__values">
          <span>${t("ramp.curveIn")} <strong data-curve-value="in">${Number(strip.curve.in).toFixed(2)}</strong></span>
          <span>Bézier</span>
          <span>${t("ramp.curveOut")} <strong data-curve-value="out">${Number(strip.curve.out).toFixed(2)}</strong></span>
        </div>
      </div>`;
  }

  const interpolationLabel = strip.interpolation === "smooth"
    ? t("ramp.modeSmooth")
    : strip.interpolation === "steps"
      ? t("ramp.modeSteps")
      : t("ramp.modeLinear");

  return `
    <div class="ramp-overview">
      <div class="ramp-overview__title">
        <span class="eyebrow">${t("ramp.counter", { index: pad2(stripIndex + 1), total: pad2(project.strips.length) })}</span>
        <h2 id="ramp-title-text">${escapeHTML(strip.name)}</h2>
      </div>
      <div class="ramp-overview__actions">
        <button class="icon-btn" type="button" data-ramp-action="move-up" title="${t("ramp.moveUp")}" aria-label="${t("ramp.moveUpAria")}" ${stripIndex === 0 ? "disabled" : ""}>${icon("arrow-up")}</button>
        <button class="icon-btn" type="button" data-ramp-action="move-down" title="${t("ramp.moveDown")}" aria-label="${t("ramp.moveDownAria")}" ${stripIndex === project.strips.length - 1 ? "disabled" : ""}>${icon("arrow-down")}</button>
        <button class="icon-btn" type="button" data-ramp-action="duplicate" title="${t("ramp.duplicate")}" aria-label="${t("ramp.duplicate")}">${icon("copy")}</button>
        <button class="icon-btn icon-btn--danger" type="button" data-ramp-action="delete" title="${t("ramp.delete")}" aria-label="${t("ramp.delete")}">${icon("trash")}</button>
      </div>
    </div>

    <div class="ramp-form">
      <label class="field">
        <span class="field__label">${t("ramp.name")}</span>
        <input class="text-input" id="ramp-name" type="text" maxlength="48" autocomplete="off" spellcheck="false" value="${escapeHTML(strip.name)}">
      </label>
      <div class="field">
        <span class="field__label">${t("ramp.direction")} <small class="control-micro">${t("ramp.inAtlas")}</small></span>
        <div class="segmented orientation-switch" role="group" aria-label="${t("ramp.directionAria")}">
          <button type="button" data-orientation="horizontal" class="${strip.orientation === "horizontal" ? "is-active" : ""}" aria-pressed="${strip.orientation === "horizontal"}">
            ${icon("arrow-right")} ${t("ramp.horizontal")}
          </button>
          <button type="button" data-orientation="vertical" class="${strip.orientation === "vertical" ? "is-active" : ""}" aria-pressed="${strip.orientation === "vertical"}">
            ${icon("arrow-downline")} ${t("ramp.vertical")}
          </button>
        </div>
      </div>
    </div>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title"><strong>${t("ramp.gradient")}</strong><small>${t("ramp.stops", { count: stops.length })}</small></div>
        <span class="control-micro">${icon("mouse")} ${t("ramp.editNodes")}</span>
      </div>
      <div class="gradient-editor">
        <div class="gradient-preview">
          <canvas id="ramp-gradient" width="640" height="72"></canvas>
        </div>
        <div class="stop-track" id="stop-track">${markers}</div>

        <div class="stop-editor">
          <div class="stop-editor__head">
            <span>${t("ramp.selectedStop")}</span>
            <span>${pad2(selectedIndex + 1)} / ${pad2(stops.length)}</span>
          </div>
          <div class="stop-color-row">
            <label class="color-picker-shell" id="stop-color-shell" style="--picked-color:${selectedStop ? selectedStop.color : "#ffffff"}" title="${t("ramp.chooseColor")}">
              <input id="stop-color" type="color" value="${selectedStop ? selectedStop.color : "#ffffff"}" aria-label="${t("ramp.colorAria")}">
            </label>
            <input class="hex-field" id="stop-hex" type="text" value="${selectedStop ? selectedStop.color : "#ffffff"}" maxlength="7" autocomplete="off" spellcheck="false" aria-label="${t("ramp.hexAria")}">
            <button class="icon-btn icon-btn--danger" type="button" data-action="remove-stop" title="${t("ramp.removeStop")}" aria-label="${t("ramp.removeStop")}" ${stops.length <= 2 ? "disabled" : ""}>${icon("trash")}</button>
          </div>
          <div class="position-row">
            <span>${t("ramp.position")}</span>
            <input class="range" id="stop-position" type="range" min="0" max="100" step="1" value="${Math.round((selectedStop?.pos || 0) * 100)}" aria-label="${t("ramp.positionAria")}">
            <output id="stop-position-value">${Math.round((selectedStop?.pos || 0) * 100)}%</output>
          </div>
        </div>
        <div class="gradient-footer">
          <button class="text-button add-stop-button" type="button" data-action="add-stop">${icon("plus")} ${t("ramp.addStop")}</button>
          <span class="gradient-footer__hint">${t("ramp.dragHint")}</span>
        </div>
      </div>
    </section>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title"><strong>${t("ramp.interpolation")}</strong><small>${interpolationLabel}</small></div>
      </div>
      <div class="segmented interpolation-switch" role="group" aria-label="${t("ramp.interpolationAria")}">
        ${interpolationButtons}
      </div>
      ${modeExtra}
    </section>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title">
          <strong>${t("ramp.presence")}</strong>
          <small>${activeColumns > 1 ? t("ramp.columnShort", { column: columnNumber, columns: activeColumns }) : t("ramp.fullWidth")}</small>
        </div>
      </div>
      <div class="slider-field">
        <div class="slider-field__head">
          <span>${t("ramp.cellHeight")}</span>
          <output id="band-height-value">${pixelWidth} × ${pixelHeight}px</output>
        </div>
        <input class="range" id="strip-weight" type="range" min="0.25" max="4" step="0.05" value="${strip.weight}" data-weight="true" aria-label="${t("ramp.weightAria")}">
        <span class="slider-field__hint">${activeColumns > 1
          ? t("ramp.cellHint", { width: pixelWidth, percentage })
          : t("ramp.singleColumnHint", { percentage })}</span>
      </div>
      <button class="ramp-preset-cta" type="button" data-action="open-presets">
        <span class="ramp-preset-cta__copy">
          <span class="ramp-preset-cta__icon">${icon("sparkles")}</span>
          <span>
            <strong>${t("ramp.templates")}</strong>
            <small>${t("ramp.templatesSubtitle", { count: getAllPresets().length })}</small>
          </span>
        </span>
        ${icon("chevron-right")}
      </button>
    </section>
  `;
}

function emptyInspectorMarkup() {
  return `
    <div class="empty-inspector">
      <span class="empty-inspector__icon">${icon("layers")}</span>
      <h3>${t("ramp.emptyTitle")}</h3>
      <p>${t("ramp.emptyText")}</p>
      <button class="btn btn--primary btn--small" type="button" data-action="add-ramp">${icon("plus")} ${t("ramp.new")}</button>
    </div>`;
}

function adjustedAdjustmentMarkup(key, label, min, max, step, iconName, scaleLeft, scaleRight, modifier = "") {
  const value = Number(appState.project.globalAdjust[key]) || 0;
  const changed = value !== 0;
  const fill = ((value - min) / (max - min)) * 100;
  const display = key === "hue" ? formatSigned(value, "°") : formatSigned(value, "%");
  return `
    <div class="adjustment" data-adjustment="${key}">
      <div class="adjustment__head">
        <span class="adjustment__label"><span class="adjustment__icon">${icon(iconName)}</span>${label}</span>
        <output class="adjustment__value${changed ? " is-changed" : ""}" data-adjust-output="${key}">${display}</output>
      </div>
      <input class="range ${modifier}" id="adjust-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-adjust="${key}" style="--fill:${fill}%" aria-label="${label}">
      <div class="adjustment__scale"><span>${scaleLeft}</span><span>${scaleRight}</span></div>
    </div>`;
}

function globalTabMarkup() {
  return `
    <div class="global-hero">
      <span class="global-hero__icon">${icon("palette")}</span>
      <div>
        <h2>${t("global.heroTitle")}</h2>
        <p>${t("global.heroText")}</p>
      </div>
    </div>

    <div class="global-list">
      ${adjustedAdjustmentMarkup("hue", t("global.hue"), -180, 180, 1, "palette", "−180°", "+180°", "range--hue")}
      ${adjustedAdjustmentMarkup("saturation", t("global.saturation"), -100, 100, 1, "brush", "−100%", "+100%")}
      ${adjustedAdjustmentMarkup("brightness", t("global.brightness"), -100, 100, 1, "sun", "−100%", "+100%")}
      ${adjustedAdjustmentMarkup("contrast", t("global.contrast"), -100, 100, 1, "sliders", t("global.soft"), t("global.strong"))}
      ${adjustedAdjustmentMarkup("warmth", t("global.warmth"), -100, 100, 1, "sun", t("global.cool"), t("global.warm"), "range--temperature")}
      ${adjustedAdjustmentMarkup("tint", t("global.tint"), -100, 100, 1, "palette", t("global.green"), t("global.magenta"), "range--tint")}
    </div>

    <div class="global-footer">
      <div class="global-note">
        ${icon("sparkles")}
        <span><strong>${t("global.splitTitle")}</strong> ${t("global.splitText")}</span>
      </div>
      <div class="global-actions">
        <button class="btn btn--ghost btn--small" type="button" data-action="reset-global">${icon("reset")} ${t("global.reset")}</button>
      </div>
    </div>`;
}

function renderGlobalTab() {
  els.inspectorContent.innerHTML = globalTabMarkup();
}

function renderRampTab() {
  const strip = activeStrip();
  if (!strip) {
    els.inspectorContent.innerHTML = emptyInspectorMarkup();
    return;
  }
  els.inspectorContent.innerHTML = rampTabMarkup(strip);
  drawRampGradient();
  if (strip.interpolation === "smooth") drawCurveEditor();
}

function pbrValueBytes(strip, emissionScale) {
  const pbr = normalizePbr(strip?.pbr, emissionScale);
  return {
    roughness: Math.round(pbr.roughness * 255),
    metallic: Math.round(pbr.metallic * 255),
    emission: Math.round((pbr.emission / emissionScale) * 255),
    opacity: Math.round(pbr.opacity * 255),
  };
}

function pbrFieldMarkup({ key, channel, label, value, min, max, step, scaleLeft, scaleRight, output }) {
  return `
    <div class="pbr-field" data-pbr-field="${key}">
      <div class="pbr-field__head">
        <span class="channel-badge channel-badge--${channel.toLowerCase()}">${channel}</span>
        <span class="pbr-field__label">${label}</span>
        <output class="pbr-field__value" data-pbr-output="${key}">${output}</output>
      </div>
      <input class="range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-pbr="${key}" aria-label="${label}">
      <div class="pbr-field__scale"><span>${scaleLeft}</span><span>${scaleRight}</span></div>
    </div>`;
}

function renderPbrTab() {
  const strip = activeStrip();
  if (!strip) {
    els.inspectorContent.innerHTML = emptyInspectorMarkup();
    return;
  }

  const project = appState.project;
  const stripIndex = project.strips.findIndex((item) => item.id === strip.id);
  const metric = getBandMetrics(project).find((cell) => cell.id === strip.id);
  const activeColumns = getEffectiveAtlasColumns(project);
  const columnNumber = (metric?.column || 0) + 1;
  const pbr = normalizePbr(strip.pbr, project.emissionScale);
  const bytes = pbrValueBytes(strip, project.emissionScale);
  const field = (key, value, min, max, step, scaleLeft, scaleRight, output, channel) => pbrFieldMarkup({
    key,
    channel,
    label: key === "roughness" ? t("pbr.roughness") : key === "metallic" ? t("pbr.metallic") : key === "emission" ? t("pbr.emission") : t("pbr.opacity"),
    value,
    min,
    max,
    step,
    scaleLeft,
    scaleRight,
    output,
  });

  els.inspectorContent.innerHTML = `
    <div class="ramp-overview pbr-overview">
      <div class="ramp-overview__title">
        <span class="eyebrow">${t("pbr.eyebrow", { column: columnNumber, columns: activeColumns })}</span>
        <h2>${escapeHTML(strip.name)}</h2>
      </div>
      <span class="pbr-cell-chip">${metric?.width || project.atlasSize}×${metric?.height || 0}px</span>
    </div>
    <div class="pbr-intro">
      ${icon("pbr")}
      <span>${t("pbr.intro")}</span>
    </div>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title"><strong>${t("pbr.surfaceParams")}</strong><small>${t("pbr.constantRgba")}</small></div>
      </div>
      <div class="pbr-fields">
        ${field("roughness", pbr.roughness, 0, 1, 0.01, t("pbr.smooth"), t("pbr.rough"), `${pbr.roughness.toFixed(2)} <small>R ${bytes.roughness}</small>`, "R")}
        ${field("metallic", pbr.metallic, 0, 1, 0.01, t("pbr.dielectric"), t("pbr.metal"), `${pbr.metallic.toFixed(2)} <small>G ${bytes.metallic}</small>`, "G")}
        ${field("emission", pbr.emission, 0, project.emissionScale, 0.01, t("pbr.noEmission"), t("pbr.maxEmission", { value: project.emissionScale.toFixed(0) }), `${pbr.emission.toFixed(2)} <small>B ${bytes.emission}</small>`, "B")}
        ${field("opacity", pbr.opacity, 0, 1, 0.01, t("pbr.transparent"), t("pbr.opaque"), `${pbr.opacity.toFixed(2)} <small>A ${bytes.opacity}</small>`, "A")}
      </div>
    </section>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title"><strong>${t("pbr.packedMask")}</strong><small>${t("pbr.linearNoSrgb")}</small></div>
      </div>
      <div class="pbr-channel-map">
        <div class="pbr-channel-map__item"><span class="channel-badge channel-badge--r">R</span> ${t("pbr.channelR")}</div>
        <div class="pbr-channel-map__item"><span class="channel-badge channel-badge--g">G</span> ${t("pbr.channelG")}</div>
        <div class="pbr-channel-map__item"><span class="channel-badge channel-badge--b">B</span> ${t("pbr.channelB")}</div>
        <div class="pbr-channel-map__item"><span class="channel-badge channel-badge--a">A</span> ${t("pbr.channelA")}</div>
      </div>
      <div class="pbr-preview-card">
        <div class="pbr-preview-card__head">
          <span>${t("pbr.preview")}</span>
          <span>${project.pbrMaskSize}²</span>
        </div>
        <div class="pbr-preview-card__stage">
          <canvas id="pbr-mask-preview" width="${project.pbrMaskSize}" height="${project.pbrMaskSize}" aria-label="${t("pbr.previewAria")}"></canvas>
        </div>
        <div class="pbr-preview-card__foot">
          <div class="segmented pbr-channel-switcher" id="pbr-channel-switcher" role="group" aria-label="${t("pbr.channelAria")}">
            ${["rgba", "r", "g", "b", "a"].map((channel) => `<button type="button" data-pbr-view="${channel}" class="${appState.pbrChannelView === channel ? "is-active" : ""}" aria-pressed="${appState.pbrChannelView === channel}">${channel === "rgba" ? "RGBA" : channel.toUpperCase()}</button>`).join("")}
          </div>
          <span class="pbr-byte-type">RGBA8</span>
        </div>
      </div>
    </section>

    <section class="control-section">
      <div class="control-section__head">
        <div class="control-heading__title"><strong>${t("pbr.export")}</strong><small>${t("pbr.pngLinear")}</small></div>
      </div>
      <div class="pbr-settings-grid">
        <label class="select-field">
          <span>${t("pbr.resolution")}</span>
          <select class="select-input" id="pbr-mask-size-select">
            ${PBR_MASK_SIZES.map((size) => `<option value="${size}" ${project.pbrMaskSize === size ? "selected" : ""}>${size} × ${size}</option>`).join("")}
          </select>
        </label>
        <label class="select-field">
          <span>${t("pbr.emissionScale")}</span>
          <select class="select-input" id="pbr-emission-scale">
            ${EMISSION_SCALES.map((scale) => `<option value="${scale}" ${project.emissionScale === scale ? "selected" : ""}>${scale.toFixed(0)}×</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="control-note">
        ${icon("alert")}
        <span>${t("pbr.note", { scale: project.emissionScale.toFixed(0) })}</span>
      </div>
      <button class="btn btn--primary btn--small pbr-export-button" type="button" data-action="export-pbr-mask">
        ${icon("download")} ${t("pbr.download")}
      </button>
      <p class="pbr-export-note">${t("pbr.exportNote")}</p>
    </section>
  `;

  drawPbrPreview();
}

function drawPbrPreview() {
  const canvas = $("#pbr-mask-preview", els.inspectorContent);
  if (!canvas || !activeStrip()) return;
  renderPbrMaskToCanvas(canvas, appState.project, {
    size: appState.project.pbrMaskSize,
    view: appState.pbrChannelView,
  });
}

/* =========================================================
   Canvases & drawing helpers
   ========================================================= */
function drawRampGradient() {
  const strip = activeStrip();
  const canvas = $("#ramp-gradient", els.inspectorContent);
  if (!strip || !canvas) return;
  renderRampToCanvas(canvas, strip, appState.project.globalAdjust, {
    width: 640,
    height: 72,
  });
  syncStopMarkers();
}

function syncStopMarkers() {
  const strip = activeStrip();
  if (!strip) return;
  const markers = $$(".stop-marker", els.inspectorContent);
  markers.forEach((marker) => {
    const stop = findStop(strip, marker.dataset.stopId);
    if (!stop) return;
    marker.style.left = `${(stop.pos * 100).toFixed(3)}%`;
    marker.style.setProperty("--stop-color", adjustedHex(stop.color, appState.project.globalAdjust));
    const sorted = sortedStops(strip);
    const index = sorted.findIndex((item) => item.id === stop.id);
    marker.title = t("ramp.stopMarker", { index: index + 1, percentage: Math.round(stop.pos * 100) });
  });

  const selected = findStop(strip, appState.selectedStopId);
  if (selected) {
    const range = $("#stop-position", els.inspectorContent);
    const output = $("#stop-position-value", els.inspectorContent);
    if (range) {
      range.value = Math.round(selected.pos * 100);
      syncRangeFill(range);
    }
    if (output) output.textContent = `${Math.round(selected.pos * 100)}%`;
  }
}

const CURVE_CANVAS = { width: 600, height: 200, left: 34, right: 20, top: 18, bottom: 26 };

function drawCurveEditor() {
  const strip = activeStrip();
  const canvas = $("#curve-canvas", els.inspectorContent);
  if (!strip || !canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height, left, right, top, bottom } = CURVE_CANVAS;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const curve = strip.curve;
  const point = (t, value) => ({
    x: left + t * plotWidth,
    y: top + (1 - value) * plotHeight,
  });

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0d0f13";
  context.fillRect(0, 0, width, height);

  // Fine grid
  context.lineWidth = 1;
  context.strokeStyle = "rgba(255,255,255,0.045)";
  for (let index = 0; index <= 4; index += 1) {
    const x = left + (plotWidth * index) / 4;
    const y = top + (plotHeight * index) / 4;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + plotHeight);
    context.stroke();
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + plotWidth, y);
    context.stroke();
  }

  // Linear reference
  context.save();
  context.strokeStyle = "rgba(231,235,241,0.13)";
  context.setLineDash([4, 6]);
  context.beginPath();
  context.moveTo(left, top + plotHeight);
  context.lineTo(left + plotWidth, top);
  context.stroke();
  context.restore();

  const start = point(0, 0);
  const end = point(1, 1);
  const c1 = point(1 / 3, curve.in);
  const c2 = point(2 / 3, curve.out);

  // Filled area
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
  context.lineTo(end.x, start.y);
  context.lineTo(start.x, start.y);
  context.closePath();
  const fill = context.createLinearGradient(0, top, 0, top + plotHeight);
  fill.addColorStop(0, "rgba(212,255,99,0.12)");
  fill.addColorStop(1, "rgba(212,255,99,0.008)");
  context.fillStyle = fill;
  context.fill();

  // Curve
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
  context.strokeStyle = "#d4ff63";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.shadowColor = "rgba(212,255,99,0.45)";
  context.shadowBlur = 7;
  context.stroke();
  context.shadowBlur = 0;

  // Handles
  context.save();
  context.strokeStyle = "rgba(212,255,99,0.24)";
  context.setLineDash([3, 4]);
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(c1.x, c1.y);
  context.moveTo(end.x, end.y);
  context.lineTo(c2.x, c2.y);
  context.stroke();
  context.restore();

  const drawHandle = (handle, label, alignLeft) => {
    context.beginPath();
    context.arc(handle.x, handle.y, 7, 0, Math.PI * 2);
    context.fillStyle = "#171b1d";
    context.fill();
    context.strokeStyle = "#d4ff63";
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(handle.x, handle.y, 2.3, 0, Math.PI * 2);
    context.fillStyle = "#f3f2ea";
    context.fill();

    context.font = '500 9px "IBM Plex Mono", monospace';
    context.fillStyle = "rgba(226,229,232,0.42)";
    context.textAlign = alignLeft ? "right" : "left";
    context.textBaseline = "middle";
    context.fillText(label, handle.x + (alignLeft ? -13 : 13), handle.y);
  };

  drawHandle(c1, t("ramp.curveIn"), true);
  drawHandle(c2, t("ramp.curveOut"), false);

  context.font = '400 8px "IBM Plex Mono", monospace';
  context.fillStyle = "rgba(210,215,222,0.22)";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(t("ramp.curveShadow"), left, top);
  context.textAlign = "right";
  context.fillText(t("ramp.curveLight"), left + plotWidth, top);
}

function pointToCurveValue(event, canvas) {
  const bounds = canvas.getBoundingClientRect();
  const normalizedX = (event.clientX - bounds.left) / bounds.width;
  const normalizedY = (event.clientY - bounds.top) / bounds.height;
  const x = normalizedX * CURVE_CANVAS.width;
  const y = normalizedY * CURVE_CANVAS.height;
  const plotWidth = CURVE_CANVAS.width - CURVE_CANVAS.left - CURVE_CANVAS.right;
  const plotHeight = CURVE_CANVAS.height - CURVE_CANVAS.top - CURVE_CANVAS.bottom;
  const value = clamp(1 - (y - CURVE_CANVAS.top) / plotHeight, 0, 1);
  const handle = Math.abs(x - (CURVE_CANVAS.left + plotWidth / 3)) <=
    Math.abs(x - (CURVE_CANVAS.left + (plotWidth * 2) / 3))
    ? "in"
    : "out";
  return { value, handle };
}

function syncRangeFill(range) {
  if (!range) return;
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 100;
  const value = Number(range.value) || 0;
  const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;
  range.style.setProperty("--fill", `${clamp(percentage, 0, 100)}%`);
}

function syncRangeFills(root = document) {
  $$('input[type="range"]', root).forEach(syncRangeFill);
}

/* =========================================================
   Autosave & save state
   ========================================================= */
function setSavingState({ saving = false, error = false } = {}) {
  appState.isAutosaving = Boolean(saving);
  appState.autosaveError = Boolean(error);
  els.saveState.classList.toggle("is-saving", saving);
  if (error) {
    els.saveLabel.textContent = t("header.autosaveError");
    els.saveState.title = t("header.autosaveErrorTitle");
    return;
  }
  if (saving) {
    els.saveLabel.textContent = t("header.autosaving");
    els.saveState.title = t("header.autosavingTitle");
  } else {
    const time = new Date().toLocaleTimeString(getLocale(), { hour: "2-digit", minute: "2-digit" });
    els.saveLabel.textContent = t("header.autosaved");
    els.saveState.title = t("header.autosavedTitle", { time });
  }
}

function queueAutosave() {
  if (!appState.project) return;
  window.clearTimeout(appState.saveTimer);
  setSavingState({ saving: true });
  appState.saveTimer = window.setTimeout(() => {
    saveLocalNow();
  }, 350);
}

function saveLocalNow() {
  if (!appState.project) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildProjectPayload(appState.project)));
    setSavingState({ saving: false });
  } catch (error) {
    console.warn("Autosave failed.", error);
    setSavingState({ error: true });
  }
}

function updateLanguageButton() {
  if (!els.btnLanguage || !els.languageLabel) return;
  els.languageLabel.textContent = getLanguage().toUpperCase();
  els.btnLanguage.dataset.language = getLanguage();
}

function refreshLanguageUi() {
  const presetNamesChanged = localizePresetRampNames();
  applyTranslations(document);
  updateLanguageButton();
  clearPresetStatus();
  if (els.metaDescription) els.metaDescription.content = t("app.metaDescription");
  document.title = `RampForge — ${appState.project.name}`;
  renderRampList();
  renderInspector({ preserveScroll: true });
  updateGlobalIndicator();
  updateColumnsControl();
  updateAtlasMeta();
  updateUvPreview();
  updateCurrentMeshLabel();
  setSavingState({ saving: appState.isAutosaving, error: appState.autosaveError });
  if (els.presetModal.open) {
    els.presetModal.querySelector("#preset-modal-title").textContent = t("presets.title");
    updatePresetSubtitle();
    renderPresetGallery();
    if (!els.presetSavebar.hidden) {
      const strip = activeStrip();
      const seed = els.presetNameInput.dataset.seed;
      if (strip && seed && els.presetNameInput.value === seed) {
        els.presetNameInput.value = strip.name;
        els.presetNameInput.dataset.seed = strip.name;
      }
    }
  }
  if (presetNamesChanged) queueAutosave();
}

function updatePresetSubtitle() {
  if (!els.presetSubtitle) return;
  const strip = activeStrip();
  if (strip) {
    els.presetSubtitle.innerHTML = t("presets.subtitle", {
      name: `<strong>${escapeHTML(strip.name)}</strong>`,
    });
  } else {
    els.presetSubtitle.textContent = t("presets.defaultSubtitle");
  }
}

function updateCurrentMeshLabel() {
  els.currentMeshLabel.textContent = meshLabel(appState.mesh);
}

/* =========================================================
   Actions: ramps, stops, presets
   ========================================================= */
function selectStrip(id, { openInspectorOnMobile = false } = {}) {
  const previousTab = appState.inspectorTab;
  const preservedTab = ["ramp", "pbr"].includes(previousTab) ? previousTab : "ramp";

  if (appState.selectedStripId === id) {
    appState.inspectorTab = preservedTab;
    renderInspector({ preserveScroll: false });
    return;
  }
  appState.selectedStripId = id;
  appState.inspectorTab = preservedTab;
  const strip = activeStrip();
  appState.selectedStopId = interestingStop(strip)?.id || null;
  renderRampList();
  renderInspector({ preserveScroll: false });
  updateGlobalIndicator();
  updateUvPreview();
  els.inspectorScroll.scrollTop = 0;
  if (openInspectorOnMobile && window.matchMedia("(max-width: 880px)").matches) {
    closeDrawers();
    window.setTimeout(() => openDrawer(els.inspectorPanel), 120);
  }
}

function addRamp() {
  const project = appState.project;
  let number = project.strips.length + 1;
  const existingNames = new Set(project.strips.map((strip) => strip.name.toLowerCase()));
  while (existingNames.has(t("ramp.newName", { number }).toLowerCase())) number += 1;
  const newStrip = createBlankStrip({
    name: t("ramp.newName", { number }),
    emissionScale: project.emissionScale,
  });
  let insertIndex = project.strips.length;
  const currentIndex = project.strips.findIndex((strip) => strip.id === appState.selectedStripId);
  if (currentIndex >= 0) insertIndex = currentIndex + 1;
  project.strips.splice(insertIndex, 0, newStrip);
  appState.selectedStripId = newStrip.id;
  appState.selectedStopId = interestingStop(newStrip)?.id || null;
  appState.inspectorTab = "ramp";
  renderAll();
  queueAutosave();
}

function duplicateRamp() {
  const project = appState.project;
  const strip = activeStrip();
  if (!strip) return;
  const index = project.strips.findIndex((item) => item.id === strip.id);
  const duplicate = cloneStrip(strip, {
    name: t("ramp.copySuffix", { name: strip.name }).slice(0, 48),
  });
  project.strips.splice(index + 1, 0, duplicate);
  appState.selectedStripId = duplicate.id;
  appState.selectedStopId = interestingStop(duplicate)?.id || null;
  appState.inspectorTab = "ramp";
  renderAll();
  queueAutosave();
}

function deleteRamp() {
  const project = appState.project;
  const strip = activeStrip();
  if (!strip) return;
  const index = project.strips.findIndex((item) => item.id === strip.id);
  const ownerProject = project;
  project.strips.splice(index, 1);
  if (project.strips.length > 0) {
    const next = project.strips[Math.min(index, project.strips.length - 1)];
    appState.selectedStripId = next.id;
    appState.selectedStopId = interestingStop(next)?.id || null;
  } else {
    appState.selectedStripId = null;
    appState.selectedStopId = null;
  }
  renderAll();
  queueAutosave();

  showToast({
    type: "info",
    title: t("toast.rampDeletedTitle"),
    message: t("toast.rampDeletedMessage", { name: strip.name }),
    actionLabel: t("common.undo"),
    duration: 6500,
    onAction: () => {
      if (appState.project !== ownerProject) return;
      ownerProject.strips.splice(Math.min(index, ownerProject.strips.length), 0, strip);
      appState.selectedStripId = strip.id;
      appState.selectedStopId = interestingStop(strip)?.id || null;
      appState.inspectorTab = "ramp";
      renderAll();
      queueAutosave();
    },
  });
}

function moveRamp(direction) {
  const project = appState.project;
  const strip = activeStrip();
  if (!strip) return;
  const index = project.strips.findIndex((item) => item.id === strip.id);
  const target = index + direction;
  if (target < 0 || target >= project.strips.length) return;
  [project.strips[index], project.strips[target]] = [project.strips[target], project.strips[index]];
  renderAll();
  queueAutosave();
}

function selectStop(id) {
  const strip = activeStrip();
  if (!strip) return;
  if (!findStop(strip, id)) return;
  appState.selectedStopId = id;
  renderInspector();
}

function addStop() {
  const strip = activeStrip();
  if (!strip) return;
  const gap = getLargestGap(strip.stops);
  let position = gap.position;
  const tolerance = 0.008;
  if (strip.stops.some((stop) => Math.abs(stop.pos - position) < tolerance)) {
    position = clamp(position + 0.035, 0.02, 0.98);
  }
  const color = sampleStripColor(strip, position, null);
  const stop = makeStop(color, position);
  strip.stops.push(stop);
  strip.stops.sort((a, b) => a.pos - b.pos);
  appState.selectedStopId = stop.id;
  renderInspector();
  pushPaletteChange();
}

function removeStop() {
  const strip = activeStrip();
  if (!strip || strip.stops.length <= 2) return;
  const sorted = sortedStops(strip);
  const index = sorted.findIndex((stop) => stop.id === appState.selectedStopId);
  const removed = sorted[Math.max(0, index)];
  if (!removed) return;
  strip.stops = strip.stops.filter((stop) => stop.id !== removed.id);
  const remaining = sortedStops(strip);
  appState.selectedStopId = (remaining[Math.max(0, index - 1)] || remaining[0])?.id || null;
  renderInspector();
  pushPaletteChange();
}

function reorderStopsByPosition() {
  const strip = activeStrip();
  if (!strip) return;
  strip.stops.sort((a, b) => a.pos - b.pos);
}

function getAllPresets() {
  return [...RAMPS_PRESETS, ...appState.userPresets];
}

function findPresetById(id) {
  return getPreset(id) || appState.userPresets.find((preset) => preset.id === id) || null;
}

function presetCategories() {
  return appState.userPresets.length
    ? [...PRESET_CATEGORIES, CUSTOM_PRESET_CATEGORY]
    : PRESET_CATEGORIES;
}

function localizePresetRampNames() {
  let changed = false;
  for (const strip of appState.project?.strips || []) {
    const preset = RAMPS_PRESETS.find((item) => (
      getPresetNameVariants(item.id).includes(strip.name) || item.name === strip.name
    ));
    if (!preset) continue;
    const localized = translatePreset(preset).name;
    if (strip.name !== localized) {
      strip.name = localized;
      changed = true;
    }
  }
  return changed;
}

function showPresetStatus(message, tone = "success") {
  if (!els.presetStatus) return;
  window.clearTimeout(presetStatusTimer);
  els.presetStatus.textContent = message;
  els.presetStatus.dataset.tone = tone;
  presetStatusTimer = window.setTimeout(() => {
    els.presetStatus.textContent = "";
    delete els.presetStatus.dataset.tone;
  }, 3800);
}

function clearPresetStatus() {
  window.clearTimeout(presetStatusTimer);
  if (!els.presetStatus) return;
  els.presetStatus.textContent = "";
  delete els.presetStatus.dataset.tone;
}

function hidePresetSavePanel() {
  if (!els.presetSavebar) return;
  els.presetSavebar.hidden = true;
  if (els.btnSaveCurrentPreset) els.btnSaveCurrentPreset.disabled = false;
  if (els.presetNameInput) {
    els.presetNameInput.value = "";
    delete els.presetNameInput.dataset.seed;
  }
  if (els.presetDescriptionInput) els.presetDescriptionInput.value = "";
}

function openPresetSavePanel() {
  const strip = activeStrip();
  if (!strip) {
    showPresetStatus(t("presets.noRampMessage"), "error");
    return;
  }
  if (appState.userPresets.length >= MAX_USER_PRESETS) {
    showPresetStatus(t("presets.limitReached"), "error");
    return;
  }
  applyTranslations(els.presetSavebar);
  els.presetSavebar.hidden = false;
  els.btnSaveCurrentPreset.disabled = true;
  els.presetNameInput.value = strip.name;
  els.presetNameInput.dataset.seed = strip.name;
  els.presetDescriptionInput.value = "";
  window.requestAnimationFrame(() => {
    els.presetNameInput.focus();
    els.presetNameInput.select();
  });
}

function saveCurrentRampAsPreset() {
  const strip = activeStrip();
  if (!strip) {
    showPresetStatus(t("presets.noRampMessage"), "error");
    return;
  }
  if (appState.userPresets.length >= MAX_USER_PRESETS) {
    showPresetStatus(t("presets.limitReached"), "error");
    return;
  }
  const name = (els.presetNameInput.value.trim() || strip.name || t("presets.customUntitled")).slice(0, 48);
  const description = els.presetDescriptionInput.value.trim() || t("presets.customDefaultDescription");
  const preset = createUserPreset(strip, { name, description });
  if (!preset) {
    showPresetStatus(t("presets.storageError"), "error");
    return;
  }
  const nextPresets = [...appState.userPresets, preset];
  if (!persistUserPresets(nextPresets)) {
    showPresetStatus(t("presets.storageError"), "error");
    return;
  }
  appState.userPresets = nextPresets;
  appState.presetCategory = CUSTOM_PRESET_CATEGORY;
  hidePresetSavePanel();
  renderPresetGallery();
  renderInspector({ preserveScroll: true });
  els.presetGrid.scrollTop = els.presetGrid.scrollHeight;
  const newCard = $$("[data-preset]", els.presetGrid).find((card) => card.dataset.preset === preset.id);
  newCard?.focus();
  showPresetStatus(t("presets.savedInline", { name: preset.name }));
}

function deleteUserPreset(presetId) {
  const preset = appState.userPresets.find((item) => item.id === presetId);
  if (!preset) return;
  if (!window.confirm(t("presets.deleteConfirm", { name: preset.name }))) return;
  const nextPresets = appState.userPresets.filter((item) => item.id !== presetId);
  if (!persistUserPresets(nextPresets)) {
    showPresetStatus(t("presets.storageError"), "error");
    return;
  }
  appState.userPresets = nextPresets;
  if (appState.presetCategory === CUSTOM_PRESET_CATEGORY && nextPresets.length === 0) {
    appState.presetCategory = "Todos";
  }
  renderPresetGallery();
  renderInspector({ preserveScroll: true });
  showPresetStatus(t("presets.deletedInline", { name: preset.name }));
}

function applyPresetToStrip(presetId) {
  const preset = findPresetById(presetId);
  const project = appState.project;
  const strip = activeStrip();
  if (!preset || !strip) {
    showToast({
      type: "error",
      title: t("presets.noRampTitle"),
      message: t("presets.noRampMessage"),
    });
    return;
  }
  const index = project.strips.findIndex((item) => item.id === strip.id);
  const applied = stripFromPreset(preset, {
    id: strip.id,
    name: strip.name,
    orientation: strip.orientation,
    weight: strip.weight,
    pbr: preset.pbr || strip.pbr,
    emissionScale: project.emissionScale,
  });
  project.strips[index] = applied;
  appState.selectedStopId = interestingStop(applied)?.id || null;
  closeDialog(els.presetModal);
  renderAll();
  queueAutosave();
  showToast({
    type: "success",
    title: t("presets.appliedTitle"),
    message: t("presets.appliedMessage", {
      preset: translatePreset(preset).name,
      strip: applied.name,
    }),
  });
}

/* =========================================================
   Global adjustments
   ========================================================= */
function handleAdjustInput(input) {
  const key = input.dataset.adjust;
  if (!key) return;
  const value = Number(input.value);
  appState.project.globalAdjust[key] = value;
  const adjustment = input.closest(".adjustment");
  const output = adjustment?.querySelector("[data-adjust-output]");
  if (output) {
    output.textContent = key === "hue" ? formatSigned(value, "°") : formatSigned(value, "%");
    output.classList.toggle("is-changed", value !== 0);
  }
  syncRangeFill(input);
  updateGlobalIndicator();
  schedulePaletteRefresh();
  queueAutosave();
}

function resetGlobalAdjustments() {
  appState.project.globalAdjust = { ...DEFAULT_ADJUST };
  renderInspector();
  schedulePaletteRefresh();
  queueAutosave();
  showToast({
    type: "success",
    title: t("global.resetTitle"),
    message: t("global.resetMessage"),
  });
}

/* =========================================================
   Generic UI: toasts, drawers, dialogs
   ========================================================= */
function showToast({ type = "success", title, message = "", actionLabel = "", onAction = null, duration = 4400 }) {
  while (els.toastStack.children.length >= 3) {
    els.toastStack.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  const iconName = type === "error" ? "alert" : type === "info" ? "sparkles" : "check";
  toast.innerHTML = `
    <span class="toast__icon">${icon(iconName)}</span>
    <div class="toast__body">
      <div class="toast__title">${escapeHTML(title)}</div>
      ${message ? `<div class="toast__message">${escapeHTML(message)}</div>` : ""}
    </div>
    ${actionLabel ? `<button class="toast__action" type="button">${escapeHTML(actionLabel)}</button>` : ""}
    <button class="toast__close" type="button" aria-label="${t("toast.dismiss")}">${icon("x")}</button>
  `;
  toast.dataset.toastId = String(++toastId);
  els.toastStack.appendChild(toast);

  let timeout = null;
  let hovered = false;
  const remove = () => {
    if (!toast.isConnected) return;
    window.clearTimeout(timeout);
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 230);
  };
  const armTimer = () => {
    window.clearTimeout(timeout);
    if (!hovered && duration > 0) {
      timeout = window.setTimeout(remove, duration);
    }
  };

  const actionButton = toast.querySelector(".toast__action");
  if (actionButton) {
    actionButton.addEventListener("click", () => {
      remove();
      onAction?.();
    });
  } else if (onAction) {
    toast.addEventListener("click", (event) => {
      if (event.target.closest(".toast__close")) return;
      remove();
      onAction();
    });
  }

  toast.querySelector(".toast__close").addEventListener("click", remove);
  toast.addEventListener("mouseenter", () => {
    hovered = true;
    window.clearTimeout(timeout);
  });
  toast.addEventListener("mouseleave", () => {
    hovered = false;
    armTimer();
  });
  armTimer();
}

function openDrawer(panel) {
  $$(".panel.is-open").forEach((openPanel) => {
    if (openPanel !== panel) openPanel.classList.remove("is-open");
  });
  panel.classList.add("is-open");
  els.backdrop.hidden = false;
  requestAnimationFrame(() => els.backdrop.classList.add("is-visible"));
}

function closeDrawers({ immediate = false } = {}) {
  $$(".panel.is-open").forEach((panel) => panel.classList.remove("is-open"));
  if (immediate) {
    els.backdrop.hidden = true;
    els.backdrop.classList.remove("is-visible");
    return;
  }
  els.backdrop.classList.remove("is-visible");
  window.setTimeout(() => {
    if ($$(".panel.is-open").length === 0) els.backdrop.hidden = true;
  }, 230);
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function openPresetModal() {
  const strip = activeStrip();
  if (!strip) {
    showToast({
      type: "error",
      title: t("toast.noRampTitle"),
      message: t("toast.noRampMessage"),
    });
    return;
  }
  if (window.matchMedia("(max-width: 1120px)").matches) closeDrawers({ immediate: true });
  hidePresetSavePanel();
  clearPresetStatus();
  updatePresetSubtitle();
  if (!presetCategories().includes(appState.presetCategory)) {
    appState.presetCategory = "Todos";
  }
  renderPresetGallery();
  if (!els.presetModal.open) els.presetModal.showModal();
}

function renderPresetGallery() {
  const categories = presetCategories();
  if (!categories.includes(appState.presetCategory)) {
    appState.presetCategory = "Todos";
  }
  const category = appState.presetCategory;
  const sourcePresets = getAllPresets();
  const filtered = category === "Todos"
    ? sourcePresets
    : sourcePresets.filter((preset) => preset.category === category);
  const presets = filtered.map(translatePreset);
  els.presetFilters.setAttribute("aria-label", t("presets.filterAria"));

  els.presetFilters.innerHTML = categories.map(
    (item) =>
      `<button class="filter-chip${item === category ? " is-active" : ""}" type="button" data-category="${escapeHTML(item)}" aria-pressed="${item === category}">${escapeHTML(translatePresetCategory(item))}</button>`,
  ).join("");

  els.presetCount.textContent = tPlural(presets.length, "presets.countOne", "presets.countMany", { count: presets.length });
  els.presetGrid.innerHTML = presets
    .map(
      (preset) => `
        <div class="preset-card-wrap">
          <button class="preset-card" type="button" data-preset="${escapeHTML(preset.id)}" title="${escapeHTML(t("presets.applyTitle", { name: preset.name }))}">
            <span class="preset-card__preview">
              <canvas width="360" height="96" data-preset-preview="${escapeHTML(preset.id)}"></canvas>
              <span class="preset-card__action">${icon("plus")}</span>
            </span>
            <span class="preset-card__meta">
              <span class="preset-card__name">${escapeHTML(preset.name)}</span>
              <span class="preset-card__tag">${escapeHTML(preset.categoryLabel)}</span>
            </span>
            <span class="preset-card__description">${escapeHTML(preset.description)}</span>
          </button>
          ${preset.custom ? `<button class="preset-card__delete" type="button" data-delete-preset="${escapeHTML(preset.id)}" title="${escapeHTML(t("presets.deleteNamed", { name: preset.name }))}" aria-label="${escapeHTML(t("presets.deleteNamed", { name: preset.name }))}">${icon("trash")}</button>` : ""}
        </div>`,
    )
    .join("");

  $$("[data-preset-preview]", els.presetGrid).forEach((canvas) => {
    const preset = findPresetById(canvas.dataset.presetPreview);
    if (preset) {
      renderRampToCanvas(canvas, preset, null, { width: 360, height: 96 });
    }
  });
}

function openAtlasModal() {
  refreshAtlas();
  const resolution = `${appState.project.atlasSize} × ${appState.project.atlasSize}`;
  els.atlasModalMeta.textContent = t("atlas.modalMeta", { resolution });
  paintCanvasFromCanvas(els.atlasModalCanvas, els.atlasCanvas);
  updateAtlasMeta();
  if (!els.atlasModal.open) els.atlasModal.showModal();
  updateUvPreview();
}

/* =========================================================
   File export / import
   ========================================================= */
function currentFileName(extension) {
  return `${slugify(appState.project.name)}_${appState.project.atlasSize}.${extension}`;
}

async function saveProjectFile() {
  if (appState.isSavingFile) return;
  appState.isSavingFile = true;
  const filename = `${slugify(appState.project.name)}.rampforge.json`;
  const json = JSON.stringify(buildProjectPayload(appState.project), null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });

  try {
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: t("save.projectType"),
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast({
          type: "success",
          title: t("toast.jsonSavedTitle"),
          message: t("toast.jsonSavedMessage", { filename: handle.name || filename }),
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.warn("The native save dialog failed; falling back to a browser download.", error);
      }
    }

    downloadBlob(blob, filename);
    showToast({
      type: "success",
      title: t("toast.downloadStartedTitle"),
      message: t("toast.downloadStartedMessage", { filename }),
      duration: 5600,
    });
  } finally {
    appState.isSavingFile = false;
  }
}

async function exportAtlasPNG() {
  if (appState.isExporting) return;
  if (appState.project.strips.length === 0) {
    showToast({
      type: "error",
      title: t("toast.colorEmptyTitle"),
      message: t("toast.colorEmptyMessage"),
    });
    return;
  }

  appState.isExporting = true;
  updateAtlasMeta();
  try {
    const canvas = document.createElement("canvas");
    renderAtlasToCanvas(canvas, appState.project);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("The PNG could not be generated."));
      }, "image/png");
    });
    downloadBlob(blob, currentFileName("png"));
    showToast({
      type: "success",
      title: t("toast.colorExportedTitle"),
      message: t("toast.colorExportedMessage", {
        resolution: appState.project.atlasSize,
        size: formatBytes(blob.size),
      }),
    });
  } catch (error) {
    console.error(error);
    showToast({
      type: "error",
      title: t("toast.exportErrorTitle"),
      message: t("toast.colorExportErrorMessage"),
    });
  } finally {
    appState.isExporting = false;
    updateAtlasMeta();
  }
}

async function exportPbrMaskPNG() {
  if (appState.isPbrExporting) return;
  if (appState.project.strips.length === 0) {
    showToast({
      type: "error",
      title: t("toast.maskEmptyTitle"),
      message: t("toast.maskEmptyMessage"),
    });
    return;
  }

  appState.isPbrExporting = true;
  const buttons = [
    ...$$('[data-action="export-pbr-mask"]', els.inspectorContent),
    els.btnExportPbrAtlas,
  ];
  buttons.forEach((button) => {
    if (button) button.disabled = true;
  });
  updateAtlasMeta();

  try {
    refreshPbrMask();
    const mask = createPbrMaskData(appState.project);
    const blob = await rgbaToPngBlob(mask.data, mask.width, mask.height);
    downloadBlob(blob, `${slugify(appState.project.name)}_pbr_${mask.size}.png`);
    showToast({
      type: "success",
      title: t("toast.maskExportedTitle"),
      message: t("toast.maskExportedMessage", { width: mask.width, height: mask.height }),
      duration: 6000,
    });
  } catch (error) {
    console.error(error);
    showToast({
      type: "error",
      title: t("toast.exportErrorTitle"),
      message: t("toast.maskErrorMessage"),
    });
  } finally {
    appState.isPbrExporting = false;
    $$('[data-action="export-pbr-mask"]', els.inspectorContent).forEach((button) => {
      button.disabled = false;
    });
    updateAtlasMeta();
  }
}

async function importProjectFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const project = normalizeProject(parsed);
    setProject(project);
    saveLocalNow();
    showToast({
      type: "success",
      title: t("toast.projectLoadedTitle"),
      message: t("toast.projectLoadedMessage", {
        count: project.strips.length,
        rampWord: t(project.strips.length === 1 ? "common.rampWordOne" : "common.rampWordMany"),
        name: project.name,
      }),
    });
  } catch (error) {
    console.warn(error);
    showToast({
      type: "error",
      title: t("toast.invalidJsonTitle"),
      message: t("toast.invalidJsonMessage"),
      duration: 5500,
    });
  } finally {
    els.importFile.value = "";
  }
}

function resetDemoProject() {
  const confirmed = window.confirm(t("confirm.restoreDemo"));
  if (!confirmed) return;
  const demo = createDefaultProject();
  setProject(demo, { save: false });
  saveLocalNow();
  showToast({
    type: "success",
    title: t("toast.demoRestoredTitle"),
    message: t("toast.demoRestoredMessage"),
  });
}

/* =========================================================
   Pointer interactions: stops & curves
   ========================================================= */
function startStopDrag(event, marker) {
  if (appState.stopDrag) return;
  const strip = activeStrip();
  if (!strip) return;
  const stop = findStop(strip, marker.dataset.stopId);
  if (!stop) return;
  event.preventDefault();

  appState.selectedStopId = stop.id;
  $$(".stop-marker", els.inspectorContent).forEach((element) => {
    element.classList.toggle("is-selected", element.dataset.stopId === stop.id);
  });

  appState.stopDrag = {
    stripId: strip.id,
    stopId: stop.id,
    startX: event.clientX,
    moved: false,
  };
  window.addEventListener("pointermove", handleStopDragMove);
  window.addEventListener("pointerup", finishStopDrag, { once: true });
  window.addEventListener("pointercancel", finishStopDrag, { once: true });
}

function handleStopDragMove(event) {
  const drag = appState.stopDrag;
  if (!drag) return;
  const strip = appState.project.strips.find((item) => item.id === drag.stripId);
  const stop = findStop(strip, drag.stopId);
  const track = $("#stop-track", els.inspectorContent);
  if (!strip || !stop || !track) return;
  if (Math.abs(event.clientX - drag.startX) > 2) drag.moved = true;

  const bounds = track.getBoundingClientRect();
  const position = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
  stop.pos = Number(position.toFixed(4));
  drawRampGradient();
  schedulePaletteRefresh();
}

function finishStopDrag() {
  window.removeEventListener("pointermove", handleStopDragMove);
  window.removeEventListener("pointerup", finishStopDrag);
  window.removeEventListener("pointercancel", finishStopDrag);
  const drag = appState.stopDrag;
  appState.stopDrag = null;
  if (!drag) return;
  const strip = appState.project.strips.find((item) => item.id === drag.stripId);
  if (strip) reorderStopsByPosition();
  queueAutosave();
  renderInspector();
}

function startCurveDrag(event, canvas) {
  if (appState.curveDrag) return;
  const strip = activeStrip();
  if (!strip || strip.interpolation !== "smooth") return;
  event.preventDefault();
  const { handle, value } = pointToCurveValue(event, canvas);
  strip.curve[handle] = Number(value.toFixed(3));
  drawCurveEditor();
  updateCurveValues(strip);
  drawRampGradient();
  schedulePaletteRefresh();

  appState.curveDrag = { stripId: strip.id, handle };
  window.addEventListener("pointermove", handleCurveDragMove);
  window.addEventListener("pointerup", finishCurveDrag, { once: true });
  window.addEventListener("pointercancel", finishCurveDrag, { once: true });
}

function handleCurveDragMove(event) {
  const drag = appState.curveDrag;
  const canvas = $("#curve-canvas", els.inspectorContent);
  if (!drag || !canvas) return;
  const strip = appState.project.strips.find((item) => item.id === drag.stripId);
  if (!strip) return;
  const { handle, value } = pointToCurveValue(event, canvas);
  strip.curve[handle] = Number(value.toFixed(3));
  drawCurveEditor();
  updateCurveValues(strip);
  drawRampGradient();
  schedulePaletteRefresh();
}

function finishCurveDrag() {
  window.removeEventListener("pointermove", handleCurveDragMove);
  window.removeEventListener("pointerup", finishCurveDrag);
  window.removeEventListener("pointercancel", finishCurveDrag);
  appState.curveDrag = null;
  queueAutosave();
}

function updateCurveValues(strip) {
  const inputValue = els.inspectorContent.querySelector('[data-curve-value="in"]');
  const outputValue = els.inspectorContent.querySelector('[data-curve-value="out"]');
  if (inputValue) inputValue.textContent = Number(strip.curve.in).toFixed(2);
  if (outputValue) outputValue.textContent = Number(strip.curve.out).toFixed(2);
}

/* =========================================================
   Event handlers
   ========================================================= */
function bindEvents() {
  // Header
  els.projectName.addEventListener("input", () => commitProjectName(els.projectName.value));
  els.projectName.addEventListener("blur", () => {
    if (!els.projectName.value.trim()) {
      els.projectName.value = appState.project.name;
    } else {
      commitProjectName(els.projectName.value);
    }
  });
  els.btnSave.addEventListener("click", saveProjectFile);
  els.btnLanguage.addEventListener("click", () => {
    toggleLanguage();
  });
  window.addEventListener("rampforge:languagechange", () => {
    refreshLanguageUi();
  });
  els.btnImport.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", () => importProjectFile(els.importFile.files?.[0]));
  els.btnExportAtlas.addEventListener("click", exportAtlasPNG);
  els.btnExportAtlasModal.addEventListener("click", exportAtlasPNG);
  els.btnExportPbrAtlas.addEventListener("click", exportPbrMaskPNG);
  els.btnResetProject.addEventListener("click", resetDemoProject);

  // Atlas size
  els.sizeSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-size]");
    if (!button) return;
    const size = Number(button.dataset.size);
    if (![256, 512, 1024, 2048].includes(size) || size === appState.project.atlasSize) return;
    appState.project.atlasSize = size;
    renderAll();
    queueAutosave();
  });

  // Atlas columns
  els.columnsSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-columns]");
    if (!button) return;
    const columns = clamp(Math.round(Number(button.dataset.columns)), 1, MAX_ATLAS_COLUMNS);
    if (columns === appState.project.atlasColumns) return;
    appState.project.atlasColumns = columns;
    renderAll();
    queueAutosave();
  });

  // Sidebar ramps
  els.btnAddRamp.addEventListener("click", addRamp);
  els.rampList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-strip-id]");
    if (!item) return;
    selectStrip(item.dataset.stripId);
  });
  els.rampList.addEventListener("dblclick", (event) => {
    const item = event.target.closest("[data-strip-id]");
    if (!item) return;
    selectStrip(item.dataset.stripId);
    if (window.matchMedia("(max-width: 880px)").matches) {
      openDrawer(els.inspectorPanel);
    }
    window.setTimeout(() => {
      const input = $("#ramp-name", els.inspectorContent);
      if (input) {
        input.focus();
        input.select();
      }
    }, 80);
  });
  els.rampList.addEventListener("keydown", (event) => {
    const item = event.target.closest("[data-strip-id]");
    if (!item) return;
    const items = $$("[data-strip-id]", els.rampList);
    const index = items.indexOf(item);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectStrip(item.dataset.stripId);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      selectStrip(items[Math.min(items.length - 1, index + 1)].dataset.stripId);
      items[Math.min(items.length - 1, index + 1)].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectStrip(items[Math.max(0, index - 1)].dataset.stripId);
      items[Math.max(0, index - 1)].focus();
    }
  });

  bindRampDragAndDrop();

  // Inspector tabs
  els.inspectorTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setInspectorTab(tab.dataset.tab);
    });
  });

  // Inspector events
  els.inspectorContent.addEventListener("input", handleInspectorInput);
  els.inspectorContent.addEventListener("change", handleInspectorChange);
  els.inspectorContent.addEventListener("click", handleInspectorClick);
  els.inspectorContent.addEventListener("pointerdown", handleInspectorPointerDown);

  // 3D viewport
  els.meshTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mesh]");
    if (!button) return;
    setMesh(button.dataset.mesh);
  });
  els.shadingSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shading]");
    if (!button) return;
    setShading(button.dataset.shading);
  });
  els.btnAutoRotate.addEventListener("click", () => {
    appState.autoRotate = !appState.autoRotate;
    els.btnAutoRotate.classList.toggle("is-active", appState.autoRotate);
    els.btnAutoRotate.setAttribute("aria-pressed", appState.autoRotate ? "true" : "false");
    viewer?.setAutoRotate(appState.autoRotate);
  });
  els.btnResetView.addEventListener("click", () => viewer?.resetView());

  // Light
  bindLightControls();

  // Presets
  els.btnOpenPresets.addEventListener("click", openPresetModal);
  els.presetFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    appState.presetCategory = button.dataset.category;
    renderPresetGallery();
  });
  els.btnSaveCurrentPreset.addEventListener("click", openPresetSavePanel);
  els.btnConfirmSavePreset.addEventListener("click", saveCurrentRampAsPreset);
  els.btnCancelSavePreset.addEventListener("click", hidePresetSavePanel);
  [els.presetNameInput, els.presetDescriptionInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      saveCurrentRampAsPreset();
    });
  });
  els.presetModal.addEventListener("close", () => {
    hidePresetSavePanel();
    clearPresetStatus();
  });
  els.presetGrid.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-preset]");
    if (deleteButton) {
      deleteUserPreset(deleteButton.dataset.deletePreset);
      return;
    }
    const card = event.target.closest("[data-preset]");
    if (!card) return;
    applyPresetToStrip(card.dataset.preset);
  });

  // UV preview region
  $$("[data-uv-mode]").forEach((button) => {
    button.addEventListener("click", () => setUvMode(button.dataset.uvMode));
  });
  $$("[data-uv-overlay]").forEach((overlay) => {
    overlay.addEventListener("pointerdown", (event) => startUvRegionDrag(event, overlay));
  });

  // Atlas modal
  els.btnExpandAtlas.addEventListener("click", openAtlasModal);
  els.btnExpandAtlas2.addEventListener("click", openAtlasModal);

  // Dialog closers
  $$("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });
  $$(".modal").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  // Drawers
  els.btnMobileLibrary.addEventListener("click", () => openDrawer(els.libraryPanel));
  els.btnMobileInspector.addEventListener("click", () => openDrawer(els.inspectorPanel));
  $$("[data-close-drawer]").forEach((button) => {
    button.addEventListener("click", () => closeDrawers());
  });
  els.backdrop.addEventListener("click", () => closeDrawers());

  // Hide orbit hint after first orbit or after a while.
  const hideOrbitHint = () => els.orbitHint.classList.add("is-hidden");
  els.threeCanvas.addEventListener("pointerdown", hideOrbitHint, { once: true });
  els.threeCanvas.addEventListener("wheel", hideOrbitHint, { once: true, passive: true });
  window.setTimeout(hideOrbitHint, 9000);

  // Toast close delegation is handled per-toast; keep the container clickable.
  els.toastStack.addEventListener("click", (event) => {
    if (event.target === els.toastStack) return;
  });

  // Keyboard
  document.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveProjectFile();
    }
    if (modifier && event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      exportAtlasPNG();
    }
    if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
      closeDrawers();
    }
  });

  window.matchMedia("(min-width: 1121px)").addEventListener("change", (event) => {
    if (event.matches) closeDrawers({ immediate: true });
  });

  document.fonts?.ready?.then(() => {
    if (appState.inspectorTab === "ramp" && activeStrip()?.interpolation === "smooth") {
      drawCurveEditor();
    }
  });
}

function bindLightControls() {
  const updateLight = () => {
    appState.light.intensity = Number(els.lightIntensity.value);
    appState.light.azimuth = Number(els.lightAzimuth.value);
    appState.light.elevation = Number(els.lightElevation.value);
    els.lightIntensityValue.textContent = appState.light.intensity.toFixed(1);
    els.lightAzimuthValue.textContent = `${appState.light.azimuth}°`;
    els.lightElevationValue.textContent = `${appState.light.elevation}°`;
    [els.lightIntensity, els.lightAzimuth, els.lightElevation].forEach(syncRangeFill);
    viewer?.setLight(appState.light);
  };
  [els.lightIntensity, els.lightAzimuth, els.lightElevation].forEach((input) => {
    input.addEventListener("input", updateLight);
  });
  updateLight();

  els.btnResetLight.addEventListener("click", () => {
    appState.light = { ...DEFAULT_LIGHT };
    els.lightIntensity.value = String(DEFAULT_LIGHT.intensity);
    els.lightAzimuth.value = String(DEFAULT_LIGHT.azimuth);
    els.lightElevation.value = String(DEFAULT_LIGHT.elevation);
    updateLight();
  });
}

function bindRampDragAndDrop() {
  let draggedId = null;
  let target = null;

  const clearDropClasses = () => {
    $$(".ramp-item", els.rampList).forEach((item) => {
      item.classList.remove("is-drop-before", "is-drop-after");
    });
  };

  els.rampList.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-strip-id]");
    if (!item) return;
    draggedId = item.dataset.stripId;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", draggedId);
    } catch {
      // Some browsers restrict custom drag data; local state is enough.
    }
  });

  els.rampList.addEventListener("dragover", (event) => {
    if (!draggedId) return;
    event.preventDefault();
    const item = event.target.closest("[data-strip-id]");
    if (!item || item.dataset.stripId === draggedId) {
      clearDropClasses();
      target = null;
      return;
    }
    const bounds = item.getBoundingClientRect();
    const after = event.clientY > bounds.top + bounds.height / 2;
    if (target !== item || target.dataset.dropAfter !== String(after)) {
      clearDropClasses();
      target = item;
      target.dataset.dropAfter = String(after);
      item.classList.add(after ? "is-drop-after" : "is-drop-before");
    }
  });

  els.rampList.addEventListener("dragleave", (event) => {
    if (!els.rampList.contains(event.relatedTarget)) {
      clearDropClasses();
      target = null;
    }
  });

  els.rampList.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedId || !target) {
      clearDropClasses();
      return;
    }
    const project = appState.project;
    const fromIndex = project.strips.findIndex((strip) => strip.id === draggedId);
    let toIndex = project.strips.findIndex((strip) => strip.id === target.dataset.stripId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      clearDropClasses();
      return;
    }
    const after = target.dataset.dropAfter === "true";
    const [moved] = project.strips.splice(fromIndex, 1);
    if (fromIndex < toIndex) toIndex -= 1;
    if (after) toIndex += 1;
    toIndex = clamp(toIndex, 0, project.strips.length);
    project.strips.splice(toIndex, 0, moved);
    clearDropClasses();
    renderRampList();
    renderInspector({ preserveScroll: true });
    schedulePaletteRefresh();
    updateUvPreview();
    queueAutosave();
  });

  els.rampList.addEventListener("dragend", () => {
    draggedId = null;
    target = null;
    $$(".ramp-item", els.rampList).forEach((item) => item.classList.remove("is-dragging"));
    clearDropClasses();
  });
}

function handleInspectorInput(event) {
  const target = event.target;
  const strip = activeStrip();
  if (!strip) return;

  if (target.dataset.pbr) {
    handlePbrInput(target, strip);
    return;
  }

  if (target.dataset.adjust) {
    handleAdjustInput(target);
    return;
  }

  if (target.id === "strip-weight") {
    strip.weight = clamp(Number(target.value), 0.25, 8);
    syncRangeFill(target);
    const metric = getBandMetrics(appState.project).find((band) => band.id === strip.id);
    const output = $("#band-height-value", els.inspectorContent);
    if (output && metric) {
      output.textContent = `${metric.width} × ${metric.height}px`;
    }
    const hint = target.parentElement?.querySelector(".slider-field__hint");
    if (hint && metric) {
      hint.textContent = getEffectiveAtlasColumns(appState.project) > 1
        ? t("ramp.cellHint", { width: metric.width, percentage: Math.round(metric.percentage) })
        : t("ramp.singleColumnHint", { percentage: Math.round(metric.percentage) });
    }
    schedulePaletteRefresh();
    queueAutosave();
    return;
  }

  if (target.id === "strip-steps") {
    strip.steps = clamp(Math.round(Number(target.value)), 2, 16);
    syncRangeFill(target);
    const output = $("#steps-value", els.inspectorContent);
    if (output) output.textContent = String(strip.steps);
    const note = target.closest(".slider-field")?.nextElementSibling;
    if (note) {
      note.innerHTML = `${icon("grid")}<span>${t("ramp.stepsNote", { count: strip.steps })}</span>`;
    }
    drawRampGradient();
    schedulePaletteRefresh();
    queueAutosave();
    return;
  }

  if (target.id === "stop-position") {
    const stop = findStop(strip, appState.selectedStopId);
    if (!stop) return;
    stop.pos = clamp(Number(target.value) / 100, 0, 1);
    syncRangeFill(target);
    const output = $("#stop-position-value", els.inspectorContent);
    if (output) output.textContent = `${Math.round(stop.pos * 100)}%`;
    drawRampGradient();
    schedulePaletteRefresh();
    queueAutosave();
    return;
  }

  if (target.id === "stop-color") {
    const stop = findStop(strip, appState.selectedStopId);
    if (!stop) return;
    stop.color = normalizeHex(target.value);
    const hexField = $("#stop-hex", els.inspectorContent);
    const shell = $("#stop-color-shell", els.inspectorContent);
    if (hexField) hexField.value = stop.color;
    if (shell) shell.style.setProperty("--picked-color", stop.color);
    drawRampGradient();
    schedulePaletteRefresh();
    queueAutosave();
    return;
  }

  if (target.id === "stop-hex") {
    const stop = findStop(strip, appState.selectedStopId);
    if (!stop) return;
    const candidate = String(target.value).trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(candidate) || /^#?[0-9a-fA-F]{3}$/.test(candidate)) {
      stop.color = normalizeHex(candidate);
      const colorInput = $("#stop-color", els.inspectorContent);
      const shell = $("#stop-color-shell", els.inspectorContent);
      if (colorInput) colorInput.value = stop.color;
      if (shell) shell.style.setProperty("--picked-color", stop.color);
      drawRampGradient();
      schedulePaletteRefresh();
      queueAutosave();
    }
    return;
  }

  if (target.id === "ramp-name") {
    strip.name = target.value.slice(0, 48);
    const title = $("#ramp-title-text", els.inspectorContent);
    if (title) title.textContent = strip.name || t("ramp.untitled");
    const selectedItem = $$("[data-strip-id]", els.rampList).find((item) => item.dataset.stripId === strip.id);
    const nameNode = selectedItem?.querySelector(".ramp-item__name");
    if (nameNode) nameNode.textContent = strip.name || t("ramp.untitled");
    queueAutosave();
  }
}

function handlePbrInput(target, strip) {
  const key = target.dataset.pbr;
  if (!["roughness", "metallic", "emission", "opacity"].includes(key)) return;
  const max = key === "emission" ? appState.project.emissionScale : 1;
  const value = clamp(Number(target.value), 0, max);
  strip.pbr = normalizePbr({ ...strip.pbr, [key]: value }, appState.project.emissionScale);
  target.value = String(strip.pbr[key]);
  syncRangeFill(target);

  const output = target.closest(".pbr-field")?.querySelector("[data-pbr-output]");
  if (output) {
    const pbr = strip.pbr;
    const byte = key === "emission"
      ? Math.round((pbr.emission / appState.project.emissionScale) * 255)
      : Math.round(pbr[key] * 255);
    const channel = { roughness: "R", metallic: "G", emission: "B", opacity: "A" }[key];
    output.innerHTML = `${pbr[key].toFixed(2)} <small>${channel} ${byte}</small>`;
  }

  schedulePbrRefresh();
  queueAutosave();
}

function handleInspectorChange(event) {
  const target = event.target;
  const strip = activeStrip();
  if (!strip) return;

  if (target.id === "pbr-mask-size-select") {
    const size = Number(target.value);
    if (!PBR_MASK_SIZES.includes(size)) return;
    appState.project.pbrMaskSize = size;
    renderInspector();
    schedulePbrRefresh();
    queueAutosave();
    return;
  }

  if (target.id === "pbr-emission-scale") {
    const scale = Number(target.value);
    if (!EMISSION_SCALES.includes(scale)) return;
    const previousScale = appState.project.emissionScale;
    let clipped = false;
    appState.project.emissionScale = scale;
    appState.project.strips.forEach((item) => {
      if (Number(item.pbr?.emission) > scale) clipped = true;
      item.pbr = normalizePbr(item.pbr, scale);
    });
    renderInspector();
    schedulePbrRefresh();
    queueAutosave();
    if (clipped && scale < previousScale) {
      showToast({
        type: "info",
        title: t("toast.emissionClippedTitle"),
        message: t("toast.emissionClippedMessage", { scale }),
      });
    }
    return;
  }

  if (target.id === "stop-position") {
    reorderStopsByPosition();
    renderInspector();
    return;
  }

  if (target.id === "stop-hex") {
    const stop = findStop(strip, appState.selectedStopId);
    if (!stop) return;
    const value = String(target.value).trim();
    if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value)) {
      target.value = stop.color;
    } else {
      stop.color = normalizeHex(value);
      target.value = stop.color;
      drawRampGradient();
      schedulePaletteRefresh();
      queueAutosave();
    }
    return;
  }

  if (target.id === "ramp-name") {
    strip.name = (target.value.trim() || t("ramp.fallback", {
      index: appState.project.strips.indexOf(strip) + 1,
    })).slice(0, 48);
    target.value = strip.name;
    const title = $("#ramp-title-text", els.inspectorContent);
    if (title) title.textContent = strip.name;
    const selectedItem = $$("[data-strip-id]", els.rampList).find((item) => item.dataset.stripId === strip.id);
    const nameNode = selectedItem?.querySelector(".ramp-item__name");
    if (nameNode) nameNode.textContent = strip.name;
    queueAutosave();
    return;
  }

  if (target.id === "strip-weight") {
    renderRampList();
    renderInspector();
    schedulePaletteRefresh();
    queueAutosave();
  }
}

function handleInspectorClick(event) {
  const pbrViewButton = event.target.closest("[data-pbr-view]");
  if (pbrViewButton) {
    appState.pbrChannelView = pbrViewButton.dataset.pbrView;
    $$("[data-pbr-view]", els.inspectorContent).forEach((button) => {
      const active = button.dataset.pbrView === appState.pbrChannelView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    drawPbrPreview();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    event.preventDefault();
    const action = actionButton.dataset.action;
    if (action === "add-stop") addStop();
    if (action === "remove-stop") removeStop();
    if (action === "reset-curve") {
      const strip = activeStrip();
      if (!strip) return;
      strip.curve = { in: 0, out: 1 };
      renderInspector();
      schedulePaletteRefresh();
      queueAutosave();
    }
    if (action === "open-presets") openPresetModal();
    if (action === "reset-global") resetGlobalAdjustments();
    if (action === "add-ramp") addRamp();
    if (action === "export-pbr-mask") exportPbrMaskPNG();
    return;
  }

  const rampAction = event.target.closest("[data-ramp-action]");
  if (rampAction) {
    const action = rampAction.dataset.rampAction;
    if (action === "move-up") moveRamp(-1);
    if (action === "move-down") moveRamp(1);
    if (action === "duplicate") duplicateRamp();
    if (action === "delete") deleteRamp();
    return;
  }

  const interpolationButton = event.target.closest("[data-interpolation]");
  if (interpolationButton) {
    const strip = activeStrip();
    if (!strip) return;
    const mode = interpolationButton.dataset.interpolation;
    if (!["linear", "smooth", "steps"].includes(mode) || strip.interpolation === mode) return;
    strip.interpolation = mode;
    renderInspector();
    schedulePaletteRefresh();
    queueAutosave();
    return;
  }

  const orientationButton = event.target.closest("[data-orientation]");
  if (orientationButton) {
    const strip = activeStrip();
    if (!strip) return;
    const orientation = orientationButton.dataset.orientation;
    if (!["horizontal", "vertical"].includes(orientation) || strip.orientation === orientation) return;
    strip.orientation = orientation;
    renderRampList();
    renderInspector();
    schedulePaletteRefresh();
    queueAutosave();
  }
}

function handleInspectorPointerDown(event) {
  const marker = event.target.closest(".stop-marker");
  if (marker) {
    startStopDrag(event, marker);
    return;
  }
  const curveCanvas = event.target.closest("#curve-canvas");
  if (curveCanvas) {
    startCurveDrag(event, curveCanvas);
  }
}

function setMesh(type) {
  if (!MESH_LABEL_KEYS[type]) return;
  appState.mesh = type;
  $$(".mesh-tab", els.meshTabs).forEach((button) => {
    const active = button.dataset.mesh === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  updateCurrentMeshLabel();
  viewer?.setMesh(type);
}

function setShading(mode) {
  if (!["pbr", "toon"].includes(mode)) return;
  appState.shading = mode;
  $$("[data-shading]", els.shadingSwitcher).forEach((button) => {
    const active = button.dataset.shading === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  viewer?.setShading(mode);
}

/* =========================================================
   Three.js boot
   ========================================================= */
function bootViewer() {
  try {
    viewer = new ThreePreview({
      container: els.viewport,
      canvas: els.threeCanvas,
      textureCanvas: els.atlasCanvas,
      hasTexture: appState.project.strips.length > 0,
      pbrCanvas: pbrMaskCanvas,
    });
    viewer.setLight(appState.light);
    viewer.setShading(appState.shading);
    viewer.setMesh(appState.mesh, { animate: false });
    viewer.setAutoRotate(appState.autoRotate);
    updateUvPreview();
    refreshPbrMask();
    window.setTimeout(() => els.viewerLoader.classList.add("is-hidden"), 260);
  } catch (error) {
    console.error("Could not initialize Three.js:", error);
    els.viewerLoader.classList.add("is-hidden");
    els.webglFallback.hidden = false;
    showToast({
      type: "error",
      title: t("toast.webglTitle"),
      message: t("toast.webglMessage"),
      duration: 6500,
    });
  }
}

/* =========================================================
   Init
   ========================================================= */
function init() {
  initLanguage();
  updateLanguageButton();
  if (els.metaDescription) els.metaDescription.content = t("app.metaDescription");
  appState.userPresets = loadUserPresets();

  const saved = readStoredProject();
  appState.project = saved || createDefaultProject();
  const presetNamesChanged = localizePresetRampNames();
  appState.selectedStripId = appState.project.strips[0]?.id || null;
  appState.selectedStopId =
    interestingStop(appState.project.strips[0])?.id || null;
  ensureSelections();

  els.projectName.value = appState.project.name;
  document.title = `RampForge — ${appState.project.name}`;
  updateCurrentMeshLabel();
  ensurePbrMaskCanvas();
  bindEvents();
  renderAll();
  bootViewer();
  syncRangeFills(document);
  setSavingState({ saving: false });
  if (!saved || presetNamesChanged) queueAutosave();

  // Expose a tiny, read-only surface for debugging and automated smoke tests.
  Object.defineProperty(window, "RampForge", {
    value: {
      getProject: () => deepClone(appState.project),
      getUserPresets: () => deepClone(appState.userPresets),
      getState: () => ({
        selectedStripId: appState.selectedStripId,
        selectedStopId: appState.selectedStopId,
        inspectorTab: appState.inspectorTab,
        mesh: appState.mesh,
        shading: appState.shading,
        atlasColumns: appState.project.atlasColumns,
        pbrMaskSize: appState.project.pbrMaskSize,
        emissionScale: appState.project.emissionScale,
        pbrChannelView: appState.pbrChannelView,
        uvMode: appState.uvMode,
        uvRegion: appState.uvRegion ? { ...appState.uvRegion } : null,
        userPresetCount: appState.userPresets.length,
      }),
      getViewerUvRegion: () => viewer?.getUvRegion?.() || null,
      getLayout: () => getBandMetrics(appState.project),
    },
    configurable: false,
    writable: false,
  });
}

init();
