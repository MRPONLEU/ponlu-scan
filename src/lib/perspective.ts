import type { Point, Quad } from '../types';

export interface Matrix3x3 {
  m: Float64Array; // length 9, row-major
}

/**
 * Solves an 8x8 linear system Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinear8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(aug[r][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = r;
      }
    }
    if (maxVal < 1e-10) return null;

    if (maxRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = tmp;
    }

    const pivot = aug[col][col];
    for (let j = col; j <= n; j++) {
      aug[col][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j <= n; j++) {
        aug[r][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row[n]);
}

/**
 * Computes the homography matrix H mapping dst (u,v) -> src (x,y).
 */
export function computeInverseHomography(
  srcPts: [Point, Point, Point, Point],
  dstWidth: number,
  dstHeight: number
): Float64Array {
  const dstPts: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: dstWidth, y: 0 },
    { x: dstWidth, y: dstHeight },
    { x: 0, y: dstHeight },
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcPts[i].x;
    const y = srcPts[i].y;

    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    b.push(y);
  }

  const h = solveLinear8(A, b);
  if (!h) {
    return new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }
  return new Float64Array([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]);
}

/**
 * Estimates crisp output dimensions (width, height) from a normalized quad and source size.
 */
export function estimateOutputDimensions(
  quad: Quad,
  srcWidth: number,
  srcHeight: number,
  maxSide = 1600
): { width: number; height: number } {
  const px = quad.map((p) => ({ x: p.x * srcWidth, y: p.y * srcHeight }));
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  const wTop = dist(px[0], px[1]);
  const wBot = dist(px[3], px[2]);
  const hLeft = dist(px[0], px[3]);
  const hRight = dist(px[1], px[2]);

  let w = Math.max(64, Math.round(Math.max(wTop, wBot)));
  let h = Math.max(64, Math.round(Math.max(hLeft, hRight)));

  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.max(64, Math.round(w * scale));
  h = Math.max(64, Math.round(h * scale));

  return { width: w, height: h };
}

/**
 * Warps a source RGBA pixel buffer using a normalized quad into a flat rectangular RGBA buffer
 * with bilinear interpolation.
 */
export function warpPerspectiveRGBA(
  srcData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  quad: Quad,
  dstWidth: number,
  dstHeight: number
): Uint8ClampedArray {
  const srcPts: [Point, Point, Point, Point] = [
    { x: quad[0].x * srcWidth, y: quad[0].y * srcHeight },
    { x: quad[1].x * srcWidth, y: quad[1].y * srcHeight },
    { x: quad[2].x * srcWidth, y: quad[2].y * srcHeight },
    { x: quad[3].x * srcWidth, y: quad[3].y * srcHeight },
  ];

  const H = computeInverseHomography(srcPts, dstWidth, dstHeight);
  const dstData = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const maxX = srcWidth - 1;
  const maxY = srcHeight - 1;

  for (let v = 0; v < dstHeight; v++) {
    const h01v = H[1] * v + H[2];
    const h34v = H[4] * v + H[5];
    const h67v = H[7] * v + H[8];
    const rowOffset = v * dstWidth * 4;

    for (let u = 0; u < dstWidth; u++) {
      const denom = H[6] * u + h67v;
      const invD = denom !== 0 ? 1 / denom : 1;
      const sx = (H[0] * u + h01v) * invD;
      const sy = (H[3] * u + h34v) * invD;

      const x0 = sx < 0 ? 0 : sx > maxX ? maxX : sx | 0;
      const y0 = sy < 0 ? 0 : sy > maxY ? maxY : sy | 0;
      const x1 = x0 < maxX ? x0 + 1 : maxX;
      const y1 = y0 < maxY ? y0 + 1 : maxY;

      const fx = Math.max(0, Math.min(1, sx - x0));
      const fy = Math.max(0, Math.min(1, sy - y0));
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const idx00 = (y0 * srcWidth + x0) * 4;
      const idx10 = (y0 * srcWidth + x1) * 4;
      const idx01 = (y1 * srcWidth + x0) * 4;
      const idx11 = (y1 * srcWidth + x1) * 4;

      const out = rowOffset + u * 4;
      dstData[out] =
        srcData[idx00] * w00 +
        srcData[idx10] * w10 +
        srcData[idx01] * w01 +
        srcData[idx11] * w11;
      dstData[out + 1] =
        srcData[idx00 + 1] * w00 +
        srcData[idx10 + 1] * w10 +
        srcData[idx01 + 1] * w01 +
        srcData[idx11 + 1] * w11;
      dstData[out + 2] =
        srcData[idx00 + 2] * w00 +
        srcData[idx10 + 2] * w10 +
        srcData[idx01 + 2] * w01 +
        srcData[idx11 + 2] * w11;
      dstData[out + 3] = 255;
    }
  }

  return dstData;
}

