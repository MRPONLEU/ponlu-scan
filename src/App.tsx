import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FULL_QUAD, type FilterId, type Quad, type RotationDeg, type ScanDocument, type ScanPage } from './types';
import {
  detectDocumentCorners,
  normalizeCapturedImage,
  renderScannedPage,
} from './lib/imageProcessing';
import {
  createDefaultDocTitle,
  deleteDocument,
  generateId,
  listDocuments,
  saveDocument,
} from './lib/storage';
import {
  exportOrSharePdf,
  exportPageImage,
  type PdfPaperMode,
} from './lib/pdfExport';
import {
  downloadJpegsIndividually,
  exportJpegsAsZip,
  type ConvertedPdfPage,
  type PdfConversionResult,
} from './lib/pdfToJpeg';
import { createSampleScanImageDataUrl } from './lib/sampleDoc';
import { HomeScreen } from './components/HomeScreen';
import { CameraScreen } from './components/CameraScreen';
import { CropScreen } from './components/CropScreen';
import { FilterScreen } from './components/FilterScreen';
import { DocumentViewerScreen } from './components/DocumentViewerScreen';
import { PdfToJpegScreen } from './components/PdfToJpegScreen';
import { OcrScreen } from './components/OcrScreen';
import { QrScannerScreen } from './components/QrScannerScreen';

interface PendingScanItem {
  originalDataUrl: string;
  corners: Quad;
  filter: FilterId;
  brightness: number;
  contrast: number;
  rotation: RotationDeg;
}

type ScreenState =
  | { name: 'home' }
  | { name: 'pdf-to-jpeg' }
  | { name: 'qr' }
  | {
      name: 'ocr';
      imageDataUrl: string | null;
      title?: string;
      returnToDocId?: string;
    }
  | { name: 'camera'; targetDocId: string | null }
  | {
      name: 'crop';
      queue: PendingScanItem[];
      currentIndex: number;
      targetDocId: string | null;
      editingPageId?: string;
    }
  | {
      name: 'filter';
      queue: PendingScanItem[];
      currentIndex: number;
      targetDocId: string | null;
      editingPageId?: string;
    }
  | { name: 'viewer'; docId: string };

