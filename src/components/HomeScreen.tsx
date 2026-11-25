import React, { useMemo, useState } from 'react';
import {
  Camera,
  FileImage,
  FileText,
  Grid2X2,
  ImagePlus,
  Languages,
  List,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  QrCode,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ScanDocument } from '../types';
import { formatDateTimeKm } from '../lib/storage';

interface HomeScreenProps {
  documents: ScanDocument[];
  onOpenCamera: () => void;
  onImportImages: (files: FileList) => void;
  onOpenPdfToJpeg: () => void;
  onOpenOcr: () => void;
  onOpenQrScanner: () => void;
  onTrySample: () => void;
  onOpenDocument: (doc: ScanDocument) => void;
  onRenameDocument: (docId: string, newTitle: string) => void;
  onTogglePin: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onQuickExportPdf: (doc: ScanDocument, mode: 'download' | 'share') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  documents,
  onOpenCamera,
  onImportImages,
  onOpenPdfToJpeg,
  onOpenOcr,
  onOpenQrScanner,
  onTrySample,
  onOpenDocument,
  onRenameDocument,
  onTogglePin,
  onDeleteDocument,
  onQuickExportPdf,
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<ScanDocument | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<ScanDocument | null>(null);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportImages(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="safe-top sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 px-4 pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-900/40">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">P-Scan</h1>
              <p className="text-[11px] text-slate-400">កម្មវិធីស្កេនឯកសារចល័ត</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-2.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/20 active:scale-95"
              title="ស្កេន QR Code"
            >
              <QrCode className="h-4 w-4" />
              <span>QR</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white active:scale-95"
              title={viewMode === 'grid' ? 'ប្តូរជាបញ្ជី' : 'ប្តូរជាក្រឡា'}
              aria-label="ប្តូរទម្រង់បង្ហាញ"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid2X2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកឈ្មោះឯកសារ..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label="សម្អាតការស្វែងរក"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Tools Strip */}
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={onOpenOcr}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition hover:bg-sky-500/20 active:scale-95"
          >
            <Languages className="h-3.5 w-3.5" />
            <span>OCR ដកស្រង់អក្សរ</span>
          </button>

          <button
            type="button"
            onClick={onOpenPdfToJpeg}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/20 active:scale-95"
          >
            <FileImage className="h-3.5 w-3.5" />
            <span>PDF ➔ JPEG</span>
          </button>

          <button
            type="button"
            onClick={onOpenQrScanner}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-[11px] font-medium text-teal-300 transition hover:bg-teal-500/20 active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>ស្កេន QR Code</span>
          </button>

