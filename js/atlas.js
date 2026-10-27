import { applyPaletteAdjustment, clamp, hexToRgb, rgbToHex, easeCurve } from "./utils.js";

/**
 * Creates a fast color sampler for a ramp. Palette adjustments are baked into
 * the stop colors once so scanning an entire atlas does not repeat HSL work
 * for every pixel.
 */
export function createStripSampler(strip, adjustments = null) {
  const sourceStops = Array.isArray(strip?.stops) ? [...strip.stops] : [];
  const stops = sourceStops
    .filter((stop) => stop && Number.isFinite(Number(stop.pos)))
    .map((stop) => {
      const rgb = adjustments
        ? applyPaletteAdjustment(stop.color, adjustments)
        : hexToRgb(stop.color);
      return { pos: clamp(Number(stop.pos)), ...rgb };
    })
    .sort((a, b) => a.pos - b.pos);

  if (stops.length === 0) {
    return () => [128, 128, 128];
  }

  const interpolation = strip?.interpolation || "smooth";
  const curve = strip?.curve || { in: 0, out: 1 };
  const stepCount = clamp(Math.round(Number(strip?.steps) || 4), 2, 16);

  return function sample(tRaw) {
    let t = clamp(Number(tRaw) || 0);

    if (interpolation === "steps") {
      const bucket = clamp(Math.floor(t * stepCount - 1e-7), 0, stepCount - 1);
      t = bucket / (stepCount - 1);
    }

    if (stops.length === 1 || t <= stops[0].pos) {
      return [stops[0].r, stops[0].g, stops[0].b];
    }
    const last = stops[stops.length - 1];
    if (t >= last.pos) {
      return [last.r, last.g, last.b];
    }

    let left = stops[0];
    let right = last;
    for (let index = 0; index < stops.length - 1; index += 1) {
      if (t >= stops[index].pos && t <= stops[index + 1].pos) {
        left = stops[index];
        right = stops[index + 1];
        break;
      }
    }

    const span = right.pos - left.pos;
    let local = span <= 1e-7 ? 0 : (t - left.pos) / span;
    if (interpolation === "smooth") local = easeCurve(local, curve);

    return [
      Math.round(left.r + (right.r - left.r) * local),
      Math.round(left.g + (right.g - left.g) * local),
      Math.round(left.b + (right.b - left.b) * local),
    ];
  };
}

export function sampleStripColor(strip, position, adjustments = null) {
  const sample = createStripSampler(strip, adjustments);
  const [r, g, b] = sample(position);
  return rgbToHex(r, g, b);
}

/** Draws a horizontal gradient preview into an arbitrary canvas. */
export function renderRampToCanvas(canvas, strip, adjustments = null, options = {}) {
  if (!canvas) return;
  const width = Math.max(2, Math.round(options.width || canvas.width || 512));
  const height = Math.max(2, Math.round(options.height || canvas.height || 64));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  if (!strip || !Array.isArray(strip.stops) || strip.stops.length === 0) {
    context.clearRect(0, 0, width, height);
    return;
  }

  const sample = createStripSampler(strip, adjustments);
  const image = context.createImageData(width, height);
  const data = image.data;
  const row = new Uint8ClampedArray(width * 4);

  for (let x = 0; x < width; x += 1) {
    const [r, g, b] = sample(width === 1 ? 0 : x / (width - 1));
    const offset = x * 4;
    row[offset] = r;
    row[offset + 1] = g;
    row[offset + 2] = b;
    row[offset + 3] = 255;
  }

  for (let y = 0; y < height; y += 1) {
    data.set(row, y * width * 4);
  }

  context.putImageData(image, 0, 0);
}

export const MAX_ATLAS_COLUMNS = 4;

/**
 * Returns the number of columns actually used by the atlas. The requested
 * number is capped by the number of ramps so the texture never contains empty
 * columns and always fills its full area.
 */
export function getEffectiveAtlasColumns(project) {
  const strips = Array.isArray(project?.strips) ? project.strips : [];
  if (strips.length === 0) return 0;
  const requested = clamp(Math.round(Number(project?.atlasColumns) || 1), 1, MAX_ATLAS_COLUMNS);
  return Math.min(requested, strips.length);
}

/**
 * Computes independent vertical column stacks. Every column fills the full
 * atlas height; each ramp's relative weight is normalized inside its column.
 */
