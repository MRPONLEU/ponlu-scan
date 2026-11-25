import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Languages,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';
import {
  extractTextFromImage,
  type OcrLanguage,
  type OcrLayoutMode,
  type OcrProgress,
} from '../lib/ocr';
import { normalizeCapturedImage } from '../lib/imageProcessing';

interface OcrScreenProps {
  initialImageDataUrl?: string | null;
  initialTitle?: string;
  onBack: () => void;
  onNotify: (msg: string) => void;
}

const LANG_OPTIONS: Array<{ id: OcrLanguage; labelKm: string }> = [
  { id: 'khm', labelKm: 'ខ្មែរ (ច្បាស់បំផុត)' },
  { id: 'khm+eng', labelKm: 'ខ្មែរ + អង់គ្លេស' },
  { id: 'eng', labelKm: 'អង់គ្លេសសុទ្ធ' },
];

export const OcrScreen: React.FC<OcrScreenProps> = ({
  initialImageDataUrl = null,
  initialTitle,
  onBack,
  onNotify,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageDataUrl);
  const [language, setLanguage] = useState<OcrLanguage>('khm');
  const [layoutMode, setLayoutMode] = useState<OcrLayoutMode>('auto');
  const [enhanceImage, setEnhanceImage] = useState(true);
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({
    statusKm: 'ត្រៀមរួចរាល់',
    progress: 0,
  });

  const runOcr = async (
    srcUrl: string,
    lang: OcrLanguage,
    layout: OcrLayoutMode,
    enhance: boolean
  ) => {
    setRunning(true);
    setProgress({ statusKm: 'កំពុងចាប់ផ្តើមម៉ាស៊ីន OCR...', progress: 5 });
    try {
      const extracted = await extractTextFromImage(srcUrl, {
        language: lang,
        layoutMode: layout,
        enhanceImage: enhance,
        onProgress: setProgress,
      });
      setText(extracted);
      if (!extracted) {
        onNotify('រកមិនឃើញអក្សរច្បាស់នៅក្នុងរូបភាពនេះទេ');
      } else {
        onNotify('បានដកស្រង់អក្សររួចរាល់');
      }
    } catch {
      onNotify('បរាជ័យក្នុងការដកស្រង់អក្សរ (ត្រូវការអ៊ីនធឺណិតសម្រាប់ទាញយកទិន្នន័យភាសាលើកដំបូង)');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (initialImageDataUrl) {
      void runOcr(initialImageDataUrl, language, layoutMode, enhanceImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const norm = await normalizeCapturedImage(file, 2200);
      setImageUrl(norm.dataUrl);
      await runOcr(norm.dataUrl, language, layoutMode, enhanceImage);
    } catch {
      onNotify('មិនអាចផ្ទុករូបភាពបានទេ');
    }
  };

  const handleCopy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      onNotify('បានចម្លងអក្សរទៅ Clipboard');
    } catch {
      onNotify('មិនអាចចម្លងអក្សរបានទេ');
    }
  };

  const handleDownloadTxt = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialTitle || 'P-Scan-OCR'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onNotify('បានទាញយកឯកសារអក្សរ (.txt)');
  };

  const handleShareText = async () => {
    if (!text.trim()) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: initialTitle || 'អក្សរដកស្រង់ពី P-Scan OCR',
          text,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopy();
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

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-sm font-bold text-white">OCR ដកស្រង់អក្សរ</h1>
          <p className="truncate text-[11px] text-slate-400">
            {initialTitle || 'ប្រើគំរូភាសាខ្មែរគុណភាពខ្ពស់ (Best)'}
          </p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-teal-300 ring-1 ring-slate-800 hover:bg-slate-800">
          <ImagePlus className="h-4 w-4" />
          <span>{imageUrl ? 'ប្តូររូប' : 'រើសរូប'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
        </label>
      </header>

      {/* Language & Tuning Bar */}
      <div className="border-b border-slate-800/70 bg-slate-900/60 px-4 py-2.5">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Languages className="h-4 w-4 text-teal-400" />
              <span>ភាសា៖</span>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {LANG_OPTIONS.map((opt) => {
                const active = language === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={running}
                    onClick={() => {
                      setLanguage(opt.id);
                      if (imageUrl) void runOcr(imageUrl, opt.id, layoutMode, enhanceImage);
                    }}
                    className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
                      active
                        ? 'border-teal-500 bg-teal-500/15 text-teal-300'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.labelKm}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  const next = layoutMode === 'auto' ? 'block' : 'auto';
                  setLayoutMode(next);
                  if (imageUrl) void runOcr(imageUrl, language, next, enhanceImage);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-slate-300 hover:border-slate-700"
              >
                ទម្រង់៖ {layoutMode === 'auto' ? 'ស្វ័យប្រវត្តិ' : 'អត្ថបទមួយកថាខណ្ឌ'}
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  const next = !enhanceImage;
                  setEnhanceImage(next);
                  if (imageUrl) void runOcr(imageUrl, language, layoutMode, next);
                }}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 ${
                  enhanceImage
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>បំភ្លឺ & ពង្រីកអក្សរ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {!imageUrl ? (
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-7 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/20 to-teal-500/10 ring-1 ring-sky-500/30">
              <FileText className="h-10 w-10 text-sky-400" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-white">ដកស្រង់អក្សរពីរូបភាព (OCR)</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              ជ្រើសរើសរូបភាពឯកសារច្បាស់ ឬកាត់ត្រង់ជ្រុងជាមុន ដើម្បីដកស្រង់អក្សរខ្មែរ និងអង់គ្លេសបានត្រឹមត្រូវបំផុត។
            </p>
            <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500">
              <ImagePlus className="h-4 w-4" />
              ជ្រើសរើសរូបភាព
              <input type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
            </label>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {/* Compact source thumbnail + re-run button */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <img
                src={imageUrl}
                alt="រូបភាព OCR"
                className="h-20 w-16 shrink-0 rounded-xl bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">រូបភាពប្រភព</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {running ? progress.statusKm : 'គន្លឹះ៖ ប្រើ "ខ្មែរ (ច្បាស់បំផុត)" ឬថត/កាត់ឱ្យត្រង់ជួរអក្សរ'}
                </p>
                {running && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={running}
                onClick={() => void runOcr(imageUrl, language, layoutMode, enhanceImage)}
                className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
              >
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>អានម្តងទៀត</span>
              </button>
            </div>

            {/* Extracted Text Area */}
            <div className="flex flex-col">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-slate-300">លទ្ធផលអក្សរដែលដកស្រង់បាន</span>
                <span className="text-[11px] text-slate-500">{text.length} តួអក្សរ</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder={
                  running ? 'កំពុងអានអក្សរពីរូបភាព សូមរង់ចាំ...' : 'អក្សរដែលអានបាននឹងបង្ហាញនៅទីនេះ...'
                }
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {imageUrl && (
        <footer className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/80 bg-slate-950/95 px-4 pt-3 backdrop-blur-lg">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              disabled={!text.trim() || running}
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-teal-600 py-3 text-xs font-semibold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 active:scale-95 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              <span>ចម្លងអក្សរ</span>
            </button>

            <button
              type="button"
              disabled={!text.trim() || running}
              onClick={handleDownloadTxt}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium text-slate-200 hover:bg-slate-800 active:scale-95 disabled:opacity-40"
            >
              <Download className="h-4 w-4 text-sky-400" />
              <span>.TXT</span>
            </button>

            <button
              type="button"
              disabled={!text.trim() || running}
              onClick={handleShareText}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium text-slate-200 hover:bg-slate-800 active:scale-95 disabled:opacity-40"
            >
              <Share2 className="h-4 w-4 text-teal-400" />
              <span>ចែករំលែក</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
