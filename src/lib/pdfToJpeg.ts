import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfRenderScale = 1.5 | 2 | 3;

export interface ConvertedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfConversionResult {
  baseName: string;
  totalPages: number;
  pages: ConvertedPdfPage[];
}

export function stripPdfExtension(fileName: string): string {
  const cleaned = fileName.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_').trim();
  return cleaned || 'P-Scan-PDF';
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const str = String(reader.result);
      const comma = str.indexOf(',');
      resolve(comma >= 0 ? str.slice(comma + 1) : str);
    };
    reader.onerror = () => reject(new Error('Failed to encode file'));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(blobOrUrl: Blob | string, fileName: string): void {
  const isString = typeof blobOrUrl === 'string';
  const url = isString ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (!isString) {
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
}

/**
 * Renders every page of a PDF File into JPEG data URLs using pdfjs-dist.
 */
export async function convertPdfFileToJpegs(
  file: File,
  options?: {
    scale?: PdfRenderScale;
    quality?: number;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<PdfConversionResult> {
  const scale = options?.scale ?? 2;
  const quality = options?.quality ?? 0.92;
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pages: ConvertedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    // Fill pure white background because PDFs often have transparent background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    });

    options?.onProgress?.(pageNum, totalPages);
  }

  return {
    baseName: stripPdfExtension(file.name),
    totalPages,
    pages,
  };
}

export async function saveSingleJpeg(dataUrl: string, fileName: string): Promise<string> {
  const safeName = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
    ? fileName
    : `${fileName}.jpg`;

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: safeName,
      data: dataUrlToBase64(dataUrl),
      directory: Directory.Documents,
    });
    return `បានរក្សាទុក ${safeName} ទៅ Documents`;
  }

  triggerBrowserDownload(dataUrl, safeName);
  return `បានទាញយក ${safeName}`;
}

export async function shareSingleJpeg(dataUrl: string, fileName: string): Promise<string> {
  const safeName = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
    ? fileName
    : `${fileName}.jpg`;

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: safeName,
      data: dataUrlToBase64(dataUrl),
      directory: Directory.Cache,
    });
    await Share.share({
      title: safeName,
      url: written.uri,
      dialogTitle: 'ចែករំលែករូបភាព JPEG',
    });
    return 'បានបើកផ្ទាំងចែករំលែករូបភាព';
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    const file = new File([blob], safeName, { type: 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      await navigator.share({
        title: safeName,
        files: [file],
      });
      return 'បានចែករំលែករូបភាពរួចរាល់';
    }
  }

  triggerBrowserDownload(blob, safeName);
  return `បានទាញយក ${safeName}`;
}

export async function downloadJpegsIndividually(
  pages: Array<{ pageNumber: number; dataUrl: string }>,
  baseName: string
): Promise<string> {
  for (const page of pages) {
    const fileName = `${baseName}_ទំព័រ_${page.pageNumber}.jpg`;
    await saveSingleJpeg(page.dataUrl, fileName);
    if (!Capacitor.isNativePlatform() && pages.length > 1) {
      await new Promise((r) => setTimeout(r, 180));
    }
  }
  return `បានរក្សាទុករូបភាព JPEG ចំនួន ${pages.length} ទំព័រ`;
}

export async function exportJpegsAsZip(
  pages: Array<{ pageNumber: number; dataUrl: string }>,
  baseName: string
): Promise<string> {
  const zip = new JSZip();
  for (const page of pages) {
    const fileName = `${baseName}_page_${page.pageNumber}.jpg`;
    zip.file(fileName, dataUrlToBase64(page.dataUrl), { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${baseName}_JPEG.zip`;

  if (Capacitor.isNativePlatform()) {
    const base64Data = await blobToBase64(zipBlob);
    await Filesystem.writeFile({
      path: zipName,
      data: base64Data,
      directory: Directory.Documents,
    });
    return `បានរក្សាទុក ${zipName} ទៅ Documents`;
  }

  triggerBrowserDownload(zipBlob, zipName);
  return `បានទាញយក ${zipName}`;
}
