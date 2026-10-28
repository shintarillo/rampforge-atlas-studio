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

export const PBR_MASK_SIZES = [128, 256, 512, 1024];
export const EMISSION_SCALES = [1, 2, 4, 8];
export const DEFAULT_PBR = Object.freeze({
  roughness: 0.72,
  metallic: 0,
  emission: 0,
  opacity: 1,
});

const isFiniteNumber = (value) => value !== "" && value !== null && Number.isFinite(Number(value));

export function normalizePbr(input, emissionScale = 4) {
  const source = input && typeof input === "object" ? input : {};
  const read = (value, fallback) => (isFiniteNumber(value) ? Number(value) : fallback);
  return {
    roughness: clamp(read(source.roughness, DEFAULT_PBR.roughness), 0, 1),
    metallic: clamp(read(source.metallic, DEFAULT_PBR.metallic), 0, 1),
    emission: clamp(read(source.emission, DEFAULT_PBR.emission), 0, emissionScale),
    opacity: clamp(read(source.opacity, DEFAULT_PBR.opacity), 0, 1),
  };
}

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
  const emissionScale = clamp(Number(overrides.emissionScale) || 4, 1, 16);
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
    pbr: normalizePbr(overrides.pbr || preset.pbr, emissionScale),
    stops: preset.stops.map((stop) => makeStop(stop.color, stop.pos)),
  };
}

export function createBlankStrip(overrides = {}) {
  const name = normalizeName(overrides.name, "Nueva rampa");
  const emissionScale = clamp(Number(overrides.emissionScale) || 4, 1, 16);
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
    pbr: normalizePbr(overrides.pbr, emissionScale),
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
    {
      preset: "wood-warm",
      name: "Madera cálida",
      weight: 1.12,
      orientation: "horizontal",
      pbr: { roughness: 0.8, metallic: 0, emission: 0, opacity: 1 },
    },
    {
      preset: "gold-polished",
      name: "Oro pulido",
      weight: 0.98,
      orientation: "horizontal",
      pbr: { roughness: 0.27, metallic: 1, emission: 0, opacity: 1 },
    },
    {
      preset: "crystal-prism",
      name: "Cristal prismático",
      weight: 0.86,
      orientation: "vertical",
      pbr: { roughness: 0.12, metallic: 0.12, emission: 0.8, opacity: 1 },
    },
    {
      preset: "leather-worn",
      name: "Cuero envejecido",
      weight: 1.06,
      orientation: "horizontal",
      pbr: { roughness: 0.74, metallic: 0, emission: 0, opacity: 1 },
    },
    {
      preset: "volcanic-stone",
      name: "Piedra volcánica",
      weight: 1.14,
      orientation: "horizontal",
      pbr: { roughness: 0.92, metallic: 0.03, emission: 0.18, opacity: 1 },
    },
    {
      preset: "fabric-olive",
      name: "Tela oliva",
      weight: 0.96,
      orientation: "vertical",
      pbr: { roughness: 0.87, metallic: 0, emission: 0, opacity: 1 },
    },
  ];

  const strips = definitions.map((definition) => {
    const preset = getPreset(definition.preset);
    return stripFromPreset(preset, {
      name: definition.name,
      weight: definition.weight,
      orientation: definition.orientation,
      pbr: definition.pbr,
    });
  });

  return {
    version: 1,
    name: "Paleta de Estudio",
    atlasSize: 1024,
    atlasColumns: 2,
    pbrMaskSize: 256,
    emissionScale: 4,
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

  const emissionScale = EMISSION_SCALES.includes(Number(source.emissionScale))
    ? Number(source.emissionScale)
    : 4;
  const pbrMaskSize = PBR_MASK_SIZES.includes(Number(source.pbrMaskSize))
    ? Number(source.pbrMaskSize)
    : 256;

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
        pbr: normalizePbr(strip.pbr, emissionScale),
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
    pbrMaskSize,
    emissionScale,
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
