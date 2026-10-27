/**
 * Small, dependency-free helpers shared by the editor, the atlas rasterizer
 * and the Three.js preview.
 */

export const ATLAS_SIZES = [256, 512, 1024, 2048];
export const DEFAULT_CURVE = Object.freeze({ in: 0, out: 1 });
export const DEFAULT_ADJUSTMENTS = Object.freeze({
  hue: 0,
  saturation: 0,
  brightness: 0,
  contrast: 0,
  warmth: 0,
  tint: 0,
});

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

export function uid(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function pad2(number) {
  return String(number).padStart(2, "0");
}

export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function icon(name, className = "icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

export function normalizeHex(value, fallback = "#808080") {
  if (typeof value !== "string") return fallback;
  let hex = value.trim().toLowerCase();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : fallback;
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Returns hue/saturation/lightness in 0..1 range. Input RGB is 0..255. */
export function rgbToHsl(r, g, b) {
  const rn = clamp(r / 255, 0, 1);
  const gn = clamp(g / 255, 0, 1);
  const bn = clamp(b / 255, 0, 1);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h /= 6;
    if (h < 0) h += 1;
  }

  return { h, s: clamp(s), l: clamp(l) };
}

export function hslToRgb(h, s, l) {
  const hue = ((h % 1) + 1) % 1;
  const sat = clamp(s);
  const light = clamp(l);

  if (sat === 0) {
    const value = light * 255;
    return { r: value, g: value, b: value };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  const hueToChannel = (t) => {
    let channel = t;
    if (channel < 0) channel += 1;
    if (channel > 1) channel -= 1;
    if (channel < 1 / 6) return p + (q - p) * 6 * channel;
    if (channel < 1 / 2) return q;
    if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
    return p;
  };

  return {
    r: hueToChannel(hue + 1 / 3) * 255,
    g: hueToChannel(hue) * 255,
    b: hueToChannel(hue - 1 / 3) * 255,
  };
}

export function relativeLuminance(r, g, b) {
  const linearize = (value) => {
    const v = clamp(value / 255, 0, 1);
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Applies the full non-destructive palette grade to a single sRGB color.
 * Returns integer RGB values.
 */
export function applyPaletteAdjustment(color, adjustments = DEFAULT_ADJUSTMENTS) {
  const source = typeof color === "string" ? hexToRgb(color) : color;
  const grade = { ...DEFAULT_ADJUSTMENTS, ...(adjustments || {}) };

  const hsl = rgbToHsl(source.r, source.g, source.b);
  let hue = (hsl.h + Number(grade.hue) / 360) % 1;
  hue = ((hue % 1) + 1) % 1;

  let saturation = hsl.s;
  if (grade.saturation > 0) {
    saturation += (1 - saturation) * (Number(grade.saturation) / 100) * 0.68;
  } else if (grade.saturation < 0) {
    saturation *= 1 + Number(grade.saturation) / 100;
  }
  saturation = clamp(saturation);

  let lightness = hsl.l;
  if (grade.brightness > 0) {
    lightness += (1 - lightness) * (Number(grade.brightness) / 100) * 0.62;
  } else if (grade.brightness < 0) {
    lightness *= 1 + Number(grade.brightness) / 100;
  }

  if (grade.contrast !== 0) {
    lightness = (lightness - 0.5) * (1 + Number(grade.contrast) / 100 * 0.82) + 0.5;
  }
  lightness = clamp(lightness);

  let rgb = hslToRgb(hue, saturation, lightness);
  const luma = relativeLuminance(rgb.r, rgb.g, rgb.b);

  const warmth = clamp(Number(grade.warmth), -100, 100) / 100;
  if (warmth !== 0) {
    const highlights = smoothstep(0.25, 0.92, luma);
    const shadows = 1 - smoothstep(0.08, 0.6, luma);
    const amount = Math.abs(warmth);
    const highTarget = warmth > 0 ? { r: 255, g: 183, b: 112 } : { r: 126, g: 185, b: 255 };
    const shadowTarget = warmth > 0 ? { r: 87, g: 125, b: 185 } : { r: 235, g: 151, b: 94 };
    const highMix = highlights * amount * 0.22;
    const shadowMix = shadows * amount * 0.15;
    rgb = {
      r: rgb.r + (highTarget.r - rgb.r) * highMix + (shadowTarget.r - rgb.r) * shadowMix,
      g: rgb.g + (highTarget.g - rgb.g) * highMix + (shadowTarget.g - rgb.g) * shadowMix,
      b: rgb.b + (highTarget.b - rgb.b) * highMix + (shadowTarget.b - rgb.b) * shadowMix,
    };
  }

  const tint = clamp(Number(grade.tint), -100, 100) / 100;
  if (tint !== 0) {
    const target = tint > 0 ? { r: 243, g: 121, b: 206 } : { r: 117, g: 218, b: 151 };
    const amount = Math.abs(tint) * (0.07 + luma * 0.08);
    rgb = {
      r: rgb.r + (target.r - rgb.r) * amount,
      g: rgb.g + (target.g - rgb.g) * amount,
      b: rgb.b + (target.b - rgb.b) * amount,
    };
  }

  return {
    r: Math.round(clamp(rgb.r, 0, 255)),
    g: Math.round(clamp(rgb.g, 0, 255)),
    b: Math.round(clamp(rgb.b, 0, 255)),
  };
}

export function adjustedHex(color, adjustments) {
  const rgb = applyPaletteAdjustment(color, adjustments);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** Cubic ease with fixed control-point X positions (0.333, 0.667). */
export function easeCurve(t, curve = DEFAULT_CURVE) {
  const u = clamp(t);
  const c1 = clamp(Number(curve?.in ?? DEFAULT_CURVE.in), 0, 1);
  const c2 = clamp(Number(curve?.out ?? DEFAULT_CURVE.out), 0, 1);
  const v = 1 - u;
  return 3 * v * v * u * c1 + 3 * v * u * u * c2 + u * u * u;
}

export function mixRgb(colorA, colorB, t) {
  const a = typeof colorA === "string" ? hexToRgb(colorA) : colorA;
  const b = typeof colorB === "string" ? hexToRgb(colorB) : colorB;
  const amount = clamp(t);
  return {
    r: Math.round(lerp(a.r, b.r, amount)),
    g: Math.round(lerp(a.g, b.g, amount)),
    b: Math.round(lerp(a.b, b.b, amount)),
  };
}

export function formatBytes(bytes, digits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : digits)} ${units[exponent]}`;
}

export function slugify(value, fallback = "rampforge-atlas") {
  const slug = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(text, filename, type = "application/json") {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

export function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function formatSigned(value, suffix = "") {
  const number = Number(value) || 0;
  const sign = number > 0 ? "+" : "";
  return `${sign}${number}${suffix}`;
}

export function getLargestGap(stops) {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  let best = { start: 0, end: 1, size: -1 };
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index].pos;
    const end = sorted[index + 1].pos;
    if (end - start > best.size) {
      best = { start, end, size: end - start };
    }
  }
  if (best.size < 0) return { start: 0, end: 1, position: 0.5, size: 1 };
  return {
    start: best.start,
    end: best.end,
    position: (best.start + best.end) / 2,
    size: best.size,
  };
}
