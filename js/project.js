import { ATLAS_SIZES, clamp, uid, normalizeHex, deepClone } from "./utils.js";
import { getPreset } from "./presets.js";

const DEFAULT_ADJUSTMENTS = {
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  warmth: 0,
  tint: 0,
};

const isFiniteNumber = (value) => value !== "" && value !== null && Number.isFinite(Number(value));

function normalizeName(value, fallback) {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (name || fallback).slice(0, 64);
}

export function makeStop(color = "#808080", pos = 0) {
  return {
    id: uid("stop"),
    color: normalizeHex(color),
    pos: clamp(Number(pos) || 0),
  };
}

export function stripFromPreset(preset, overrides = {}) {
  if (!preset) return createBlankStrip(overrides);
  return {
    id: overrides.id || uid("ramp"),
    name: overrides.name || preset.name,
    orientation: overrides.orientation || "horizontal",
    weight: clamp(Number(overrides.weight ?? 1), 0.25, 8),
    interpolation: preset.interpolation || "smooth",
    curve: {
      in: clamp(Number(preset.curve?.in ?? 0), 0, 1),
      out: clamp(Number(preset.curve?.out ?? 1), 0, 1),
    },
    steps: clamp(Math.round(Number(preset.steps) || 4), 2, 16),
    stops: preset.stops.map((stop) => makeStop(stop.color, stop.pos)),
  };
}

export function createBlankStrip(overrides = {}) {
  const name = normalizeName(overrides.name, "Nueva rampa");
  return {
    id: overrides.id || uid("ramp"),
    name,
    orientation: overrides.orientation === "vertical" ? "vertical" : "horizontal",
    weight: clamp(Number(overrides.weight ?? 1), 0.25, 8),
    interpolation: overrides.interpolation || "smooth",
    curve: {
      in: clamp(Number(overrides.curve?.in ?? 0.08), 0, 1),
      out: clamp(Number(overrides.curve?.out ?? 0.92), 0, 1),
    },
    steps: clamp(Math.round(Number(overrides.steps) || 4), 2, 16),
    stops:
      Array.isArray(overrides.stops) && overrides.stops.length >= 2
        ? overrides.stops.map((stop) => makeStop(stop.color, stop.pos))
        : [
            makeStop("#171a21", 0),
            makeStop("#59616f", 0.38),
            makeStop("#c8c3b5", 0.72),
            makeStop("#f3e9d4", 1),
          ],
  };
}

export function cloneStrip(strip, overrides = {}) {
  return {
    ...deepClone(strip),
    ...overrides,
    id: overrides.id || uid("ramp"),
    stops: strip.stops.map((stop) => ({
      ...stop,
      id: uid("stop"),
    })),
  };
}

export function createDefaultProject() {
  const definitions = [
    { preset: "wood-warm", name: "Madera cálida", weight: 1.12, orientation: "horizontal" },
    { preset: "gold-polished", name: "Oro pulido", weight: 0.98, orientation: "horizontal" },
    { preset: "crystal-prism", name: "Cristal prismático", weight: 0.86, orientation: "vertical" },
    { preset: "leather-worn", name: "Cuero envejecido", weight: 1.06, orientation: "horizontal" },
    { preset: "volcanic-stone", name: "Piedra volcánica", weight: 1.14, orientation: "horizontal" },
    { preset: "fabric-olive", name: "Tela oliva", weight: 0.96, orientation: "vertical" },
  ];

  const strips = definitions.map((definition) => {
    const preset = getPreset(definition.preset);
    return stripFromPreset(preset, {
      name: definition.name,
      weight: definition.weight,
      orientation: definition.orientation,
    });
  });

  return {
    version: 1,
    name: "Paleta de Estudio",
    atlasSize: 1024,
    atlasColumns: 2,
    globalAdjust: { ...DEFAULT_ADJUSTMENTS },
    strips,
  };
}