export function App() {
  const [documents, setDocuments] = useState<ScanDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [screen, setScreen] = useState<ScreenState>({ name: 'home' });
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [stagedPages, setStagedPages] = useState<ScanPage[]>([]);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .finally(() => setLoadingDocs(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const persistDocument = async (doc: ScanDocument) => {
    await saveDocument(doc);
    setDocuments((prev) => {
      const others = prev.filter((d) => d.id !== doc.id);
      const updated = [doc, ...others];
      updated.sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return b.updatedAt - a.updatedAt;
      });
      return updated;
    });
  };

  const startPipelineFromSources = async (
    sources: (File | string)[],
    targetDocId: string | null
  ) => {
    setBusyMessage('កំពុងវិភាគគែមឯកសារ...');
    try {
      const items: PendingScanItem[] = [];
      for (const src of sources) {
        const norm = await normalizeCapturedImage(src, 1800);
        const corners = await detectDocumentCorners(norm.dataUrl);
        items.push({
          originalDataUrl: norm.dataUrl,
          corners,
          filter: 'magic',
          brightness: 0,
          contrast: 0,
          rotation: 0,
        });
      }
      setStagedPages([]);
      setScreen({
        name: 'crop',
        queue: items,
        currentIndex: 0,
        targetDocId,
      });
    } catch {
      showToast('មិនអាចដំណើរការរូបភាពបានទេ');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleTrySample = async () => {
    const sampleUrl = createSampleScanImageDataUrl();
    if (!sampleUrl) return;
    await startPipelineFromSources([sampleUrl], null);
  };

  const handleImportFiles = async (files: FileList, targetDocId: string | null) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    await startPipelineFromSources(list, targetDocId);
  };

  const handleSaveFilterStep = async (result: {
    processedDataUrl: string;
    width: number;
    height: number;
    filter: FilterId;
    brightness: number;
    contrast: number;
    rotation: RotationDeg;
  }) => {
    if (screen.name !== 'filter') return;
    const currentItem = screen.queue[screen.currentIndex];

    // If editing an existing page in a document
    if (screen.editingPageId && screen.targetDocId) {
      const targetDoc = documents.find((d) => d.id === screen.targetDocId);
      if (targetDoc) {
        const updatedPages = targetDoc.pages.map((p) =>
          p.id === screen.editingPageId
            ? {
                ...p,
                corners: currentItem.corners,
                processedDataUrl: result.processedDataUrl,
                width: result.width,
                height: result.height,
                filter: result.filter,
                brightness: result.brightness,
                contrast: result.contrast,
                rotation: result.rotation,
              }
            : p
        );
        const updatedDoc: ScanDocument = {
          ...targetDoc,
          pages: updatedPages,
          updatedAt: Date.now(),
        };
        await persistDocument(updatedDoc);
        showToast('បានធ្វើបច្ចុប្បន្នភាពទំព័ររួចរាល់');
        setScreen({ name: 'viewer', docId: updatedDoc.id });
        return;
      }
    }

    const newPage: ScanPage = {
      id: generateId('page'),
      originalDataUrl: currentItem.originalDataUrl,
      processedDataUrl: result.processedDataUrl,
      corners: currentItem.corners,
      filter: result.filter,
      brightness: result.brightness,
      contrast: result.contrast,
      rotation: result.rotation,
      width: result.width,
      height: result.height,
      createdAt: Date.now(),
    };

    const nextPages = [...stagedPages, newPage];
    const nextIdx = screen.currentIndex + 1;

    if (nextIdx < screen.queue.length) {
      setStagedPages(nextPages);
      setScreen({
        name: 'crop',
        queue: screen.queue,
        currentIndex: nextIdx,
        targetDocId: screen.targetDocId,
      });
      return;
    }

    // All queued pages finished -> save into existing or new document
    const now = Date.now();
    if (screen.targetDocId) {
      const existing = documents.find((d) => d.id === screen.targetDocId);
      if (existing) {
        const updatedDoc: ScanDocument = {
          ...existing,
          pages: [...existing.pages, ...nextPages],
          updatedAt: now,
        };
        await persistDocument(updatedDoc);
        setStagedPages([]);
        showToast(`បានបន្ថែម ${nextPages.length} ទំព័រទៅឯកសារ`);
        setScreen({ name: 'viewer', docId: updatedDoc.id });
        return;
      }
    }

    const newDoc: ScanDocument = {
      id: generateId('doc'),
      title: createDefaultDocTitle(new Date(now)),
      pages: nextPages,
      createdAt: now,
      updatedAt: now,
    };
    await persistDocument(newDoc);
    setStagedPages([]);
    showToast('បានរក្សាទុកឯកសារស្កេនថ្មីរួចរាល់');
    setScreen({ name: 'viewer', docId: newDoc.id });
  };

  const handleRenameDoc = async (docId: string, newTitle: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    await persistDocument({ ...doc, title: newTitle, updatedAt: Date.now() });
    showToast('បានប្តូរឈ្មោះឯកសារ');
  };

  const handleTogglePin = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    await persistDocument({ ...doc, isPinned: !doc.isPinned });
  };

  const handleDeleteDoc = async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (screen.name === 'viewer' && screen.docId === docId) {
      setScreen({ name: 'home' });
    }
    showToast('បានលុបឯកសារ');
  };

  const handleExportPdf = async (
    doc: ScanDocument,
    action: 'download' | 'share',
    mode: PdfPaperMode = 'a4'
  ) => {
    setBusyMessage('កំពុងបង្កើតឯកសារ PDF...');
    try {
      const msg = await exportOrSharePdf(doc, action, mode);
      showToast(msg);
    } catch {
      showToast('មិនអាចនាំចេញ PDF បានទេ');
    } finally {
      setBusyMessage(null);
    }
  };

  const handleExportImage = async (doc: ScanDocument, page: ScanPage, index: number) => {
    try {
      const msg = await exportPageImage(page, doc.title, index);
      showToast(msg);
    } catch {
      showToast('មិនអាចទាញយករូបភាពបានទេ');
    }
  };

  const handleMovePage = async (doc: ScanDocument, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= doc.pages.length) return;
    const pages = [...doc.pages];
    const [moved] = pages.splice(index, 1);
    pages.splice(target, 0, moved);
    await persistDocument({ ...doc, pages, updatedAt: Date.now() });
  };

  const handleDeletePage = async (doc: ScanDocument, pageId: string) => {
    if (doc.pages.length <= 1) return;
    const pages = doc.pages.filter((p) => p.id !== pageId);
    await persistDocument({ ...doc, pages, updatedAt: Date.now() });
    showToast('បានលុបទំព័រ');
  };

  const activeDoc =
    screen.name === 'viewer'
      ? documents.find((d) => d.id === screen.docId) ?? null
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {loadingDocs ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <p className="text-sm">កំពុងបើក P-Scan...</p>
        </div>
      ) : (
        <>
          {screen.name === 'home' && (
            <HomeScreen
              documents={documents}
              onOpenCamera={() => setScreen({ name: 'camera', targetDocId: null })}
              onImportImages={(files) => handleImportFiles(files, null)}
              onOpenPdfToJpeg={() => setScreen({ name: 'pdf-to-jpeg' })}
              onOpenOcr={() => setScreen({ name: 'ocr', imageDataUrl: null })}
              onOpenQrScanner={() => setScreen({ name: 'qr' })}
              onTrySample={handleTrySample}
              onOpenDocument={(doc) => setScreen({ name: 'viewer', docId: doc.id })}
              onRenameDocument={handleRenameDoc}
              onTogglePin={handleTogglePin}
              onDeleteDocument={handleDeleteDoc}
              onQuickExportPdf={(doc, mode) => handleExportPdf(doc, mode, 'a4')}
            />
          )}

          {screen.name === 'qr' && (
            <QrScannerScreen
              onClose={() => setScreen({ name: 'home' })}
              onNotify={showToast}
            />
          )}

          {screen.name === 'ocr' && (
            <OcrScreen
              initialImageDataUrl={screen.imageDataUrl}
              initialTitle={screen.title}
              onBack={() =>
                setScreen(
                  screen.returnToDocId
                    ? { name: 'viewer', docId: screen.returnToDocId }
                    : { name: 'home' }
                )
              }
              onNotify={showToast}
            />
          )}

          {screen.name === 'pdf-to-jpeg' && (
            <PdfToJpegScreen
              onBack={() => setScreen({ name: 'home' })}
              onNotify={showToast}
              onImportIntoPScan={async (
                result: PdfConversionResult,
                selectedPages: ConvertedPdfPage[]
              ) => {
                const now = Date.now();
                const pages: ScanPage[] = selectedPages.map((p) => ({
                  id: generateId('page'),
                  originalDataUrl: p.dataUrl,
                  processedDataUrl: p.dataUrl,
                  corners: FULL_QUAD,
                  filter: 'original',
                  brightness: 0,
                  contrast: 0,
                  rotation: 0,
                  width: p.width,
                  height: p.height,
                  createdAt: now,
                }));
                const newDoc: ScanDocument = {
                  id: generateId('doc'),
                  title: result.baseName,
                  pages,
                  createdAt: now,
                  updatedAt: now,
                };
                await persistDocument(newDoc);
                showToast(`បានរក្សាទុក ${pages.length} ទំព័រទៅក្នុង P-Scan`);
                setScreen({ name: 'viewer', docId: newDoc.id });
              }}
            />
          )}

          {screen.name === 'viewer' && activeDoc && (
            <DocumentViewerScreen
              document={activeDoc}
              onBack={() => setScreen({ name: 'home' })}
              onRename={(title) => handleRenameDoc(activeDoc.id, title)}
              onAddFromCamera={() =>
                setScreen({ name: 'camera', targetDocId: activeDoc.id })
              }
              onAddFromGallery={(files) => handleImportFiles(files, activeDoc.id)}
              onEditPage={(page) =>
                setScreen({
                  name: 'crop',
                  queue: [
                    {
                      originalDataUrl: page.originalDataUrl,
                      corners: page.corners,
                      filter: page.filter,
                      brightness: page.brightness,
                      contrast: page.contrast,
                      rotation: page.rotation,
                    },
                  ],
                  currentIndex: 0,
                  targetDocId: activeDoc.id,
                  editingPageId: page.id,
                })
              }
              onMovePage={(idx, dir) => handleMovePage(activeDoc, idx, dir)}
              onDeletePage={(pageId) => handleDeletePage(activeDoc, pageId)}
              onExportPdf={(action, mode) => handleExportPdf(activeDoc, action, mode)}
              onExportPageImage={(page, idx) => handleExportImage(activeDoc, page, idx)}
              onExtractText={async (page, idx) => {
                let ocrImage = page.processedDataUrl;
                if (page.filter === 'bw') {
                  try {
                    const clean = await renderScannedPage({
                      originalDataUrl: page.originalDataUrl,
                      corners: page.corners,
                      filter: 'original',
                      brightness: 0,
                      contrast: 0,
                      rotation: page.rotation,
                      maxSide: 2000,
                    });
                    ocrImage = clean.dataUrl;
                  } catch {
                    // fallback to processedDataUrl
                  }
                }
                setScreen({
                  name: 'ocr',
                  imageDataUrl: ocrImage,
                  title: `${activeDoc.title} - ទំព័រ ${idx + 1}`,
                  returnToDocId: activeDoc.id,
                });
              }}
              onExportAllJpegs={async (asZip) => {
                const mapped = activeDoc.pages.map((p, idx) => ({
                  pageNumber: idx + 1,
                  dataUrl: p.processedDataUrl,
                }));
                try {
                  const msg = asZip
                    ? await exportJpegsAsZip(mapped, activeDoc.title)
                    : await downloadJpegsIndividually(mapped, activeDoc.title);
                  showToast(msg);
                } catch {
                  showToast('មិនអាចទាញយករូបភាព JPEG បានទេ');
                }
              }}
            />
          )}

          {screen.name === 'camera' && (
            <CameraScreen
              onClose={() =>
                setScreen(
                  screen.targetDocId
                    ? { name: 'viewer', docId: screen.targetDocId }
                    : { name: 'home' }
                )
              }
              onCaptureBatch={(urls) => startPipelineFromSources(urls, screen.targetDocId)}
              onPickFromGallery={(files) => handleImportFiles(files, screen.targetDocId)}
              onUseSample={handleTrySample}
            />
          )}

          {screen.name === 'crop' && (
            <CropScreen
              key={`crop-${screen.currentIndex}`}
              imageDataUrl={screen.queue[screen.currentIndex].originalDataUrl}
              initialCorners={screen.queue[screen.currentIndex].corners}
              initialRotation={screen.queue[screen.currentIndex].rotation}
              pageLabel={
                screen.queue.length > 1
                  ? `ទំព័រ ${screen.currentIndex + 1} / ${screen.queue.length}`
                  : undefined
              }
              onCancel={() => {
                // If partial staged pages already processed, save them or return
                setStagedPages([]);
                setScreen(
                  screen.targetDocId
                    ? { name: 'viewer', docId: screen.targetDocId }
                    : { name: 'home' }
                );
              }}
              onConfirm={(corners, rotation) => {
                const updatedQueue = [...screen.queue];
                updatedQueue[screen.currentIndex] = {
                  ...updatedQueue[screen.currentIndex],
                  corners,
                  rotation,
                };
                setScreen({
                  name: 'filter',
                  queue: updatedQueue,
                  currentIndex: screen.currentIndex,
                  targetDocId: screen.targetDocId,
                  editingPageId: screen.editingPageId,
                });
              }}
            />
          )}

          {screen.name === 'filter' && (
            <FilterScreen
              key={`filter-${screen.currentIndex}`}
              originalDataUrl={screen.queue[screen.currentIndex].originalDataUrl}
              corners={screen.queue[screen.currentIndex].corners}
              initialFilter={screen.queue[screen.currentIndex].filter}
              initialBrightness={screen.queue[screen.currentIndex].brightness}
              initialContrast={screen.queue[screen.currentIndex].contrast}
              initialRotation={screen.queue[screen.currentIndex].rotation}
              pageLabel={
                screen.queue.length > 1
                  ? `ទំព័រ ${screen.currentIndex + 1} / ${screen.queue.length}`
                  : undefined
              }
              onBackToCrop={(state) => {
                const updatedQueue = [...screen.queue];
                updatedQueue[screen.currentIndex] = {
                  ...updatedQueue[screen.currentIndex],
                  ...state,
                };
                setScreen({
                  name: 'crop',
                  queue: updatedQueue,
                  currentIndex: screen.currentIndex,
                  targetDocId: screen.targetDocId,
                  editingPageId: screen.editingPageId,
                });
              }}
              onSave={handleSaveFilterStep}
            />
          )}
        </>
      )}

      {/* Global Busy Overlay */}
      {busyMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900 px-7 py-5 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <p className="text-sm font-medium text-slate-100">{busyMessage}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
          <div className="rounded-2xl border border-teal-500/40 bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-teal-200 shadow-2xl backdrop-blur">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