/**
 * Checks whether a 4-point polygon is convex and covers a reasonable area.
 */
export function isValidQuad(quad: Quad, minArea = 0.08): boolean {
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
    if (Math.abs(c) < 1e-6) return false;
    const s = c > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;
  }

  // Shoelace area
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += quad[i].x * quad[j].y - quad[j].x * quad[i].y;
  }
  area = Math.abs(area) * 0.5;
  return area >= minArea;
}

interface Line2D {
  // ax + by + c = 0
  a: number;
  b: number;
  c: number;
}

function fitLineLeastSquares(pts: Point[]): Line2D | null {
  if (pts.length < 3) return null;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  // Principal eigenvector of covariance matrix gives direction; normal is perpendicular
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const c = -(nx * mx + ny * my);
  return { a: nx, b: ny, c };
}

function intersectLines(l1: Line2D, l2: Line2D): Point | null {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < 1e-6) return null;
  const x = (l1.b * l2.c - l2.b * l1.c) / det;
  const y = (l2.a * l1.c - l1.a * l2.c) / det;
  return { x, y };
}

/**
 * Detects a document's 4 corners from a small RGBA image buffer by scanning inward
 * for strong paper-vs-background gradient/luminance transitions along 4 sides
 * and fitting 4 boundary lines.
 */
