import { describe, expect, it } from 'vitest';
import {
  detectDocumentQuadFromRGBA,
  estimateOutputDimensions,
  isValidQuad,
  warpPerspectiveRGBA,
} from '../perspective';
import { applyDocumentFilterRGBA } from '../imageProcessing';
import type { Quad } from '../../types';

describe('Perspective & Document Processing Engine', () => {
  it('validates convex quads and rejects self-intersecting or tiny quads', () => {
    const valid: Quad = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ];
    expect(isValidQuad(valid)).toBe(true);

    const bowtie: Quad = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.9 },
    ];
    expect(isValidQuad(bowtie)).toBe(false);
  });

  it('estimates proportional output dimensions capped by maxSide', () => {
    const quad: Quad = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ];
    const dims = estimateOutputDimensions(quad, 2000, 3000, 1000);
    expect(dims.height).toBe(1000);
    expect(dims.width).toBeCloseTo(667, -1);
  });

  it('warps a bright inner rectangle from a dark background cleanly', () => {
    const w = 100;
    const h = 100;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const inside = x >= 20 && x <= 79 && y >= 20 && y <= 79;
        src[p] = inside ? 240 : 15;
        src[p + 1] = inside ? 245 : 15;
        src[p + 2] = inside ? 250 : 15;
        src[p + 3] = 255;
      }
    }

    const quad: Quad = [
      { x: 0.22, y: 0.22 },
      { x: 0.78, y: 0.22 },
      { x: 0.78, y: 0.78 },
      { x: 0.22, y: 0.78 },
    ];

    const out = warpPerspectiveRGBA(src, w, h, quad, 40, 40);
    expect(out.length).toBe(40 * 40 * 4);
    // Center pixel should be bright paper
    const center = (20 * 40 + 20) * 4;
    expect(out[center]).toBeGreaterThan(230);
    expect(out[center + 1]).toBeGreaterThan(235);
    expect(out[center + 2]).toBeGreaterThan(240);
  });

  it('detects document edges on a contrasting desk background', () => {
    const w = 120;
    const h = 160;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const isPaper = x >= 18 && x <= 102 && y >= 24 && y <= 136;
        const val = isPaper ? 235 : 25;
        src[p] = val;
        src[p + 1] = val;
        src[p + 2] = val;
        src[p + 3] = 255;
      }
    }

    const detected = detectDocumentQuadFromRGBA(src, w, h);
    expect(isValidQuad(detected)).toBe(true);
    expect(detected[0].x).toBeGreaterThan(0.1);
    expect(detected[0].x).toBeLessThan(0.22);
    expect(detected[1].x).toBeGreaterThan(0.78);
    expect(detected[1].x).toBeLessThan(0.92);
  });

  it('applies B&W adaptive filter and grayscale filter accurately', () => {
    const w = 60;
    const h = 60;
    const src = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const isInk = x >= 26 && x <= 34 && y >= 26 && y <= 34;
        src[p] = isInk ? 30 : 210;
        src[p + 1] = isInk ? 35 : 205;
        src[p + 2] = isInk ? 40 : 195;
        src[p + 3] = 255;
      }
    }

    const bw = applyDocumentFilterRGBA(src, w, h, 'bw');
    const paperPx = (5 * w + 5) * 4;
    const inkPx = (30 * w + 30) * 4;
    expect(bw[paperPx]).toBe(255);
    expect(bw[inkPx]).toBe(0);

    const gray = applyDocumentFilterRGBA(src, w, h, 'grayscale');
    expect(gray[paperPx]).toBe(gray[paperPx + 1]);
    expect(gray[paperPx + 1]).toBe(gray[paperPx + 2]);
  });
});
