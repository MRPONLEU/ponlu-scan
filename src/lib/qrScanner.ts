import jsQR from 'jsqr';
import { loadImageElement } from './imageProcessing';

export type QrPayloadType = 'url' | 'wifi' | 'khqr' | 'tel' | 'email' | 'text';

export interface ParsedQrPayload {
  type: QrPayloadType;
  labelKm: string;
  raw: string;
  wifi?: {
    ssid: string;
    password: string;
    encryption: string;
  };
}

/**
 * Decodes a QR code directly from an RGBA buffer.
 */
export function decodeQrFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  if (width < 16 || height < 16) return null;
  const code = jsQR(data, width, height, {
    inversionAttempts: 'attemptBoth',
  });
  return code?.data ?? null;
}

/**
 * Decodes a QR code from a File or image data URL.
 */
export async function decodeQrFromImageSource(source: File | string): Promise<string | null> {
  const dataUrl =
    typeof source === 'string'
      ? source
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ'));
          reader.readAsDataURL(source);
        });

  const img = await loadImageElement(dataUrl);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(16, Math.round(img.width * scale));
  const h = Math.max(16, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  return decodeQrFromImageData(imgData.data, w, h);
}

/**
 * Classifies and extracts fields from raw QR code text.
 */
export function parseQrPayload(rawText: string): ParsedQrPayload {
  const raw = rawText.trim();

  if (/^https?:\/\//i.test(raw)) {
    return {
      type: 'url',
      labelKm: 'តំណភ្ជាប់គេហទំព័រ (URL)',
      raw,
    };
  }

  if (/^WIFI:/i.test(raw)) {
    const getField = (key: string) => {
      const m = raw.match(new RegExp(`${key}:([^;]*)`, 'i'));
      return m ? m[1].replace(/\\([;:,\\])/g, '$1') : '';
    };
    return {
      type: 'wifi',
      labelKm: 'ព័ត៌មានបណ្តាញ Wi-Fi',
      raw,
      wifi: {
        ssid: getField('S'),
        password: getField('P'),
        encryption: getField('T') || 'WPA',
      },
    };
  }

  // EMVCo / Bakong KHQR payload starts with Payload Format Indicator "000201"
  if (/^000201/.test(raw) && raw.length >= 24) {
    return {
      type: 'khqr',
      labelKm: 'កូដទូទាត់ប្រាក់ (KHQR / EMV)',
      raw,
    };
  }

  if (/^tel:/i.test(raw)) {
    return {
      type: 'tel',
      labelKm: 'លេខទូរសព្ទ',
      raw,
    };
  }

  if (/^(mailto:|MATMSG:)/i.test(raw)) {
    return {
      type: 'email',
      labelKm: 'អាសយដ្ឋានអ៊ីមែល',
      raw,
    };
  }

  return {
    type: 'text',
    labelKm: 'អត្ថបទ QR ទូទៅ',
    raw,
  };
}
