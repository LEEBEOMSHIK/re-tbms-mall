/** Fit garment bounds without stretching the authored silhouette. */
export function studioDistance(width: number, height: number, depth: number, aspect: number, fov = 38) {
  const tangent = Math.tan(fov * Math.PI / 360);
  return Math.max(height / 2, width / (2 * Math.max(.2, aspect))) / tangent * 1.1 + depth / 2;
}
