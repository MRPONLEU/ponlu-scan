import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Download,
  FileDown,
  ImageDown,
  ImagePlus,
  Languages,
  Pencil,
  Share2,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import type { ScanDocument, ScanPage } from '../types';
import { formatDateTimeKm } from '../lib/storage';
import type { PdfPaperMode } from '../lib/pdfExport';

interface DocumentViewerScreenProps {
  document: ScanDocument;
  onBack: () => void;
  onRename: (newTitle: string) => void;
  onAddFromCamera: () => void;
  onAddFromGallery: (files: FileList) => void;
  onEditPage: (page: ScanPage, index: number) => void;
  onMovePage: (index: number, direction: -1 | 1) => void;
  onDeletePage: (pageId: string) => void;
  onExportPdf: (action: 'download' | 'share', mode: PdfPaperMode) => void;
  onExportPageImage: (page: ScanPage, index: number) => void;
  onExportAllJpegs: (asZip: boolean) => void;
  onExtractText: (page: ScanPage, index: number) => void;
}

export const DocumentViewerScreen: React.FC<DocumentViewerScreenProps> = ({
  document: doc,
  onBack,
  onRename,
  onAddFromCamera,
  onAddFromGallery,
  onEditPage,
  onMovePage,
  onDeletePage,
  onExportPdf,
  onExportPageImage,
  onExportAllJpegs,
  onExtractText,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title);
  const [zoomPage, setZoomPage] = useState<ScanPage | null>(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfMode, setPdfMode] = useState<PdfPaperMode>('a4');

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onRename(titleInput.trim());
    } else {
      setTitleInput(doc.title);
    }
    setEditingTitle(false);
  };

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

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="w-full rounded-lg border border-teal-500 bg-slate-900 px-2.5 py-1 text-sm text-white focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInput(doc.title);
                setEditingTitle(true);
              }}
              className="flex max-w-full items-center gap-1.5 text-left"
            >
              <h1 className="truncate text-sm font-bold text-white">{doc.title}</h1>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>
          )}
          <p className="text-[11px] text-slate-400">
            {doc.pages.length} ទំព័រ • {formatDateTimeKm(doc.updatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPdfOptions(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95"
        >
          <FileDown className="h-4 w-4" />
          <span>PDF</span>
        </button>
      </header>

      {/* Pages Grid/Scroll List */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {doc.pages.map((page, index) => (
            <div
              key={page.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg"
            >
              <button
                type="button"
                onClick={() => setZoomPage(page)}
                className="relative block aspect-[3/4] w-full overflow-hidden bg-slate-950"
              >
                <img
                  src={page.processedDataUrl}
                  alt={`ទំព័រទី ${index + 1}`}
                  className="h-full w-full object-contain bg-white/5"
                />
                <span className="absolute left-2.5 top-2.5 rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  ទំព័រ {index + 1}
                </span>
              </button>

              {/* Page Toolbar */}
              <div className="flex items-center justify-between border-t border-slate-800/80 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMovePage(index, -1)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                    title="រំកិលឡើង"
                    aria-label="រំកិលទំព័រឡើង"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === doc.pages.length - 1}
                    onClick={() => onMovePage(index, 1)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                    title="រំកិលចុះ"
                    aria-label="រំកិលទំព័រចុះ"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onExtractText(page, index)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-sky-300 hover:bg-slate-800"
                    title="OCR ដកស្រង់អក្សរខ្មែរ/អង់គ្លេស"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    <span>OCR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditPage(page, index)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-teal-300 hover:bg-slate-800"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>កែសម្រួល</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportPageImage(page, index)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"
                    title="ទាញយក JPG"
                    aria-label="ទាញយករូបភាព"
                  >
                    <ImageDown className="h-4 w-4" />
                  </button>
                  {doc.pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeletePage(page.id)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/60"
                      title="លុបទំព័រ"
                      aria-label="លុបទំព័រ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/90 px-4 pt-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-around gap-2">
          <button
            type="button"
            onClick={onAddFromCamera}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-medium text-slate-200 hover:border-teal-500/50 active:scale-95"
          >
            <Camera className="h-4 w-4 text-teal-400" />
            <span>ថតបន្ថែម</span>
          </button>

          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-medium text-slate-200 hover:border-teal-500/50 active:scale-95">
            <ImagePlus className="h-4 w-4 text-teal-400" />
            <span>បន្ថែមរូប</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onAddFromGallery(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowPdfOptions(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            <span>នាំចេញ PDF</span>
          </button>
        </div>
      </footer>

      {/* Fullscreen Page Zoom Modal */}
      {zoomPage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setZoomPage(null)}
        >
          <div className="safe-top flex justify-end px-4 pb-2">
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
              src={zoomPage.processedDataUrl}
              alt="មើលទំព័រពេញ"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* PDF Export Options Bottom Sheet */}
      {showPdfOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="safe-bottom w-full max-w-md rounded-t-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">នាំចេញឯកសារ PDF</h3>
              <button
                type="button"
                onClick={() => setShowPdfOptions(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {doc.title} • {doc.pages.length} ទំព័រ
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-300">ទំហំក្រដាស PDF</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfMode('a4')}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    pdfMode === 'a4'
                      ? 'border-teal-500 bg-teal-500/15 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  ស្តង់ដារ A4 (ណែនាំ)
                </button>
                <button
                  type="button"
                  onClick={() => setPdfMode('fit')}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    pdfMode === 'fit'
                      ? 'border-teal-500 bg-teal-500/15 text-teal-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  តាមទំហំរូបភាពដើម
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPdfOptions(false);
                  onExportPdf('download', pdfMode);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-500 active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                ទាញយកឯកសារ PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPdfOptions(false);
                  onExportPdf('share', pdfMode);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-medium text-slate-100 hover:bg-slate-700 active:scale-[0.99]"
              >
                <Share2 className="h-4 w-4 text-teal-400" />
                ចែករំលែក PDF ទៅកម្មវិធីផ្សេង
              </button>

              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPdfOptions(false);
                    onExportAllJpegs(false);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 active:scale-[0.99]"
                >
                  <ImageDown className="h-4 w-4" />
                  <span>ទាញយក JPEG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPdfOptions(false);
                    onExportAllJpegs(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 active:scale-[0.99]"
                >
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>JPEG ទាំងអស់ (.zip)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
