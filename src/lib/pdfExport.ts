import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ScanDocument, ScanPage } from '../types';

export type PdfPaperMode = 'fit' | 'a4';

/**
 * Generates a multi-page PDF Blob from a ScanDocument.
 */
export async function generateDocumentPdfBlob(
  doc: ScanDocument,
  mode: PdfPaperMode = 'a4'
): Promise<Blob> {
  if (doc.pages.length === 0) {
    throw new Error('មិនមានទំព័រសម្រាប់នាំចេញ PDF ទេ');
  }

  const first = doc.pages[0];
  const firstLandscape = first.width > first.height;

  const pdf = new jsPDF({
    orientation: firstLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: mode === 'a4' ? 'a4' : [Math.max(50, first.width * 0.264583), Math.max(50, first.height * 0.264583)],
    compress: true,
  });

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const isLandscape = page.width > page.height;

    if (i > 0) {
      if (mode === 'a4') {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      } else {
        pdf.addPage(
          [Math.max(50, page.width * 0.264583), Math.max(50, page.height * 0.264583)],
          isLandscape ? 'landscape' : 'portrait'
        );
      }
    }

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = mode === 'a4' ? 6 : 0;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    const imgRatio = page.width / Math.max(1, page.height);
    const boxRatio = availW / Math.max(1, availH);

    let drawW = availW;
    let drawH = availH;
    if (imgRatio > boxRatio) {
      drawW = availW;
      drawH = availW / imgRatio;
    } else {
      drawH = availH;
      drawW = availH * imgRatio;
    }

    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    pdf.addImage(page.processedDataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
  }

  return pdf.output('blob');
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, '_').trim();
  return cleaned || 'P-Scan-Document';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to encode file'));
    reader.readAsDataURL(blob);
  });
}

export async function exportOrSharePdf(
  doc: ScanDocument,
  action: 'download' | 'share',
  mode: PdfPaperMode = 'a4'
): Promise<string> {
  const blob = await generateDocumentPdfBlob(doc, mode);
  const fileName = `${sanitizeFileName(doc.title)}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const base64Data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: action === 'share' ? Directory.Cache : Directory.Documents,
    });

    if (action === 'share') {
      await Share.share({
        title: doc.title,
        text: `${doc.title} (${doc.pages.length} ទំព័រ)`,
        url: written.uri,
        dialogTitle: 'ចែករំលែកឯកសារ PDF',
      });
      return 'បានបើកផ្ទាំងចែករំលែក PDF';
    }
    return `បានរក្សាទុក PDF ទៅ Documents/${fileName}`;
  }

  if (action === 'share' && typeof navigator !== 'undefined' && 'share' in navigator) {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      await navigator.share({
        title: doc.title,
        text: `${doc.title} (${doc.pages.length} ទំព័រ)`,
        files: [file],
      });
      return 'បានចែករំលែក PDF រួចរាល់';
    }
  }

  // Fallback to browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return `បានទាញយក ${fileName}`;
}

export async function exportPageImage(page: ScanPage, title: string, pageIndex: number): Promise<string> {
  const fileName = `${sanitizeFileName(title)}_ទំព័រ_${pageIndex + 1}.jpg`;
  const res = await fetch(page.processedDataUrl);
  const blob = await res.blob();

  if (Capacitor.isNativePlatform()) {
    const base64Data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
    });
    return `បានរក្សាទុករូបភាព ${fileName}`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return `បានទាញយករូបភាព ${fileName}`;
}