export function computeAtlasLayout(project) {
  const size = clamp(Math.round(Number(project?.atlasSize) || 1024), 16, 4096);
  const strips = Array.isArray(project?.strips) ? project.strips : [];
  const columns = getEffectiveAtlasColumns(project);
  if (strips.length === 0 || columns === 0) {
    return { cells: [], columns: 0, requestedColumns: 0, size };
  }

  const groups = Array.from({ length: columns }, () => []);

  // Alternating assignments keep the layout stable when weights change.
  strips.forEach((strip, index) => {
    groups[index % columns].push({ strip, index });
  });

  const cells = new Array(strips.length);

  groups.forEach((group, columnIndex) => {
    const left = Math.round((columnIndex * size) / columns);
    const right = Math.round(((columnIndex + 1) * size) / columns);
    const width = Math.max(0, right - left);
    const totalWeight = group.reduce(
      (sum, item) => sum + clamp(Number(item.strip.weight) || 1, 0.25, 8),
      0,
    );
    let cumulative = 0;

    group.forEach(({ strip, index }, rowIndex) => {
      const weight = clamp(Number(strip.weight) || 1, 0.25, 8);
      const top = Math.round((cumulative / totalWeight) * size);
      cumulative += weight;
      const bottom = rowIndex === group.length - 1
        ? size
        : Math.round((cumulative / totalWeight) * size);
      const height = Math.max(0, bottom - top);
      const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;

      cells[index] = {
        id: strip.id,
        name: strip.name,
        index,
        column: columnIndex,
        columns,
        rowIndex,
        rowCount: group.length,
        left,
        right,
        width,
        top,
        bottom,
        height,
        weight,
        percentage,
        areaPercentage: size > 0 ? (width * height * 100) / (size * size) : 0,
        orientation: strip.orientation,
      };
    });
  });

  return {
    cells,
    columns,
    requestedColumns: clamp(Math.round(Number(project?.atlasColumns) || 1), 1, MAX_ATLAS_COLUMNS),
    size,
  };
}

/** Layout metadata without rasterizing the atlas. */
export function getBandMetrics(project) {
  return computeAtlasLayout(project).cells;
}

export function getBandHeightForStrip(project, stripId) {
  return getBandMetrics(project).find((band) => band.id === stripId)?.height ?? 0;
}

/**
 * Draws the flattened atlas. Returns cell metadata that can be used by the UI.
 */
export function renderAtlasToCanvas(canvas, project, options = {}) {
  if (!canvas) return { bands: [], cells: [], size: 0 };
  const size = clamp(Math.round(Number(project?.atlasSize) || 1024), 16, 4096);
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return { bands: [], cells: [], size };

  const strips = Array.isArray(project?.strips) ? project.strips : [];
  const adjustments = options.adjustments ?? project?.globalAdjust ?? null;

  if (strips.length === 0) {
    context.clearRect(0, 0, size, size);
    return { bands: [], cells: [], size, columns: 0 };
  }

  const layout = computeAtlasLayout(project);
  const cells = layout.cells;

  // Reuse a buffer per canvas to avoid allocating several MB on every tweak.
  let cache = imageCache.get(canvas);
  if (!cache || cache.image.width !== size || cache.image.height !== size) {
    cache = { image: context.createImageData(size, size) };
    imageCache.set(canvas, cache);
  }
  const image = cache.image;
  const data = image.data;
  data.fill(0);

  cells.forEach((cell) => {
    if (cell.width <= 0 || cell.height <= 0) return;
    const strip = strips[cell.index];
    if (!strip) return;
    const sample = createStripSampler(strip, adjustments);
    const isHorizontal = strip.orientation !== "vertical";
    const row = new Uint8ClampedArray(cell.width * 4);

    if (isHorizontal) {
      for (let x = 0; x < cell.width; x += 1) {
        const [r, g, b] = sample(cell.width <= 1 ? 0 : x / (cell.width - 1));
        const offset = x * 4;
        row[offset] = r;
        row[offset + 1] = g;
        row[offset + 2] = b;
        row[offset + 3] = 255;
      }
      for (let y = cell.top; y < cell.bottom; y += 1) {
        data.set(row, (y * size + cell.left) * 4);
      }
    } else {
      const denominator = Math.max(1, cell.height - 1);
      for (let y = cell.top; y < cell.bottom; y += 1) {
        const [r, g, b] = sample((y - cell.top) / denominator);
        for (let x = 0; x < cell.width; x += 1) {
          const offset = x * 4;
          row[offset] = r;
          row[offset + 1] = g;
          row[offset + 2] = b;
          row[offset + 3] = 255;
        }
        data.set(row, (y * size + cell.left) * 4);
      }
    }
  });

  context.putImageData(image, 0, 0);
  return {
    bands: cells,
    cells,
    size,
    columns: layout.columns,
    requestedColumns: layout.requestedColumns,
  };
}

const imageCache = new WeakMap();

export function paintCanvasFromCanvas(target, source) {
  if (!target || !source) return;
  if (target.width !== source.width) target.width = source.width;
  if (target.height !== source.height) target.height = source.height;
  const context = target.getContext("2d", { alpha: true });
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0);
}
