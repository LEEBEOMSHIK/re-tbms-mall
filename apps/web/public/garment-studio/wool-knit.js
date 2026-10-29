/** Reference-based stockinette yarn model, authored from knitting structure.
 * No pixels are copied from the user's photograph. Not a measured fabric scan. */
export const WOOL_KNIT_TILE_METERS = .108;
const COLUMNS = 24, ROWS = 20, CELL = 128, TAU = 2 * Math.PI;
const fract = (x) => x - Math.floor(x);
let cell;
function stitchCell() {
    if (cell)
        return cell;
    const segments = [];
    // Two curved yarn legs converge into a V, with the returning head tucked
    // behind the next course. Rounded cylindrical cross sections provide depth.
    const point = (t, side) => {
        const q = 1 - t;
        const x = q * q * q * .12 + 3 * q * q * t * .16 + 3 * q * t * t * .34 + t * t * t * .5;
        const y = q * q * q * (-.16) + 3 * q * q * t * .18 + 3 * q * t * t * .58 + t * t * t * .84;
        return { x: side === 1 ? x : 1 - x, y };
    };
    for (const side of [-1, 1])
        for (let i = 0; i < 32; i++) {
            const a = point(i / 32, side), b = point((i + 1) / 32, side);
            segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, along: i / 32, side });
        }
    const result = new Float64Array(CELL * CELL);
    for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
            const px = x / CELL, py = y / CELL;
            let nearest = Infinity, along = 0, cross = 0;
            for (const s of segments)
                for (let row = -1; row <= 1; row++) {
                    const dx = s.bx - s.ax, dy = s.by - s.ay;
                    const tx = px - s.ax, ty = py + row - s.ay;
                    const t = Math.max(0, Math.min(1, (tx * dx + ty * dy) / (dx * dx + dy * dy)));
                    const ex = tx - t * dx, ey = ty - t * dy, distance = Math.hypot(ex, ey);
                    if (distance < nearest) {
                        nearest = distance;
                        along = s.along + t / 32;
                        cross = (ex * dy - ey * dx) / Math.hypot(dx, dy) * s.side;
                    }
                }
            const radius = .176 + .016 * Math.sin(TAU * (along * 2.3 + cross * 3));
            const tube = Math.sqrt(Math.max(0, 1 - (nearest / radius) ** 2));
            const twist = .82 + .18 * Math.cos(TAU * (along * 10 + cross * 9));
            const fiber = .92 + .08 * Math.cos(TAU * (along * 41 + cross * 31));
            result[y * CELL + x] = tube * twist * fiber;
        }
    cell = result;
    return result;
}
export function woolKnitHeight(u, v) {
    const warpedU = u + .0008 * Math.sin(TAU * (11 * u + 13 * v)), warpedV = v + .0007 * Math.sin(TAU * (17 * u - 7 * v));
    const data = stitchCell(), x = fract(warpedU * COLUMNS) * CELL, y = fract(warpedV * ROWS) * CELL;
    const x0 = Math.floor(x) % CELL, y0 = Math.floor(y) % CELL, fx = x - Math.floor(x), fy = y - Math.floor(y);
    const at = (a, b) => data[(b % CELL) * CELL + a % CELL];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
}
export function buildWoolKnitMaps(size = 1024) {
    if (!Number.isInteger(size) || size < 128 || size > 2048)
        throw new RangeError('Wool map size must be128..2048');
    const normal = new Uint8ClampedArray(size * size * 4), roughness = new Uint8ClampedArray(size * size * 4), diffuse = new Uint8ClampedArray(size * size * 4);
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size, body = woolKnitHeight(u, v);
            const hair = Math.sin(TAU * (u * 237 + v * 319 + Math.sin(TAU * v * 53) * .3)) * Math.sin(TAU * (v * 283 - u * 107));
            heights[y * size + x] = Math.max(0, body + .075 * hair * Math.min(1, body * 3));
        }
    const h = (x, y) => heights[((y + size) % size) * size + (x + size) % size];
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const at = (y * size + x) * 4, height = h(x, y), u = x / size, v = y / size;
            const dx = -(h(x + 1, y) - h(x - 1, y)) * size / COLUMNS * .105;
            const dy = (h(x, y + 1) - h(x, y - 1)) * size / ROWS * .105;
            const length = Math.hypot(dx, dy, 1);
            normal[at] = (dx / length * .5 + .5) * 255;
            normal[at + 1] = (dy / length * .5 + .5) * 255;
            normal[at + 2] = (1 / length * .5 + .5) * 255;
            const mottling = 5 * Math.sin(TAU * (7 * u + 3 * v)) * Math.sin(TAU * (11 * u - 5 * v)) + 4 * Math.sin(TAU * (u * 237 + v * 319)) * Math.sin(TAU * (v * 283 - u * 107));
            // Neutral source values straddle128, retaining the recessed stitch pockets.
            // Renderer should not high-pass this synthetic map: it contains no dyed blocks.
            const shade = 76 + 78 * height + mottling, rough = 248 - 17 * height;
            for (let c = 0; c < 3; c++) {
                diffuse[at + c] = shade;
                roughness[at + c] = rough;
            }
            normal[at + 3] = roughness[at + 3] = diffuse[at + 3] = 255;
        }
    return { width: size, height: size, normal, roughness, diffuse };
}
