import type { FilterId, Quad, RotationDeg } from '../types';
import {
  detectDocumentQuadFromRGBA,
  estimateOutputDimensions,
  warpPerspectiveRGBA,
} from './perspective';

export interface FilterOption {
  id: FilterId;
  labelKm: string;
  descriptionKm: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'original', labelKm: 'ដើម', descriptionKm: 'រក្សាពណ៌ដើម' },
  { id: 'magic', labelKm: 'ពណ៌ច្បាស់', descriptionKm: 'បំភ្លឺក្រដាស និងពណ៌ដិតច្បាស់' },
  { id: 'lighten', labelKm: 'បំភ្លឺ', descriptionKm: 'លុបស្រមោលងងឹតលើឯកសារ' },
  { id: 'bw', labelKm: 'ស-ខ្មៅ', descriptionKm: 'អក្សរខ្មៅច្បាស់លើផ្ទៃស' },
  { id: 'grayscale', labelKm: 'ប្រផេះ', descriptionKm: 'ពណ៌ប្រផេះបែបម៉ាស៊ីនព្រីន' },
];

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/**
 * Separable box blur on a single-channel Float32Array (used to estimate smooth paper illumination).
 */
function boxBlurGray(
  src: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const temp = new Float32Array(width * height);
  const dst = new Float32Array(width * height);
  const windowSize = radius * 2 + 1;

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      const idx = Math.max(0, Math.min(width - 1, k));
      sum += src[row + idx];
    }
    for (let x = 0; x < width; x++) {
      temp[row + x] = sum / windowSize;
      const removeX = Math.max(0, x - radius);
      const addX = Math.min(width - 1, x + radius + 1);
      sum += src[row + addX] - src[row + removeX];
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      const idx = Math.max(0, Math.min(height - 1, k));
      sum += temp[idx * width + x];
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / windowSize;
      const removeY = Math.max(0, y - radius);
      const addY = Math.min(height - 1, y + radius + 1);
      sum += temp[addY * width + x] - temp[removeY * width + x];
    }
  }

  return dst;
}

/**
 * Applies a CamScanner-style document filter plus brightness/contrast to RGBA pixels in-place or returning new buffer.
 */
export function applyDocumentFilterRGBA(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  filter: FilterId,
  brightness = 0,
  contrast = 0
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const totalPixels = width * height;

  if (filter === 'original') {
    out.set(src);
  } else if (filter === 'magic' || filter === 'lighten') {
    // Estimate local background illumination using downscaled max/smooth luminance
    const luma = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      // Use max channel to avoid darkening colored ink in background estimate
      luma[i] = Math.max(src[p], src[p + 1], src[p + 2]);
    }
    const radius = Math.max(12, Math.round(Math.min(width, height) * 0.045));
    const bg = boxBlurGray(luma, width, height, radius);

    const boostContrast = filter === 'magic' ? 1.28 : 1.08;
    const whiteBias = filter === 'magic' ? 1.06 : 1.03;

    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      const localBg = Math.max(48, bg[i]);
      const scale = (255 * whiteBias) / localBg;

      let r = src[p] * scale;
      let g = src[p + 1] * scale;
      let b = src[p + 2] * scale;

      if (filter === 'magic') {
        // Gentle S-curve + vivid saturation boost
        r = (r - 128) * boostContrast + 132;
        g = (g - 128) * boostContrast + 132;
        b = (b - 128) * boostContrast + 132;

        // Push near-white paper cleanly to pure white
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 224) {
          const factor = Math.min(1, (lum - 224) / 31);
          r = r + (255 - r) * factor;
          g = g + (255 - g) * factor;
          b = b + (255 - b) * factor;
        }
      }

      out[p] = clamp255(r);
      out[p + 1] = clamp255(g);
      out[p + 2] = clamp255(b);
      out[p + 3] = 255;
    }
  } else if (filter === 'bw') {
    // Fast adaptive thresholding using integral image (summed-area table)
    const gray = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      gray[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    }

    const stride = width + 1;
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      const rowOffset = y * width;
      const intRow = (y + 1) * stride;
      const prevIntRow = y * stride;
      for (let x = 0; x < width; x++) {
        rowSum += gray[rowOffset + x];
        integral[intRow + x + 1] = integral[prevIntRow + x + 1] + rowSum;
      }
    }

    const r = Math.max(10, Math.round(Math.min(width, height) * 0.028));
    const tRatio = 0.89; // Threshold 11% below local mean

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - r);
      const y2 = Math.min(height - 1, y + r);
      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - r);
        const x2 = Math.min(width - 1, x + r);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum =
          integral[(y2 + 1) * stride + (x2 + 1)] -
          integral[y1 * stride + (x2 + 1)] -
          integral[(y2 + 1) * stride + x1] +
          integral[y1 * stride + x1];
        const localMean = sum / count;
        const val = gray[y * width + x];
        // Soft anti-aliased transition near threshold for crisp text
        const diff = val - localMean * tRatio;
        const bw = diff >= 6 ? 255 : diff <= -10 ? 0 : clamp255(((diff + 10) / 16) * 255);
        const p = (y * width + x) * 4;
        out[p] = bw;
        out[p + 1] = bw;
        out[p + 2] = bw;
        out[p + 3] = 255;
      }
    }
  } else if (filter === 'grayscale') {
    const luma = new Float32Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      luma[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    }
    const radius = Math.max(12, Math.round(Math.min(width, height) * 0.045));
    const bg = boxBlurGray(luma, width, height, radius);

    for (let i = 0; i < totalPixels; i++) {
      const localBg = Math.max(48, bg[i]);
      let v = (luma[i] * 250) / localBg;
      v = (v - 128) * 1.2 + 132;
      const g = clamp255(v);
      const p = i * 4;
      out[p] = g;
      out[p + 1] = g;
      out[p + 2] = g;
      out[p + 3] = 255;
    }
  }

  // Apply user brightness (-50..50) and contrast (-50..50) adjustments
  if (brightness !== 0 || contrast !== 0) {
    const bOffset = brightness * 1.8;
    const cFactor = (259 * (contrast * 1.8 + 255)) / (255 * (259 - contrast * 1.8));
    for (let i = 0; i < totalPixels; i++) {
      const p = i * 4;
      out[p] = clamp255(cFactor * (out[p] + bOffset - 128) + 128);
      out[p + 1] = clamp255(cFactor * (out[p + 1] + bOffset - 128) + 128);
      out[p + 2] = clamp255(cFactor * (out[p + 2] + bOffset - 128) + 128);
    }
  }

  return out;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('មិនអាចផ្ទុករូបភាពបានទេ'));
    img.src = src;
  });
}