function normalizeStops(inputStops) {
  let stops = Array.isArray(inputStops)
    ? inputStops
        .filter((stop) => stop && typeof stop === "object")
        .map((stop) => ({
          id: typeof stop.id === "string" && stop.id ? stop.id : uid("stop"),
          color: normalizeHex(stop.color, "#808080"),
          pos: clamp(isFiniteNumber(stop.pos) ? Number(stop.pos) : 0),
        }))
        .sort((a, b) => a.pos - b.pos)
        .slice(0, 24)
    : [];

  if (stops.length === 0) {
    stops = [makeStop("#161820", 0), makeStop("#d8d4c8", 1)];
  } else if (stops.length === 1) {
    const only = stops[0];
    if (only.pos <= 0.001) {
      stops.push(makeStop(only.color, 1));
    } else {
      stops.unshift(makeStop(only.color, 0));
    }
  }

  const usedIds = new Set();
  stops = stops.map((stop) => {
    const id = usedIds.has(stop.id) ? uid("stop") : stop.id;
    usedIds.add(id);
    return { ...stop, id };
  });

  return stops;
}

export function normalizeProject(input) {
  if (!input || typeof input !== "object") {
    throw new Error("El archivo no contiene un proyecto válido.");
  }

  const source = input.project && typeof input.project === "object" && Array.isArray(input.project.strips)
    ? input.project
    : input;

  if (!Array.isArray(source.strips)) {
    throw new Error("El proyecto no contiene una lista de rampas.");
  }

  const usedStripIds = new Set();
  const strips = source.strips
    .filter((strip) => strip && typeof strip === "object")
    .map((strip, index) => {
      let id = typeof strip.id === "string" && strip.id ? strip.id : uid("ramp");
      if (usedStripIds.has(id)) id = uid("ramp");
      usedStripIds.add(id);

      const orientation = strip.orientation === "vertical" ? "vertical" : "horizontal";
      const interpolation = ["smooth", "linear", "steps"].includes(strip.interpolation)
        ? strip.interpolation
        : "smooth";

      return {
        id,
        name: normalizeName(strip.name, `Rampa ${index + 1}`),
        orientation,
        weight: clamp(isFiniteNumber(strip.weight) ? Number(strip.weight) : 1, 0.25, 8),
        interpolation,
        curve: {
          in: clamp(isFiniteNumber(strip.curve?.in) ? Number(strip.curve.in) : 0, 0, 1),
          out: clamp(isFiniteNumber(strip.curve?.out) ? Number(strip.curve.out) : 1, 0, 1),
        },
        steps: clamp(
          Math.round(isFiniteNumber(strip.steps) ? Number(strip.steps) : 4),
          2,
          16,
        ),
        stops: normalizeStops(strip.stops),
      };
    });

  const atlasSize = ATLAS_SIZES.includes(Number(source.atlasSize))
    ? Number(source.atlasSize)
    : 1024;

  const requestedColumns = isFiniteNumber(source.atlasColumns)
    ? Math.round(Number(source.atlasColumns))
    : 1;
  const atlasColumns = clamp(requestedColumns, 1, 4);

  const adjustments = source.globalAdjust && typeof source.globalAdjust === "object"
    ? source.globalAdjust
    : {};

  return {
    version: 1,
    name: normalizeName(source.name, "Proyecto sin título"),
    atlasSize,
    atlasColumns,
    globalAdjust: {
      hue: clamp(isFiniteNumber(adjustments.hue) ? Number(adjustments.hue) : 0, -180, 180),
      saturation: clamp(isFiniteNumber(adjustments.saturation) ? Number(adjustments.saturation) : 0, -100, 100),
      brightness: clamp(isFiniteNumber(adjustments.brightness) ? Number(adjustments.brightness) : 0, -100, 100),
      contrast: clamp(isFiniteNumber(adjustments.contrast) ? Number(adjustments.contrast) : 0, -100, 100),
      warmth: clamp(isFiniteNumber(adjustments.warmth) ? Number(adjustments.warmth) : 0, -100, 100),
      tint: clamp(isFiniteNumber(adjustments.tint) ? Number(adjustments.tint) : 0, -100, 100),
    },
    strips,
  };
}

export function buildProjectPayload(project) {
  return {
    format: "rampforge-atlas-project",
    version: 1,
    application: "RampForge Atlas Studio",
    savedAt: new Date().toISOString(),
    project: deepClone(project),
  };
}

export function isProjectEmpty(project) {
  return !project || !Array.isArray(project.strips) || project.strips.length === 0;
}