          <button
            type="button"
            onClick={onTrySample}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:text-white active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>ឯកសារគំរូ</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {documents.length === 0 ? (
          <div className="mx-auto mt-6 flex max-w-sm flex-col items-center rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 ring-1 ring-teal-500/30">
              <Camera className="h-10 w-10 text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">មិនទាន់មានឯកសារស្កេននៅឡើយទេ</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              ថតរូបឯកសារ វិក្កយបត្រ ឬអត្តសញ្ញាណប័ណ្ណ ដើម្បីកាត់តម្រង់ជ្រុង 4 និងបង្កើតជា PDF ច្បាស់លាស់។
            </p>

            <div className="mt-6 flex w-full flex-col gap-2.5">
              <button
                type="button"
                onClick={onOpenCamera}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition hover:bg-teal-500 active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                ស្កេនដោយកាមេរ៉ា
              </button>

              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 active:scale-[0.98]">
                <ImagePlus className="h-4 w-4 text-teal-400" />
                ជ្រើសរើសរូបភាពពីទូរសព្ទ
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                onClick={onOpenPdfToJpeg}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 active:scale-[0.98]"
              >
                <FileImage className="h-4 w-4" />
                បំប្លែង PDF ទៅជា JPEG
              </button>

              <button
                type="button"
                onClick={onTrySample}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/20 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                សាកល្បងជាមួយឯកសារគំរូ
              </button>
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            រកមិនឃើញឯកសារដែលត្រូវនឹង "{search}" ទេ
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'
                : 'flex flex-col gap-2.5'
            }
          >
            {filteredDocs.map((doc) => {
              const cover = doc.pages[0]?.processedDataUrl;
              const isMenuOpen = menuDocId === doc.id;

              return viewMode === 'grid' ? (
                <div
                  key={doc.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/80 transition hover:border-teal-500/40"
                >
                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950 text-left"
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={doc.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600">
                        <FileText className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    <span className="absolute bottom-2 left-2 rounded-lg bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-slate-200 backdrop-blur-sm">
                      {doc.pages.length} ទំព័រ
                    </span>
                    {doc.isPinned && (
                      <span className="absolute left-2 top-2 rounded-full bg-teal-600/90 p-1 text-white shadow">
                        <Pin className="h-3 w-3" />
                      </span>
                    )}
                  </button>

                  <div className="flex items-start justify-between gap-1 p-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold text-slate-100">{doc.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {formatDateTimeKm(doc.updatedAt)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMenuDocId(isMenuOpen ? null : doc.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                      aria-label="ជម្រើសឯកសារ"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  {isMenuOpen && (
                    <DocumentActionMenu
                      doc={doc}
                      onClose={() => setMenuDocId(null)}
                      onSharePdf={() => {
                        setMenuDocId(null);
                        onQuickExportPdf(doc, 'share');
                      }}
                      onRename={() => {
                        setMenuDocId(null);
                        setRenameText(doc.title);
                        setRenamingDoc(doc);
                      }}
                      onTogglePin={() => {
                        setMenuDocId(null);
                        onTogglePin(doc.id);
                      }}
                      onDelete={() => {
                        setMenuDocId(null);
                        setConfirmDeleteDoc(doc);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div
                  key={doc.id}
                  className="relative flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/80 p-2.5 transition hover:border-teal-500/40"
                >
                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-950"
                  >
                    {cover ? (
                      <img src={cover} alt={doc.title} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="m-auto h-5 w-5 text-slate-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      {doc.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-teal-400" />}
                      <p className="truncate text-sm font-semibold text-slate-100">{doc.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {doc.pages.length} ទំព័រ • {formatDateTimeKm(doc.updatedAt)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuDocId(isMenuOpen ? null : doc.id)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="ជម្រើសឯកសារ"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {isMenuOpen && (
                    <DocumentActionMenu
                      doc={doc}
                      onClose={() => setMenuDocId(null)}
                      onSharePdf={() => {
                        setMenuDocId(null);
                        onQuickExportPdf(doc, 'share');
                      }}
                      onRename={() => {
                        setMenuDocId(null);
                        setRenameText(doc.title);
                        setRenamingDoc(doc);
                      }}
                      onTogglePin={() => {
                        setMenuDocId(null);
                        onTogglePin(doc.id);
                      }}
                      onDelete={() => {
                        setMenuDocId(null);
                        setConfirmDeleteDoc(doc);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Floating CamScanner Action Bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/90 px-4 pt-2.5 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-slate-300 transition hover:text-teal-400 active:scale-95">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px] font-medium">រូបភាព</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            type="button"
            onClick={onOpenOcr}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-slate-300 transition hover:text-sky-300 active:scale-95"
          >
            <Languages className="h-5 w-5 text-sky-400" />
            <span className="text-[11px] font-medium">OCR</span>
          </button>

          <button
            type="button"
            onClick={onOpenCamera}
            className="-mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-xl shadow-teal-900/60 ring-4 ring-slate-950 transition hover:brightness-110 active:scale-95"
            aria-label="ស្កេនដោយកាមេរ៉ា"
          >
            <Camera className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={onOpenPdfToJpeg}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-slate-300 transition hover:text-amber-300 active:scale-95"
          >
            <FileImage className="h-5 w-5 text-amber-400" />
            <span className="text-[11px] font-medium">PDF➔JPG</span>
          </button>

          <button
            type="button"
            onClick={onOpenQrScanner}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-slate-300 transition hover:text-teal-400 active:scale-95"
          >
            <QrCode className="h-5 w-5 text-teal-400" />
            <span className="text-[11px] font-medium">QR Code</span>
          </button>
        </div>
      </nav>

      {/* Rename Modal */}
      {renamingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white">ប្តូរឈ្មោះឯកសារ</h3>
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              autoFocus
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              placeholder="បញ្ចូលឈ្មោះថ្មី..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamingDoc(null)}
                className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={() => {
                  if (renameText.trim()) {
                    onRenameDocument(renamingDoc.id, renameText.trim());
                  }
                  setRenamingDoc(null);
                }}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white">លុបឯកសារនេះ?</h3>
            <p className="mt-2 text-sm text-slate-400">
              តើអ្នកពិតជាចង់លុប "{confirmDeleteDoc.title}" មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(confirmDeleteDoc.id);
                  setConfirmDeleteDoc(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                លុបចោល
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DocumentActionMenuProps {
  doc: ScanDocument;
  onClose: () => void;
  onSharePdf: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

const DocumentActionMenu: React.FC<DocumentActionMenuProps> = ({
  doc,
  onClose,
  onSharePdf,
  onRename,
  onTogglePin,
  onDelete,
}) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute bottom-11 right-2 z-40 w-44 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 py-1.5 shadow-2xl">
      <button
        type="button"
        onClick={onSharePdf}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
      >
        <Share2 className="h-3.5 w-3.5 text-teal-400" />
        នាំចេញ / ចែករំលែក PDF
      </button>
      <button
        type="button"
        onClick={onRename}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
      >
        <Pencil className="h-3.5 w-3.5 text-sky-400" />
        ប្តូរឈ្មោះ
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
      >
        {doc.isPinned ? (
          <>
            <PinOff className="h-3.5 w-3.5 text-amber-400" />
            ដកការខ្ទាស់
          </>
        ) : (
          <>
            <Pin className="h-3.5 w-3.5 text-amber-400" />
            ខ្ទាស់នៅខាងលើ
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        លុបឯកសារ
      </button>
    </div>
  </>
);
