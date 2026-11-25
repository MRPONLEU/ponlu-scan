import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  FileArchive,
  FileImage,
  FileUp,
  FolderPlus,
  Loader2,
  Share2,
  X,
} from 'lucide-react';
import {
  convertPdfFileToJpegs,
  downloadJpegsIndividually,
  exportJpegsAsZip,
  saveSingleJpeg,
  shareSingleJpeg,
  type ConvertedPdfPage,
  type PdfConversionResult,
  type PdfRenderScale,
} from '../lib/pdfToJpeg';

interface PdfToJpegScreenProps {
  onBack: () => void;
  onImportIntoPScan: (result: PdfConversionResult, selectedPages: ConvertedPdfPage[]) => Promise<void>;
  onNotify: (message: string) => void;
}

const QUALITY_OPTIONS: Array<{ scale: PdfRenderScale; labelKm: string; subKm: string }> = [
  { scale: 1.5, labelKm: 'ស្តង់ដារ', subKm: 'ឯកសារតូច រហ័ស' },
  { scale: 2, labelKm: 'ច្បាស់ល្អ', subKm: 'ណែនាំ' },
  { scale: 3, labelKm: 'ច្បាស់ខ្លាំង', subKm: 'HD សម្រាប់ព្រីន' },
];

export const PdfToJpegScreen: React.FC<PdfToJpegScreenProps> = ({
  onBack,
  onImportIntoPScan,
  onNotify,
}) => {
  const [scale, setScale] = useState<PdfRenderScale>(2);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [result, setResult] = useState<PdfConversionResult | null>(null);
  const [selectedPageNums, setSelectedPageNums] = useState<Set<number>>(new Set());
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [zoomPage, setZoomPage] = useState<ConvertedPdfPage | null>(null);

  const runConversion = async (file: File, targetScale: PdfRenderScale) => {
    setCurrentFile(file);
    setConverting(true);
    setProgress({ done: 0, total: 0 });
    try {
      const converted = await convertPdfFileToJpegs(file, {
        scale: targetScale,
        quality: 0.92,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setResult(converted);
      setSelectedPageNums(new Set(converted.pages.map((p) => p.pageNumber)));
      onNotify(`បានបំប្លែង ${converted.totalPages} ទំព័រទៅជា JPEG រួចរាល់`);
    } catch {
      onNotify('មិនអាចអាន ឬបំប្លែងឯកសារ PDF នេះបានទេ');
    } finally {
      setConverting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void runConversion(file, scale);
      e.target.value = '';
    }
  };

  const handleScaleChange = (newScale: PdfRenderScale) => {
    setScale(newScale);
    if (currentFile && !converting) {
      void runConversion(currentFile, newScale);
    }
  };

  const togglePage = (pageNum: number) => {
    setSelectedPageNums((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const selectedPages = useMemo(() => {
    if (!result) return [];
    return result.pages.filter((p) => selectedPageNums.has(p.pageNumber));
  }, [result, selectedPageNums]);

  const allSelected = Boolean(result && selectedPages.length === result.pages.length);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="safe-top sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/90 px-4 pb-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-white"
          aria-label="ត្រឡប់ក្រោយ"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-sm font-bold text-white">បំប្លែង PDF ទៅជា JPEG</h1>
          <p className="truncate text-[11px] text-slate-400">
            {result
              ? `${result.baseName}.pdf • ${result.totalPages} ទំព័រ`
              : 'ជ្រើសរើសឯកសារ PDF ដើម្បីបំប្លែងជារូបភាព'}
          </p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-teal-300 ring-1 ring-slate-800 hover:bg-slate-800">
          <FileUp className="h-4 w-4" />
          <span>{result ? 'ប្តូរ PDF' : 'រើស PDF'}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </header>

      {/* Quality Selector */}
      <div className="border-b border-slate-800/70 bg-slate-900/50 px-4 py-2.5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-300">កម្រិតភាពច្បាស់៖</span>
          <div className="flex flex-1 justify-end gap-1.5">
            {QUALITY_OPTIONS.map((opt) => {
              const active = scale === opt.scale;
              return (
                <button
                  key={opt.scale}
                  type="button"
                  disabled={converting}
                  onClick={() => handleScaleChange(opt.scale)}
                  className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                    active
                      ? 'border-teal-500 bg-teal-500/15 text-teal-300'
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold leading-tight">{opt.labelKm}</div>
                  <div className="text-[9px] opacity-80">{opt.subKm}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-4">
        {converting ? (
          <div className="mx-auto mt-16 flex max-w-xs flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
            <h2 className="mt-4 text-sm font-semibold text-white">កំពុងបំប្លែង PDF ទៅជា JPEG...</h2>
            <p className="mt-1.5 text-xs text-slate-400">
              {progress.total > 0
                ? `ទំព័រទី ${progress.done} នៃ ${progress.total}`
                : 'កំពុងអានឯកសារ PDF...'}
            </p>
            {progress.total > 0 && (
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ) : !result ? (
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-7 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-amber-500/30">
              <FileImage className="h-10 w-10 text-amber-400" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-white">បំប្លែង PDF ទៅជារូបភាព JPEG</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              ជ្រើសរើសឯកសារ PDF ពីទូរសព្ទរបស់អ្នក ដើម្បីបំបែកគ្រប់ទំព័រទៅជារូបភាព JPEG ច្បាស់លាស់ ទាញយកជា .jpg ឬ .zip ឬរក្សាទុកចូល P-Scan។
            </p>

            <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition hover:bg-teal-500 active:scale-[0.98]">
              <FileUp className="h-4 w-4" />
              ជ្រើសរើសឯកសារ PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {/* Selection summary bar */}
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5">
              <span className="text-xs text-slate-300">
                បានជ្រើស <strong className="text-teal-400">{selectedPages.length}</strong> / {result.totalPages} ទំព័រ
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedPageNums(
                    allSelected ? new Set() : new Set(result.pages.map((p) => p.pageNumber))
                  )
                }
                className="text-xs font-medium text-teal-400 hover:text-teal-300"
              >
                {allSelected ? 'ដកការជ្រើសទាំងអស់' : 'ជ្រើសរើសទាំងអស់'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.pages.map((page) => {
                const isSelected = selectedPageNums.has(page.pageNumber);
                return (
                  <div
                    key={page.pageNumber}
                    className={`overflow-hidden rounded-2xl border transition ${
                      isSelected
                        ? 'border-teal-500 bg-slate-900 shadow-lg shadow-teal-950/50'
                        : 'border-slate-800 bg-slate-900/50 opacity-70'
                    }`}
                  >
                    <div className="relative aspect-[3/4] bg-white">
                      <button
                        type="button"
                        onClick={() => setZoomPage(page)}
                        className="h-full w-full"
                      >
                        <img
                          src={page.dataUrl}
                          alt={`ទំព័រ ${page.pageNumber}`}
                          className="h-full w-full object-contain"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePage(page.pageNumber)}
                        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow transition ${
                          isSelected
                            ? 'border-white bg-teal-600 text-white'
                            : 'border-slate-300 bg-slate-950/70 text-transparent'
                        }`}
                        aria-label={`ជ្រើសទំព័រ ${page.pageNumber}`}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <span className="absolute bottom-2 left-2 rounded-lg bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-white">
                        ទំព័រ {page.pageNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-2">
                      <span className="text-[10px] text-slate-400">
                        {page.width}×{page.height}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const msg = await shareSingleJpeg(
                              page.dataUrl,
                              `${result.baseName}_ទំព័រ_${page.pageNumber}.jpg`
                            );
                            onNotify(msg);
                          }}
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                          title="ចែករំលែក JPEG"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const msg = await saveSingleJpeg(
                              page.dataUrl,
                              `${result.baseName}_ទំព័រ_${page.pageNumber}.jpg`
                            );
                            onNotify(msg);
                          }}
                          className="rounded-lg p-1.5 text-teal-400 hover:bg-slate-800"
                          title="ទាញយក JPEG"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar when PDF is converted */}
      {result && !converting && (
        <footer className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/95 px-4 pt-3 backdrop-blur-lg">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              disabled={selectedPages.length === 0}
              onClick={async () => {
                const msg = await downloadJpegsIndividually(selectedPages, result.baseName);
                onNotify(msg);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-teal-600 px-3 py-3 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              <span>ទាញយក JPEG ({selectedPages.length})</span>
            </button>

            <button
              type="button"
              disabled={selectedPages.length === 0}
              onClick={async () => {
                const msg = await exportJpegsAsZip(selectedPages, result.baseName);
                onNotify(msg);
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-xs font-medium text-slate-200 hover:bg-slate-800 active:scale-95 disabled:opacity-40"
            >
              <FileArchive className="h-4 w-4 text-amber-400" />
              <span>ZIP</span>
            </button>

            <button
              type="button"
              disabled={selectedPages.length === 0}
              onClick={() => onImportIntoPScan(result, selectedPages)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-teal-500/40 bg-teal-500/10 px-3.5 py-3 text-xs font-medium text-teal-300 hover:bg-teal-500/20 active:scale-95 disabled:opacity-40"
              title="រក្សាទុកចូលបញ្ជីឯកសារ P-Scan"
            >
              <FolderPlus className="h-4 w-4" />
              <span>រក្សាទុក</span>
            </button>
          </div>
        </footer>
      )}

      {/* Fullscreen Page Preview */}
      {zoomPage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setZoomPage(null)}
        >
          <div className="safe-top flex items-center justify-between px-4 pb-2">
            <span className="text-xs font-medium text-slate-300">
              ទំព័រ {zoomPage.pageNumber} ({zoomPage.width}×{zoomPage.height})
            </span>
            <button
              type="button"
              onClick={() => setZoomPage(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white"
              aria-label="បិទ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <img
              src={zoomPage.dataUrl}
              alt={`ទំព័រ ${zoomPage.pageNumber}`}
              className="max-h-full max-w-full rounded-lg bg-white object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