/**
 * Normalizes an uploaded/captured image (caps max dimension to 1800px) and returns a JPEG data URL.
 */
export async function normalizeCapturedImage(
  fileOrDataUrl: File | string,
  maxSide = 1800
): Promise<{ dataUrl: string; width: number; height: number }> {
  const srcUrl =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  const img = await loadImageElement(srcUrl);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width,
    height,
  };
}

/**
 * Automatically detects the 4 document corners on a captured image.
 */
export async function detectDocumentCorners(dataUrl: string): Promise<Quad> {
  const img = await loadImageElement(dataUrl);
  const maxDetectSide = 260;
  const scale = Math.min(1, maxDetectSide / Math.max(img.width, img.height));
  const w = Math.max(24, Math.round(img.width * scale));
  const h = Math.max(24, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return [
      { x: 0.08, y: 0.08 },
      { x: 0.92, y: 0.08 },
      { x: 0.92, y: 0.92 },
      { x: 0.08, y: 0.92 },
    ];
  }
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return detectDocumentQuadFromRGBA(imageData.data, w, h);
}

/**
 * Full render pipeline: perspective warp -> rotation -> filter + brightness/contrast -> JPEG data URL.
 */
export async function renderScannedPage(params: {
  originalDataUrl: string;
  corners: Quad;
  filter: FilterId;
  brightness: number;
  contrast: number;
  rotation: RotationDeg;
  maxSide?: number;
}): Promise<{ dataUrl: string; width: number; height: number }> {
  const {
    originalDataUrl,
    corners,
    filter,
    brightness,
    contrast,
    rotation,
    maxSide = 1600,
  } = params;

  const img = await loadImageElement(originalDataUrl);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Canvas unavailable');
  srcCtx.drawImage(img, 0, 0);
  const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);

  const { width: warpW, height: warpH } = estimateOutputDimensions(
    corners,
    img.width,
    img.height,
    maxSide
  );

  const warped = warpPerspectiveRGBA(
    srcImageData.data,
    img.width,
    img.height,
    corners,
    warpW,
    warpH
  );

  const filtered = applyDocumentFilterRGBA(
    warped,
    warpW,
    warpH,
    filter,
    brightness,
    contrast
  );

  const warpCanvas = document.createElement('canvas');
  warpCanvas.width = warpW;
  warpCanvas.height = warpH;
  const warpCtx = warpCanvas.getContext('2d');
  if (!warpCtx) throw new Error('Canvas unavailable');
  warpCtx.putImageData(new ImageData(new Uint8ClampedArray(filtered), warpW, warpH), 0, 0);

  if (rotation === 0) {
    return {
      dataUrl: warpCanvas.toDataURL('image/jpeg', 0.9),
      width: warpW,
      height: warpH,
    };
  }

  const rotCanvas = document.createElement('canvas');
  const swap = rotation === 90 || rotation === 270;
  rotCanvas.width = swap ? warpH : warpW;
  rotCanvas.height = swap ? warpW : warpH;
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) throw new Error('Canvas unavailable');

  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((rotation * Math.PI) / 180);
  rotCtx.drawImage(warpCanvas, -warpW / 2, -warpH / 2);

  return {
    dataUrl: rotCanvas.toDataURL('image/jpeg', 0.9),
    width: rotCanvas.width,
    height: rotCanvas.height,
  };
}
