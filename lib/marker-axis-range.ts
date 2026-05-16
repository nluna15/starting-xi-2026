// Auto-fit axis range for marker-driven bar charts (squad age, caps, value).
//
// Strategy:
//   1. Zoom tight around the marker neighborhood so adjacent labels have
//      enough horizontal room to land on one row.
//   2. Never go below a per-metric floor, so the bar still reads as a
//      meaningful scale rather than a microscope.
//   3. Snap endpoints to a nice interval so axis labels stay clean.
//
// When markers are unavoidably close together (e.g. three squad averages
// within 0.1y of each other), the floor wins and the bar's existing
// collision-stacking logic handles the residual label overlap.

export interface AxisRangeOptions {
  values: number[];
  minRangeFloor: number;
  snapTo: number;
  edgePadFraction?: number;
  allowNegative?: boolean;
}

export function computeMarkerAxisRange({
  values,
  minRangeFloor,
  snapTo,
  edgePadFraction = 0.12,
  allowNegative = false,
}: AxisRangeOptions): { min: number; max: number } {
  if (values.length === 0) {
    return { min: 0, max: minRangeFloor };
  }

  const markerMin = Math.min(...values);
  const markerMax = Math.max(...values);
  const markerSpread = markerMax - markerMin;

  // Markers should occupy at most (1 - 2 * edgePad) of the bar so they don't
  // crash into the endpoint labels.
  const usableFraction = Math.max(0.1, 1 - 2 * edgePadFraction);
  const rangeForMarkerFit = markerSpread / usableFraction;
  const range = Math.max(rangeForMarkerFit, minRangeFloor);

  const center = (markerMin + markerMax) / 2;
  let axisMin = Math.floor((center - range / 2) / snapTo) * snapTo;
  let axisMax = Math.ceil((center + range / 2) / snapTo) * snapTo;

  if (!allowNegative && axisMin < 0) {
    const shift = -axisMin;
    axisMin = 0;
    axisMax = Math.ceil((axisMax + shift) / snapTo) * snapTo;
  }

  return { min: axisMin, max: axisMax };
}
