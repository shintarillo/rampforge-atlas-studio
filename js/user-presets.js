import { clamp, normalizeHex } from "./utils.js";
import { normalizePbr } from "./project.js";

const STORAGE_KEY = "rampforge.presets.v1";
export const CUSTOM_PRESET_CATEGORY = "Personalizados";
export const MAX_USER_PRESETS = 80;

function normalizeStops(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((stop) => stop && typeof stop === "object")
    .map((stop) => ({
      color: normalizeHex(stop.color, "#808080"),
      pos: clamp(Number(stop.pos) || 0),
    }))
    .sort((a, b) => a.pos - b.pos);
}

function normalizeUserPreset(input) {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name || "").trim().replace(/\s+/g, " ").slice(0, 48);
  const stops = normalizeStops(input.stops);
  if (!name || stops.length < 2) return null;
  const id = typeof input.id === "string" && input.id.startsWith("custom-")
    ? input.id
    : `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    custom: true,
    name,
    description: String(input.description || "").trim().replace(/\s+/g, " ").slice(0, 120),
    category: CUSTOM_PRESET_CATEGORY,
    interpolation: ["smooth", "linear", "steps"].includes(input.interpolation)
      ? input.interpolation
      : "smooth",
    curve: {
      in: clamp(Number(input.curve?.in ?? 0), 0, 1),
      out: clamp(Number(input.curve?.out ?? 1), 0, 1),
    },
    steps: clamp(Math.round(Number(input.steps) || 4), 2, 16),
    pbr: input.pbr && typeof input.pbr === "object" ? normalizePbr(input.pbr, 16) : null,
    stops,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
  };
}

export function loadUserPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map(normalizeUserPreset)
      .filter((preset) => {
        if (!preset || seen.has(preset.id)) return false;
        seen.add(preset.id);
        return true;
      })
      .slice(0, MAX_USER_PRESETS);
  } catch {
    return [];
  }
}

export function persistUserPresets(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_USER_PRESETS)));
    return true;
  } catch {
    return false;
  }
}

export function createUserPreset(strip, { name, description } = {}) {
  const stops = normalizeStops(strip?.stops);
  if (!strip || stops.length < 2) return null;
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    custom: true,
    name: String(name || strip.name || "").trim().replace(/\s+/g, " ").slice(0, 48),
    description: String(description || "").trim().replace(/\s+/g, " ").slice(0, 120),
    category: CUSTOM_PRESET_CATEGORY,
    interpolation: strip.interpolation,
    curve: {
      in: clamp(Number(strip.curve?.in ?? 0), 0, 1),
      out: clamp(Number(strip.curve?.out ?? 1), 0, 1),
    },
    steps: clamp(Math.round(Number(strip.steps) || 4), 2, 16),
    pbr: normalizePbr(strip.pbr, 16),
    stops,
    createdAt: new Date().toISOString(),
  };
}