export function detectDocumentQuadFromRGBA(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Quad {
  const fallback: Quad = [
    { x: 0.08, y: 0.08 },
    { x: 0.92, y: 0.08 },
    { x: 0.92, y: 0.92 },
    { x: 0.08, y: 0.92 },
  ];

  if (width < 24 || height < 24) return fallback;

  // Compute grayscale luminance
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    gray[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  // Estimate center brightness (assume document occupies center region)
  let centerSum = 0;
  let centerCount = 0;
  const cx0 = Math.floor(width * 0.35);
  const cx1 = Math.floor(width * 0.65);
  const cy0 = Math.floor(height * 0.35);
  const cy1 = Math.floor(height * 0.65);
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      centerSum += gray[y * width + x];
      centerCount++;
    }
  }
  const centerMean = centerSum / Math.max(1, centerCount);

  // Sample edge points along 4 borders from outside toward center
  const samples = 24;
  const topPts: Point[] = [];
  const bottomPts: Point[] = [];
  const leftPts: Point[] = [];
  const rightPts: Point[] = [];

  const maxScanY = Math.floor(height * 0.42);
  const maxScanX = Math.floor(width * 0.42);
  const gradThreshold = 14;

  // Top & bottom edge scan along vertical rays
  for (let s = 2; s < samples - 2; s++) {
    const x = Math.floor((s / (samples - 1)) * (width - 1));

    let bestTopY = -1;
    let bestTopScore = 0;
    for (let y = 3; y < maxScanY; y++) {
      const g = Math.abs(gray[(y + 1) * width + x] - gray[(y - 2) * width + x]);
      const brightnessJump = gray[(y + 2) * width + x] - gray[(y - 2) * width + x];
      const score = g + (centerMean > 130 && brightnessJump > 10 ? brightnessJump * 0.6 : 0);
      if (score > gradThreshold && score > bestTopScore) {
        bestTopScore = score;
        bestTopY = y;
      }
    }
    if (bestTopY > 0) topPts.push({ x: x / width, y: bestTopY / height });

    let bestBotY = -1;
    let bestBotScore = 0;
    for (let y = height - 4; y > height - maxScanY; y--) {
      const g = Math.abs(gray[(y - 1) * width + x] - gray[(y + 2) * width + x]);
      const brightnessJump = gray[(y - 2) * width + x] - gray[(y + 2) * width + x];
      const score = g + (centerMean > 130 && brightnessJump > 10 ? brightnessJump * 0.6 : 0);
      if (score > gradThreshold && score > bestBotScore) {
        bestBotScore = score;
        bestBotY = y;
      }
    }
    if (bestBotY > 0) bottomPts.push({ x: x / width, y: bestBotY / height });
  }

  // Left & right edge scan along horizontal rays
  for (let s = 2; s < samples - 2; s++) {
    const y = Math.floor((s / (samples - 1)) * (height - 1));
    const row = y * width;

    let bestLeftX = -1;
    let bestLeftScore = 0;
    for (let x = 3; x < maxScanX; x++) {
      const g = Math.abs(gray[row + x + 1] - gray[row + x - 2]);
      const brightnessJump = gray[row + x + 2] - gray[row + x - 2];
      const score = g + (centerMean > 130 && brightnessJump > 10 ? brightnessJump * 0.6 : 0);
      if (score > gradThreshold && score > bestLeftScore) {
        bestLeftScore = score;
        bestLeftX = x;
      }
    }
    if (bestLeftX > 0) leftPts.push({ x: bestLeftX / width, y: y / height });

    let bestRightX = -1;
    let bestRightScore = 0;
    for (let x = width - 4; x > width - maxScanX; x--) {
      const g = Math.abs(gray[row + x - 1] - gray[row + x + 2]);
      const brightnessJump = gray[row + x - 2] - gray[row + x + 2];
      const score = g + (centerMean > 130 && brightnessJump > 10 ? brightnessJump * 0.6 : 0);
      if (score > gradThreshold && score > bestRightScore) {
        bestRightScore = score;
        bestRightX = x;
      }
    }
    if (bestRightX > 0) rightPts.push({ x: bestRightX / width, y: y / height });
  }

  const topLine = fitLineLeastSquares(filterInliers(topPts, 'y'));
  const bottomLine = fitLineLeastSquares(filterInliers(bottomPts, 'y'));
  const leftLine = fitLineLeastSquares(filterInliers(leftPts, 'x'));
  const rightLine = fitLineLeastSquares(filterInliers(rightPts, 'x'));

  if (!topLine || !bottomLine || !leftLine || !rightLine) {
    return fallback;
  }

  const tl = intersectLines(topLine, leftLine);
  const tr = intersectLines(topLine, rightLine);
  const br = intersectLines(bottomLine, rightLine);
  const bl = intersectLines(bottomLine, leftLine);

  if (!tl || !tr || !br || !bl) return fallback;

  const clampPt = (p: Point): Point => ({
    x: Math.max(0.01, Math.min(0.99, p.x)),
    y: Math.max(0.01, Math.min(0.99, p.y)),
  });

  const candidate: Quad = [clampPt(tl), clampPt(tr), clampPt(br), clampPt(bl)];
  if (!isValidQuad(candidate, 0.18)) {
    return fallback;
  }
  return candidate;
}

function filterInliers(pts: Point[], axis: 'x' | 'y'): Point[] {
  if (pts.length < 5) return pts;
  const sorted = [...pts].sort((a, b) => a[axis] - b[axis]);
  const median = sorted[Math.floor(sorted.length / 2)][axis];
  const filtered = pts.filter((p) => Math.abs(p[axis] - median) < 0.14);
  return filtered.length >= 4 ? filtered : pts;
}
