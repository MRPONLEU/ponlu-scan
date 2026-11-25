import { createWorker, OEM, PSM } from 'tesseract.js';
import { applyDocumentFilterRGBA, loadImageElement } from './imageProcessing';

export type OcrLanguage = 'khm' | 'khm+eng' | 'eng';
export type OcrLayoutMode = 'auto' | 'block';

export interface OcrProgress {
  statusKm: string;
  progress: number; // 0..100
}

export interface OcrOptions {
  language?: OcrLanguage;
  layoutMode?: OcrLayoutMode;
  enhanceImage?: boolean;
  onProgress?: (p: OcrProgress) => void;
}

const TESSDATA_BEST_URL = 'https://tessdata.projectnaptha.com/4.0.0_best';

function mapStatusToKm(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('loading tesseract') || s.includes('initializing tesseract')) {
    return 'កំពុងរៀបចំម៉ាស៊ីន OCR...';
  }
  if (s.includes('traineddata') || s.includes('loading language')) {
    return 'កំពុងទាញយកទិន្នន័យភាសាគុណភាពខ្ពស់ (លើកដំបូង)...';
  }
  if (s.includes('initializing api')) {
    return 'កំពុងចាប់ផ្តើមវិភាគអក្សរ...';
  }
  if (s.includes('recognizing')) {
    return 'កំពុងអានអក្សរខ្មែរ/អង់គ្លេស...';
  }
  return 'កំពុងដំណើរការ OCR...';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ'));
    reader.readAsDataURL(file);
  });
}

/**
 * Prepares an image for Khmer OCR by upscaling to ~300 DPI equivalent,
 * adding a clean white margin, removing shadows, and boosting text-background separation
 * without breaking delicate Khmer vowel loops and subscripts.
 */
async function preprocessImageForKhmerOcr(dataUrl: string): Promise<string> {
  const img = await loadImageElement(dataUrl);

  // Upscale smaller images so Khmer subscripts (ជើងអក្សរ) & top marks have crisp detail
  const maxCurrent = Math.max(img.width, img.height);
  let scale = 1;
  if (maxCurrent < 1200) {
    scale = Math.min(2.5, 2200 / Math.max(1, maxCurrent));
  } else if (maxCurrent < 2000) {
    scale = 2200 / maxCurrent;
  }

  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);
  const pad = 32;

  const canvas = document.createElement('canvas');
  canvas.width = targetW + pad * 2;
  canvas.height = targetH + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, pad, pad, targetW, targetH);

  // Clean shadow-normalized grayscale preserves anti-aliased Khmer diacritics better than hard B&W
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cleaned = applyDocumentFilterRGBA(
    imgData.data,
    canvas.width,
    canvas.height,
    'grayscale',
    6,
    18
  );
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(cleaned), canvas.width, canvas.height),
    0,
    0
  );

  return canvas.toDataURL('image/png');
}

/**
 * Cleans common Tesseract OCR spacing artifacts inside Khmer character clusters
 * while keeping intentional phrase/English/number spacing intact.
 */
export function cleanKhmerOcrText(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n');

  // Remove spurious spaces before Khmer coeng (្), dependent vowels, or signs
  text = text.replace(/([\u1780-\u17FF])[ \t]+([\u17B6-\u17D3\u17DD])/g, '$1$2');

  // Remove spurious spaces right after Khmer coeng (្) before the subscript consonant
  text = text.replace(/(\u17D2)[ \t]+([\u1780-\u17A2])/g, '$1$2');

  // Collapse multiple spaces on the same line
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Trim trailing spaces per line and collapse >2 consecutive newlines
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Extracts Khmer and/or English text from an image using Tesseract.js (4.0.0_best).
 */
export async function extractTextFromImage(
  source: string | File,
  options: OcrOptions = {}
): Promise<string> {
  const {
    language = 'khm',
    layoutMode = 'auto',
    enhanceImage = true,
    onProgress,
  } = options;

  const rawDataUrl = typeof source === 'string' ? source : await fileToDataUrl(source);

  onProgress?.({ statusKm: 'កំពុងកែលម្អភាពច្បាស់រូបភាព...', progress: 5 });
  const preparedUrl = enhanceImage
    ? await preprocessImageForKhmerOcr(rawDataUrl)
    : rawDataUrl;

  onProgress?.({ statusKm: 'កំពុងភ្ជាប់ម៉ាស៊ីន OCR គុណភាពខ្ពស់...', progress: 10 });

  const worker = await createWorker(language, OEM.LSTM_ONLY, {
    langPath: TESSDATA_BEST_URL,
    logger: (m) => {
      if (typeof m.progress === 'number') {
        onProgress?.({
          statusKm: mapStatusToKm(m.status ?? ''),
          progress: Math.max(10, Math.min(99, Math.round(10 + m.progress * 89))),
        });
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: layoutMode === 'block' ? PSM.SINGLE_BLOCK : PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });

    const { data } = await worker.recognize(preparedUrl);
    onProgress?.({ statusKm: 'បានដកស្រង់អក្សររួចរាល់', progress: 100 });
    return cleanKhmerOcrText(data.text ?? '');
  } finally {
    await worker.terminate();
  }
}
